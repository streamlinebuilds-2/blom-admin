-- Core Acrylics Duplicate Cleanup SQL Script
-- This script helps identify and clean up duplicates using direct SQL
-- Use this if you prefer SQL over the JavaScript Highlander Method

-- Step 1: Identify all Core Acrylics products
SELECT 
    id, 
    name, 
    price, 
    stock, 
    is_active, 
    created_at,
    'Core Acrylics - AvanéSignatureNude (071)' AS target_name_071,
    'Core Acrylics - Barely Blooming Nude (070)' AS target_name_070,
    'Core Acrylics - Blom Cover Pink (072)' AS target_name_072,
    'Core Acrylics - Crystal Clear (073)' AS target_name_073,
    'Core Acrylics - Pearl White (076)' AS target_name_076,
    'Core Acrylics - Purely White (075)' AS target_name_075,
    'Core Acrylics - The Perfect Milky White (074)' AS target_name_074
FROM 
    products
WHERE 
    name LIKE 'Core Acrylics%' 
    AND name NOT LIKE 'z_Trash_%'
ORDER BY 
    name, created_at DESC;

-- Step 2: For each variant, find duplicates and mark them for cleanup
-- AvanéSignatureNude (071)
WITH avane_duplicates AS (
    SELECT 
        id, 
        name, 
        created_at,
        ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM 
        products
    WHERE 
        name LIKE 'Core Acrylics - AvanéSignatureNude (071)%'
        AND name NOT LIKE 'z_Trash_%'
)
SELECT 
    id, 
    name, 
    created_at,
    CASE WHEN rn = 1 THEN 'KEEP (WINNER)' ELSE 'TRASH (LOSER)' END as action
FROM 
    avane_duplicates
ORDER BY 
    rn;

-- Barely Blooming Nude (070)
WITH barely_duplicates AS (
    SELECT 
        id, 
        name, 
        created_at,
        ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM 
        products
    WHERE 
        name LIKE 'Core Acrylics - Barely Blooming Nude (070)%'
        AND name NOT LIKE 'z_Trash_%'
)
SELECT 
    id, 
    name, 
    created_at,
    CASE WHEN rn = 1 THEN 'KEEP (WINNER)' ELSE 'TRASH (LOSER)' END as action
FROM 
    barely_duplicates
ORDER BY 
    rn;

-- Blom Cover Pink (072)
WITH pink_duplicates AS (
    SELECT 
        id, 
        name, 
        created_at,
        ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM 
        products
    WHERE 
        name LIKE 'Core Acrylics - Blom Cover Pink (072)%'
        AND name NOT LIKE 'z_Trash_%'
)
SELECT 
    id, 
    name, 
    created_at,
    CASE WHEN rn = 1 THEN 'KEEP (WINNER)' ELSE 'TRASH (LOSER)' END as action
FROM 
    pink_duplicates
ORDER BY 
    rn;

-- Crystal Clear (073)
WITH clear_duplicates AS (
    SELECT 
        id, 
        name, 
        created_at,
        ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM 
        products
    WHERE 
        name LIKE 'Core Acrylics - Crystal Clear (073)%'
        AND name NOT LIKE 'z_Trash_%'
)
SELECT 
    id, 
    name, 
    created_at,
    CASE WHEN rn = 1 THEN 'KEEP (WINNER)' ELSE 'TRASH (LOSER)' END as action
FROM 
    clear_duplicates
ORDER BY 
    rn;

-- Pearl White (076)
WITH pearl_duplicates AS (
    SELECT 
        id, 
        name, 
        created_at,
        ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM 
        products
    WHERE 
        name LIKE 'Core Acrylics - Pearl White (076)%'
        AND name NOT LIKE 'z_Trash_%'
)
SELECT 
    id, 
    name, 
    created_at,
    CASE WHEN rn = 1 THEN 'KEEP (WINNER)' ELSE 'TRASH (LOSER)' END as action
FROM 
    pearl_duplicates
ORDER BY 
    rn;

-- Purely White (075)
WITH purely_duplicates AS (
    SELECT 
        id, 
        name, 
        created_at,
        ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM 
        products
    WHERE 
        name LIKE 'Core Acrylics - Purely White (075)%'
        AND name NOT LIKE 'z_Trash_%'
)
SELECT 
    id, 
    name, 
    created_at,
    CASE WHEN rn = 1 THEN 'KEEP (WINNER)' ELSE 'TRASH (LOSER)' END as action
FROM 
    purely_duplicates
ORDER BY 
    rn;

-- The Perfect Milky White (074)
WITH milky_duplicates AS (
    SELECT 
        id, 
        name, 
        created_at,
        ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM 
        products
    WHERE 
        name LIKE 'Core Acrylics - The Perfect Milky White (074)%'
        AND name NOT LIKE 'z_Trash_%'
)
SELECT 
    id, 
    name, 
    created_at,
    CASE WHEN rn = 1 THEN 'KEEP (WINNER)' ELSE 'TRASH (LOSER)' END as action
FROM 
    milky_duplicates
ORDER BY 
    rn;

-- Step 3: Generate UPDATE statements to trash losers (run these after reviewing)
-- Template for trashing losers:
-- UPDATE products SET name = 'z_Trash_' || id, is_active = false 
-- WHERE id IN (SELECT id FROM (
--     SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
--     FROM products
--     WHERE name LIKE 'Core Acrylics - [Variant Name]%'
--     AND name NOT LIKE 'z_Trash_%'
-- ) AS duplicates WHERE rn > 1);

-- Step 4: Update the WINNERS with correct data
-- Template for updating winners:
-- UPDATE products SET
--     price = 320,
--     stock = 100,
--     is_active = true,
--     description = '<p>All Blom Cosmetics Acrylic powders are self-leveling, non yellowing and buttery to work with.</p>',
--     inci_ingredients = '',
--     how_to_use = ''
-- WHERE id IN (
--     SELECT id FROM (
--         SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
--         FROM products
--         WHERE name LIKE 'Core Acrylics - [Variant Name]%'
--         AND name NOT LIKE 'z_Trash_%'
--     ) AS duplicates WHERE rn = 1
-- );

-- Step 5: Archive the parent product
-- UPDATE products SET is_active = false
-- WHERE name IN ('Core Acrylics', 'Core Acrylics [ARCHIVED]');

-- Step 6: Verify the cleanup
SELECT 
    id, 
    name, 
    price, 
    stock, 
    is_active, 
    created_at
FROM 
    products
WHERE 
    (name LIKE 'Core Acrylics%' OR name LIKE 'z_Trash_%')
ORDER BY 
    name, created_at DESC;