# Product Name Matching & Stock Movement Plan

## 🔍 **PROBLEM IDENTIFIED**
Order names don't match inventory names:
- **Order**: "Nail File (80/80 Grit) - Single File"
- **Inventory**: "Hand Files / Single File"
- **Result**: No match = No stock deduction = No analytics

## 📋 **COMPREHENSIVE SOLUTION PLAN**

### **PHASE 1: Product Name Mapping System**
Create a mapping table to link order names to inventory names:

```sql
-- Product Name Mapping Table
CREATE TABLE product_name_mapping (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_name text NOT NULL,           -- Names as they appear in orders
  inventory_name text NOT NULL,       -- Names as they appear in stock
  category_pattern text,              -- Core Acrylics, Cuticle Oil, etc.
  brand text,                         -- Brand information if applicable
  match_confidence decimal(3,2),     -- 0.00 to 1.00 confidence score
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### **PHASE 2: Enhanced Matching Algorithm**
Implement multi-level matching:

1. **Exact Name Match** (100% confidence)
2. **Category + Variant Match** (95% confidence)
3. **Fuzzy Text Matching** (80% confidence)
4. **Partial Word Matching** (60% confidence)
5. **Manual Override** (Manual mapping)

### **PHASE 3: Stock Movement Tracking**
Create proper stock movements for every order:

```sql
-- Enhanced Stock Movements Table
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS order_item_id uuid;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS matching_method text;
ALTER TABLE STOCK_MOVEMENTS ADD COLUMN IF NOT EXISTS confidence_score decimal(3,2);
```

### **PHASE 4: UI Integration**
Update stock page to show:
- All products with their current stock
- Recent stock movements with order details
- Manual adjustment buttons
- Mismatch alerts for products that couldn't be matched

## 🎯 **IMPLEMENTATION STEPS**

### **Step 1: Create Mapping Table & Data**
Populate the mapping table with common product name patterns:

```sql
-- Sample mappings based on your data:
INSERT INTO product_name_mapping (order_name, inventory_name, category_pattern, match_confidence) VALUES
('Nail File (80/80 Grit) - Single File', 'Hand Files / Single File', 'Hand Files', 0.95),
('Core Acrylics - AvanéSignatureNude (071)', 'Core Acrylics / AvanéSignatureNude (071)', 'Core Acrylics', 0.95),
('Cuticle Oil - Vanilla', 'Cuticle Oil / Vanilla', 'Cuticle Oil', 0.95),
('Colour Acrylics - 040', 'Colour Acrylics / 040', 'Colour Acrylics', 0.95),
('Nail File (80/80 Grit) - 5-Pack Bundle', 'Hand Files / 5-Pack Bundle', 'Hand Files', 0.95),
('Prep & Primer Bundle', 'Prep & Primer Bundle', 'Bundle', 0.95);
```

### **Step 2: Enhanced Order Processing Function**
Update the order status function to use the mapping system:

1. **Check mapping table first**
2. **Fall back to fuzzy matching**
3. **Create detailed stock movements**
4. **Log confidence scores and matching method**

### **Step 3: Data Migration for Existing Orders**
Process historical orders to create stock movements:

```sql
-- Process all existing paid orders
DO $$
DECLARE
  order_record RECORD;
  item_record RECORD;
  mapped_product record;
BEGIN
  FOR order_record IN SELECT id FROM orders WHERE status = 'paid' LOOP
    FOR item_record IN SELECT * FROM order_items WHERE order_id = order_record.id LOOP
      -- Find matching product
      SELECT * INTO mapped_product 
      FROM find_product_match(item_record.name);
      
      IF mapped_product.found THEN
        -- Create stock movement
        INSERT INTO stock_movements (
          product_id, movement_type, quantity, order_id, 
          matching_method, confidence_score, notes
        ) VALUES (
          mapped_product.product_id, 'sale', -item_record.quantity, order_record.id,
          mapped_product.method, mapped_product.confidence, 'Historical order processed'
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;
```

## 🔧 **TECHNICAL IMPLEMENTATION**

### **Enhanced Matching Function**
```sql
CREATE OR REPLACE FUNCTION find_product_match(order_product_name text)
RETURNS TABLE(found boolean, product_id uuid, method text, confidence decimal(3,2)) AS $$
BEGIN
  -- Method 1: Exact mapping
  SELECT true, pnm.inventory_product_id, 'exact_mapping', 1.00
  INTO found, product_id, method, confidence
  FROM product_name_mapping pnm
  WHERE pnm.order_name ILIKE '%' || order_product_name || '%'
  AND pnm.is_active = true
  LIMIT 1;
  
  IF FOUND THEN
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Method 2: Category + Variant matching
  -- Method 3: Fuzzy matching
  -- Method 4: Partial word matching
  
  -- If no match found
  RETURN QUERY SELECT false, null::uuid, 'no_match', 0.00;
END;
$$ LANGUAGE plpgsql;
```

## 📊 **EXPECTED RESULTS**

After implementation:
- ✅ **Items Sold**: Will populate with real numbers
- ✅ **Best Selling**: Will show actual top products
- ✅ **Stock Movements**: Will display in stock page
- ✅ **Stock Deduction**: Will work for all order items
- ✅ **Analytics**: Will update correctly
- ✅ **Manual Mappings**: Can handle edge cases

## 🚀 **NEXT ACTIONS**

1. **Create the mapping table and sample data**
2. **Implement the enhanced matching algorithm**  
3. **Update order processing function**
4. **Test with recent orders**
5. **Deploy and verify functionality**

This plan will solve the core issue of product name mismatches and ensure stock movements appear correctly!