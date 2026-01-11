-- SQL Script to clear all description fields for Acrylic products
-- This script updates all Acrylic products to have empty description fields
-- while keeping the correct short description

-- Update all Acrylic products to clear description fields
UPDATE products
SET
    overview = '',
    description = '',
    long_description = '',
    updated_at = NOW()
WHERE
    name ILIKE '%Acrylic%'
    AND is_active = true;

-- Verify the updates
SELECT
    id,
    name,
    short_description,
    overview,
    description,
    long_description
FROM products
WHERE name ILIKE '%Acrylic%' AND is_active = true
ORDER BY name;