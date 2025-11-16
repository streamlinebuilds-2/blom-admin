-- Migration: Add adjust_stock RPC function
-- Purpose: Safely adjust stock for products when orders are completed
-- Used by: payfast-itn.ts webhook to reduce stock for bundles and regular products

CREATE OR REPLACE FUNCTION adjust_stock(product_uuid uuid, quantity_to_reduce int)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET stock = stock - quantity_to_reduce
  WHERE id = product_uuid;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION adjust_stock(uuid, int) TO service_role;
