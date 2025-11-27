-- Migration: Fix invalid coupon types (Complete Working Version)
-- Purpose: Safely update coupons with invalid type values while handling constraints
-- This script temporarily disables the check constraint, updates data, then re-enables it

DO $$
DECLARE
    invalid_types RECORD;
    fixed_count INTEGER := 0;
    constraint_exists BOOLEAN;
BEGIN
    RAISE NOTICE '=== Starting Coupon Type Fix Migration ===';
    
    -- Step 1: Display current invalid types
    RAISE NOTICE 'Step 1: Identifying invalid coupon types...';
    FOR invalid_types IN 
        SELECT type, COUNT(*) as count
        FROM coupons 
        WHERE type NOT IN ('percent', 'fixed')
        GROUP BY type
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '  Found % coupons with invalid type: %', invalid_types.count, invalid_types.type;
    END LOOP;
    
    -- Step 2: Check if constraint exists and temporarily disable it
    RAISE NOTICE 'Step 2: Temporarily disabling check constraint...';
    
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.check_constraints 
        WHERE constraint_name = 'coupons_type_check'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE '  Dropping existing check constraint...';
        ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_type_check;
    ELSE
        RAISE NOTICE '  No existing check constraint found';
    END IF;
    
    -- Step 3: Update invalid types to valid ones
    RAISE NOTICE 'Step 3: Updating invalid coupon types...';
    
    UPDATE coupons 
    SET 
        type = CASE 
            WHEN type = 'percentage' THEN 'percent'
            WHEN type = '%' THEN 'percent'
            WHEN type = 'amount' THEN 'fixed'
            WHEN type = 'r' THEN 'fixed'
            WHEN type = 'rand' THEN 'fixed'
            WHEN type = 'percent' THEN 'percent'  -- Already valid
            WHEN type = 'fixed' THEN 'fixed'      -- Already valid
            ELSE 'percent'  -- Default fallback for any other invalid type
        END,
        updated_at = now()
    WHERE type NOT IN ('percent', 'fixed');
    
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    
    RAISE NOTICE '  Updated % coupon records with new type values', fixed_count;
    
    -- Step 4: Re-enable the check constraint
    RAISE NOTICE 'Step 4: Re-enabling check constraint...';
    ALTER TABLE coupons ADD CONSTRAINT coupons_type_check 
    CHECK (type IN ('percent', 'fixed'));
    
    RAISE NOTICE '  Check constraint re-enabled';
    
    -- Step 5: Verify all types are now valid
    RAISE NOTICE 'Step 5: Verifying data integrity...';
    
    IF EXISTS (SELECT 1 FROM coupons WHERE type NOT IN ('percent', 'fixed')) THEN
        RAISE EXCEPTION 'Migration failed: Invalid coupon types still exist after update';
    ELSE
        RAISE NOTICE '  SUCCESS: All coupon types are now valid (percent or fixed)';
    END IF;
    
    -- Step 6: Display summary
    RAISE NOTICE '=== Migration Summary ===';
    RAISE NOTICE 'Total coupons processed: %', fixed_count;
    RAISE NOTICE 'Final type distribution:';
    FOR invalid_types IN 
        SELECT type, COUNT(*) as count
        FROM coupons 
        GROUP BY type
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '  - Type: %, Count: %', invalid_types.type, invalid_types.count;
    END LOOP;
    
    RAISE NOTICE '=== Migration Completed Successfully ===';
    
END $$;