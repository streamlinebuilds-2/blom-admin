# 🚨 COMPREHENSIVE SOLUTION PLAN: Order Payment & Product ID Issues

## 🔍 **ROOT CAUSE ANALYSIS (CORRECTED)**

### **PRIMARY ISSUE: Data Type Mismatch & Conflicting Systems**

**Problem 1: Data Type Error in Previous Fix**
```sql
-- ❌ FAILED - Type mismatch
SELECT oi.id, oi.product_name, oi.sku, oi.unit_price 
FROM public.order_items oi 
WHERE oi.order_id = order_id_var  -- order_id_var is UUID, but order_id might be TEXT
AND oi.product_id IS NULL
```

**Problem 2: Conflicting Database Changes**
- Website side: Uses different data types and structures
- Admin side: Has different schemas and constraints  
- Multiple migration files created conflicting changes
- Stock movement system has strict NOT NULL constraints

**Problem 3: Inconsistent Order ID Types**
- Some orders store `id` as UUID
- Some orders store `id` as TEXT (like your BL-MIJ9P3QJ order)
- This causes lookup failures and type errors

## 🎯 **COMPREHENSIVE SOLUTION STRATEGY**

### **PHASE 1: Safe Data Type Analysis**

**Step 1.1: Check Actual Data Types**
```sql
-- First, understand what we're working with
SELECT 
  'orders' as table_name,
  'id' as column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'id'

UNION ALL

SELECT 
  'order_items' as table_name,
  'order_id' as column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'order_items' AND column_name = 'order_id'

UNION ALL

SELECT 
  'order_items' as table_name,
  'product_id' as column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'order_items' AND column_name = 'product_id';
```

**Step 1.2: Check Your Specific Order**
```sql
-- Verify order ID type and structure
SELECT 
  'ORDER_FOUND' as check_type,
  id::text as order_id,
  order_number,
  status,
  payment_status,
  data_type as id_data_type
FROM (
  SELECT 
    id, 
    order_number, 
    status, 
    payment_status,
    pg_typeof(id) as data_type
  FROM public.orders 
  WHERE order_number = 'BL-MIJ9P3QJ'
    OR m_payment_id = 'BL-MIJ9P3QJ'
    OR id = '4fc6796e-3b62-4890-8d8d-0e645f6599a3'::uuid
    OR id = '4fc6796e-3b62-4890-8d8d-0e645f6599a3'::text
) order_check;
```

### **PHASE 2: Universal Order Fix (Handles All ID Types)**

**Step 2.1: Find Order Using All Possible ID Types**
```sql
DO $$
DECLARE
  order_id_uuid uuid := '4fc6796e-3b62-4890-8d8d-0e645f6599a3';
  order_id_text text := '4fc6796e-3b62-4890-8d8d-0e645f6599a3';
  order_id_var text;
  order_exists boolean := false;
BEGIN
  -- Try to find the order using different ID types
  SELECT id::text INTO order_id_var 
  FROM public.orders 
  WHERE id = order_id_uuid 
     OR id = order_id_text
     OR order_number = 'BL-MIJ9P3QJ'
     OR m_payment_id = 'BL-MIJ9P3QJ'
  LIMIT 1;
  
  IF order_id_var IS NOT NULL THEN
    order_exists := true;
    RAISE NOTICE 'Found order: %', order_id_var;
  ELSE
    RAISE EXCEPTION 'Order BL-MIJ9P3QJ not found';
  END IF;
END $$;
```

**Step 2.2: Fix Order Items (Type-Safe)**
```sql
DO $$
DECLARE
  order_id_text text := '4fc6796e-3b62-4890-8d8d-0e645f6599a3'; -- Treat as text
  fallback_product_id uuid;
  order_item_record record;
  mapped_product_id uuid;
  items_processed integer := 0;
BEGIN
  RAISE NOTICE 'Starting universal fix for order %', order_id_text;

  -- Get or create fallback product
  SELECT id INTO fallback_product_id 
  FROM public.products 
  WHERE name = 'System Fallback Product' LIMIT 1;
  
  IF fallback_product_id IS NULL THEN
    INSERT INTO public.products (name, sku, price, is_active, created_at, updated_at)
    VALUES ('System Fallback Product', 'SYS-FALLBACK-001', 0.01, true, now(), now())
    RETURNING id INTO fallback_product_id;
    RAISE NOTICE 'Created fallback product: %', fallback_product_id;
  END IF;

  -- Process each order item with null product_id (using TEXT comparison)
  FOR order_item_record IN
    SELECT oi.id, oi.product_name, oi.sku, oi.unit_price, oi.order_id
    FROM public.order_items oi
    WHERE oi.order_id::text = order_id_text  -- Explicit text comparison
      AND oi.product_id IS NULL
  LOOP
    mapped_product_id := NULL;
    
    -- Method 1: Try exact name match
    SELECT id INTO mapped_product_id 
    FROM public.products 
    WHERE LOWER(name) = LOWER(order_item_record.product_name)
      AND is_active = true
    LIMIT 1;
    
    -- Method 2: Try partial name match
    IF mapped_product_id IS NULL THEN
      SELECT id INTO mapped_product_id 
      FROM public.products 
      WHERE name ILIKE '%' || order_item_record.product_name || '%'
        AND is_active = true
      LIMIT 1;
    END IF;
    
    -- Method 3: Create product if not found
    IF mapped_product_id IS NULL THEN
      INSERT INTO public.products (
        name, 
        sku, 
        price, 
        description, 
        is_active, 
        created_at, 
        updated_at
      )
      VALUES (
        order_item_record.product_name,
        COALESCE(order_item_record.sku, 'AUTO-' || substr(md5(order_item_record.product_name), 1, 8)),
        COALESCE(order_item_record.unit_price, 0.01),
        'Auto-created for order: BL-MIJ9P3QJ',
        true,
        now(),
        now()
      )
      RETURNING id INTO mapped_product_id;
      
      RAISE NOTICE 'Auto-created product: % (%)', order_item_record.product_name, mapped_product_id;
    END IF;
    
    -- Update the order item with resolved product_id
    UPDATE public.order_items 
    SET product_id = COALESCE(mapped_product_id, fallback_product_id)
    WHERE id = order_item_record.id;
    
    items_processed := items_processed + 1;
    RAISE NOTICE 'Fixed item %: % -> %', items_processed, order_item_record.product_name, mapped_product_id;
    
  END LOOP;

  RAISE NOTICE 'Successfully processed % order items', items_processed;
END $$;
```

### **PHASE 3: Order Status Update (Type-Safe)**

**Step 3.1: Mark Order as Paid**
```sql
-- Safe order update that handles both UUID and TEXT order IDs
UPDATE public.orders 
SET 
  status = 'paid',
  payment_status = 'paid',
  paid_at = now(),
  updated_at = now()
WHERE id = '4fc6796e-3b62-4890-8d8d-0e645f6599a3'::text  -- Force text comparison
   OR id = '4fc6796e-3b62-4890-8d8d-0e645f6599a3'::uuid  -- Force UUID comparison
   OR order_number = 'BL-MIJ9P3QJ'
   OR m_payment_id = 'BL-MIJ9P3QJ';
```

### **PHASE 4: Verification & Monitoring**

**Step 4.1: Comprehensive Verification**
```sql
-- Verify the fix worked
SELECT 
  'ORDER_STATUS' as check_type,
  id::text as order_id,
  order_number,
  status,
  payment_status,
  paid_at::text,
  total::text as total_amount
FROM public.orders 
WHERE order_number = 'BL-MIJ9P3QJ'
   OR m_payment_id = 'BL-MIJ9P3QJ'
   OR id = '4fc6796e-3b62-4890-8d8d-0e645f6599a3'::text

UNION ALL

SELECT 
  'ORDER_ITEMS' as check_type,
  COUNT(*)::text as order_id,
  'Total Items' as order_number,
  COUNT(CASE WHEN product_id IS NOT NULL THEN 1 END)::text as status,
  'With Product ID' as payment_status,
  '' as paid_at,
  '' as total_amount
FROM public.order_items oi
JOIN public.orders o ON o.id::text = oi.order_id::text
WHERE o.order_number = 'BL-MIJ9P3QJ'

UNION ALL

SELECT 
  'STOCK_MOVEMENTS' as check_type,
  COUNT(*)::text as order_id,
  'Movements Created' as order_number,
  '' as status,
  '' as payment_status,
  '' as paid_at,
  '' as total_amount
FROM public.stock_movements sm
JOIN public.orders o ON o.id::text = sm.order_id::text
WHERE o.order_number = 'BL-MIJ9P3QJ';
```

## 🔧 **PERMANENT SYSTEM FIXES**

### **Fix 1: Standardize Order ID Types**
```sql
-- Create a function to handle both UUID and TEXT order IDs
CREATE OR REPLACE FUNCTION public.find_order_id_by_identifier(p_identifier text)
RETURNS text AS $$
DECLARE
  result_id text;
BEGIN
  -- Try UUID first
  BEGIN
    SELECT id::text INTO result_id 
    FROM public.orders 
    WHERE id = p_identifier::uuid
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    result_id := NULL;
  END;
  
  -- If not found, try as text
  IF result_id IS NULL THEN
    SELECT id::text INTO result_id 
    FROM public.orders 
    WHERE id::text = p_identifier
       OR order_number = p_identifier
       OR m_payment_id = p_identifier
    LIMIT 1;
  END IF;
  
  RETURN result_id;
END;
$$ LANGUAGE plpgsql;
```

### **Fix 2: Update Stock Movement Function**
```sql
-- Update stock movement to handle null product_id gracefully
CREATE OR REPLACE FUNCTION public.create_stock_movements_for_paid_order()
RETURNS TRIGGER AS $$
DECLARE
  order_item RECORD;
  product_record public.products%ROWTYPE;
  fallback_product_id uuid;
BEGIN
  -- Get fallback product for null cases
  SELECT id INTO fallback_product_id 
  FROM public.products 
  WHERE name = 'System Fallback Product' LIMIT 1;
  
  IF fallback_product_id IS NULL THEN
    INSERT INTO public.products (name, sku, price, is_active)
    VALUES ('System Fallback Product', 'SYS-FALLBACK', 0.01, true)
    RETURNING id INTO fallback_product_id;
  END IF;

  -- Only process if order status changed to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    
    -- Process each order item
    FOR order_item IN 
      SELECT oi.*, p.product_type, p.sku as product_sku
      FROM public.order_items oi
      LEFT JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id::text = NEW.id::text  -- Handle both types
    LOOP
      -- Skip courses and digital products
      IF order_item.product_type = 'course' THEN
        CONTINUE;
      END IF;
      
      -- Use fallback product if product_id is null
      v_effective_product_id := COALESCE(order_item.product_id, fallback_product_id);
      
      -- Create stock movement record
      INSERT INTO public.stock_movements (
        product_id,
        order_id,
        order_item_id,
        delta,
        reason,
        reference,
        metadata
      ) VALUES (
        v_effective_product_id,
        NEW.id::text,
        order_item.id,
        -order_item.quantity,
        'sale',
        COALESCE(NEW.order_number, NEW.id::text),
        jsonb_build_object(
          'product_name', order_item.product_name,
          'variant_title', order_item.variant_title,
          'unit_price', order_item.unit_price,
          'payment_status', NEW.payment_status,
          'buyer_email', NEW.buyer_email,
          'was_fallback', order_item.product_id IS NULL
        )
      );
      
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 📋 **EXECUTION PLAN**

### **Step 1: Data Type Analysis**
Run the data type checking queries first to understand your actual schema

### **Step 2: Universal Order Fix**
Execute the type-safe order item fixing script

### **Step 3: Order Status Update**
Mark the order as paid using type-safe queries

### **Step 4: Verification**
Confirm everything worked correctly

### **Step 5: Deploy Permanent Fixes**
Apply the system-wide fixes to prevent future issues

## ⚠️ **SAFETY MEASURES**

1. **Always use explicit type casting** (`::text`, `::uuid`)
2. **Test with small batches first**
3. **Have rollback scripts ready**
4. **Monitor stock movement creation**
5. **Verify order status changes**

This approach handles the conflicting changes between website and admin sides by being explicit about data types and using universal lookup methods.