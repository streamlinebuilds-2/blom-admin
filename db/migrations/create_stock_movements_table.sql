-- Migration: Create stock_movements table
-- Purpose: Track all stock changes for inventory management

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

-- Grant permissions
GRANT ALL ON TABLE stock_movements TO service_role;
GRANT ALL ON TABLE stock_movements TO anon;
GRANT ALL ON TABLE stock_movements TO authenticated;
GRANT EXECUTE ON FUNCTION log_stock_movement(uuid, integer, text, uuid, integer, text, text) TO service_role;