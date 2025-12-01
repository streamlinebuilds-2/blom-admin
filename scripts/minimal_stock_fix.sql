-- Minimal Stock Management Fix
-- Simple version that avoids complex function conflicts

-- ==================================================
-- Part 1: Add Missing Columns
-- ==================================================

-- Add missing columns safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'variant_index') THEN
        ALTER TABLE stock_movements ADD COLUMN variant_index INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'movement_type') THEN
        ALTER TABLE stock_movements ADD COLUMN movement_type text DEFAULT 'manual';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'notes') THEN
        ALTER TABLE stock_movements ADD COLUMN notes text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'product_name') THEN
        ALTER TABLE stock_movements ADD COLUMN product_name text;
    END IF;
END
$$;

-- ==================================================
-- Part 2: Simple Stock Deduction Function
-- ==================================================

-- Drop and recreate with minimal functionality
DROP FUNCTION IF EXISTS process_order_stock_deduction(uuid);

CREATE OR REPLACE FUNCTION process_order_stock_deduction(order_uuid uuid)
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
  -- Process each order item
  FOR item IN
    SELECT oi.id, oi.product_id, oi.name, oi.product_name, oi.quantity, oi.variant_index
    FROM order_items oi 
    WHERE oi.order_id = order_uuid
  LOOP
    BEGIN
      product_found := NULL;
      stock_before := 0;
      stock_after := 0;
      
      -- Try to find product by ID first
      IF item.product_id IS NOT NULL THEN
        SELECT p.id, p.stock INTO product_found, stock_before
        FROM products p 
        WHERE p.id = item.product_id AND p.is_active = true;
      END IF;
      
      -- If no product found by ID, try by name
      IF product_found IS NULL THEN
        SELECT p.id, p.stock INTO product_found, stock_before
        FROM products p 
        WHERE p.is_active = true 
        AND LOWER(p.name) = LOWER(item.product_name)
        LIMIT 1;
      END IF;
      
      -- If still no match, try partial name match
      IF product_found IS NULL THEN
        SELECT p.id, p.stock INTO product_found, stock_before
        FROM products p 
        WHERE p.is_active = true 
        AND LOWER(p.name) LIKE '%' || LOWER(item.product_name) || '%'
        LIMIT 1;
      END IF;
      
      -- If product still not found, mark as failed
      IF product_found IS NULL THEN
        results := results || json_build_object(
          'item_id', item.id,
          'status', 'failed',
          'error', 'Product not found: ' || item.product_name
        )::json;
        fail_count := fail_count + 1;
        CONTINUE;
      END IF;
      
      -- Check if enough stock
      IF stock_before < item.quantity THEN
        results := results || json_build_object(
          'item_id', item.id,
          'status', 'failed',
          'error', 'Insufficient stock: need ' || item.quantity || ', have ' || stock_before
        )::json;
        fail_count := fail_count + 1;
        CONTINUE;
      END IF;
      
      -- Deduct stock
      stock_after := stock_before - item.quantity;
      UPDATE products SET stock = stock_after WHERE id = product_found;
      
      -- Log movement
      INSERT INTO stock_movements (
        product_id,
        delta,
        reason,
        order_id,
        variant_index,
        movement_type,
        notes,
        product_name
      ) VALUES (
        product_found,
        -item.quantity,
        'order_fulfillment',
        order_uuid,
        item.variant_index,
        'order',
        'Stock deduction for order item: ' || item.product_name,
        item.product_name
      );
      
      -- Add success result
      results := results || json_build_object(
        'item_id', item.id,
        'status', 'success',
        'product_id', product_found,
        'stock_before', stock_before,
        'stock_after', stock_after
      )::json;
      
      success_count := success_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      results := results || json_build_object(
        'item_id', item.id,
        'status', 'failed',
        'error', SQLERRM
      )::json;
      fail_count := fail_count + 1;
    END;
  END LOOP;
  
  -- Return summary
  RETURN json_build_object(
    'order_id', order_uuid,
    'total_items', success_count + fail_count,
    'successful', success_count,
    'failed', fail_count,
    'results', results
  );
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- Part 3: Simple Stock Adjustment Function
-- ==================================================

DROP FUNCTION IF EXISTS log_stock_movement(uuid, integer, text);

CREATE OR REPLACE FUNCTION log_stock_movement(p_product_id uuid, p_delta integer, p_reason text)
RETURNS void AS $$
BEGIN
  INSERT INTO stock_movements (
    product_id,
    delta,
    reason,
    movement_type,
    notes,
    product_name
  ) VALUES (
    p_product_id,
    p_delta,
    p_reason,
    'manual',
    p_reason,
    (SELECT name FROM products WHERE id = p_product_id)
  );
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- Part 4: Basic adjust_stock function
-- ==================================================

DROP FUNCTION IF EXISTS adjust_stock(uuid, int);

CREATE OR REPLACE FUNCTION adjust_stock(product_uuid uuid, quantity_to_reduce int)
RETURNS void AS $$
BEGIN
  UPDATE products SET stock = stock - quantity_to_reduce WHERE id = product_uuid;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- Grant Permissions
-- ==================================================

GRANT EXECUTE ON FUNCTION process_order_stock_deduction(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION log_stock_movement(uuid, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION adjust_stock(uuid, int) TO service_role;

-- ==================================================
-- Complete
-- ==================================================

SELECT 'Minimal Stock Management fix completed successfully!' as status;