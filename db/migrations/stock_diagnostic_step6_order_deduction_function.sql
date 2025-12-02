-- Step 6: Create Order Deduction Function
-- Run this in Supabase SQL Editor

-- Simple order processing function
CREATE OR REPLACE FUNCTION process_order_stock_deduction(p_order_id uuid)
RETURNS json AS $$
DECLARE
  item RECORD;
  product_found uuid;
  stock_before integer;
  stock_after integer;
  results json := '[]'::json;
  success_count integer := 0;
  fail_count integer := 0;
BEGIN
  FOR item IN
    SELECT oi.id, oi.product_id, oi.name, oi.quantity
    FROM order_items oi 
    WHERE oi.order_id = p_order_id
  LOOP
    BEGIN
      product_found := item.product_id;
      
      -- If no product_id, try to find by name
      IF product_found IS NULL THEN
        SELECT p.id INTO product_found
        FROM products p 
        WHERE LOWER(p.name) = LOWER(item.name)
        LIMIT 1;
      END IF;
      
      -- If still no match, skip this item
      IF product_found IS NULL THEN
        results := results || json_build_object('item_id', item.id, 'status', 'failed', 'error', 'Product not found')::json;
        fail_count := fail_count + 1;
        CONTINUE;
      END IF;
      
      -- Get current stock and deduct
      SELECT p.stock INTO stock_before FROM products p WHERE p.id = product_found;
      stock_after := stock_before - item.quantity;
      
      UPDATE products SET stock = stock_after WHERE id = product_found;
      
      -- Log the movement
      PERFORM log_stock_movement(product_found, -item.quantity, 'Order deduction: ' || item.name);
      
      results := results || json_build_object('item_id', item.id, 'status', 'success', 'product_id', product_found)::json;
      success_count := success_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      results := results || json_build_object('item_id', item.id, 'status', 'failed', 'error', SQLERRM)::json;
      fail_count := fail_count + 1;
    END;
  END LOOP;
  
  RETURN json_build_object('successful', success_count, 'failed', fail_count, 'results', results);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION process_order_stock_deduction(uuid) TO service_role;

