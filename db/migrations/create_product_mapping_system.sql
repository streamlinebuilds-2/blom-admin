-- Product Name Mapping System for Stock Movement Fix
-- This creates the mapping between order names and inventory names

-- 1. Create Product Name Mapping Table
CREATE TABLE IF NOT EXISTS product_name_mapping (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_name text NOT NULL,           -- Names as they appear in orders
  inventory_name text NOT NULL,       -- Names as they appear in stock
  category_pattern text,              -- Core Acrylics, Cuticle Oil, etc.
  brand text,                         -- Brand information if applicable
  match_confidence decimal(3,2) DEFAULT 0.95, -- 0.00 to 1.00 confidence score
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_order_inventory_mapping UNIQUE(order_name, inventory_name)
);

-- 2. Create Enhanced Matching Function
CREATE OR REPLACE FUNCTION find_product_match(order_product_name text)
RETURNS TABLE(found boolean, product_id uuid, product_name text, method text, confidence decimal(3,2)) AS $$
BEGIN
  -- Method 1: Exact mapping from our mapping table
  SELECT 
    true, 
    p.id, 
    p.name, 
    'exact_mapping', 
    pnm.match_confidence
  INTO found, product_id, product_name, method, confidence
  FROM product_name_mapping pnm
  JOIN products p ON p.name = pnm.inventory_name
  WHERE pnm.order_name = order_product_name 
  AND pnm.is_active = true
  AND p.is_active = true
  LIMIT 1;
  
  IF FOUND THEN
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Method 2: Category + Variant matching for grouped products
  -- Handle cases like "Core Acrylics - AvanéSignatureNude (071)" 
  -- matching to "Core Acrylics / AvanéSignatureNude (071)"
  SELECT 
    true,
    p.id,
    p.name,
    'category_variant',
    0.90
  INTO found, product_id, product_name, method, confidence
  FROM products p
  WHERE p.is_active = true
  AND (
    -- Check if order name contains product name as substring
    order_product_name LIKE '%' || p.name || '%'
    OR
    -- Check if product name contains order name variants
    p.name LIKE '%' || REPLACE(order_product_name, ' - ', ' / ') || '%'
    OR
    p.name LIKE '%' || REPLACE(order_product_name, ' - ', ' / ') || '%'
  )
  LIMIT 1;
  
  IF FOUND THEN
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Method 3: Enhanced fuzzy matching with keyword extraction
  WITH clean_order_name AS (
    SELECT 
      regexp_replace(order_product_name, '[^\w\s]', '', 'g') as cleaned_name
  ),
  keyword_matches AS (
    SELECT 
      p.id,
      p.name,
      -- Calculate similarity based on common keywords
      LEAST(
        1.0,
        (array_length(
          string_to_array(lower(clean_order_name.cleaned_name), ' ') 
          && 
          string_to_array(lower(p.name), ' ')
        , 1)::decimal / 
        GREATEST(
          array_length(string_to_array(lower(clean_order_name.cleaned_name), ' '), 1),
          array_length(string_to_array(lower(p.name), ' '), 1)
        )
      ) * 0.8 + 0.2  -- Boost confidence
      ) as confidence
    FROM products p, clean_order_name
    WHERE p.is_active = true
    AND (
      -- Word overlap approach
      array_length(
        string_to_array(lower(clean_order_name.cleaned_name), ' ') 
        && 
        string_to_array(lower(p.name), ' ')
      , 1) > 0
    )
  )
  SELECT 
    true,
    km.id,
    km.name,
    'fuzzy_keyword',
    km.confidence
  INTO found, product_id, product_name, method, confidence
  FROM keyword_matches km
  WHERE km.confidence > 0.6
  ORDER BY km.confidence DESC
  LIMIT 1;
  
  IF FOUND THEN
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Method 4: Partial word matching for edge cases
  SELECT 
    true,
    p.id,
    p.name,
    'partial_match',
    0.50
  INTO found, product_id, product_name, method, confidence
  FROM products p
  WHERE p.is_active = true
  AND (
    lower(p.name) LIKE ANY(
      array[
        '%' || lower(split_part(order_product_name, ' ', 1)) || '%',
        '%' || lower(split_part(order_product_name, ' ', 2)) || '%',
        '%' || lower(split_part(order_product_name, ' ', 3)) || '%'
      ]
    )
  )
  ORDER BY 
    CASE 
      WHEN lower(p.name) LIKE '%' || lower(split_part(order_product_name, ' ', 1)) || '%' THEN 1
      WHEN lower(p.name) LIKE '%' || lower(split_part(order_product_name, ' ', 2)) || '%' THEN 2
      ELSE 3
    END
  LIMIT 1;
  
  IF FOUND THEN
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- If no match found
  RETURN QUERY SELECT false, null::uuid, 'NO_MATCH', 'no_match', 0.00;
END;
$$ LANGUAGE plpgsql;

-- 3. Add missing columns to stock_movements table for enhanced tracking
ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS matching_method text,
ADD COLUMN IF NOT EXISTS confidence_score decimal(3,2),
ADD COLUMN IF NOT EXISTS order_item_id uuid REFERENCES order_items(id);

-- 4. Enhanced stock deduction function that uses mapping
CREATE OR REPLACE FUNCTION process_order_stock_deduction(p_order_id uuid)
RETURNS TABLE(item_id uuid, order_name text, matched_product text, success boolean, method text, confidence decimal(3,2), error_message text) AS $$
DECLARE
  order_item record;
  matched_product record;
  stock_before integer;
  stock_after integer;
BEGIN
  FOR order_item IN 
    SELECT oi.*, o.order_number 
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.order_id = p_order_id
  LOOP
    -- Find matching product using our enhanced function
    SELECT * INTO matched_product
    FROM find_product_match(order_item.name);
    
    IF NOT matched_product.found THEN
      -- Return failure - no product match found
      RETURN QUERY SELECT 
        order_item.id,
        order_item.name,
        'NO_MATCH',
        false,
        'no_match',
        0.00,
        'Product not found in inventory: ' || order_item.name;
      CONTINUE;
    END IF;
    
    -- Get current stock
    SELECT stock INTO stock_before
    FROM products 
    WHERE id = matched_product.product_id;
    
    IF stock_before IS NULL THEN
      RETURN QUERY SELECT 
        order_item.id,
        order_item.name,
        'STOCK_ERROR',
        false,
        matched_product.method,
        matched_product.confidence,
        'Could not retrieve current stock';
      CONTINUE;
    END IF;
    
    -- Check if sufficient stock
    IF stock_before < order_item.quantity THEN
      RETURN QUERY SELECT 
        order_item.id,
        order_item.name,
        matched_product.product_name,
        false,
        matched_product.method,
        matched_product.confidence,
        format('Insufficient stock: have %s, need %s', stock_before, order_item.quantity);
      CONTINUE;
    END IF;
    
    -- Calculate new stock
    stock_after := stock_before - order_item.quantity;
    
    -- Update product stock
    UPDATE products 
    SET 
      stock = stock_after,
      stock_qty = stock_after,
      updated_at = now()
    WHERE id = matched_product.product_id;
    
    -- Create stock movement record
    INSERT INTO stock_movements (
      product_id,
      movement_type,
      quantity,
      order_id,
      order_item_id,
      matching_method,
      confidence_score,
      notes,
      created_at
    ) VALUES (
      matched_product.product_id,
      'sale',
      -order_item.quantity,
      p_order_id,
      order_item.id,
      matched_product.method,
      matched_product.confidence,
      format('Stock deducted - Order %s via %s matching (%.2f%% confidence)', 
             order_item.order_number, 
             matched_product.method, 
             matched_product.confidence * 100),
      now()
    );
    
    -- Return success
    RETURN QUERY SELECT 
      order_item.id,
      order_item.name,
      matched_product.product_name,
      true,
      matched_product.method,
      matched_product.confidence,
      format('Stock updated: %s -> %s (-%s units)', stock_before, stock_after, order_item.quantity);
  END LOOP;
END;
$$ LANGUAGE plpgsql;