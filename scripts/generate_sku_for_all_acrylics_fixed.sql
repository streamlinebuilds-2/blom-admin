-- Fixed SKU Generation for ALL Acrylic Products
-- Simplified and more reliable version

-- Step 1: Check current SKU status
SELECT 
    id, 
    name, 
    sku,
    price,
    stock,
    is_active
FROM 
    products
WHERE 
    (name LIKE 'Core Acrylics%' 
     OR name LIKE 'Colour Acrylics%' 
     OR name LIKE '%Acrylic%')
    AND name NOT LIKE 'z_Trash_%'
ORDER BY 
    name;

-- Step 2: Generate SKUs for Core Acrylics
UPDATE products 
SET sku = 
    CASE
        WHEN name LIKE '%AvanéSignatureNude (071)%' THEN 'ACR-071-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%Barely Blooming Nude (070)%' THEN 'ACR-070-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%Blom Cover Pink (072)%' THEN 'ACR-072-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%Crystal Clear (073)%' THEN 'ACR-073-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%Pearl White (076)%' THEN 'ACR-076-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%Purely White (075)%' THEN 'ACR-075-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%The Perfect Milky White (074)%' THEN 'ACR-074-' || FLOOR(RANDOM() * 900000 + 100000)
        ELSE 'ACR-' || FLOOR(RANDOM() * 900000 + 100000)
    END
WHERE 
    name LIKE 'Core Acrylics - %'
    AND name NOT LIKE 'z_Trash_%'
    AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

-- Step 3: Generate SKUs for Colour Acrylics (simplified approach)
-- First, update specific known colors
UPDATE products 
SET sku = 'CLR-PINK-' || FLOOR(RANDOM() * 900000 + 100000)
WHERE name LIKE '%Colour Acrylics - Pink%' 
AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

UPDATE products 
SET sku = 'CLR-RED-' || FLOOR(RANDOM() * 900000 + 100000)
WHERE name LIKE '%Colour Acrylics - Red%' 
AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

UPDATE products 
SET sku = 'CLR-BLUE-' || FLOOR(RANDOM() * 900000 + 100000)
WHERE name LIKE '%Colour Acrylics - Blue%' 
AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

UPDATE products 
SET sku = 'CLR-GREEN-' || FLOOR(RANDOM() * 900000 + 100000)
WHERE name LIKE '%Colour Acrylics - Green%' 
AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

UPDATE products 
SET sku = 'CLR-YELLOW-' || FLOOR(RANDOM() * 900000 + 100000)
WHERE name LIKE '%Colour Acrylics - Yellow%' 
AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

UPDATE products 
SET sku = 'CLR-PURPLE-' || FLOOR(RANDOM() * 900000 + 100000)
WHERE name LIKE '%Colour Acrylics - Purple%' 
AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

UPDATE products 
SET sku = 'CLR-ORANGE-' || FLOOR(RANDOM() * 900000 + 100000)
WHERE name LIKE '%Colour Acrylics - Orange%' 
AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

UPDATE products 
SET sku = 'CLR-BLACK-' || FLOOR(RANDOM() * 900000 + 100000)
WHERE name LIKE '%Colour Acrylics - Black%' 
AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

UPDATE products 
SET sku = 'CLR-WHITE-' || FLOOR(RANDOM() * 900000 + 100000)
WHERE name LIKE '%Colour Acrylics - White%' 
AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

UPDATE products 
SET sku = 'CLR-GOLD-' || FLOOR(RANDOM() * 900000 + 100000)
WHERE name LIKE '%Colour Acrylics - Gold%' 
AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

UPDATE products 
SET sku = 'CLR-SILVER-' || FLOOR(RANDOM() * 900000 + 100000)
WHERE name LIKE '%Colour Acrylics - Silver%' 
AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

UPDATE products 
SET sku = 'CLR-GLITTER-' || FLOOR(RANDOM() * 900000 + 100000)
WHERE name LIKE '%Colour Acrylics - Glitter%' 
AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

UPDATE products 
SET sku = 'CLR-NEON-' || FLOOR(RANDOM() * 900000 + 100000)
WHERE name LIKE '%Colour Acrylics - Neon%' 
AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

UPDATE products 
SET sku = 'CLR-PASTEL-' || FLOOR(RANDOM() * 900000 + 100000)
WHERE name LIKE '%Colour Acrylics - Pastel%' 
AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

UPDATE products 
SET sku = 'CLR-METALLIC-' || FLOOR(RANDOM() * 900000 + 100000)
WHERE name LIKE '%Colour Acrylics - Metallic%' 
AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

UPDATE products 
SET sku = 'CLR-NUDE-' || FLOOR(RANDOM() * 900000 + 100000)
WHERE name LIKE '%Colour Acrylics - Nude%' 
AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

UPDATE products 
SET sku = 'CLR-CLEAR-' || FLOOR(RANDOM() * 900000 + 100000)
WHERE name LIKE '%Colour Acrylics - Clear%' 
AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

-- Step 4: Generate SKUs for any remaining Colour Acrylics (generic fallback)
UPDATE products 
SET sku = 'CLR-' || FLOOR(RANDOM() * 900000 + 100000)
WHERE name LIKE 'Colour Acrylics%' 
AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

-- Step 5: Generate SKUs for other acrylic products
UPDATE products 
SET sku = 'ACR-' || FLOOR(RANDOM() * 900000 + 100000)
WHERE (name LIKE '%Acrylic%' OR name LIKE '%acrylic%')
AND name NOT LIKE 'Core Acrylics%' 
AND name NOT LIKE 'Colour Acrylics%'
AND name NOT LIKE 'z_Trash_%'
AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

-- Step 6: Generate slugs for all acrylic products
UPDATE products 
SET slug = 
    LOWER(
        REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(
                            REPLACE(
                                REPLACE(
                                    REPLACE(
                                        REPLACE(name, ' ', '-'),
                                        '(', '-'
                                    ),
                                    ')', '-'
                                ),
                                '&', 'and'
                            ),
                            '/', '-'
                        ),
                        '", ''
                    ),
                    '", ''
                ),
                '", ''
            ),
            '", ''
        )
    )
WHERE 
    (name LIKE 'Core Acrylics%' 
     OR name LIKE 'Colour Acrylics%' 
     OR name LIKE '%Acrylic%')
    AND name NOT LIKE 'z_Trash_%'
    AND (slug IS NULL OR slug = '');

-- Step 7: Verify all changes
SELECT 
    id, 
    name, 
    sku,
    slug,
    price,
    stock,
    is_active,
    CASE 
        WHEN sku IS NULL OR sku = '' THEN '❌ Missing SKU'
        WHEN sku LIKE 'SKU-%' THEN '⚠️ Wrong format'
        ELSE '✅ Good SKU'
    END as sku_status
FROM 
    products
WHERE 
    (name LIKE 'Core Acrylics%' 
     OR name LIKE 'Colour Acrylics%' 
     OR name LIKE '%Acrylic%')
    AND name NOT LIKE 'z_Trash_%'
ORDER BY 
    name;

-- Step 8: Summary statistics
SELECT 
    COUNT(*) as total_acrylic_products,
    COUNT(CASE WHEN sku IS NULL OR sku = '' THEN 1 END) as products_without_sku,
    COUNT(CASE WHEN sku LIKE 'SKU-%' THEN 1 END) as products_with_wrong_sku_format,
    COUNT(CASE WHEN sku IS NOT NULL AND sku != '' AND sku NOT LIKE 'SKU-%' THEN 1 END) as products_with_good_sku
FROM 
    products
WHERE 
    (name LIKE 'Core Acrylics%' 
     OR name LIKE 'Colour Acrylics%' 
     OR name LIKE '%Acrylic%')
    AND name NOT LIKE 'z_Trash_%';