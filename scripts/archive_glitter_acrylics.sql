-- SQL script to archive Glitter Acrylic products
-- This will set is_active to FALSE and archived to TRUE for the three Glitter Acrylic products

-- Archive Glitter Acrylic - Mienks
UPDATE products
SET
    is_active = FALSE,
    archived = TRUE,
    updated_at = NOW()
WHERE 
    name = 'Glitter Acrylic - Mienks';

-- Archive Glitter Acrylic - Funfetti
UPDATE products
SET
    is_active = FALSE,
    archived = TRUE,
    updated_at = NOW()
WHERE 
    name = 'Glitter Acrylic - Funfetti';

-- Archive Glitter Acrylic - Frozen
UPDATE products
SET
    is_active = FALSE,
    archived = TRUE,
    updated_at = NOW()
WHERE 
    name = 'Glitter Acrylic - Frozen';

-- Verify the archiving
SELECT 
    id,
    name,
    sku,
    is_active,
    archived,
    updated_at
FROM 
    products
WHERE 
    name IN ('Glitter Acrylic - Mienks', 'Glitter Acrylic - Funfetti', 'Glitter Acrylic - Frozen')
ORDER BY 
    name;