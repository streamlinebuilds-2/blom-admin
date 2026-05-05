-- Manual Order Status Update Script
-- This script provides manual order status updates for immediate testing

-- Update all orders with specific IDs to 'packed' status
-- Replace the order IDs with actual ones from your orders table

-- Example: Update specific order to 'packed'
-- UPDATE orders 
-- SET 
--   status = 'packed',
--   order_packed_at = NOW(),
--   updated_at = NOW()
-- WHERE id = 'your-order-id-here';

-- Function to safely update order status with validation
CREATE OR REPLACE FUNCTION update_order_status_safe(
  p_order_id UUID,
  p_new_status TEXT,
  p_updated_by TEXT DEFAULT 'admin-manual'
)
RETURNS JSON AS $$
DECLARE
  v_current_status TEXT;
  v_fulfillment_type TEXT;
  v_result JSON;
BEGIN
  -- Get current order data
  SELECT status, fulfillment_type INTO v_current_status, v_fulfillment_type
  FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;
  
  -- Validate status transition
  IF v_current_status = 'paid' AND p_new_status = 'packed' THEN
    -- Valid transition: paid -> packed
    UPDATE orders 
    SET 
      status = p_new_status,
      order_packed_at = NOW(),
      updated_at = NOW(),
      notes = COALESCE(notes, '') || E'\n[Manual Update] Status changed from ' || v_current_status || ' to ' || p_new_status || ' by ' || p_updated_by || ' at ' || NOW()
    WHERE id = p_order_id;
    
  ELSIF v_current_status = 'packed' AND v_fulfillment_type = 'delivery' AND p_new_status = 'out_for_delivery' THEN
    -- Valid transition: packed -> out_for_delivery (delivery)
    UPDATE orders 
    SET 
      status = p_new_status,
      order_out_for_delivery_at = NOW(),
      updated_at = NOW(),
      notes = COALESCE(notes, '') || E'\n[Manual Update] Status changed from ' || v_current_status || ' to ' || p_new_status || ' by ' || p_updated_by || ' at ' || NOW()
    WHERE id = p_order_id;
    
  ELSIF v_current_status = 'packed' AND v_fulfillment_type = 'collection' AND p_new_status = 'collected' THEN
    -- Valid transition: packed -> collected (collection)
    UPDATE orders 
    SET 
      status = p_new_status,
      order_collected_at = NOW(),
      fulfilled_at = NOW(),
      updated_at = NOW(),
      notes = COALESCE(notes, '') || E'\n[Manual Update] Status changed from ' || v_current_status || ' to ' || p_new_status || ' by ' || p_updated_by || ' at ' || NOW()
    WHERE id = p_order_id;
    
  ELSIF v_current_status = 'out_for_delivery' AND p_new_status = 'delivered' THEN
    -- Valid transition: out_for_delivery -> delivered
    UPDATE orders 
    SET 
      status = p_new_status,
      order_delivered_at = NOW(),
      fulfilled_at = NOW(),
      updated_at = NOW(),
      notes = COALESCE(notes, '') || E'\n[Manual Update] Status changed from ' || v_current_status || ' to ' || p_new_status || ' by ' || p_updated_by || ' at ' || NOW()
    WHERE id = p_order_id;
    
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid status transition: ' || v_current_status || ' -> ' || p_new_status);
  END IF;
  
  -- Return success with updated order data
  SELECT json_build_object(
    'success', true,
    'order_id', p_order_id,
    'previous_status', v_current_status,
    'new_status', p_new_status,
    'updated_at', NOW(),
    'fulfillment_type', v_fulfillment_type
  ) INTO v_result;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT update_order_status_safe('your-order-uuid', 'packed', 'manual-test');

-- List recent orders for testing
SELECT 
  id,
  order_number,
  status,
  fulfillment_type,
  buyer_name,
  total_cents,
  created_at,
  updated_at
FROM orders 
WHERE status IN ('paid', 'packed', 'out_for_delivery')
ORDER BY updated_at DESC 
LIMIT 10;