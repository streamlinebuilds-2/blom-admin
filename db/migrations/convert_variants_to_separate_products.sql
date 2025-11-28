-- Migration: Convert JSON variants to separate products
-- Purpose: Transform variants stored as JSON into individual products
-- Each variant becomes its own product with its own ID and stock tracking

-- Create a function to generate parent-child relationships
CREATE OR REPLACE FUNCTION create_variant_products()
RETURNS TABLE(
  parent_product_id uuid,
  parent_product_name text,
  variant_product_id uuid,
  variant_name text,
  variant_stock int
) AS $$
DECLARE
  parent_product RECORD;
  variant_record RECORD;
  variant_product_id uuid;
  new_product_id uuid;
  variant_name text;
  variant_stock int;
  variant_price int;
  variant_image text;
  variant_sku text;
BEGIN
  -- Loop through each product with variants
  FOR parent_product IN 
    SELECT id, name, variants, price, stock, sku, image_url 
    FROM products 
    WHERE variants IS NOT NULL 
    AND variants != '[]'::jsonb
    AND variants != 'null'
    AND jsonb_array_length(variants) > 0
  LOOP
    -- Loop through each variant in the JSON array
    FOR variant_index IN 0..(jsonb_array_length(parent_product.variants) - 1)
    LOOP
      -- Get variant data
      variant_record := parent_product.variants -> variant_index;
      
      -- Extract variant information
      variant_name := COALESCE((variant_record ->> 'name'), 
                             (variant_record ->> 'label'), 
                             'Variant ' || (variant_index + 1));
      
      variant_stock := COALESCE((variant_record ->> 'stock')::int, 
                               parent_product.stock, 
                               0);
      
      variant_price := COALESCE((variant_record ->> 'price')::int, 
                               parent_product.price, 
                               parent_product.price);
      
      variant_image := COALESCE((variant_record ->> 'image'), 
                               (variant_record ->> 'image_url'), 
                               parent_product.image_url);
      
      variant_sku := COALESCE((variant_record ->> 'sku'), 
                             parent_product.sku || '-' || variant_name);
      
      -- Generate new product ID for variant
      new_product_id := gen_random_uuid();
      
      -- Create the variant product
      INSERT INTO products (
        id,
        name,
        slug,
        price,
        price_cents,
        stock,
        stock_qty,
        sku,
        short_description,
        long_description,
        image_url,
        status,
        is_active,
        is_featured,
        category,
        tags,
        weight_grams,
        length_cm,
        width_cm,
        height_cm,
        created_at,
        updated_at,
        -- Variant-specific fields
        parent_product_id,
        variant_index,
        variant_of_product,
        is_variant,
        variant_name
      )
      VALUES (
        new_product_id,
        parent_product.name || ' - ' || variant_name,
        parent_product.name || '-' || variant_name,
        variant_price,
        variant_price,
        variant_stock,
        variant_stock,
        variant_sku,
        COALESCE(parent_product.short_description, ''),
        COALESCE(parent_product.long_description, ''),
        variant_image,
        parent_product.status,
        parent_product.is_active,
        parent_product.is_featured,
        parent_product.category,
        parent_product.tags,
        parent_product.weight_grams,
        parent_product.length_cm,
        parent_product.width_cm,
        parent_product.height_cm,
        NOW(),
        NOW(),
        -- Link to parent
        parent_product.id,
        variant_index,
        parent_product.id,
        true,
        variant_name
      );
      
      -- Return the results
      RETURN QUERY SELECT 
        parent_product.id,
        parent_product.name,
        new_product_id,
        variant_name,
        variant_stock;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add columns to products table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'parent_product_id') THEN
    ALTER TABLE products ADD COLUMN parent_product_id uuid REFERENCES products(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'variant_index') THEN
    ALTER TABLE products ADD COLUMN variant_index int;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'variant_of_product') THEN
    ALTER TABLE products ADD COLUMN variant_of_product uuid REFERENCES products(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_variant') THEN
    ALTER TABLE products ADD COLUMN is_variant boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'variant_name') THEN
    ALTER TABLE products ADD COLUMN variant_name text;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_parent_product_id ON products(parent_product_id);
CREATE INDEX IF NOT EXISTS idx_products_variant_of_product ON products(variant_of_product);
CREATE INDEX IF NOT EXISTS idx_products_is_variant ON products(is_variant);
CREATE INDEX IF NOT EXISTS idx_products_variant_index ON products(variant_index);

-- Execute the conversion
SELECT 'Converting variants to separate products...' as status;

-- This will create the variant products and return the results
SELECT * FROM create_variant_products();

-- Update parent products to mark them as having variants
UPDATE products 
SET has_variants = true
WHERE id IN (SELECT DISTINCT parent_product_id FROM products WHERE is_variant = true);

-- Add has_variants column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'has_variants') THEN
    ALTER TABLE products ADD COLUMN has_variants boolean DEFAULT false;
  END IF;
END $$;

-- Clear variants from parent products (they now have separate products)
UPDATE products 
SET variants = NULL
WHERE has_variants = true;

SELECT 'Variant conversion completed successfully!' as status;

-- Summary query
SELECT 
  'Parent Products with Variants' as category,
  COUNT(DISTINCT parent_product_id) as count
FROM products 
WHERE is_variant = true

UNION ALL

SELECT 
  'Total Variant Products Created' as category,
  COUNT(*) as count
FROM products 
WHERE is_variant = true

UNION ALL

SELECT 
  'Products without Variants' as category,
  COUNT(*) as count
FROM products 
WHERE is_variant = false OR is_variant IS NULL;