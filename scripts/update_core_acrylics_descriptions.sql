-- SQL Script to update Core Acrylics products with correct descriptions
-- This script sets the standard short description for all Acrylic products

-- Update all Acrylic products with the standard short description
UPDATE products
SET
    short_description = 'All Blom Cosmetics Acrylic powders are self-leveling, non yellowing and buttery to work with.',
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
    description
FROM products
WHERE name ILIKE '%Acrylic%' AND is_active = true
ORDER BY name;