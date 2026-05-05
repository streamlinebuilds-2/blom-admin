-- Database Migration: Fix Payment Status Constraint
-- This script investigates and fixes the payment_status constraint issue

-- 1. Check current constraints on the orders table
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass;

-- 2. Check the specific constraint that's failing
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname = 'orders_payment_status_valid'
AND conrelid = 'orders'::regclass;

-- 3. Drop the problematic constraint if it exists
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_valid;
    RAISE NOTICE '✅ Dropped orders_payment_status_valid constraint';
END $$;

-- 4. Add a proper payment_status constraint that allows logical values
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_valid 
CHECK (payment_status IN ('pending', 'paid', 'unpaid', 'failed', 'refunded', 'cancelled'));

-- 5. Update any existing invalid payment_status values
UPDATE orders 
SET payment_status = 'pending' 
WHERE payment_status NOT IN ('pending', 'paid', 'unpaid', 'failed', 'refunded', 'cancelled')
OR payment_status IS NULL;

-- 6. Make payment_status nullable (in case it should be allowed to be null)
ALTER TABLE orders ALTER COLUMN payment_status DROP NOT NULL;

-- 7. Show current order statuses for verification
SELECT 
    id,
    status,
    payment_status,
    created_at,
    updated_at
FROM orders 
WHERE id = '4fc6796e-3b62-4890-8d8d-0e645f6599a3';

-- 8. Final verification
SELECT 
    'Payment Status Fix Summary' as description,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
    COUNT(CASE WHEN payment_status = 'unpaid' THEN 1 END) as unpaid_orders,
    COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_orders
FROM orders;