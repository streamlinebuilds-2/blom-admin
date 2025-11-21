-- Add missing columns to bundles table for proper functionality
-- This fixes schema cache errors for bundle editing

-- Add category column if it doesn't exist
ALTER TABLE bundles
ADD COLUMN IF NOT EXISTS category VARCHAR(255) DEFAULT 'Bundle Deals';

-- Add other missing columns that might be needed
ALTER TABLE bundles
ADD COLUMN IF NOT EXISTS hover_image TEXT;

-- Add comments for documentation
COMMENT ON COLUMN bundles.category IS 'Product category for the bundle';
COMMENT ON COLUMN bundles.hover_image IS 'Hover image URL for bundle display';

-- Create index for category queries
CREATE INDEX IF NOT EXISTS idx_bundles_category ON bundles(category);