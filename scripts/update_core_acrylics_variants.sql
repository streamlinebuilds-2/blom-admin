-- SQL Script to update ONLY the 7 Core Acrylics variants
-- This targets specifically the products with names like "Core Acrylics - [Variant] (###)"

-- Update all Core Acrylics variants with the standard description
UPDATE products
SET
    short_description = 'All Blom Cosmetics Acrylic powders are self-leveling, non yellowing and buttery to work with.',
    overview = '',
    description = '',
    long_description = '',
    updated_at = NOW()
WHERE
    name LIKE 'Core Acrylics - %'
    AND name LIKE '%(%';

-- Verify the updates for Core Acrylics variants only
SELECT
    id,
    name,
    sku,
    short_description,
    overview,
    description,
    long_description
FROM products
WHERE name LIKE 'Core Acrylics - %' AND name LIKE '%(%'
ORDER BY name;