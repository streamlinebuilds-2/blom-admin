-- Bulk Delete Specific Products/Bundles requested by the user
-- This script permanently deletes them from the database if no orders exist,
-- or sets them to 'deleted' status (which is now hidden in the admin)

BEGIN;

-- 1. List of products to delete (based on SKUs provided)
DO $$
DECLARE
    p_skus TEXT[] := ARRAY[
        'ACR-960690', 
        'SKU-Top Coat', 
        'SKU-Nail File (80/80 Grit)', 
        'AUTO-73c7f705', 
        'COURSE:professional-acrylic-training', 
        'SKU-1764755934070-933', 
        'SKU-New Bundle Test', 
        'SKU-Cuticle Oil - Dragon Fruit Lotus', 
        'SKU-Fairy Dust Top Coat - Default', 
        'SKU-Cuticle Oil - Vanilla', 
        'SKU-1764786252349-901', 
        'SKU-Prep & Primer Bundle - Default', 
        'AUTO-cb66b35b', 
        'AUTO-ba29353e', 
        'AUTO-NAILFOR', 
        'AUTO-47a18ad7', 
        'SKU-Test bunle - Default', 
        'SKU-Christmas Watercolor Workshop - Christmas Workshop Package'
    ];
    s TEXT;
BEGIN
    FOREACH s IN ARRAY p_skus LOOP
        -- Try to hard delete first
        DELETE FROM products WHERE sku = s;
        
        -- If hard delete failed (due to FK), soft delete
        IF FOUND THEN
            RAISE NOTICE 'Permanently deleted product with SKU: %', s;
        ELSE
            UPDATE products SET status = 'deleted', is_active = false WHERE sku = s;
            IF FOUND THEN
                RAISE NOTICE 'Soft deleted product with SKU: %', s;
            END IF;
        END IF;
        
        -- Also check bundles just in case some SKUs refer to bundles
        DELETE FROM bundles WHERE sku = s;
        IF NOT FOUND THEN
             UPDATE bundles SET status = 'deleted', is_active = false WHERE sku = s;
        END IF;
    END LOOP;
END $$;

COMMIT;
