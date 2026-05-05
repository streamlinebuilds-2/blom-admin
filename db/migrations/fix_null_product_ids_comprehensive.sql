-- PHASE 2: Comprehensive Fix for Null Product IDs
-- This script implements the solution plan to fix product ID null issues
-- while maintaining compatibility with the existing variant system

BEGIN;

-- Step 1: Create or get fallback product for safety
DO $$
DECLARE
  fallback_product_id uuid;
BEGIN
  SELECT id INTO fallback_product_id 
  FROM public.products 
  WHERE name = 'System Fallback Product' LIMIT 1;
  
  IF fallback_product_id IS NULL THEN
    INSERT INTO public.products (
      name, 
      sku, 
      price, 
      price_cents,
      stock,
      stock_qty,
      is_active, 
      is_variant,
      has_variants,
      created_at, 
      updated_at
    )
    VALUES (
      'System Fallback Product', 
      'SYS-FALLBACK-001', 
      0.01,
      1,
      999999,
      999999,
      true,
      false,
      false,
      now(), 
      now()
    )
    RETURNING id INTO fallback_product_id;
    
    RAISE NOTICE 'Created fallback product: %', fallback_product_id;
  ELSE
    RAISE NOTICE 'Using existing fallback product: %', fallback_product_id;
  END IF;
END $$;

-- Step 2: Fix order items with null product_id for the specific problematic order
DO $$
DECLARE
  order_id_text text := '4fc6796e-3b62-4890-8d8d-0e645f6599a3'; -- Treat as text
  fallback_product_id uuid;
  order_item_record record;
  mapped_product_id uuid;
  items_processed integer := 0;
BEGIN
  RAISE NOTICE 'Starting comprehensive fix for order %', order_id_text;

  -- Get fallback product
  SELECT id INTO fallback_product_id 
  FROM public.products 
  WHERE name = 'System Fallback Product' LIMIT 1;

  -- Process each order item with null product_id (using TEXT comparison)
  FOR order_item_record IN
    SELECT oi.id, oi.product_name, oi.sku, oi.unit_price, oi.order_id
    FROM public.order_items oi
    WHERE oi.order_id::text = order_id_text  -- Explicit text comparison
      AND oi.product_id IS NULL
  LOOP
    mapped_product_id := NULL;
    RAISE NOTICE 'Processing item: %', order_item_record.product_name;
    
    -- Method 1: Try exact name match (case insensitive)
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
    
    -- Method 3: Try variant matching (for the variant system)
    IF mapped_product_id IS NULL THEN
      -- Look for variant products that might match
      SELECT id INTO mapped_product_id 
      FROM public.products 
      WHERE (
        name ILIKE '%' || order_item_record.product_name || '%'
        OR variant_name ILIKE '%' || order_item_record.product_name || '%'
      )
        AND is_active = true
        AND (is_variant = true OR has_variants = true)
      LIMIT 1;
    END IF;
    
    -- Method 4: Create product if not found
    IF mapped_product_id IS NULL THEN
      INSERT INTO public.products (
        name, 
        slug,
        sku, 
        price, 
        price_cents,
        stock,
        stock_qty,
        short_description, 
        is_active,
        is_variant,
        has_variants,
        created_at, 
        updated_at
      )
      VALUES (
        order_item_record.product_name,
        lower(replace(order_item_record.product_name, ' ', '-')),
        COALESCE(order_item_record.sku, 'AUTO-' || substr(md5(order_item_record.product_name), 1, 8)),
        COALESCE(order_item_record.unit_price, 0.01),
        COALESCE(order_item_record.unit_price * 100, 1),
        0,
        0,
        'Auto-created for order: BL-MIJ9P3QJ',
        true,
        false,
        false,
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
  
  IF items_processed = 0 THEN
    RAISE NOTICE 'No items with null product_id found for this order';
  END IF;
END $$;

-- Step 3: Safe order status update (type-safe)
-- Only update if the order exists and items are fixed
DO $$
DECLARE
  target_order_id text := '4fc6796e-3b62-4890-8d8d-0e645f6599a3';
  items_with_product_id integer;
BEGIN
  -- Check if order exists and has items with product_id
  SELECT COUNT(*) INTO items_with_product_id
  FROM public.order_items oi
  WHERE oi.order_id::text = target_order_id
    AND oi.product_id IS NOT NULL;
  
  IF items_with_product_id > 0 THEN
    -- Update order status to paid
    UPDATE public.orders 
    SET 
      status = 'paid',
      payment_status = 'paid',
      paid_at = now(),
      updated_at = now()
    WHERE id::text = target_order_id  -- Force text comparison
       OR id::uuid = target_order_id::uuid  -- Force UUID comparison
       OR order_number = 'BL-MIJ9P3QJ'
       OR m_payment_id = 'BL-MIJ9P3QJ';
    
    RAISE NOTICE 'Updated order status to paid - processed % items', items_with_product_id;
  ELSE
    RAISE EXCEPTION 'Cannot update order - no items have valid product_id';
  END IF;
END $$;

-- Step 4: Verification - Check that everything worked
DO $$
DECLARE
  verification_result text;
BEGIN
  -- Check order status
  SELECT 'ORDER_STATUS_CHECK' INTO verification_result;
  RAISE NOTICE '=== VERIFICATION RESULTS ===';
  
  -- Check if order is now paid
  IF EXISTS (SELECT 1 FROM public.orders WHERE order_number = 'BL-MIJ9P3QJ' AND status = 'paid') THEN
    RAISE NOTICE '✅ Order BL-MIJ9P3QJ is now marked as paid';
  ELSE
    RAISE NOTICE '❌ Order BL-MIJ9P3QJ is NOT marked as paid';
  END IF;
  
  -- Check if all order items have product_id
  IF NOT EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON o.id::text = oi.order_id::text
    WHERE o.order_number = 'BL-MIJ9P3QJ' AND oi.product_id IS NULL
  ) THEN
    RAISE NOTICE '✅ All order items now have product_id';
  ELSE
    RAISE NOTICE '❌ Some order items still have NULL product_id';
  END IF;
  
  -- Check if stock movements were created
  IF EXISTS (
    SELECT 1 FROM public.stock_movements sm
    JOIN public.orders o ON o.id::text = sm.order_id::text
    WHERE o.order_number = 'BL-MIJ9P3QJ'
  ) THEN
    RAISE NOTICE '✅ Stock movements were created';
  ELSE
    RAISE NOTICE '⚠️ No stock movements found (may be normal if trigger not active)';
  END IF;
  
  RAISE NOTICE '=== FIX COMPLETE ===';
END $$;

COMMIT;

-- Final summary query
SELECT 
  'FIX_SUMMARY' as result_type,
  o.id::text as order_id,
  o.order_number,
  o.status,
  o.payment_status,
  o.paid_at::text,
  COUNT(oi.id)::text as total_items,
  COUNT(CASE WHEN oi.product_id IS NOT NULL THEN 1 END)::text as items_with_product_id,
  COUNT(sm.id)::text as stock_movements_created
FROM public.orders o
LEFT JOIN public.order_items oi ON o.id::text = oi.order_id::text
LEFT JOIN public.stock_movements sm ON o.id::text = sm.order_id::text
WHERE o.order_number = 'BL-MIJ9P3QJ'
  OR o.m_payment_id = 'BL-MIJ9P3QJ'
GROUP BY o.id, o.order_number, o.status, o.payment_status, o.paid_at;