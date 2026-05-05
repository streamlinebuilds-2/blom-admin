-- SQL Script to check ONLY the 7 Core Acrylics variants
-- This helps verify the current state of these specific products

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
WHERE name LIKE 'Core Acrylics - %' AND name LIKE '%(%'
ORDER BY name;