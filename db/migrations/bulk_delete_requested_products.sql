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
        -- Attempt to hard delete first, but handle foreign key exceptions
        BEGIN
            DELETE FROM products WHERE sku = s;
            
            IF FOUND THEN
                RAISE NOTICE 'Permanently deleted product with SKU: %', s;
            ELSE
                -- If not found, try to soft delete (in case it already exists)
                UPDATE products SET status = 'deleted', is_active = false WHERE sku = s;
                IF FOUND THEN
                    RAISE NOTICE 'Soft deleted product with SKU: % (already existed but not hard deletable)', s;
                END IF;
            END IF;
        EXCEPTION WHEN foreign_key_violation THEN
            -- If hard delete fails due to orders, perform soft delete instead
            UPDATE products SET status = 'deleted', is_active = false WHERE sku = s;
            RAISE NOTICE 'Soft deleted product with SKU: % (due to foreign key dependencies)', s;
        END;
        
        -- Also check bundles just in case some SKUs refer to bundles
        BEGIN
            DELETE FROM bundles WHERE sku = s;
            IF NOT FOUND THEN
                 UPDATE bundles SET status = 'deleted', is_active = false WHERE sku = s;
            END IF;
        EXCEPTION WHEN foreign_key_violation THEN
            UPDATE bundles SET status = 'deleted', is_active = false WHERE sku = s;
        END;
    END LOOP;
END $$;

COMMIT;
