-- Step 2: Clean Up & Reset Functions
-- Run this in Supabase SQL Editor

-- Drop existing functions
DROP FUNCTION IF EXISTS log_stock_movement(uuid, integer, text) CASCADE;
DROP FUNCTION IF EXISTS process_order_stock_deduction(uuid) CASCADE;
DROP FUNCTION IF EXISTS adjust_stock(uuid, int) CASCADE;

-- Create minimal working versions
CREATE OR REPLACE FUNCTION log_stock_movement(
  p_product_id uuid,
  p_delta integer,
  p_reason text
) RETURNS void AS $$
BEGIN
  INSERT INTO stock_movements (
    product_id,
    delta,
    reason,
    created_at
  ) VALUES (
    p_product_id,
    p_delta,
    p_reason,
    now()
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION adjust_stock(product_uuid uuid, quantity_to_reduce int)
RETURNS void AS $$
BEGIN
  UPDATE products SET stock = stock - quantity_to_reduce WHERE id = product_uuid;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_stock_movement(uuid, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION adjust_stock(uuid, int) TO service_role;

