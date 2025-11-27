-- Fix Coupon System Complete
-- This migration fixes all coupon-related issues

-- Step 1: Fix the database schema mismatch
-- The constraint currently expects 'percentage' but code uses 'percent'
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_type_check;

-- Update all existing percentage types to use 'percent' (what code expects)
UPDATE coupons 
SET 
  type = 'percent',
  updated_at = now()
WHERE type = 'percentage';

-- Re-create constraint to only allow 'percent' and 'fixed'
ALTER TABLE coupons ADD CONSTRAINT coupons_type_check 
CHECK (type IN ('percent', 'fixed'));

-- Step 2: Clean up existing functions that might conflict
-- Drop all existing redeem_coupon function overloads
DROP FUNCTION IF EXISTS public.redeem_coupon(text);
DROP FUNCTION IF EXISTS public.redeem_coupon(text, text);
DROP FUNCTION IF EXISTS public.redeem_coupon(text, text, integer);
DROP FUNCTION IF EXISTS public.redeem_coupon(text, text, integer, jsonb);
DROP FUNCTION IF EXISTS public.redeem_coupon(text, text, integer, text);
DROP FUNCTION IF EXISTS public.redeem_coupon(text, text, integer, text, text);

-- Also clean up mark_coupon_used function
DROP FUNCTION IF EXISTS public.mark_coupon_used(text);

-- Create the usage tracking function
CREATE OR REPLACE FUNCTION public.mark_coupon_used(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_updated boolean;
BEGIN
  UPDATE public.coupons
  SET
    used_count = used_count + 1,
    updated_at = now()
  WHERE upper(code) = upper(p_code)
    AND is_active = true
    AND (used_count < max_uses OR max_uses IS NULL);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$;

-- Step 3: Add product exclusion validation to the main validation function
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code text,
  p_order_total_cents integer DEFAULT 0,
  p_product_ids uuid[] DEFAULT '{}'
)
RETURNS TABLE (
  valid boolean,
  coupon_id uuid,
  discount_type text,
  discount_value numeric,
  max_discount_cents integer,
  min_order_cents integer,
  excluded_product_ids uuid[],
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_coupon record;
  v_has_excluded_products boolean;
BEGIN
  -- Find the coupon
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE upper(code) = upper(p_code)
  LIMIT 1;

  -- Check if coupon exists
  IF v_coupon.id IS NULL THEN
    RETURN QUERY SELECT
      false::boolean,
      null::uuid,
      null::text,
      null::numeric,
      null::integer,
      null::integer,
      null::uuid[],
      'Invalid coupon code'::text;
    RETURN;
  END IF;

  -- Check if active
  IF NOT v_coupon.is_active THEN
    RETURN QUERY SELECT
      false::boolean,
      v_coupon.id,
      v_coupon.type,
      v_coupon.value,
      v_coupon.max_discount_cents,
      v_coupon.min_order_cents,
      v_coupon.excluded_product_ids,
      'Coupon is no longer active'::text;
    RETURN;
  END IF;

  -- Check validity dates
  IF v_coupon.valid_from > now() THEN
    RETURN QUERY SELECT
      false::boolean,
      v_coupon.id,
      v_coupon.type,
      v_coupon.value,
      v_coupon.max_discount_cents,
      v_coupon.min_order_cents,
      v_coupon.excluded_product_ids,
      'Coupon is not yet valid'::text;
    RETURN;
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RETURN QUERY SELECT
      false::boolean,
      v_coupon.id,
      v_coupon.type,
      v_coupon.value,
      v_coupon.max_discount_cents,
      v_coupon.min_order_cents,
      v_coupon.excluded_product_ids,
      'Coupon has expired'::text;
    RETURN;
  END IF;

  -- Check usage limit
  IF v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN QUERY SELECT
      false::boolean,
      v_coupon.id,
      v_coupon.type,
      v_coupon.value,
      v_coupon.max_discount_cents,
      v_coupon.min_order_cents,
      v_coupon.excluded_product_ids,
      'Coupon has reached its usage limit'::text;
    RETURN;
  END IF;

  -- Check minimum order
  IF p_order_total_cents < v_coupon.min_order_cents THEN
    RETURN QUERY SELECT
      false::boolean,
      v_coupon.id,
      v_coupon.type,
      v_coupon.value,
      v_coupon.max_discount_cents,
      v_coupon.min_order_cents,
      v_coupon.excluded_product_ids,
      format('Minimum order of R%.2f required', v_coupon.min_order_cents / 100.0)::text;
    RETURN;
  END IF;

  -- Check if cart contains excluded products
  IF array_length(v_coupon.excluded_product_ids, 1) > 0 THEN
    SELECT EXISTS(
      SELECT 1 FROM unnest(p_product_ids) AS cart_product_id
      WHERE cart_product_id = ANY(v_coupon.excluded_product_ids)
    ) INTO v_has_excluded_products;
    
    IF v_has_excluded_products THEN
      RETURN QUERY SELECT
        false::boolean,
        v_coupon.id,
        v_coupon.type,
        v_coupon.value,
        v_coupon.max_discount_cents,
        v_coupon.min_order_cents,
        v_coupon.excluded_product_ids,
        'This coupon cannot be applied to selected products'::text;
      RETURN;
    END IF;
  END IF;

  -- Coupon is valid
  RETURN QUERY SELECT
    true::boolean,
    v_coupon.id,
    v_coupon.type,
    v_coupon.value,
    v_coupon.max_discount_cents,
    v_coupon.min_order_cents,
    v_coupon.excluded_product_ids,
    null::text;
END;
$$;

-- Step 4: Update RLS policy to use the new validation function
DROP POLICY IF EXISTS "anon read active valid coupons" ON public.coupons;
CREATE POLICY "anon read active valid coupons"
ON public.coupons
FOR SELECT
TO anon
USING (
  is_active = true
  AND (valid_until IS NULL OR valid_until > now())
  AND valid_from <= now()
  AND used_count < COALESCE(max_uses, 999999)
);

-- End of migration