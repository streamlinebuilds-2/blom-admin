-- Migration: Add Custom Pricing Support for Product Variants
-- Purpose: Enable individual pricing for product variants while maintaining backward compatibility
-- Features:
-- - Variants can have custom prices stored in cents
-- - If variant price is not set, defaults to main product price
-- - Maintains compatibility with existing variants that don't have pricing

-- Create helper function to get effective variant price
CREATE OR REPLACE FUNCTION get_variant_price(product_row products, variant_index int)
RETURNS int AS $$
DECLARE
  variant_data jsonb;
  variant_price int;
  main_price int;
BEGIN
  -- Get the variant data
  variant_data := product_row.variants -> variant_index;

  -- Try to get variant-specific price
  variant_price := (variant_data ->> 'price_cents')::int;
  
  -- If variant has no custom price, use main product price
  IF variant_price IS NULL THEN
    main_price := COALESCE(product_row.price_cents, product_row.price * 100, 0);
    variant_price := main_price;
  END IF;

  RETURN COALESCE(variant_price, 0);
END;
$$ LANGUAGE plpgsql;

-- Create helper function to update variant price
CREATE OR REPLACE FUNCTION update_variant_price(product_row products, variant_index int, new_price_cents int)
RETURNS products AS $$
DECLARE
  current_variants jsonb;
  updated_variants jsonb;
BEGIN
  -- Get current variants
  current_variants := product_row.variants;

  -- Update the specific variant's price
  updated_variants := jsonb_set(current_variants, ARRAY[variant_index::text, 'price_cents'], to_jsonb(new_price_cents));

  -- Update the product with new variants
  UPDATE products
  SET variants = updated_variants
  WHERE id = product_row.id
  RETURNING * INTO product_row;

  RETURN product_row;
END;
$$ LANGUAGE plpgsql;

-- Create function to normalize existing variants to new format
CREATE OR REPLACE FUNCTION normalize_variant_pricing()
RETURNS void AS $$
DECLARE
  product_record RECORD;
  variant_json jsonb;
  variant_index int;
  current_variants jsonb;
  normalized_variants jsonb;
  variant_count int;
BEGIN
  -- Loop through each product that has variants
  FOR product_record IN
    SELECT id, variants, price_cents, price
    FROM products
    WHERE variants IS NOT NULL
    AND variants != '[]'::jsonb
    AND variants != 'null'
    AND jsonb_array_length(variants) > 0
  LOOP
    current_variants := product_record.variants;
    normalized_variants := '[]'::jsonb;
    variant_count := 0;
    
    -- Loop through each variant and ensure it has a price field
    FOR variant_index IN 0..(jsonb_array_length(current_variants) - 1)
    LOOP
      variant_json := current_variants -> variant_index;
      
      -- If variant doesn't have price_cents, add it using the main product price
      IF (variant_json ->> 'price_cents') IS NULL THEN
        -- Use main product price in cents, or convert price to cents
        variant_json := jsonb_set(
          variant_json,
          ARRAY['price_cents'],
          to_jsonb(COALESCE(
            product_record.price_cents,
            (product_record.price * 100)::int,
            0
          ))
        );
      END IF;
      
      -- Add the normalized variant to the result
      normalized_variants := normalized_variants || variant_json;
      variant_count := variant_count + 1;
    END LOOP;
    
    -- Update the product with normalized variants if we found any
    IF variant_count > 0 THEN
      UPDATE products
      SET variants = normalized_variants
      WHERE id = product_record.id;
      
      RAISE NOTICE 'Normalized % variants for product %', variant_count, product_record.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Variant pricing normalization complete';
END;
$$ LANGUAGE plpgsql;

-- Execute the normalization function
SELECT normalize_variant_pricing();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_variant_price(products, int) TO service_role;
GRANT EXECUTE ON FUNCTION update_variant_price(products, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION normalize_variant_pricing() TO service_role;

-- Create index for efficient querying of variants with custom pricing
CREATE INDEX IF NOT EXISTS idx_products_variants_price_search 
ON products USING GIN ((variants -> 'price_cents'));

-- Add comment documenting the new variant pricing system
COMMENT ON FUNCTION get_variant_price(products, int) IS 
'Returns the effective price for a specific variant in cents. 
If variant has no custom price, returns main product price.';

COMMENT ON FUNCTION update_variant_price(products, int, int) IS 
'Updates the custom price for a specific variant and returns the updated product record.';

COMMENT ON FUNCTION normalize_variant_pricing() IS 
'One-time function to add price_cents field to existing variants that lack custom pricing.
Sets missing variant prices to the main product price.';