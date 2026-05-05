-- Fix specific bundles that were incorrectly categorized as collections
-- The user explicitly requested these to be 'bundle' type and 'Bundle Deals' category

UPDATE bundles
SET product_type = 'bundle',
    category = 'Bundle Deals'
WHERE name IN (
    'Red Collection',
    'High Tea Brigerton Combo',
    'Blossom Sugar Rush Collection',
    'Snowberry Christmas Collection',
    'Petal Collection Bundle',
    'Pastel Acrylic Collection',
    'Blooming Love Acrylic Collection'
);

-- Also ensure 'Prep & Primer Bundle' is correct (just in case)
UPDATE bundles
SET product_type = 'bundle',
    category = 'Bundle Deals'
WHERE name ILIKE '%Prep & Primer%';
