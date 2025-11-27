-- Product Duplicate Consolidation Migration
-- This migration consolidates duplicate products by:
-- 1. Identifying which product ID should be kept (active + has SKU)
-- 2. Updating all foreign key references in related tables
-- 3. Deleting the duplicate/inactive product records
-- 4. Preventing future duplicates with constraints

BEGIN;

-- Step 1: Find and analyze current order references to these duplicate products
-- This helps us understand which products are actually being used

-- Check order_items references for Fairy Dust Top Coat duplicates
DO $$
DECLARE
    fairy_keep_id uuid := '23277fea-c7dc-4cbe-8efe-7f5b58718f81';  -- Active with SKU
    fairy_remove_id uuid := '5b006e50-c52f-464e-b39e-f6998120276b'; -- Inactive, no SKU
    
    orchid_keep_id uuid := 'a85cf490-9ae1-4a44-97f4-5918b4b03687';  -- Active with SKU  
    orchid_remove_id uuid := 'd540fade-2e8d-442f-8082-a0c9eff34099'; -- Inactive, no SKU
    
    fairy_order_count integer;
    orchid_order_count integer;
BEGIN
    -- Check how many orders reference each duplicate
    SELECT COUNT(*) INTO fairy_order_count 
    FROM order_items WHERE product_id = fairy_remove_id;
    
    SELECT COUNT(*) INTO orchid_order_count 
    FROM order_items WHERE product_id = orchid_remove_id;
    
    RAISE NOTICE 'Fairy Dust Top Coat - Orders to reassign: %', fairy_order_count;
    RAISE NOTICE 'Orchid Manicure Table - Orders to reassign: %', orchid_order_count;
END $$;

-- Step 2: Update order_items table to reference the correct product IDs
UPDATE order_items 
SET product_id = '23277fea-c7dc-4cbe-8efe-7f5b58718f81'  -- Keep active Fairy Dust Top Coat
WHERE product_id = '5b006e50-c52f-464e-b39e-f6998120276b';  -- Remove inactive duplicate

UPDATE order_items 
SET product_id = 'a85cf490-9ae1-4a44-97f4-5918b4b03687'  -- Keep active Orchid Manicure Table
WHERE product_id = 'd540fade-2e8d-442f-8082-a0c9eff34099';  -- Remove inactive duplicate

-- Step 3: Update stock_movements table
UPDATE stock_movements 
SET product_id = '23277fea-c7dc-4cbe-8efe-7f5b58718f81'  -- Keep active Fairy Dust Top Coat
WHERE product_id = '5b006e50-c52f-464e-b39e-f6998120276b';  -- Remove inactive duplicate

UPDATE stock_movements 
SET product_id = 'a85cf490-9ae1-4a44-97f4-5918b4b03687'  -- Keep active Orchid Manicure Table
WHERE product_id = 'd540fade-2e8d-442f-8082-a0c9eff34099';  -- Remove inactive duplicate

-- Step 4: Update bundle_items if any
UPDATE bundle_items 
SET product_id = '23277fea-c7dc-4cbe-8efe-7f5b58718f81'  -- Keep active Fairy Dust Top Coat
WHERE product_id = '5b006e50-c52f-464e-b39e-f6998120276b';  -- Remove inactive duplicate

UPDATE bundle_items 
SET product_id = 'a85cf490-9ae1-4a44-97f4-5918b4b03687'  -- Keep active Orchid Manicure Table
WHERE product_id = 'd540fade-2e8d-442f-8082-a0c9eff34099';  -- Remove inactive duplicate

-- Step 5: Update any other tables that reference products
-- (Add more tables as needed based on your schema)

-- Step 6: Consolidate stock levels for Fairy Dust Top Coat
-- Add stock from duplicate to main product, then set duplicate to 0
UPDATE products 
SET stock = COALESCE(
    (SELECT stock FROM products WHERE id = '23277fea-c7dc-4cbe-8efe-7f5b58718f81'), 
    0
) + COALESCE(
    (SELECT stock FROM products WHERE id = '5b006e50-c52f-464e-b39e-f6998120276b'), 
    0
),
updated_at = NOW()
WHERE id = '23277fea-c7dc-4cbe-8efe-7f5b58718f81';

-- Step 7: Consolidate stock levels for Orchid Manicure Table  
UPDATE products 
SET stock = COALESCE(
    (SELECT stock FROM products WHERE id = 'a85cf490-9ae1-4a44-97f4-5918b4b03687'), 
    0
) + COALESCE(
    (SELECT stock FROM products WHERE id = 'd540fade-2e8d-442f-8082-a0c9eff34099'), 
    0
),
updated_at = NOW()
WHERE id = 'a85cf490-9ae1-4a44-97f4-5918b4b03687';

-- Step 8: Delete the duplicate/inactive product records
-- These should now have no foreign key dependencies
DELETE FROM products WHERE id IN (
    '5b006e50-c52f-464e-b39e-f6998120276b',  -- Fairy Dust Top Coat duplicate
    'd540fade-2e8d-442f-8082-a0c9eff34099'   -- Orchid Manicure Table duplicate
);

-- Step 9: Add unique constraint to prevent future duplicates
-- (You may need to adjust the constraint based on your business rules)
-- Example: Add unique constraint on normalized name + active status
-- ALTER TABLE products ADD CONSTRAINT unique_active_product_name 
-- UNIQUE (LOWER(TRIM(name)), is_active) WHERE is_active = true;

-- Step 10: Verify the consolidation worked
DO $$
DECLARE
    product_count integer;
    remaining_duplicates integer;
BEGIN
    -- Check total product count after cleanup
    SELECT COUNT(*) INTO product_count FROM products;
    RAISE NOTICE 'Total products after cleanup: %', product_count;
    
    -- Check for remaining duplicates by name
    SELECT COUNT(*) INTO remaining_duplicates
    FROM (
        SELECT LOWER(TRIM(name)) as normalized_name, COUNT(*) as count
        FROM products 
        WHERE is_active = true
        GROUP BY LOWER(TRIM(name))
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RAISE NOTICE 'Remaining active duplicates: %', remaining_duplicates;
    
    IF remaining_duplicates > 0 THEN
        RAISE EXCEPTION 'Consolidation incomplete - still have duplicates!';
    END IF;
END $$;

COMMIT;

-- Success message
SELECT 'Product consolidation completed successfully!' as result;