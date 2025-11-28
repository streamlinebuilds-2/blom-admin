-- FINAL STOCK DEDUCTION FOR YOUR REAL DATA
-- This will fix all 17 paid orders and deduct stock for 169 order items

-- Step 1: See what we're about to process
SELECT 
    'About to process' as status,
    COUNT(DISTINCT o.id) as paid_orders,
    COUNT(oi.id) as total_items,
    SUM(oi.quantity) as total_quantity
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.status = 'paid';

-- Step 2: Process all paid orders with stock deduction
DO $$
DECLARE
    paid_order RECORD;
    order_item RECORD;
    product_record RECORD;
    current_stock INTEGER;
    new_stock INTEGER;
    processed_orders INTEGER := 0;
    processed_items INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting stock deduction for all paid orders...';
    
    -- Loop through all paid orders
    FOR paid_order IN 
        SELECT DISTINCT o.id, o.order_number, o.paid_at
        FROM orders o
        WHERE o.status = 'paid'
        ORDER BY o.paid_at DESC
    LOOP
        processed_orders := processed_orders + 1;
        RAISE NOTICE 'Processing order % (%)', paid_order.order_number, paid_order.id;
        
        -- Process each item in this order
        FOR order_item IN 
            SELECT oi.id, oi.product_id, oi.name, oi.quantity, oi.unit_price_cents
            FROM order_items oi
            WHERE oi.order_id = paid_order.id
        LOOP
            processed_items := processed_items + 1;
            BEGIN
                product_record := NULL;
                
                -- Try to find product by ID first
                IF order_item.product_id IS NOT NULL THEN
                    SELECT p.id, p.name, p.stock, p.is_active 
                    INTO product_record
                    FROM products p
                    WHERE p.id = order_item.product_id 
                        AND p.is_active = true;
                END IF;
                
                -- If not found by ID, try by exact name match
                IF product_record.id IS NULL THEN
                    SELECT p.id, p.name, p.stock, p.is_active 
                    INTO product_record
                    FROM products p
                    WHERE LOWER(TRIM(p.name)) = LOWER(TRIM(order_item.name))
                        AND p.is_active = true
                    LIMIT 1;
                END IF;
                
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
                
                -- If product found, deduct stock
                IF product_record.id IS NOT NULL THEN
                    current_stock := COALESCE(product_record.stock, 0);
                    new_stock := current_stock - order_item.quantity;
                    
                    -- Update product stock
                    UPDATE products 
                    SET stock = new_stock, updated_at = NOW()
                    WHERE id = product_record.id;
                    
                    -- Create stock movement record (basic format)
                    INSERT INTO stock_movements (
                        product_id, 
                        order_id, 
                        quantity, 
                        created_at
                    ) VALUES (
                        product_record.id,
                        paid_order.id,
                        -order_item.quantity,
                        NOW()
                    );
                    
                    RAISE NOTICE '✅ Order %: % (% units, % -> %)', 
                        paid_order.order_number,
                        product_record.name, 
                        order_item.quantity, 
                        current_stock, 
                        new_stock;
                ELSE
                    RAISE NOTICE '❌ Order %: Product not found: %', 
                        paid_order.order_number, order_item.name;
                END IF;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '❌ Order %: Error processing %: %', 
                    paid_order.order_number, order_item.name, SQLERRM;
            END;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Stock deduction complete: % orders, % items processed', 
        processed_orders, processed_items;
END $$;

-- Step 3: Verify results
SELECT 
    'FINAL RESULTS' as section,
    'Products Updated' as metric,
    COUNT(*) as count
FROM products 
WHERE updated_at >= CURRENT_DATE - INTERVAL '1 hour'

UNION ALL

SELECT 
    'FINAL RESULTS' as section,
    'Stock Movements' as metric,
    COUNT(*) as count
FROM stock_movements 
WHERE created_at >= CURRENT_DATE - INTERVAL '1 hour'

UNION ALL

SELECT 
    'FINAL RESULTS' as section,
    'Total Stock' as metric,
    SUM(stock) as count
FROM products 
WHERE is_active = true;