-- SQL script to reactivate Glitter Acrylic variations
-- This will make the individual variants (Mienks, Funfetti, Frozen) active again

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

-- Reactivate Glitter Acrylic variations (but not the parent product)
-- We'll target the specific variants: Mienks, Funfetti, Frozen
UPDATE products
SET
    is_active = TRUE,
    status = 'active',
    updated_at = NOW()
WHERE 
    name IN ('Glitter Acrylic - Mienks', 'Glitter Acrylic - Funfetti', 'Glitter Acrylic - Frozen')
    AND (
        is_active = FALSE 
        OR status = 'archived'
    );

-- Verify the changes
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