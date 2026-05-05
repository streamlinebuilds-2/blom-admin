-- PRODUCT DUPLICATE CONSOLIDATION - MANUAL MIGRATION
-- This script fixes the root cause of your stock deduction and analytics issues
-- Run this in your Supabase SQL editor or via psql

BEGIN;

-- Step 1: Check current duplicates (for verification)
SELECT 
  LOWER(TRIM(name)) as normalized_name, 
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as product_ids,
  STRING_AGG(CASE WHEN is_active THEN 'ACTIVE' ELSE 'INACTIVE' END, ', ') as status
FROM products 
WHERE is_active = true
GROUP BY LOWER(TRIM(name))
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 2: Update order_items references for Fairy Dust Top Coat duplicates
-- This consolidates all orders to reference the active product with SKU
UPDATE order_items 
SET product_id = '23277fea-c7dc-4cbe-8efe-7f5b58718f81'  -- Keep active Fairy Dust Top Coat
WHERE product_id = '5b006e50-c52f-464e-b39e-f6998120276b';  -- Remove inactive duplicate

-- Step 3: Update order_items references for Orchid Manicure Table duplicates
UPDATE order_items 
SET product_id = 'a85cf490-9ae1-4a44-97f4-5918b4b03687'  -- Keep active Orchid Manicure Table
WHERE product_id = 'd540fade-2e8d-442f-8082-a0c9eff34099';  -- Remove inactive duplicate

-- Step 4: Update stock_movements references for Fairy Dust Top Coat
UPDATE stock_movements 
SET product_id = '23277fea-c7dc-4cbe-8efe-7f5b58718f81'  -- Keep active Fairy Dust Top Coat
WHERE product_id = '5b006e50-c52f-464e-b39e-f6998120276b';  -- Remove inactive duplicate

-- Step 5: Update stock_movements references for Orchid Manicure Table
UPDATE stock_movements 
SET product_id = 'a85cf490-9ae1-4a44-97f4-5918b4b03687'  -- Keep active Orchid Manicure Table
WHERE product_id = 'd540fade-2e8d-442f-8082-a0c9eff34099';  -- Remove inactive duplicate

-- Step 6: Update bundle_items references for Fairy Dust Top Coat
UPDATE bundle_items 
SET product_id = '23277fea-c7dc-4cbe-8efe-7f5b58718f81'  -- Keep active Fairy Dust Top Coat
WHERE product_id = '5b006e50-c52f-464e-b39e-f6998120276b';  -- Remove inactive duplicate

-- Step 7: Update bundle_items references for Orchid Manicure Table
UPDATE bundle_items 
SET product_id = 'a85cf490-9ae1-4a44-97f4-5918b4b03687'  -- Keep active Orchid Manicure Table
WHERE product_id = 'd540fade-2e8d-442f-8082-a0c9eff34099';  -- Remove inactive duplicate

-- Step 8: Consolidate stock levels for Fairy Dust Top Coat
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

-- Step 9: Consolidate stock levels for Orchid Manicure Table
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

-- Step 10: Delete the duplicate/inactive product records
DELETE FROM products WHERE id IN (
    '5b006e50-c52f-464e-b39e-f6998120276b',  -- Fairy Dust Top Coat duplicate
    'd540fade-2e8d-442f-8082-a0c9eff34099'   -- Orchid Manicure Table duplicate
);

-- Step 11: Verify the consolidation worked
SELECT 
    (SELECT COUNT(*) FROM products WHERE is_active = true) as total_active_products,
    (SELECT COUNT(*) FROM (
        SELECT LOWER(TRIM(name)) as normalized_name, COUNT(*) as count
        FROM products 
        WHERE is_active = true
        GROUP BY LOWER(TRIM(name))
        HAVING COUNT(*) > 1
    ) duplicates) as remaining_duplicates,
    (SELECT COUNT(*) FROM order_items WHERE product_id = '23277fea-c7dc-4cbe-8efe-7f5b58718f81') as fairy_dust_orders,
    (SELECT COUNT(*) FROM order_items WHERE product_id = 'a85cf490-9ae1-4a44-97f4-5918b4b03687') as orchid_table_orders;

COMMIT;

-- SUCCESS MESSAGE
SELECT 'Product duplicate consolidation completed successfully! Stock deduction and analytics should now work.' as result;