-- Add bundle_products column to products table for storing bundle product information
-- This column stores an array of product IDs and quantities that make up a bundle

ALTER TABLE products
ADD COLUMN IF NOT EXISTS bundle_products JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN products.bundle_products IS 'Array of product IDs and quantities that make up a bundle (for product_type = bundle)';

-- Create index for querying bundles
CREATE INDEX IF NOT EXISTS idx_products_bundle_products ON products USING gin (bundle_products);
