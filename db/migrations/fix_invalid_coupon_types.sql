r -- Migration: Fix invalid coupon types that violate database constraints
-- Purpose: Clean up any coupons that have invalid type values before constraint fix
-- This should be run to fix existing data before the constraint issue occurs

-- First, identify coupons with invalid types
-- This is informational only, we'll fix them in the next query
DO $$
DECLARE
    invalid_coupon RECORD;
    fixed_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting to fix invalid coupon types...';
    
    -- Update coupons with invalid types to valid ones
    -- Map old invalid types to valid database constraint values
    UPDATE coupons 
    SET 
        type = CASE 
            WHEN type = 'percent' THEN 'percentage'
            WHEN type = 'amount' THEN 'fixed'
            WHEN type = '%' THEN 'percentage'
            ELSE type -- Keep as-is if already valid
        END,
        updated_at = now()
    WHERE type NOT IN ('percentage', 'fixed');
    
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    
    RAISE NOTICE 'Fixed % invalid coupon types', fixed_count;
    
    -- Display any remaining invalid types (for debugging)
    FOR invalid_coupon IN 
        SELECT DISTINCT type, COUNT(*) as count
        FROM coupons 
        WHERE type NOT IN ('percentage', 'fixed')
        GROUP BY type
    LOOP
        RAISE WARNING 'Found % coupons with invalid type: %', invalid_coupon.count, invalid_coupon.type;
    END LOOP;
    
    -- Summary
    IF fixed_count > 0 THEN
        RAISE NOTICE 'Successfully fixed % coupon types. Please verify the data and apply the constraint fix.', fixed_count;
    ELSE
        RAISE NOTICE 'All coupon types are already valid. No fixes needed.';
    END IF;
END $$;