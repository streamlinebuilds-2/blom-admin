-- Corrected SQL script to archive Glitter Acrylic products
-- This will set status to 'archived' for the three Glitter Acrylic products

-- Archive Glitter Acrylic - Mienks
UPDATE products
SET
    status = 'archived',
    updated_at = NOW()
WHERE 
    name = 'Glitter Acrylic - Mienks';

-- Archive Glitter Acrylic - Funfetti
UPDATE products
SET
    status = 'archived',
    updated_at = NOW()
WHERE 
    name = 'Glitter Acrylic - Funfetti';

-- Archive Glitter Acrylic - Frozen
UPDATE products
SET
    status = 'archived',
    updated_at = NOW()
WHERE 
    name = 'Glitter Acrylic - Frozen';

-- Verify the archiving
SELECT 
    id,
    name,
    slug,
    sku,
    status,
    updated_at
FROM 
    products
WHERE 
    name IN ('Glitter Acrylic - Mienks', 'Glitter Acrylic - Funfetti', 'Glitter Acrylic - Frozen')
ORDER BY 
    name;