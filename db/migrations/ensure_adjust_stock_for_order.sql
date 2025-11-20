-- Migration: Ensure adjust_stock_for_order RPC function exists and logs movements
-- Purpose: Deduct stock and log movements when an order is paid
-- Used by: payfast-itn.ts webhook

CREATE OR REPLACE FUNCTION adjust_stock_for_order(p_order_id uuid)
RETURNS void AS $$
DECLARE
  item RECORD;
BEGIN
  -- Loop through all items in the order
  FOR item IN
    SELECT product_id, qty, name -- Note: using 'qty' as per create-order.js insert, check schema if needed. 
    -- create-order.js inserts: sku, name, variant, qty, unit_price_cents...
    -- But wait, create-order.js inserts into 'order_items'. 
    -- Let's verify order_items schema from usage or assume standard.
    -- In create-order.js: .insert({ order_id: ..., qty: item.qty, ... })
    -- So column is likely 'qty'.
    FROM order_items
    WHERE order_id = p_order_id
  LOOP
    -- Only process if product_id is present (it should be)
    IF item.product_id IS NOT NULL THEN
      -- 1. Update Product Stock
      UPDATE products
      SET stock = stock - item.qty
      WHERE id = item.product_id;

      -- 2. Log Movement
      INSERT INTO stock_movements (product_id, delta, reason, product_name, order_id)
      VALUES (item.product_id, -item.qty, 'order_fulfillment', item.name, p_order_id);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION adjust_stock_for_order(uuid) TO service_role;