-- Migration: Add variant_index to order_items table
-- Purpose: Track which specific variant was ordered for stock deduction and display
-- This allows orders to specify exact variants and enables proper inventory management

-- Add variant_index column to order_items table
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS variant_index INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN order_items.variant_index IS 'Index of the variant in the product variants array (NULL for non-variant products)';

-- Create index for efficient querying of variant orders
CREATE INDEX IF NOT EXISTS idx_order_items_variant_index ON order_items(variant_index);

-- Grant necessary permissions
GRANT ALL ON TABLE order_items TO service_role;
GRANT ALL ON TABLE order_items TO anon;
GRANT ALL ON TABLE order_items TO authenticated;