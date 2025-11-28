-- MANUAL STOCK DEDUCTION FOR EXISTING ORDERS
-- Run this in Supabase SQL Editor to fix all your existing paid orders

-- Step 1: Find all paid orders that haven't had stock deducted
SELECT 
    o.id as order_id,
    o.order_number,
    o.status,
    o.paid_at,
    o.total_cents,
    COUNT(oi.id) as item_count,
    SUM(oi.quantity) as total_quantity
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.status = 'paid' 
    AND o.paid_at IS NOT NULL
GROUP BY o.id, o.order_number, o.status, o.paid_at, o.total_cents
ORDER BY o.paid_at DESC
LIMIT 10;

-- Step 2: Process each paid order individually
-- This will create stock movements for existing orders

DO $$
DECLARE
    paid_order RECORD;
    order_item RECORD;
    product_record RECORD;
    current_stock INTEGER;
    new_stock INTEGER;
BEGIN
    -- Loop through all paid orders
    FOR paid_order IN 
        SELECT DISTINCT o.id, o.order_number, o.paid_at
        FROM orders o
        WHERE o.status = 'paid' 
            AND o.paid_at IS NOT NULL
        ORDER BY o.paid_at DESC
    LOOP
        RAISE NOTICE 'Processing order %', paid_order.order_number;
        
        -- Process each item in this order
        FOR order_item IN 
            SELECT oi.id, oi.product_id, oi.name, oi.quantity, oi.unit_price_cents
            FROM order_items oi
            WHERE oi.order_id = paid_order.id
        LOOP
            BEGIN
                -- Try to find product by ID first
                SELECT p.id, p.name, p.stock, p.is_active 
                INTO product_record
                FROM products p
                WHERE p.id = order_item.product_id 
                    AND p.is_active = true;
                
                -- If not found by ID, try by name
                IF product_record.id IS NULL THEN
                    SELECT p.id, p.name, p.stock, p.is_active 
                    INTO product_record
                    FROM products p
                    WHERE LOWER(TRIM(p.name)) = LOWER(TRIM(order_item.name))
                        AND p.is_active = true
                    LIMIT 1;
                    
                    -- If still not found, try partial name match
                    IF product_record.id IS NULL THEN
                        SELECT p.id, p.name, p.stock, p.is_active 
                        INTO product_record
                        FROM products p
                        WHERE (LOWER(TRIM(p.name)) LIKE '%' || LOWER(TRIM(order_item.name)) || '%'
                            OR LOWER(TRIM(order_item.name)) LIKE '%' || LOWER(TRIM(p.name)) || '%')
                            AND p.is_active = true
                        LIMIT 1;
                    END IF;
                END IF;
                
                -- If product found, deduct stock
                IF product_record.id IS NOT NULL THEN
                    current_stock := COALESCE(product_record.stock, 0);
                    new_stock := current_stock - order_item.quantity;
                    
                    -- Update product stock
                    UPDATE products 
                    SET stock = new_stock, updated_at = NOW()
                    WHERE id = product_record.id;
                    
                    -- Log stock movement
                    INSERT INTO stock_movements (
                        product_id, 
                        movement_type, 
                        quantity, 
                        order_id, 
                        notes, 
                        created_at
                    ) VALUES (
                        product_record.id,
                        'sale',
                        -order_item.quantity,
                        paid_order.id,
                        'Stock deduction for existing paid order: ' || paid_order.order_number,
                        NOW()
                    );
                    
                    RAISE NOTICE '✅ Deducted % units from % (stock: % -> %)', 
                        order_item.quantity, 
                        product_record.name, 
                        current_stock, 
                        new_stock;
                ELSE
                    RAISE NOTICE '❌ Product not found: %', order_item.name;
                END IF;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '❌ Error processing item %: %', order_item.name, SQLERRM;
            END;
        END LOOP;
    END LOOP;
END $$;

-- Step 3: Verify the results
SELECT 
    'Stock Movements Created' as check_type,
    COUNT(*) as count
FROM stock_movements 
WHERE movement_type = 'sale' 
    AND notes LIKE '%existing paid order%'
    AND created_at >= CURRENT_DATE;

-- Step 4: Show products with updated stock
SELECT 
    p.name,
    p.stock as current_stock,
    COUNT(sm.id) as stock_movements_today
FROM products p
LEFT JOIN stock_movements sm ON p.id = sm.product_id 
    AND sm.movement_type = 'sale'
    AND sm.created_at >= CURRENT_DATE
WHERE p.is_active = true
    AND (p.stock < 10 OR sm.id IS NOT NULL)
ORDER BY p.stock ASC
LIMIT 10;