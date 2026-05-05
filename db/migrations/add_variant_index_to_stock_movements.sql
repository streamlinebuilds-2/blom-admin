-- Migration: Add variant_index to stock_movements table
-- Purpose: Track variant-specific stock movements for detailed inventory reporting
-- This enables accurate tracking of which variants are being sold and deducted

-- Add variant_index column to stock_movements table
ALTER TABLE stock_movements
ADD COLUMN IF NOT EXISTS variant_index INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN stock_movements.variant_index IS 'Index of the variant in the product variants array (NULL for non-variant movements)';

-- Create index for efficient querying of variant stock movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant_index ON stock_movements(variant_index);

-- Grant necessary permissions
GRANT ALL ON TABLE stock_movements TO service_role;
GRANT ALL ON TABLE stock_movements TO anon;
GRANT ALL ON TABLE stock_movements TO authenticated;