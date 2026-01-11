-- SQL Script to update a specific product by ID
-- Replace the ID with the product you want to update

-- Update Core Acrylics - Crystal Clear (073) specifically
UPDATE products
SET
    short_description = 'All Blom Cosmetics Acrylic powders are self-leveling, non yellowing and buttery to work with.',
    overview = '',
    description = '',
    long_description = '',
    updated_at = NOW()
WHERE id = 'da840e08-d806-48fa-b5a1-30bd2e0e09db';  -- Replace with your product ID

-- Verify the update
SELECT
    id,
    name,
    short_description,
    overview,
    description,
    long_description
FROM products
WHERE id = 'da840e08-d806-48fa-b5a1-30bd2e0e09db';  -- Replace with your product ID