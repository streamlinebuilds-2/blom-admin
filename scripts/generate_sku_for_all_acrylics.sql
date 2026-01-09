-- Comprehensive SKU Generation for ALL Acrylic Products
-- This script generates proper SKUs for Core Acrylics AND Colour Acrylics

-- Step 1: Check current SKU status for all acrylic products
SELECT 
    id, 
    name, 
    sku,
    price,
    stock,
    is_active,
    created_at
FROM 
    products
WHERE 
    (name LIKE 'Core Acrylics%' 
     OR name LIKE 'Colour Acrylics%' 
     OR name LIKE 'Acrylic%' 
     OR name LIKE '%Acrylic%')
    AND name NOT LIKE 'z_Trash_%'
ORDER BY 
    name;

-- Step 2: Generate SKUs for Core Acrylics (if still needed)
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
    AND name NOT LIKE '%003'
    AND name NOT LIKE '%035'
    AND name NOT LIKE '%Default'
    AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

-- Step 3: Generate SKUs for Colour Acrylics
-- Pattern: CLR-[ColorName]-XXXXXX (CLR = Colour, then color name, then random number)
UPDATE products 
SET sku = 
    CASE
        -- Match common colour names and generate appropriate SKUs
        WHEN name LIKE '%Colour Acrylics - Pink%' THEN 'CLR-PINK-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%Colour Acrylics - Red%' THEN 'CLR-RED-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%Colour Acrylics - Blue%' THEN 'CLR-BLUE-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%Colour Acrylics - Green%' THEN 'CLR-GREEN-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%Colour Acrylics - Yellow%' THEN 'CLR-YELLOW-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%Colour Acrylics - Purple%' THEN 'CLR-PURPLE-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%Colour Acrylics - Orange%' THEN 'CLR-ORANGE-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%Colour Acrylics - Black%' THEN 'CLR-BLACK-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%Colour Acrylics - White%' THEN 'CLR-WHITE-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%Colour Acrylics - Gold%' THEN 'CLR-GOLD-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%Colour Acrylics - Silver%' THEN 'CLR-SILVER-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%Colour Acrylics - Glitter%' THEN 'CLR-GLITTER-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%Colour Acrylics - Neon%' THEN 'CLR-NEON-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%Colour Acrylics - Pastel%' THEN 'CLR-PASTEL-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%Colour Acrylics - Metallic%' THEN 'CLR-METALLIC-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%Colour Acrylics - Nude%' THEN 'CLR-NUDE-' || FLOOR(RANDOM() * 900000 + 100000)
        WHEN name LIKE '%Colour Acrylics - Clear%' THEN 'CLR-CLEAR-' || FLOOR(RANDOM() * 900000 + 100000)
        -- Generic fallback for any other colour acrylics
        WHEN name LIKE 'Colour Acrylics - %' THEN 'CLR-' || 
            UPPER(
                REPLACE(
                    REPLACE(
                        REPLACE(
                            REPLACE(
                                REPLACE(
                                    REPLACE(
                                        REPLACE(
                                            REPLACE(
                                                REPLACE(
                                                    REPLACE(
                                                        SPLIT_PART(name, '-', 3),
                                                        ' ', '-'
                                                    ),
                                                    '(', ''
                                                ),
                                                ')', ''
                                            ),
                                            '&', ''
                                        ),
                                        '/', ''
                                    ),
                                    '", ''
                                ),
                                '", ''
                            ),
                            '", ''
                        ),
                        '", ''
                    ),
                    '", ''
                )
            ) || '-' || FLOOR(RANDOM() * 900000 + 100000)
        ELSE 'CLR-' || FLOOR(RANDOM() * 900000 + 100000)
    END
WHERE 
    name LIKE 'Colour Acrylics%' 
    AND name NOT LIKE 'z_Trash_%'
    AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

-- Step 4: Generate SKUs for any other acrylic products
UPDATE products 
SET sku = 
    CASE
        WHEN name LIKE '%Acrylic%' AND name NOT LIKE 'Core Acrylics%' AND name NOT LIKE 'Colour Acrylics%' THEN 
            'ACR-' || 
            UPPER(
                REPLACE(
                    REPLACE(
                        REPLACE(
                            REPLACE(
                                REPLACE(
                                    REPLACE(
                                        REPLACE(
                                            REPLACE(
                                                REPLACE(
                                                    REPLACE(
                                                        name,
                                                        ' ', '-'
                                                    ),
                                                    '(', ''
                                                ),
                                                ')', ''
                                            ),
                                            '&', ''
                                        ),
                                        '/', ''
                                    ),
                                    '", ''
                                ),
                                '", ''
                            ),
                            '", ''
                        ),
                        '", ''
                    ),
                    '", ''
                )
            ) || '-' || FLOOR(RANDOM() * 900000 + 100000)
        ELSE 'ACR-' || FLOOR(RANDOM() * 900000 + 100000)
    END
WHERE 
    (name LIKE '%Acrylic%' OR name LIKE '%acrylic%')
    AND name NOT LIKE 'Core Acrylics%' 
    AND name NOT LIKE 'Colour Acrylics%'
    AND name NOT LIKE 'z_Trash_%'
    AND (sku IS NULL OR sku = '' OR sku LIKE 'SKU-%');

-- Step 5: Generate slugs for all acrylic products (if missing)
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
                                        REPLACE(
                                            REPLACE(
                                                name,
                                                ' ', '-'
                                            ),
                                            '(', ''
                                        ),
                                        ')', ''
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

-- Step 6: Final verification - Check all acrylic products with their new SKUs
SELECT 
    id, 
    name, 
    sku,
    slug,
    price,
    stock,
    is_active,
    created_at,
    CASE 
        WHEN sku IS NULL OR sku = '' THEN '❌ Missing SKU'
        WHEN sku LIKE 'SKU-%' THEN '⚠️  Wrong format'
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

-- Step 7: Count summary
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