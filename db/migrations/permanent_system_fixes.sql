-- PHASE 4: Permanent System Fixes
-- These fixes prevent future null product_id issues while maintaining compatibility

-- Fix 1: Universal Order ID Resolution Function
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

-- Fix 2: Enhanced Stock Movement Function (compatible with variant system)
CREATE OR REPLACE FUNCTION public.create_stock_movements_for_paid_order()
RETURNS TRIGGER AS $$
DECLARE
  order_item RECORD;
  product_record public.products%ROWTYPE;
  fallback_product_id uuid;
  v_effective_product_id uuid;
BEGIN
  -- Get fallback product for null cases
  SELECT id INTO fallback_product_id 
  FROM public.products 
  WHERE name = 'System Fallback Product' LIMIT 1;
  
  IF fallback_product_id IS NULL THEN
    INSERT INTO public.products (name, sku, price, price_cents, stock, stock_qty, is_active, is_variant, has_variants)
    VALUES ('System Fallback Product', 'SYS-FALLBACK', 0.01, 1, 999999, 999999, true, false, false)
    RETURNING id INTO fallback_product_id;
  END IF;

  -- Only process if order status changed to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    
    -- Process each order item
    FOR order_item IN 
      SELECT oi.*, p.is_variant, p.parent_product_id, p.variant_name, p.has_variants
      FROM public.order_items oi
      LEFT JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id::text = NEW.id::text  -- Handle both UUID and TEXT types
    LOOP
      -- Use fallback product if product_id is null
      v_effective_product_id := COALESCE(order_item.product_id, fallback_product_id);
      
      -- Skip if no valid product_id found
      IF v_effective_product_id IS NULL THEN
        RAISE WARNING 'Skipping order item % - no valid product_id found', order_item.id;
        CONTINUE;
      END IF;
      
      -- Get product details for logging
      SELECT * INTO product_record FROM public.products WHERE id = v_effective_product_id;
      
      -- Create stock movement record
      INSERT INTO public.stock_movements (
        product_id,
        movement_type,
        quantity,
        reason,
        reference_id,
        reference_type,
        created_at,
        -- Additional fields for compatibility
        delta,
        order_id,
        order_item_id,
        metadata
      ) VALUES (
        v_effective_product_id,
        'sale',
        -order_item.quantity,
        'Order paid - stock deduction',
        NEW.id::text,
        'order',
        NOW(),
        -- Backward compatibility fields
        -order_item.quantity,
        NEW.id::text,
        order_item.id,
        jsonb_build_object(
          'product_name', order_item.product_name,
          'variant_name', order_item.variant_name,
          'unit_price', order_item.unit_price,
          'payment_status', NEW.payment_status,
          'buyer_name', NEW.buyer_name,
          'was_fallback', order_item.product_id IS NULL,
          'is_variant', product_record.is_variant,
          'variant_system', product_record.has_variants
        )
      );
      
      -- Update product stock (handle both regular and variant products)
      UPDATE public.products 
      SET 
        stock = GREATEST(0, stock - order_item.quantity),
        stock_qty = GREATEST(0, stock_qty - order_item.quantity),
        is_active = CASE 
          WHEN GREATEST(0, stock - order_item.quantity) > 0 THEN is_active
          ELSE false 
        END,
        updated_at = NOW()
      WHERE id = v_effective_product_id;
      
      RAISE NOTICE 'Stock movement created for product % (%), qty: %', 
        product_record.name, v_effective_product_id, order_item.quantity;
      
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix 3: Product Resolution Function for Order Items
CREATE OR REPLACE FUNCTION public.resolve_product_for_order_item(
  p_product_name text,
  p_sku text DEFAULT NULL,
  p_unit_price numeric DEFAULT NULL,
  p_variant_name text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  resolved_product_id uuid;
  fallback_product_id uuid;
BEGIN
  -- Get fallback product
  SELECT id INTO fallback_product_id 
  FROM public.products 
  WHERE name = 'System Fallback Product' LIMIT 1;
  
  IF fallback_product_id IS NULL THEN
    INSERT INTO public.products (name, sku, price, price_cents, stock, stock_qty, is_active)
    VALUES ('System Fallback Product', 'SYS-FALLBACK', 0.01, 1, 999999, 999999, true)
    RETURNING id INTO fallback_product_id;
  END IF;

  -- Try exact name match first
  SELECT id INTO resolved_product_id 
  FROM public.products 
  WHERE LOWER(name) = LOWER(p_product_name)
    AND is_active = true
  LIMIT 1;
  
  -- Try variant matching if exact match fails
  IF resolved_product_id IS NULL AND p_variant_name IS NOT NULL THEN
    SELECT id INTO resolved_product_id 
    FROM public.products 
    WHERE (
      (name ILIKE '%' || p_product_name || '%' AND variant_name = p_variant_name)
      OR (variant_name = p_variant_name AND parent_product_id IS NOT NULL)
    )
      AND is_active = true
    LIMIT 1;
  END IF;
  
  -- Try partial name match
  IF resolved_product_id IS NULL THEN
    SELECT id INTO resolved_product_id 
    FROM public.products 
    WHERE name ILIKE '%' || p_product_name || '%'
      AND is_active = true
    LIMIT 1;
  END IF;
  
  -- Create product if still not found
  IF resolved_product_id IS NULL THEN
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
      variant_name,
      is_variant,
      created_at, 
      updated_at
    )
    VALUES (
      p_product_name,
      lower(replace(p_product_name, ' ', '-')),
      COALESCE(p_sku, 'AUTO-' || substr(md5(p_product_name), 1, 8)),
      COALESCE(p_unit_price, 0.01),
      COALESCE(p_unit_price * 100, 1),
      0,
      0,
      'Auto-created from order processing',
      true,
      p_variant_name,
      p_variant_name IS NOT NULL,
      now(),
      now()
    )
    RETURNING id INTO resolved_product_id;
    
    RAISE NOTICE 'Auto-created product for order: % (%)', p_product_name, resolved_product_id;
  END IF;
  
  RETURN COALESCE(resolved_product_id, fallback_product_id);
END;
$$ LANGUAGE plpgsql;

-- Fix 4: Enhanced Order Status Update Function
CREATE OR REPLACE FUNCTION public.safe_update_order_status(
  p_order_identifier text,
  p_new_status text DEFAULT 'paid'
)
RETURNS json AS $$
DECLARE
  v_order_id text;
  v_order_record public.orders%ROWTYPE;
  v_items_updated integer := 0;
  v_result json;
BEGIN
  -- Find the order using universal function
  v_order_id := find_order_id_by_identifier(p_order_identifier);
  
  IF v_order_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Order not found: ' || p_order_identifier
    );
  END IF;
  
  -- Get order record
  SELECT * INTO v_order_record FROM public.orders WHERE id::text = v_order_id;
  
  -- Check if order already has the target status
  IF v_order_record.status = p_new_status THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Order already has status: ' || p_new_status,
      'order_id', v_order_id
    );
  END IF;
  
  -- Update order status
  UPDATE public.orders 
  SET 
    status = p_new_status,
    payment_status = CASE WHEN p_new_status = 'paid' THEN 'paid' ELSE payment_status END,
    paid_at = CASE WHEN p_new_status = 'paid' THEN NOW() ELSE paid_at END,
    updated_at = NOW()
  WHERE id::text = v_order_id;
  
  -- Count updated items
  SELECT COUNT(*) INTO v_items_updated
  FROM public.order_items 
  WHERE order_id::text = v_order_id 
    AND product_id IS NOT NULL;
  
  v_result := json_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_record.order_number,
    'old_status', v_order_record.status,
    'new_status', p_new_status,
    'items_processed', v_items_updated,
    'timestamp', NOW()
  );
  
  RAISE NOTICE 'Order status updated: % from % to %', v_order_record.order_number, v_order_record.status, p_new_status;
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'order_id', v_order_id
  );
END;
$$ LANGUAGE plpgsql;

-- Fix 5: Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_create_stock_movements_on_payment ON orders;
CREATE TRIGGER trigger_create_stock_movements_on_payment
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_stock_movements_for_paid_order();

-- Fix 6: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_identifier_lookup 
ON public.orders (order_number, m_payment_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_lookup 
ON public.order_items (order_id, product_id) 
WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_name_lookup 
ON public.products (LOWER(name)) 
WHERE is_active = true;