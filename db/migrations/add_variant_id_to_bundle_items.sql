-- Migration: Add variant_id to bundle_items table
-- Purpose: Support variant selection in bundle products
-- This allows bundles to specify exact variants of products to include

-- Add variant_id column to bundle_items table
ALTER TABLE bundle_items
ADD COLUMN IF NOT EXISTS variant_id INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN bundle_items.variant_id IS 'Index of the variant in the product variants array';

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_bundle_items_variant_id ON bundle_items(variant_id);

-- Grant necessary permissions
GRANT ALL ON TABLE bundle_items TO service_role;
GRANT ALL ON TABLE bundle_items TO anon;
GRANT ALL ON TABLE bundle_items TO authenticated;