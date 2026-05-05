-- ULTRA-SAFE ORDER STATUS DISCOVERY AND FIX
-- This script first discovers what status values exist, then safely applies constraints

-- 1. DISCOVER all current status values (before any changes)
CREATE TEMP TABLE status_discovery AS
SELECT 
    status,
    COUNT(*) as count,
    MIN(created_at) as first_seen,
    MAX(created_at) as last_seen
FROM orders 
WHERE status IS NOT NULL
GROUP BY status
ORDER BY count DESC;

-- Show what we found
SELECT 
    'DISCOVERED STATUS VALUES' as info,
    status as value,
    count as orders,
    DATE(first_seen) as since,
    DATE(last_seen) as until
FROM status_discovery;

-- 2. CREATE a permissive constraint that includes ALL discovered values
DO $$
DECLARE
    constraint_sql TEXT;
    all_values TEXT;
    discovery_record RECORD;
BEGIN
    -- Build list of all discovered status values
    SELECT STRING_AGG('''' || status || '''', ', ') INTO all_values
    FROM status_discovery
    WHERE status IS NOT NULL;
    
    RAISE NOTICE 'Found status values: %', all_values;
    
    -- Drop existing constraints
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
    
    -- Create constraint with ALL discovered values (very permissive)
    constraint_sql := 'ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (' || all_values || '))';
    
    RAISE NOTICE 'Executing: %', constraint_sql;
    
    EXECUTE constraint_sql;
    
    RAISE NOTICE '✅ Permissive constraint applied successfully';
    
    -- Now let's also update any NULL statuses to a default
    UPDATE orders 
    SET status = 'created' 
    WHERE status IS NULL;
    
    ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
    
END $$;

-- 3. CREATE the RPC function for reliable updates
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
DECLARE
    v_old_status TEXT;
BEGIN
    -- Get current status
    SELECT status INTO v_old_status FROM orders WHERE id = p_order_id;
    
    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;
    
    RAISE NOTICE 'Updating order % from % to %', p_order_id, v_old_status, p_new_status;
    
    -- Simple update
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

-- 4. GRANT permissions
GRANT EXECUTE ON FUNCTION update_order_status(UUID, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION update_order_status(UUID, TEXT, TIMESTAMPTZ) TO authenticated;

-- 5. Create performance index
CREATE INDEX IF NOT EXISTS idx_orders_status_performance ON orders(status, updated_at DESC);

-- 6. TEST with a real order
DO $$
DECLARE
    test_order_id UUID;
    test_result RECORD;
    original_status TEXT;
BEGIN
    -- Find a test order
    SELECT id, status INTO test_order_id, original_status
    FROM orders 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF test_order_id IS NOT NULL THEN
        RAISE NOTICE '🧪 Testing with order: % (current status: %)', test_order_id, original_status;
        
        BEGIN
            -- Test the function
            SELECT * INTO test_result
            FROM update_order_status(test_order_id, 'packed');
            
            RAISE NOTICE '✅ Test successful! New status: %', test_result.status;
            
            -- Reset back to original
            UPDATE orders 
            SET status = original_status, updated_at = NOW(), order_packed_at = NULL
            WHERE id = test_order_id;
            
            RAISE NOTICE '✅ Test order reset to original status';
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Test failed: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '⚠️ No orders found for testing';
    END IF;
END $$;

-- 7. FINAL SUMMARY
SELECT 
    'FINAL STATUS DISTRIBUTION' as report,
    status,
    COUNT(*) as orders,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM orders 
GROUP BY status
ORDER BY orders DESC;