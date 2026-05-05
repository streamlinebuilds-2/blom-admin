-- Add updated_at column to product_reviews table
-- This fixes the trigger error: record "new" has no field "updated_at"

-- Add updated_at column if it doesn't exist
ALTER TABLE product_reviews
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create or replace function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_product_reviews_updated_at ON product_reviews;
CREATE TRIGGER update_product_reviews_updated_at
    BEFORE UPDATE ON product_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
