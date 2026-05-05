-- Migration: Ensure adjust_stock_for_order RPC function exists and handles variants
-- Purpose: Deduct stock and log movements when an order is paid, including variants
-- Used by: payfast-itn.js webhook

CREATE OR REPLACE FUNCTION adjust_stock_for_order(p_order_id uuid)
RETURNS void AS $
DECLARE
  item RECORD;
BEGIN
  -- Loop through all items in the order
  FOR item IN
    SELECT product_id, quantity, name, variant_index
    FROM order_items
    WHERE order_id = p_order_id
  LOOP
    -- Only process if product_id is present (it should be)
    IF item.product_id IS NOT NULL THEN
      -- Check if this is a variant item
      IF item.variant_index IS NOT NULL AND item.variant_index >= 0 THEN
        -- 1. Update Variant Stock using the variant tracking function
        UPDATE products
        SET variants = jsonb_set(
          variants, 
          ARRAY[item.variant_index::text, 'stock'], 
          to_jsonb((variants->item.variant_index->>'stock')::int - item.quantity)
        )
        WHERE id = item.product_id;

        -- 2. Log Movement with variant info
        INSERT INTO stock_movements (product_id, delta, reason, product_name, order_id, variant_index)
        VALUES (item.product_id, -item.quantity, 'order_fulfillment', item.name, p_order_id, item.variant_index);
      ELSE
        -- 1. Update Product Stock (regular product)
        UPDATE products
        SET stock = stock - item.quantity
        WHERE id = item.product_id;

        -- 2. Log Movement
        INSERT INTO stock_movements (product_id, delta, reason, product_name, order_id)
        VALUES (item.product_id, -item.quantity, 'order_fulfillment', item.name, p_order_id);
      END IF;
    END IF;
  END LOOP;
END;
$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION adjust_stock_for_order(uuid) TO service_role;