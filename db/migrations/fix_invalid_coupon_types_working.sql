-- Migration: Fix invalid coupon types (Working Version)
-- Purpose: Update coupons with invalid type values to valid ones
-- This handles the case where a check constraint already exists

-- First, let's see what invalid types we have
DO $$
DECLARE
    invalid_types RECORD;
    fixed_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== Fixing Invalid Coupon Types ===';
    
    -- Display current invalid types
    RAISE NOTICE 'Current invalid types in database:';
    FOR invalid_types IN 
        SELECT type, COUNT(*) as count
        FROM coupons 
        WHERE type NOT IN ('percent', 'fixed')
        GROUP BY type
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '  - Type: %, Count: %', invalid_types.type, invalid_types.count;
    END LOOP;
    
    -- Update invalid types to valid ones
    -- Only update rows that will actually change
    UPDATE coupons 
    SET 
        type = CASE 
            WHEN type = 'percentage' THEN 'percent'
            WHEN type = '%' THEN 'percent'
            WHEN type = 'amount' THEN 'fixed'
            WHEN type = 'percent' THEN 'percent'  -- Already valid
            WHEN type = 'fixed' THEN 'fixed'      -- Already valid
            ELSE 'percent'  -- Default fallback for any other invalid type
        END,
        updated_at = now()
    WHERE type != CASE 
            WHEN type = 'percentage' THEN 'percent'
            WHEN type = '%' THEN 'percent'
            WHEN type = 'amount' THEN 'fixed'
            WHEN type = 'percent' THEN 'percent'
            WHEN type = 'fixed' THEN 'fixed'
            ELSE 'percent'
        END;
    
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    
    RAISE NOTICE 'Updated % coupon records with new type values', fixed_count;
    
    -- Verify no invalid types remain
    IF EXISTS (SELECT 1 FROM coupons WHERE type NOT IN ('percent', 'fixed')) THEN
        RAISE EXCEPTION 'Failed to fix all invalid coupon types';
    ELSE
        RAISE NOTICE 'SUCCESS: All coupon types are now valid (percent or fixed)';
    END IF;
    
    -- Show summary
    RAISE NOTICE '=== Final Summary ===';
    FOR invalid_types IN 
        SELECT type, COUNT(*) as count
        FROM coupons 
        GROUP BY type
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '  Type: %, Count: %', invalid_types.type, invalid_types.count;
    END LOOP;
    
END $$;