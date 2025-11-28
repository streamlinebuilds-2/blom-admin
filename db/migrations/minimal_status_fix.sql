-- MINIMAL ORDER STATUS FIX - No Constraints
-- This script ONLY focuses on making status updates work without adding constraints

-- 1. Just create the RPC function for updates (no constraints)
CREATE OR REPLACE FUNCTION update_order_status(
    p_order_id UUID,
    p_new_status TEXT,
    p_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    id UUID,
    status TEXT,
    updated_at TIMESTAMPTZ,
    order_packed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Simple update without constraints
    UPDATE orders 
    SET 
        status = p_new_status,
        updated_at = p_timestamp,
        order_packed_at = CASE WHEN p_new_status = 'packed' THEN p_timestamp ELSE order_packed_at END
    WHERE id = p_order_id
    RETURNING id, status, updated_at, order_packed_at;
    
    RETURN QUERY
    SELECT id, status, updated_at, order_packed_at
    FROM orders
    WHERE id = p_order_id;
    
END $$;

-- 2. Grant permissions
GRANT EXECUTE ON FUNCTION update_order_status(UUID, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION update_order_status(UUID, TEXT, TIMESTAMPTZ) TO authenticated;

-- 3. Create a simple index for performance (optional)
CREATE INDEX IF NOT EXISTS idx_orders_status_simple ON orders(status, updated_at);

-- 4. Test the function
DO $$
DECLARE
    test_order_id UUID;
    test_result RECORD;
BEGIN
    -- Find any order to test with
    SELECT id INTO test_order_id
    FROM orders 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF test_order_id IS NOT NULL THEN
        RAISE NOTICE '🧪 Testing simple status update on order: %', test_order_id;
        
        BEGIN
            -- Test the function
            SELECT * INTO test_result
            FROM update_order_status(test_order_id, 'packed');
            
            RAISE NOTICE '✅ Simple test successful - status: %', test_result.status;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Simple test failed: %', SQLERRM;
        END;
    END IF;
END $$;

-- 5. Show current orders to verify we can work with them
SELECT 
    order_number,
    status,
    created_at,
    updated_at
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;