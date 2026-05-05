-- Add bundle_products column to bundles table for storing bundle product information
-- This column stores an array of product IDs and quantities that make up a bundle

ALTER TABLE bundles
ADD COLUMN IF NOT EXISTS bundle_products JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN bundles.bundle_products IS 'Array of product IDs and quantities that make up a bundle';

-- Create index for querying bundles
CREATE INDEX IF NOT EXISTS idx_bundles_bundle_products ON bundles USING gin (bundle_products);