-- Migration to fix coupon type handling
-- This migration does two things:
-- 1. Updates the calculate_coupon_discount function to be case-insensitive
-- 2. Normalizes existing coupon types to lowercase

-- First, normalize all existing coupon types to lowercase
update public.coupons
set type = lower(trim(type))
where type != lower(trim(type));

-- Update any 'percent' to 'percentage'
update public.coupons
set type = 'percentage'
where lower(trim(type)) in ('percent', 'pct', '%');

-- Update any variations of 'fixed'
update public.coupons
set type = 'fixed'
where lower(trim(type)) in ('fix', 'rand', 'r', 'amount');

-- Now update the calculate_coupon_discount function to handle type comparison more robustly
create or replace function public.calculate_coupon_discount(
  p_code text,
  p_subtotal_cents integer,
  p_excluded_product_total_cents integer default 0
)
returns integer
language plpgsql
security definer
as $$
declare
  v_coupon record;
  v_eligible_amount integer;
  v_discount integer;
  v_type text;
begin
  -- Get coupon details
  select * into v_coupon
  from public.coupons
  where upper(code) = upper(p_code)
    and is_active = true
    and valid_from <= now()
    and (valid_until is null or valid_until > now())
    and used_count < max_uses
  limit 1;

  if v_coupon.id is null then
    return 0;
  end if;

  -- Calculate eligible amount (subtract excluded products)
  v_eligible_amount := p_subtotal_cents - p_excluded_product_total_cents;

  if v_eligible_amount <= 0 then
    return 0;
  end if;

  -- Check minimum order requirement
  if v_eligible_amount < v_coupon.min_order_cents then
    return 0;
  end if;

  -- Normalize type for comparison (case-insensitive)
  v_type := lower(trim(v_coupon.type));

  -- Calculate discount based on type
  if v_type = 'percentage' or v_type like '%percent%' then
    v_discount := round(v_eligible_amount * (v_coupon.value / 100.0));

    -- Apply max discount cap if set
    if v_coupon.max_discount_cents is not null and v_discount > v_coupon.max_discount_cents then
      v_discount := v_coupon.max_discount_cents;
    end if;
  elsif v_type = 'fixed' or v_type like '%fixed%' or v_type = 'r' or v_type = 'rand' or v_type = 'amount' then
    -- Fixed amount discount (value is in Rands, convert to cents)
    v_discount := round(v_coupon.value * 100);

    -- Don't discount more than the eligible amount
    if v_discount > v_eligible_amount then
      v_discount := v_eligible_amount;
    end if;
  else
    -- Unknown type, return 0 as a safe fallback
    v_discount := 0;
  end if;

  return v_discount;
end;
$$;

-- Also update the validate_coupon function to be case-insensitive
create or replace function public.validate_coupon(
  p_code text,
  p_subtotal_cents integer default 0
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_coupon record;
  v_now timestamp with time zone := now();
  v_type text;
begin
  -- Get coupon by code (case-insensitive)
  select * into v_coupon
  from public.coupons
  where upper(code) = upper(p_code)
  limit 1;

  if v_coupon.id is null then
    return jsonb_build_object(
      'valid', false,
      'error', 'Coupon code not found'
    );
  end if;

  -- Check if active
  if not v_coupon.is_active then
    return jsonb_build_object(
      'valid', false,
      'error', 'Coupon is not active'
    );
  end if;

  -- Check valid_from
  if v_coupon.valid_from > v_now then
    return jsonb_build_object(
      'valid', false,
      'error', 'Coupon is not yet valid'
    );
  end if;

  -- Check valid_until
  if v_coupon.valid_until is not null and v_coupon.valid_until <= v_now then
    return jsonb_build_object(
      'valid', false,
      'error', 'Coupon has expired'
    );
  end if;

  -- Check usage
  if v_coupon.used_count >= v_coupon.max_uses then
    return jsonb_build_object(
      'valid', false,
      'error', 'Coupon usage limit reached'
    );
  end if;

  -- Check minimum order (if subtotal provided)
  if p_subtotal_cents > 0 and p_subtotal_cents < v_coupon.min_order_cents then
    return jsonb_build_object(
      'valid', false,
      'error', format('Minimum order of R%.2f required', v_coupon.min_order_cents / 100.0)
    );
  end if;

  -- Normalize type for response
  v_type := lower(trim(v_coupon.type));

  -- Coupon is valid
  return jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'type', case
      when v_type = 'percentage' or v_type like '%percent%' then 'percentage'
      when v_type = 'fixed' or v_type like '%fixed%' then 'fixed'
      else v_type
    end,
    'value', v_coupon.value,
    'min_order_cents', v_coupon.min_order_cents,
    'max_discount_cents', v_coupon.max_discount_cents,
    'excluded_product_ids', v_coupon.excluded_product_ids
  );
end;
$$;
