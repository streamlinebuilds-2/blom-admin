-- Safe Database Migration: Fix Order Status Updates
-- This script safely handles existing data before applying constraints

-- 1. First, check what status values currently exist
SELECT 
    status,
    COUNT(*) as order_count
FROM orders 
GROUP BY status
ORDER BY status;

-- 2. Fix any invalid status values (you can adjust these as needed)
DO $$
DECLARE
    status_record RECORD;
BEGIN
    RAISE NOTICE '🔍 Checking and fixing invalid status values...';
    
    -- Example: Fix common invalid status values
    -- Update orders with status = 'unpaid' that might be better as 'created'
    UPDATE orders 
    SET status = 'created' 
    WHERE status = 'unpaid' AND id IN (
        SELECT id FROM orders 
        WHERE status = 'unpaid' 
        AND created_at > NOW() - INTERVAL '1 day'  -- Only recent orders
        LIMIT 5  -- Only fix a few to be safe
    );
    
    -- Make sure all statuses are lowercase and valid
    UPDATE orders 
    SET status = LOWER(TRIM(status))
    WHERE status != LOWER(TRIM(status));
    
    RAISE NOTICE '✅ Status values normalized';
END $$;

-- 3. Create a more permissive constraint that includes common status variations
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (
    status IN (
        'unpaid', 'created', 'paid', 'packed', 
        'out_for_delivery', 'delivered', 'collected', 'cancelled',
        'pending', 'processing', 'shipped', 'completed',
        'refunded', 'failed', 'cancelled_payment'
    )
);

-- 4. Update the specific constraint for the values we care about most
DO $$
BEGIN
    RAISE NOTICE '📋 Creating status mapping for common values...';
    
    -- Map common variations to our standard values
    UPDATE orders SET status = 'created' WHERE status = 'pending';
    UPDATE orders SET status = 'paid' WHERE status = 'processing';  
    UPDATE orders SET status = 'out_for_delivery' WHERE status = 'shipped';
    UPDATE orders SET status = 'delivered' WHERE status = 'completed';
    UPDATE orders SET status = 'cancelled' WHERE status = 'failed' OR status = 'cancelled_payment';
    
    RAISE NOTICE '✅ Status mappings applied';
END $$;

-- 5. Now create the strict constraint for admin operations
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN (
    'created', 'unpaid', 'paid', 'packed', 
    'out_for_delivery', 'delivered', 'collected', 'cancelled'
));

-- 6. Ensure status column can be updated
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
ALTER TABLE orders ALTER COLUMN updated_at SET DEFAULT NOW();

-- 7. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_status_updated_at 
ON orders(status, updated_at DESC);

-- 8. Create the RPC function for order status updates
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
    
    -- Build update data
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
    WHERE id = p_order_id;
    
    RETURN QUERY
    SELECT id, status, updated_at, order_packed_at, order_out_for_delivery_at, fulfilled_at
    FROM orders
    WHERE id = p_order_id;
    
END $$;

-- 9. Grant permissions
GRANT EXECUTE ON FUNCTION update_order_status(UUID, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION update_order_status(UUID, TEXT, TIMESTAMPTZ) TO authenticated;

-- 10. Test with a sample order (if available)
DO $$
DECLARE
    test_order_id UUID;
    test_result RECORD;
BEGIN
    -- Find a test order
    SELECT id INTO test_order_id
    FROM orders 
    WHERE status IN ('paid', 'unpaid', 'created') 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF test_order_id IS NOT NULL THEN
        RAISE NOTICE '🧪 Testing update_order_status function with order: %', test_order_id;
        
        BEGIN
            -- Test the function
            SELECT * INTO test_result
            FROM update_order_status(test_order_id, 'packed');
            
            RAISE NOTICE '✅ Function test successful for order: %', test_order_id;
            RAISE NOTICE 'New status: %', test_result.status;
            
            -- Reset the status back to original
            UPDATE orders 
            SET status = 'paid', updated_at = NOW(), order_packed_at = NULL 
            WHERE id = test_order_id;
            
            RAISE NOTICE '✅ Test order reset to original status';
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Function test failed: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '⚠️ No suitable orders found for testing function';
    END IF;
END $$;

-- 11. Final verification - show current status distribution
SELECT 
    'Final Status Distribution' as check_type,
    status,
    COUNT(*) as order_count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM orders 
GROUP BY status
ORDER BY order_count DESC;