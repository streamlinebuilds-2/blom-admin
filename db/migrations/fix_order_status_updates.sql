-- Database Migration: Fix Order Status Updates
-- This script ensures the orders table can be updated reliably

-- 1. Ensure status column has proper constraints
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
    
    -- Add a proper check constraint for status values
    ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('unpaid', 'created', 'paid', 'packed', 'out_for_delivery', 'delivered', 'collected', 'cancelled'));
    
    -- Make sure status column can be updated
    ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
    
    -- Ensure updated_at can be updated
    ALTER TABLE orders ALTER COLUMN updated_at SET DEFAULT NOW();
    
    -- Make sure order_packed_at can be nullable
    ALTER TABLE orders ALTER COLUMN order_packed_at DROP NOT NULL;
    
    RAISE NOTICE '✅ Status column constraints updated';
END $$;

-- 2. Create an index for faster status-based queries
CREATE INDEX IF NOT EXISTS idx_orders_status_updated_at 
ON orders(status, updated_at DESC);

-- 3. Create the RPC function for order status updates if it doesn't exist
CREATE OR REPLACE FUNCTION update_order_status(
    p_order_id UUID,
    p_new_status TEXT,
    p_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    id UUID,
    status TEXT,
    updated_at TIMESTAMPTZ,
    order_packed_at TIMESTAMPTZ,
    order_out_for_delivery_at TIMESTAMPTZ,
    fulfilled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_status TEXT;
    v_update_data JSONB;
BEGIN
    -- Get current status
    SELECT status INTO v_old_status FROM orders WHERE id = p_order_id;
    
    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;
    
    -- Build update data based on status
    v_update_data := jsonb_build_object(
        'status', p_new_status,
        'updated_at', p_timestamp
    );
    
    -- Add status-specific timestamps
    CASE p_new_status
        WHEN 'packed' THEN
            v_update_data := v_update_data || jsonb_build_object('order_packed_at', p_timestamp);
        WHEN 'out_for_delivery' THEN
            v_update_data := v_update_data || jsonb_build_object('order_out_for_delivery_at', p_timestamp);
        WHEN 'collected', 'delivered' THEN
            v_update_data := v_update_data || jsonb_build_object('fulfilled_at', p_timestamp);
    END CASE;
    
    -- Perform the update
    UPDATE orders 
    SET 
        status = (v_update_data->>'status')::TEXT,
        updated_at = (v_update_data->>'updated_at')::TIMESTAMPTZ,
        order_packed_at = CASE 
            WHEN v_update_data ? 'order_packed_at' 
            THEN (v_update_data->>'order_packed_at')::TIMESTAMPTZ 
            ELSE order_packed_at 
        END,
        order_out_for_delivery_at = CASE 
            WHEN v_update_data ? 'order_out_for_delivery_at' 
            THEN (v_update_data->>'order_out_for_delivery_at')::TIMESTAMPTZ 
            ELSE order_out_for_delivery_at 
        END,
        fulfilled_at = CASE 
            WHEN v_update_data ? 'fulfilled_at' 
            THEN (v_update_data->>'fulfilled_at')::TIMESTAMPTZ 
            ELSE fulfilled_at 
        END
    WHERE id = p_order_id
    RETURNING id, status, updated_at, order_packed_at, order_out_for_delivery_at, fulfilled_at;
    
    RAISE NOTICE '✅ Order % updated from % to %', p_order_id, v_old_status, p_new_status;
    
    RETURN QUERY
    SELECT id, status, updated_at, order_packed_at, order_out_for_delivery_at, fulfilled_at
    FROM orders
    WHERE id = p_order_id;
    
END $$;

-- 4. Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_order_status(UUID, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION update_order_status(UUID, TEXT, TIMESTAMPTZ) TO authenticated;

-- 5. Test the function with a sample order
DO $$
DECLARE
    test_order_id UUID;
    test_result RECORD;
BEGIN
    -- Find a test order
    SELECT id INTO test_order_id
    FROM orders 
    WHERE status = 'paid' 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF test_order_id IS NOT NULL THEN
        RAISE NOTICE '🧪 Testing update_order_status function with order: %', test_order_id;
        
        BEGIN
            SELECT * INTO test_result
            FROM update_order_status(test_order_id, 'packed');
            
            RAISE NOTICE '✅ Function test successful';
            RAISE NOTICE 'Result: %', test_result;
            
            -- Reset the status back
            UPDATE orders 
            SET status = 'paid', updated_at = NOW(), order_packed_at = NULL 
            WHERE id = test_order_id;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Function test failed: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '⚠️ No paid orders found for testing function';
    END IF;
END $$;

-- 6. Check for any RLS policies that might be blocking updates
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '🔍 Checking RLS policies on orders table...';
    
    FOR policy_record IN
        SELECT schemaname, tablename, policyname, permissive, cmd, qual
        FROM pg_policies 
        WHERE tablename = 'orders'
    LOOP
        RAISE NOTICE 'Policy: % - % (Command: %)', 
            policy_record.policyname, 
            policy_record.permissive, 
            policy_record.cmd;
    END LOOP;
END $$;

-- 7. Final verification
SELECT 
    'Order Status Update Fix Summary' as description,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_orders,
    COUNT(CASE WHEN status = 'packed' THEN 1 END) as packed_orders,
    COUNT(CASE WHEN order_packed_at IS NOT NULL THEN 1 END) as orders_with_packed_timestamp,
    COUNT(CASE WHEN updated_at >= NOW() - INTERVAL '1 day' THEN 1 END) as orders_updated_recently
FROM orders;