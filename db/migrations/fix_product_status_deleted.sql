-- Fix Product Status Constraint to allow 'deleted'
-- This script fixes the soft-delete issue where 'deleted' status was not allowed

-- 1. Check current constraints on the products table (for reference)
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'products'::regclass AND conname = 'products_status_check';

-- 2. Drop the existing constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;

-- 3. Add the updated constraint that includes 'deleted'
-- We include all current statuses: active, draft, archived, published, plus 'deleted'
ALTER TABLE products ADD CONSTRAINT products_status_check 
CHECK (status IN ('active', 'draft', 'archived', 'deleted', 'published'));

-- 4. Also check the bundles table status constraint
ALTER TABLE bundles DROP CONSTRAINT IF EXISTS bundles_status_check;
ALTER TABLE bundles ADD CONSTRAINT bundles_status_check 
CHECK (status IN ('active', 'draft', 'archived', 'deleted', 'published'));

-- 5. Create index on status for better filtering performance
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_bundles_status ON bundles(status);

-- 6. Verification query
SELECT 
    status, 
    COUNT(*) as count 
FROM products 
GROUP BY status;
