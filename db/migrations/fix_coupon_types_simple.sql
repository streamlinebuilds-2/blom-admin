-- Simple Coupon Types Fix Migration
-- This focuses only on fixing the type constraint mismatch

-- Step 1: Check current state
SELECT 'Before fix' as status, type, COUNT(*) as count
FROM coupons 
GROUP BY type;

-- Step 2: Update existing percentage types to percent (what code expects)
UPDATE coupons 
SET 
  type = 'percent',
  updated_at = now()
WHERE type = 'percentage';

-- Step 3: Verify update worked
SELECT 'After update' as status, type, COUNT(*) as count
FROM coupons 
GROUP BY type;

-- Step 4: Ensure constraint allows only valid types
-- First drop if exists
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_type_check;

-- Create new constraint with only valid types
ALTER TABLE coupons ADD CONSTRAINT coupons_type_check 
CHECK (type IN ('percent', 'fixed'));

-- Step 5: Verify final state
SELECT 'Final constraint' as status, type, COUNT(*) as count
FROM coupons 
GROUP BY type;

-- Step 6: Test a sample query
SELECT code, type, value, is_active 
FROM coupons 
LIMIT 5;