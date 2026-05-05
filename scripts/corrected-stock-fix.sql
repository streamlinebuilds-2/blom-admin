-- CORRECTED STOCK DEDUCTION FOR EXISTING ORDERS
-- First, let's check what columns your stock_movements table actually has

-- Step 1: Check your stock_movements table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'stock_movements' 
ORDER BY ordinal_position;

-- Step 2: Check your orders table structure too
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- Step 3: Check your order_items table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'order_items' 
ORDER BY ordinal_position;

-- Step 4: Check what paid orders you have
SELECT 
    o.id as order_id,
    o.order_number,
    o.status,
    o.created_at,
    o.paid_at,
    o.total_cents,
    COUNT(oi.id) as item_count
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.status = 'paid' 
    AND o.paid_at IS NOT NULL
GROUP BY o.id, o.order_number, o.status, o.created_at, o.paid_at, o.total_cents
ORDER BY o.paid_at DESC
LIMIT 10;

-- Step 5: Process existing paid orders (adjust column names based on your schema)
-- This will be updated once we know your actual column names

DO $$
DECLARE
    paid_order RECORD;
    order_item RECORD;
    product_record RECORD;
    current_stock INTEGER;
    new_stock INTEGER;
    movement_columns TEXT;
    insert_statement TEXT;
BEGIN
    -- First, let's see what columns exist in stock_movements
    SELECT string_agg(column_name, ', ') INTO movement_columns
    FROM information_schema.columns 
    WHERE table_name = 'stock_movements';
    
    RAISE NOTICE 'Stock movements table has columns: %', movement_columns;
    
    -- Loop through all paid orders and process them
    FOR paid_order IN 
        SELECT DISTINCT o.id, o.order_number, o.paid_at
        FROM orders o
        WHERE o.status = 'paid' 
            AND o.paid_at IS NOT NULL
        ORDER BY o.paid_at DESC
        LIMIT 5  -- Process first 5 for testing
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
                    
                    -- Create basic stock movement record
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

-- Step 6: Verify the results - check what we just did
SELECT 
    'Products Updated' as check_type,
    COUNT(*) as count,
    SUM(CASE WHEN updated_at >= CURRENT_DATE THEN 1 ELSE 0 END) as updated_today
FROM products 
WHERE updated_at >= CURRENT_DATE - INTERVAL '1 day';

-- Step 7: Check stock movements created
SELECT 
    'Stock Movements' as check_type,
    COUNT(*) as total_movements,
    SUM(CASE WHEN created_at >= CURRENT_DATE THEN 1 ELSE 0 END) as movements_today
FROM stock_movements 
WHERE created_at >= CURRENT_DATE - INTERVAL '1 day';

-- Step 8: Show products with recent stock changes
SELECT 
    p.name,
    p.stock as current_stock,
    p.updated_at as last_updated
FROM products p
WHERE p.updated_at >= CURRENT_DATE - INTERVAL '1 day'
    AND p.is_active = true
ORDER BY p.updated_at DESC;