-- SQL script to ensure Glitter Acrylic products are properly archived
-- This script uses both archiving methods to ensure compatibility

-- First, check current status of Glitter Acrylic products
SELECT
    id,
    name,
    slug,
    sku,
    is_active,
    status,
    updated_at
FROM
    products
WHERE
    name ILIKE '%Glitter Acrylic%'
ORDER BY
    name;

-- Archive any Glitter Acrylic products that are not already archived
-- Using the comprehensive approach (both is_active AND status)
UPDATE products
SET
    is_active = FALSE,
    status = 'archived',
    updated_at = NOW()
WHERE
    name ILIKE '%Glitter Acrylic%'
    AND (
        is_active = TRUE
        OR status != 'archived'
        OR status IS NULL
    );

-- Verify the archiving
SELECT
    id,
    name,
    slug,
    sku,
    is_active,
    status,
    updated_at
FROM
    products
WHERE
    name ILIKE '%Glitter Acrylic%'
ORDER BY
    name;

-- Check if these products would be filtered out by the new API logic
-- This simulates what the admin-products.ts endpoint would return by default
SELECT
    id,
    name,
    slug,
    sku,
    is_active,
    status,
    -- This is the condition used in the fixed admin-products.ts endpoint
    (is_active = TRUE AND status != 'archived') AS would_be_included_in_default_query
FROM
    products
WHERE
    name ILIKE '%Glitter Acrylic%'
ORDER BY
    name;