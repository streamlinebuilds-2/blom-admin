-- SQL script to archive ONLY the parent Glitter Acrylic product
-- This will archive the main "Glitter Acrylic" product but keep variations active

-- First, check current status of all Glitter Acrylic products
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

-- Archive ONLY the parent "Glitter Acrylic" product (not the variations)
-- We need to identify the parent product - likely the one without a variant suffix
UPDATE products
SET
    is_active = FALSE,
    status = 'archived',
    updated_at = NOW()
WHERE 
    name = 'Glitter Acrylic'  -- This should be the parent product only
    AND (
        is_active = TRUE 
        OR status != 'archived'
    );

-- Verify the changes - should show parent archived, variations active
SELECT 
    id, 
    name, 
    slug, 
    sku, 
    is_active, 
    status, 
    updated_at,
    CASE 
        WHEN name = 'Glitter Acrylic' THEN 'PARENT (should be archived)'
        ELSE 'VARIATION (should be active)'
    END as product_type
FROM 
    products
WHERE 
    name ILIKE '%Glitter Acrylic%'
ORDER BY 
    name;