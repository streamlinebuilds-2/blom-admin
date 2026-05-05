-- Bundles: rename "bundle" to "collection" for most; keep "Prep & Primer" as bundle
-- Run in Supabase SQL Editor.
--
-- 1) Set these 5 as COLLECTION (product_type=collection, category=Collections):
--    Petal Collection Bundle, Red Collection, Snowberry Christmas Collection,
--    Pastel Acrylic Collection, Blooming Love Acrylic Collection
-- 2) Set Prep & Primer Bundle as BUNDLE (product_type=bundle, category=Bundle Deals)
-- 3) Any other with "Collection" in the name (and not "Prep & Primer") -> collection

-- Ensure columns exist (no-op if already present)
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'bundle';
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Bundle Deals';

-- Collections: by exact/partial name match
UPDATE bundles
SET product_type = 'collection',
    category = 'Collections'
WHERE name ILIKE '%Petal Collection%'
   OR name ILIKE '%Red Collection%'
   OR name ILIKE '%Snowberry Christmas Collection%'
   OR name ILIKE '%Pastel Acrylic Collection%'
   OR name ILIKE '%Blooming Love Acrylic Collection%'
   OR (name ILIKE '%Collection%' AND name NOT ILIKE '%Prep%Primer%' AND name NOT ILIKE '%Prep & Primer%');

-- Bundle Deals: Prep & Primer only
UPDATE bundles
SET product_type = 'bundle',
    category = 'Bundle Deals'
WHERE name ILIKE '%Prep%Primer%' OR name ILIKE '%Prep & Primer%';

-- Verify (optional: run as select to check before/after)
-- SELECT id, name, product_type, category FROM bundles ORDER BY name;
