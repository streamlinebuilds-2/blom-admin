-- SQL script to fix the short_description and overview fields for Core Acrylics products
-- This script ensures that the overview field is empty and the short_description contains the variant description

BEGIN;

-- Step 1: Remove HTML tags from the overview field for Core Acrylics products
UPDATE products
SET
    overview = REGEXP_REPLACE(overview, '<[^>]*>', '', 'g')
WHERE
    name LIKE 'Core Acrylics -%'
    AND is_active = true;

-- Step 2: Update Core Acrylics products to set overview to empty and short_description to the variant description
UPDATE products
SET
    overview = '',
    short_description = 'All Blom Cosmetics Acrylic powders are self-leveling, non-yellowing and buttery to work with.'
WHERE
    name LIKE 'Core Acrylics -%'
    AND is_active = true;

-- Step 3: Ensure that the overview field is empty for all Core Acrylics products
UPDATE products
SET
    overview = ''
WHERE
    name LIKE 'Core Acrylics -%'
    AND is_active = true;

COMMIT;