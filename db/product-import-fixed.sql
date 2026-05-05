-- ========================================
-- BLOM COSMETICS - DATABASE CLEANUP & PRODUCT IMPORT (FIXED)
-- ========================================
-- This script handles the unique slug constraint by renaming archived products
-- Generated: 2025-11-14
-- Total products to import: 21 active products

-- ========================================
-- STEP 1: ARCHIVE EXISTING PRODUCTS & FIX SLUGS
-- ========================================

-- First, update slugs of currently archived products to avoid conflicts
UPDATE products
SET slug = slug || '-archived-' || id::text
WHERE is_active = false AND slug NOT LIKE '%-archived-%';

-- Archive all currently active products and rename their slugs
UPDATE products
SET
  is_active = false,
  status = 'archived',
  slug = slug || '-archived-' || id::text
WHERE is_active = true;

-- Verify all archived:
SELECT COUNT(*) as active_count FROM products WHERE is_active = true;
-- Should return 0

-- ========================================
-- STEP 2: IMPORT CLEAN PRODUCTS
-- ========================================

-- Bundle Deals (1 product)
INSERT INTO products (
  name, slug, sku, category, status, price,
  stock, short_description, overview,
  thumbnail_url, gallery_urls,
  features, variants, is_active
) VALUES
(
  'Prep & Primer Bundle',
  'prep-primer-bundle',
  'SKU-BUNDLE-001',
  'Bundle Deals',
  'active',
  370.00,
  10,
  'Essential prep duo - Dehydrator & Primer - save R40!',
  'Perfect nail preparation starts here. Get both our Prep Solution and Vitamin Primer together and save.',
  '/bundle-prep-primer-white.webp',
  ARRAY['/bundle-prep-primer-colorful.webp'],
  ARRAY[]::text[],
  '[]'::jsonb,
  true
);

-- Prep & Finish (3 products)
INSERT INTO products (
  name, slug, sku, category, status, price,
  stock, short_description, overview,
  thumbnail_url, gallery_urls,
  features, variants, is_active
) VALUES
(
  'Cuticle Oil',
  'cuticle-oil',
  'SKU-CUTICLE-OIL-001',
  'Prep & Finish',
  'active',
  140.00,
  10,
  'A nourishing blend that deeply hydrates and softens cuticles while promoting healthy nail growth.',
  'A nourishing blend that deeply hydrates and softens cuticles while promoting healthy nail growth. Lightweight, fast-absorbing, and enriched with restorative oils, it leaves nails and skin feeling smooth, conditioned, and beautifully cared for.',
  '/cuticle-oil-white.webp',
  ARRAY['/cuticle-oil-colorful.webp'],
  ARRAY[]::text[],
  '[
    {"name": "Cotton Candy", "inStock": true, "image": "/cuticle-oil-cotton-candy.webp"},
    {"name": "Vanilla", "inStock": true, "image": "/cuticle-oil-vanilla.webp"},
    {"name": "Tiny Touch", "inStock": true, "image": "/cuticle-oil-tiny-touch.webp"},
    {"name": "Dragon Fruit Lotus", "inStock": true, "image": "/cuticle-oil-dragon-fruit-lotus.webp"},
    {"name": "Watermelon", "inStock": true, "image": "/cuticle-oil-watermelon.webp"}
  ]'::jsonb,
  true
),
(
  'Vitamin Primer',
  'vitamin-primer',
  'SKU-VITAMIN-PRIMER-001',
  'Prep & Finish',
  'active',
  210.00,
  10,
  'Strengthens bond between natural nail and product — essential for long-lasting wear.',
  'Strengthens bond between natural nail and product — essential for long-lasting wear.',
  '/vitamin-primer-white.webp',
  ARRAY['/vitamin-primer-colorful.webp'],
  ARRAY[]::text[],
  '[]'::jsonb,
  true
),
(
  'Prep Solution (Nail Dehydrator)',
  'prep-solution',
  'SKU-PREP-SOLUTION-001',
  'Prep & Finish',
  'active',
  200.00,
  10,
  'Removes oils and moisture from the nail surface for better product adhesion and long-lasting results.',
  'Removes oils and moisture from the nail surface for better product adhesion and long-lasting results.',
  '/prep-solution-white.webp',
  ARRAY['/prep-solution-colorful.webp'],
  ARRAY[]::text[],
  '[]'::jsonb,
  true
);

-- Gel System (2 products)
INSERT INTO products (
  name, slug, sku, category, status, price,
  stock, short_description, overview,
  thumbnail_url, gallery_urls,
  features, variants, is_active
) VALUES
(
  'Non-Wipe Top Coat',
  'top-coat',
  'SKU-TOP-COAT-001',
  'Gel System',
  'active',
  190.00,
  10,
  'A crystal-clear, high-shine finish that seals and protects your nail art without leaving a sticky layer.',
  'A crystal-clear, high-shine finish that seals and protects your nail art without leaving a sticky layer. Long-lasting, scratch-resistant, and easy to use — perfect for a flawless, glossy look every time.',
  '/top-coat-white.webp',
  ARRAY['/top-coat-colorful.webp'],
  ARRAY[]::text[],
  '[]'::jsonb,
  true
),
(
  'Fairy Dust Top Coat',
  'fairy-dust-top-coat',
  'SKU-FAIRY-DUST-001',
  'Gel System',
  'active',
  195.00,
  10,
  'A dazzling, non-wipe top coat infused with fine sparkles that adds a touch of glamour to any set.',
  'A dazzling, non-wipe top coat infused with fine sparkles that adds a touch of glamour to any set. Provides long-lasting shine, strength, and protection while giving nails a radiant, shimmering finish.',
  '/fairy-dust-top-coat-white.webp',
  ARRAY['/fairy-dust-top-coat-colorful.webp'],
  ARRAY[]::text[],
  '[]'::jsonb,
  true
);

-- Tools & Essentials (4 products)
INSERT INTO products (
  name, slug, sku, category, status, price,
  stock, short_description, overview,
  thumbnail_url, gallery_urls,
  features, variants, is_active
) VALUES
(
  'Hand Files',
  'nail-file',
  'SKU-NAIL-FILE-001',
  'Tools & Essentials',
  'active',
  35.00,
  10,
  'Durable nail files for professional shaping and smoothing.',
  'Durable nail files for professional shaping and smoothing.',
  '/nail-file-white.webp',
  ARRAY['/nail-file-colorful.webp'],
  ARRAY[]::text[],
  '[
    {"name": "Single File", "inStock": true, "price": 35, "image": "/nail-file-white.webp"},
    {"name": "5-Pack Bundle", "inStock": true, "price": 160, "image": "/nail-file-colorful.webp"}
  ]'::jsonb,
  true
),
(
  'Nail Forms',
  'nail-forms',
  'SKU-NAIL-FORMS-001',
  'Tools & Essentials',
  'active',
  290.00,
  10,
  'Super sturdy and strong nail forms for acrylic and gel applications.',
  'Super sturdy and strong nail forms for acrylic and gel applications.',
  '/nail-forms-white.webp',
  ARRAY['/nail-forms-colorful.webp'],
  ARRAY[]::text[],
  '[]'::jsonb,
  true
),
(
  'Crystal Kolinsky Sculpting Brush',
  'crystal-kolinsky-sculpting-brush',
  'SKU-SCULPTING-BRUSH-001',
  'Tools & Essentials',
  'active',
  384.00,
  10,
  'Premium Kolinsky brush with floating glitter handle.',
  'Premium 100% Kolinsky brush with floating glitter handle for professional acrylic work.',
  '/acrylic-sculpture-brush-white.webp',
  ARRAY['/acrylic-sculpture-brush-colorful.webp'],
  ARRAY[]::text[],
  '[
    {"name": "10mm", "price": 384, "inStock": true}
  ]'::jsonb,
  true
),
(
  'Professional Detail Brush',
  'professional-detail-brush',
  'SKU-DETAIL-BRUSH-001',
  'Tools & Essentials',
  'active',
  320.00,
  10,
  'High-quality detail brush for intricate nail art designs. Perfect for fine lines, dots, and detailed artwork.',
  'High-quality detail brush for intricate nail art designs. Perfect for fine lines, dots, and detailed artwork. Professional grade with precise control.',
  '/detail-brush-white.webp',
  ARRAY['/detail-brush-colorful.webp'],
  ARRAY[]::text[],
  '[
    {"name": "10mm", "price": 320, "inStock": true}
  ]'::jsonb,
  true
);

-- Acrylic System (1 product)
INSERT INTO products (
  name, slug, sku, category, status, price,
  stock, short_description, overview,
  thumbnail_url, gallery_urls,
  features, variants, is_active
) VALUES
(
  'Glitter Acrylic',
  'glitter-acrylic',
  'SKU-GLITTER-ACRYLIC-001',
  'Acrylic System',
  'active',
  250.00,
  10,
  'Opalescent crushed-ice acrylic blend with prismatic shimmer.',
  'This glitter-acrylic blend looks like a soft, opalescent crushed-ice mix — a dreamy combination of translucent and iridescent shards suspended in clear acrylic. Features fine to medium reflective flakes that shift between white-silver, icy blue, and lilac hues.',
  '/glitter-acrylic-white.webp',
  ARRAY['/glitter-acrylic-colorful.webp'],
  ARRAY[]::text[],
  '[
    {"name": "56g", "price": 250, "inStock": true}
  ]'::jsonb,
  true
);

-- Furniture (10 products)
INSERT INTO products (
  name, slug, sku, category, status, price,
  stock, short_description, overview,
  thumbnail_url, gallery_urls,
  features, variants, is_active
) VALUES
(
  'Rose Petal Manicure Table',
  'rose-petal-manicure-table',
  'SKU-ROSE-PETAL-TABLE-001',
  'Furniture',
  'active',
  2590.00,
  10,
  'Beautiful manicure table perfect for salons and home studios.',
  'Beautiful manicure table perfect for salons and home studios.',
  '/rose-petal-manicure-table-white.webp',
  ARRAY['/rose-petal-manicure-table-colorful.webp'],
  ARRAY[]::text[],
  '[
    {"name": "Standard", "price": 2590, "inStock": true}
  ]'::jsonb,
  true
),
(
  'Daisy Manicure Table',
  'daisy-manicure-table',
  'SKU-DAISY-TABLE-001',
  'Furniture',
  'active',
  2700.00,
  10,
  'Classic manicure table with timeless design.',
  'Classic manicure table design with quality construction.',
  '/daisy-manicure-table-white.webp',
  ARRAY['/daisy-manicure-table-colorful.webp'],
  ARRAY[]::text[],
  '[
    {"name": "Wooden top", "price": 2700, "inStock": true},
    {"name": "Wooden base & glass top", "price": 3100, "inStock": true}
  ]'::jsonb,
  true
),
(
  'Polish Garden (Gel Polish Rack)',
  'polish-garden-rack',
  'SKU-POLISH-RACK-001',
  'Furniture',
  'active',
  1150.00,
  10,
  'Wall-mounted gel polish rack for organized storage.',
  'Wall-mounted gel polish rack for organized storage.',
  '/polish-garden-rack-white.webp',
  ARRAY['/polish-garden-rack-colorful.webp'],
  ARRAY[]::text[],
  '[
    {"name": "Standard", "price": 1150, "inStock": true}
  ]'::jsonb,
  true
),
(
  'Blossom Manicure Table',
  'blossom-manicure-table',
  'SKU-BLOSSOM-TABLE-001',
  'Furniture',
  'active',
  5200.00,
  10,
  'Premium manicure table with elegant design and superior build quality.',
  'Our premium manicure table with elegant design and superior build quality.',
  '/blossom-manicure-table-white.webp',
  ARRAY['/blossom-manicure-table-colorful.webp'],
  ARRAY[]::text[],
  '[
    {"name": "Wooden top", "price": 5200, "inStock": true},
    {"name": "Wooden & glass top", "price": 5550, "inStock": true},
    {"name": "Glass top only", "price": 6200, "inStock": true}
  ]'::jsonb,
  true
),
(
  'Pearly Pedicure Station',
  'pearly-pedicure-station',
  'SKU-PEDICURE-STATION-001',
  'Furniture',
  'active',
  4800.00,
  10,
  'Complete pedicure station with platform, step and storage drawers.',
  'Complete pedicure station with storage. Professional quality for salons.',
  '/pearly-pedicure-station-white.webp',
  ARRAY['/pearly-pedicure-station-colorful.webp'],
  ARRAY[]::text[],
  '[
    {"name": "Standard", "price": 4800, "inStock": true}
  ]'::jsonb,
  true
),
(
  'Princess Dresser',
  'princess-dresser',
  'SKU-PRINCESS-DRESSER-001',
  'Furniture',
  'active',
  7400.00,
  10,
  'Elegant princess-style dresser with glass open top and LED lighting.',
  'Beautiful princess-style dresser featuring glass open top, LED lights, and mirror included. Perfect for creating a luxurious salon atmosphere.',
  '/princess-dresser-white.webp',
  ARRAY['/princess-dresser-colorful.webp'],
  ARRAY[]::text[],
  '[
    {"name": "Standard with LED", "price": 7400, "inStock": true, "image": "/princess-dresser-colorful.webp"}
  ]'::jsonb,
  true
),
(
  'Iris Manicure Table',
  'iris-manicure-table',
  'SKU-IRIS-TABLE-001',
  'Furniture',
  'active',
  3490.00,
  10,
  'Professional manicure table with integrated shelf system.',
  'Professional manicure table with shelf. Choice of wooden or glass top.',
  '/iris-manicure-table-white.webp',
  ARRAY['/iris-manicure-table-colorful.webp'],
  ARRAY[]::text[],
  '[
    {"name": "With wooden top", "price": 3490, "inStock": true},
    {"name": "With glass top", "price": 3700, "inStock": true}
  ]'::jsonb,
  true
),
(
  'Blom Manicure Table & Work Station',
  'blom-manicure-workstation',
  'SKU-WORKSTATION-001',
  'Furniture',
  'active',
  4500.00,
  10,
  'Complete professional workstation with table and shelf.',
  'Complete workstation with table and shelf. Premium quality construction.',
  '/blom-manicure-workstation-white.webp',
  ARRAY['/blom-manicure-workstation-colorful.webp'],
  ARRAY[]::text[],
  '[
    {"name": "With wooden tops", "price": 4500, "inStock": true},
    {"name": "With glass top shelf & workstation", "price": 5100, "inStock": true}
  ]'::jsonb,
  true
),
(
  'Floral Manicure Table',
  'floral-manicure-table',
  'SKU-FLORAL-TABLE-001',
  'Furniture',
  'active',
  4300.00,
  10,
  'Beautiful floral-themed manicure table with glass top included.',
  'Elegant floral manicure table with glass top included. Features decorative floral details and professional construction.',
  '/floral-manicure-table-white.webp',
  ARRAY['/floral-manicure-table-colorful.webp'],
  ARRAY[]::text[],
  '[
    {"name": "With Glass Top", "price": 4300, "inStock": true, "image": "/floral-manicure-table-colorful.webp"}
  ]'::jsonb,
  true
),
(
  'Orchid Manicure Table',
  'orchid-manicure-table',
  'SKU-ORCHID-TABLE-001',
  'Furniture',
  'active',
  3700.00,
  10,
  'Stylish orchid-themed manicure table with elegant design.',
  'Beautiful orchid manicure table featuring elegant orchid-inspired design elements and professional construction.',
  '/orchid-manicure-table-white.webp',
  ARRAY['/orchid-manicure-table-colorful.webp'],
  ARRAY[]::text[],
  '[
    {"name": "Standard", "price": 3700, "inStock": true, "image": "/orchid-manicure-table-colorful.webp"}
  ]'::jsonb,
  true
);

-- ========================================
-- STEP 3: VERIFICATION
-- ========================================
-- Verify imported products
SELECT
  name,
  category,
  price,
  status,
  is_active,
  stock
FROM products
WHERE is_active = true
ORDER BY category, name;

-- Count by category
SELECT
  category,
  COUNT(*) as product_count,
  SUM(stock) as total_stock
FROM products
WHERE is_active = true
GROUP BY category
ORDER BY category;

-- Total active products (should be 21)
SELECT COUNT(*) as total_active_products FROM products WHERE is_active = true;
