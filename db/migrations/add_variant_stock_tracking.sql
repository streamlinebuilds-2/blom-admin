-- Migration: Add variant stock tracking
-- Purpose: Support individual stock levels for product variants
-- This allows each variant to have its own stock count

-- Add stock_qty column to products table to store variant-specific stock
-- (The existing stock column will be used for the main product stock)

-- Note: This migration assumes variants are stored as JSON in the products.variants column
-- Each variant object can optionally have a stock field for individual stock tracking

-- Create a function to get variant stock level
CREATE OR REPLACE FUNCTION get_variant_stock(product_row products, variant_index int)
RETURNS int AS $$
DECLARE
  variant_data jsonb;
  variant_stock int;
BEGIN
  -- Get the variant data
  variant_data := product_row.variants -> variant_index;
  
  -- If variant has explicit stock, use it; otherwise use product stock
  variant_stock := (variant_data ->> 'stock')::int;
  
  -- If no explicit variant stock, fall back to product stock
  IF variant_stock IS NULL THEN
    variant_stock := product_row.stock;
  END IF;
  
  RETURN COALESCE(variant_stock, 0);
END;
$$ LANGUAGE plpgsql;

-- Create a function to update variant stock
CREATE OR REPLACE FUNCTION update_variant_stock(product_row products, variant_index int, new_stock int)
RETURNS products AS $$
DECLARE
  updated_product products;
  current_variants jsonb;
  updated_variants jsonb;
BEGIN
  -- Get current variants
  current_variants := product_row.variants;
  
  -- Update the specific variant's stock
  updated_variants := jsonb_set(current_variants, ARRAY[variant_index::text, 'stock'], to_jsonb(new_stock));
  
  -- Update the product with new variants
  UPDATE products 
  SET variants = updated_variants
  WHERE id = product_row.id
  RETURNING * INTO updated_product;
  
  RETURN updated_product;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_variant_stock(products, int) TO service_role;
GRANT EXECUTE ON FUNCTION update_variant_stock(products, int, int) TO service_role;