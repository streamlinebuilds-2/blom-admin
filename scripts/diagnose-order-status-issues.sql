-- SQL Script: Diagnose Order Status Update Issues
-- This script helps identify why order status updates might not be working

-- 1. Check recent orders and their current status
SELECT 
    o.id,
    o.order_number,
    o.status,
    o.fulfillment_type,
    o.created_at,
    o.updated_at,
    o.order_packed_at,
    CASE 
        WHEN o.created_at < NOW() - INTERVAL '7 days' THEN 'Historical (7+ days)'
        WHEN o.created_at < NOW() - INTERVAL '1 day' THEN 'Recent (1-7 days)'
        ELSE 'Very Recent (24h)'
    END as order_age
FROM orders o
WHERE o.status IN ('paid', 'packed', 'unpaid')
ORDER BY o.created_at DESC
LIMIT 10;

-- 2. Check orders table structure to understand status column
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
    AND column_name IN ('status', 'updated_at', 'order_packed_at')
ORDER BY column_name;

-- 3. Test direct status update on a recent paid order
DO $$
DECLARE
    test_order_id UUID;
    test_status_before TEXT;
    test_status_after TEXT;
BEGIN
    -- Get a recent paid order for testing
    SELECT id, status INTO test_order_id, test_status_before
    FROM orders 
    WHERE status = 'paid' 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF test_order_id IS NULL THEN
        RAISE NOTICE 'No paid orders found for testing';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing with Order ID: % (Current Status: %)', test_order_id, test_status_before;
    
    -- Test 1: Standard update
    BEGIN
        UPDATE orders 
        SET 
            status = 'packed',
            updated_at = NOW(),
            order_packed_at = NOW()
        WHERE id = test_order_id
        RETURNING status, updated_at, order_packed_at;
        
        RAISE NOTICE '✅ Standard update successful';
        
        -- Reset status back
        UPDATE orders 
        SET 
            status = test_status_before,
            updated_at = NOW(),
            order_packed_at = NULL
        WHERE id = test_order_id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Standard update failed: %', SQLERRM;
    END;
    
    -- Test 2: Check if there are any triggers preventing updates
    RAISE NOTICE '🔍 Checking for triggers on orders table...';
    
END $$;

-- 4. Check for any triggers that might interfere
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'orders';

-- 5. Check RLS policies that might block updates
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'orders';

-- 6. Check current permissions on orders table
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'orders';

-- 7. Test the RPC function if it exists
-- Note: This will show if the RPC function exists
SELECT 
    proname,
    prosrc
FROM pg_proc 
WHERE proname = 'update_order_status';

-- 8. Create a simple test to verify status field can be updated
-- This simulates what the Netlify function is trying to do
DO $$
DECLARE
    test_order_id UUID;
    result_status TEXT;
BEGIN
    -- Find a test order
    SELECT id INTO test_order_id
    FROM orders 
    WHERE status = 'paid' 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF test_order_id IS NULL THEN
        RAISE NOTICE 'No orders available for testing';
        RETURN;
    END IF;
    
    RAISE NOTICE '🧪 Running direct status update test on order: %', test_order_id;
    
    -- Direct update test
    UPDATE orders 
    SET 
        status = 'packed',
        updated_at = NOW(),
        order_packed_at = NOW()
    WHERE id = test_order_id
    RETURNING status, updated_at, order_packed_at INTO result_status;
    
    -- Reset to original status
    UPDATE orders 
    SET 
        status = 'paid',
        updated_at = NOW(),
        order_packed_at = NULL
    WHERE id = test_order_id;
    
    RAISE NOTICE '✅ Direct update test passed. Result: %', result_status;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Direct update test failed: %', SQLERRM;
END $$;

-- 9. Check for any constraint violations
SELECT 
    conname,
    contype,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass;

-- 10. Final summary query
SELECT 
    'Orders Table Analysis' as check_type,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_orders,
    COUNT(CASE WHEN status = 'packed' THEN 1 END) as packed_orders,
    COUNT(CASE WHEN order_packed_at IS NOT NULL THEN 1 END) as orders_with_packed_timestamp
FROM orders;