-- Stock Management System Fix - Complete Migration Script
-- This script applies all the necessary database changes for the stock management fix

-- ==================================================
-- Part 1: Create/Update Stock Movements Table
-- ==================================================

-- Create stock_movements table if it doesn't exist
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  delta integer NOT NULL, -- Positive for additions, negative for deductions
  reason text NOT NULL DEFAULT 'manual_adjustment',
  product_name text, -- Cached product name for historical reference
  variant_index integer, -- Index of variant if applicable
  movement_type text DEFAULT 'manual', -- 'manual', 'order', 'adjustment'
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_order_id ON stock_movements(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant_index ON stock_movements(variant_index);

-- Grant permissions
GRANT ALL ON TABLE stock_movements TO service_role;
GRANT ALL ON TABLE stock_movements TO anon;
GRANT ALL ON TABLE stock_movements TO authenticated;

-- ==================================================
-- Part 2: Enhanced Stock Logging Function
-- ==================================================

-- Create function to log stock movements with better error handling
CREATE OR REPLACE FUNCTION log_stock_movement(
  p_product_id uuid,
  p_delta integer,
  p_reason text DEFAULT 'manual_adjustment',
  p_order_id uuid DEFAULT NULL,
  p_variant_index integer DEFAULT NULL,
  p_movement_type text DEFAULT 'manual',
  p_notes text DEFAULT NULL
) RETURNS void AS $$
BEGIN
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
    p_product_id,
    p_delta,
    p_reason,
    p_order_id,
    p_variant_index,
    p_movement_type,
    p_notes,
    (SELECT name FROM products WHERE id = p_product_id)
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_stock_movement(uuid, integer, text, uuid, integer, text, text) TO service_role;

-- ==================================================
-- Part 3: Enhanced Order Stock Deduction Function
-- ==================================================

-- Create enhanced function to deduct stock from orders with name matching
CREATE OR REPLACE FUNCTION process_order_stock_deduction(p_order_id uuid)
RETURNS json AS $$
DECLARE
  item RECORD;
  product_rec RECORD;
  stock_before integer;
  stock_after integer;
  deduction_results json := '[]'::json;
  total_processed integer := 0;
  total_failed integer := 0;
BEGIN
  -- Loop through order items
  FOR item IN
    SELECT 
      oi.id,
      oi.product_id,
      oi.name as item_name,
      oi.product_name,
      oi.quantity,
      oi.variant_index,
      oi.variant
    FROM order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    BEGIN
      -- Initialize result for this item
      stock_before := NULL;
      stock_after := NULL;
      product_rec := NULL;
      
      -- Step 1: Try to find product by direct ID match
      IF item.product_id IS NOT NULL THEN
        SELECT id, name, stock, is_active INTO product_rec
        FROM products
        WHERE id = item.product_id AND is_active = true;
      END IF;
      
      -- Step 2: If ID match failed, try name matching
      IF product_rec IS NULL THEN
        -- Normalize the item name for better matching
        WITH normalized_names AS (
          SELECT 
            id,
            name,
            stock,
            is_active,
            -- Create normalized versions for matching
            LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', ' ', 'g'))) as normalized_name,
            LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(item.product_name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', ' ', 'g'))) as item_normalized
          FROM products
          WHERE is_active = true
        )
        SELECT id, name, stock, is_active INTO product_rec
        FROM normalized_names
        WHERE 
          -- Exact name match
          name = item.product_name OR
          name = item.item_name OR
          -- Normalized exact match
          normalized_name = item_normalized OR
          -- Partial matches (if one contains the other)
          normalized_name LIKE '%' || item_normalized || '%' OR
          item_normalized LIKE '%' || normalized_name || '%'
        ORDER BY 
          -- Prioritize exact matches
          CASE WHEN name = item.product_name OR name = item.item_name THEN 1 ELSE 2 END,
          -- Then prioritize normalized matches
          CASE WHEN normalized_name = item_normalized THEN 1 ELSE 2 END,
          -- Finally by length similarity (prefer closer matches)
          ABS(LENGTH(normalized_name) - LENGTH(item_normalized))
        LIMIT 1;
      END IF;
      
      -- If still no match, try fuzzy matching with similar products
      IF product_rec IS NULL THEN
        SELECT id, name, stock, is_active INTO product_rec
        FROM products
        WHERE is_active = true
        ORDER BY 
          -- Use similarity for fuzzy matching
          SIMILARITY(LOWER(TRIM(name)), LOWER(TRIM(item.product_name))) DESC,
          SIMILARITY(LOWER(TRIM(name)), LOWER(TRIM(item.item_name))) DESC
        LIMIT 1;
      END IF;
      
      -- If no product found, log failure
      IF product_rec IS NULL THEN
        deduction_results := deduction_results || json_build_object(
          'item_id', item.id,
          'item_name', item.item_name,
          'quantity', item.quantity,
          'status', 'failed',
          'error', 'No matching product found',
          'product_id', NULL,
          'stock_before', NULL,
          'stock_after', NULL
        )::json;
        total_failed := total_failed + 1;
        CONTINUE;
      END IF;
      
      -- Get current stock before deduction
      stock_before := COALESCE(product_rec.stock, 0);
      
      -- Check if we have enough stock
      IF stock_before < item.quantity THEN
        deduction_results := deduction_results || json_build_object(
          'item_id', item.id,
          'item_name', item.item_name,
          'quantity', item.quantity,
          'status', 'failed',
          'error', 'Insufficient stock (need ' || item.quantity || ', have ' || stock_before || ')',
          'product_id', product_rec.id,
          'stock_before', stock_before,
          'stock_after', stock_before
        )::json;
        total_failed := total_failed + 1;
        CONTINUE;
      END IF;
      
      -- Step 4: Deduct stock
      IF item.variant_index IS NOT NULL AND item.variant_index >= 0 THEN
        -- Handle variant stock deduction
        UPDATE products
        SET variants = jsonb_set(
          variants,
          ARRAY[item.variant_index::text, 'stock'],
          to_jsonb(GREATEST(0, (variants->item.variant_index->>'stock')::int - item.quantity))
        ),
        updated_at = now()
        WHERE id = product_rec.id;
        
        -- Log movement with variant info
        PERFORM log_stock_movement(
          product_rec.id,
          -item.quantity,
          'order_fulfillment',
          p_order_id,
          item.variant_index,
          'order',
          'Stock deduction for order item: ' || item.item_name
        );
      ELSE
        -- Handle regular product stock deduction
        UPDATE products
        SET stock = GREATEST(0, stock - item.quantity),
            updated_at = now()
        WHERE id = product_rec.id;
        
        -- Log movement
        PERFORM log_stock_movement(
          product_rec.id,
          -item.quantity,
          'order_fulfillment',
          p_order_id,
          NULL,
          'order',
          'Stock deduction for order item: ' || item.item_name
        );
      END IF;
      
      -- Get stock after deduction
      stock_after := stock_before - item.quantity;
      
      -- Add success result
      deduction_results := deduction_results || json_build_object(
        'item_id', item.id,
        'item_name', item.item_name,
        'quantity', item.quantity,
        'status', 'success',
        'error', NULL,
        'product_id', product_rec.id,
        'product_name', product_rec.name,
        'stock_before', stock_before,
        'stock_after', stock_after
      )::json;
      
      total_processed := total_processed + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log any unexpected errors
      deduction_results := deduction_results || json_build_object(
        'item_id', item.id,
        'item_name', item.item_name,
        'quantity', item.quantity,
        'status', 'failed',
        'error', SQLERRM,
        'product_id', NULL,
        'stock_before', NULL,
        'stock_after', NULL
      )::json;
      total_failed := total_failed + 1;
    END;
  END LOOP;
  
  -- Return summary
  RETURN json_build_object(
    'order_id', p_order_id,
    'total_items', total_processed + total_failed,
    'successful', total_processed,
    'failed', total_failed,
    'results', deduction_results
  );
  
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_order_stock_deduction(uuid) TO service_role;

-- ==================================================
-- Part 4: Update Basic adjust_stock Function
-- ==================================================

-- Update the basic adjust_stock function to ensure it exists
CREATE OR REPLACE FUNCTION adjust_stock(product_uuid uuid, quantity_to_reduce int)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET stock = stock - quantity_to_reduce
  WHERE id = product_uuid;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION adjust_stock(uuid, int) TO service_role;

-- ==================================================
-- Migration Complete
-- ==================================================

SELECT 'Stock Management System migration completed successfully!' as status;