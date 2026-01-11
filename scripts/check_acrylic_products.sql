-- SQL Script to check the current state of all Acrylic products
-- This helps verify what needs to be updated

SELECT
    id,
    name,
    sku,
    is_active,
    short_description,
    overview,
    description,
    long_description
FROM products
WHERE name ILIKE '%Acrylic%' AND is_active = true
ORDER BY name;