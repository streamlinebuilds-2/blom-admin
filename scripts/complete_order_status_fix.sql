-- Complete Order Status Fix - Database Setup
-- This script fixes all order status related issues

-- 1. Fix payment_status constraint (remove the consrc column error)
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_valid;
    RAISE NOTICE '✅ Dropped orders_payment_status_valid constraint';
END $$;

-- 2. Add proper payment_status constraint
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_valid 
CHECK (payment_status IN ('pending', 'paid', 'unpaid', 'failed', 'refunded', 'cancelled'));

-- 3. Update any existing invalid payment_status values
UPDATE orders 
SET payment_status = 'pending' 
WHERE payment_status NOT IN ('pending', 'paid', 'unpaid', 'failed', 'refunded', 'cancelled')
OR payment_status IS NULL;

-- 4. Make payment_status nullable
ALTER TABLE orders ALTER COLUMN payment_status DROP NOT NULL;

-- 5. Create the RPC function for order status updates
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

-- 6. Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_order_status(UUID, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION update_order_status(UUID, TEXT, TIMESTAMPTZ) TO authenticated;

-- 7. Test the function with your specific order
DO $$
DECLARE
    test_order_id UUID := '4fc6796e-3b62-4890-8d8d-0e645f6599a3';
    test_result RECORD;
BEGIN
    RAISE NOTICE '🧪 Testing update_order_status function with order: %', test_order_id;
    
    BEGIN
        -- Test update to 'packed'
        SELECT * INTO test_result
        FROM update_order_status(test_order_id, 'packed');
        
        RAISE NOTICE '✅ Function test successful!';
        RAISE NOTICE 'Result: %', test_result;
        
        -- Reset the status back to 'paid' (assuming it was paid before)
        UPDATE orders 
        SET status = 'paid', updated_at = NOW(), order_packed_at = NULL 
        WHERE id = test_order_id;
        
        RAISE NOTICE '✅ Order status reset to original state';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Function test failed: %', SQLERRM;
    END;
END $$;

-- 8. Final verification
SELECT 
    'Complete Order Status Fix Summary' as description,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_orders,
    COUNT(CASE WHEN status = 'packed' THEN 1 END) as packed_orders,
    COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_payment_status,
    COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payment_status
FROM orders;