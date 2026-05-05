-- Fix coupon percentage calculation function
-- The calculate_coupon_discount function needs to check for 'percent' type, not 'percentage'

-- Step 1: Update the calculate_coupon_discount function
CREATE OR REPLACE FUNCTION public.calculate_coupon_discount(
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

  -- Calculate discount based on type
  -- Fixed: check for 'percent' type (updated from 'percentage')
  if v_coupon.type = 'percent' then
    v_discount := round(v_eligible_amount * (v_coupon.value / 100.0));

    -- Apply max discount cap if set
    if v_coupon.max_discount_cents is not null and v_discount > v_coupon.max_discount_cents then
      v_discount := v_coupon.max_discount_cents;
    end if;
  else
    -- Fixed amount discount (value is in Rands, convert to cents)
    v_discount := round(v_coupon.value * 100);

    -- Don't discount more than the eligible amount
    if v_discount > v_eligible_amount then
      v_discount := v_eligible_amount;
    end if;
  end if;

  return v_discount;
end;
$$;

-- Step 2: Also update the validate_coupon function to be consistent
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code text,
  p_order_total_cents integer default 0
)
returns table (
  valid boolean,
  coupon_id uuid,
  discount_type text,
  discount_value numeric,
  max_discount_cents integer,
  min_order_cents integer,
  excluded_product_ids uuid[],
  error_message text
)
language plpgsql
security definer
as $$
declare
  v_coupon record;
begin
  -- Find the coupon
  select * into v_coupon
  from public.coupons
  where upper(code) = upper(p_code)
  limit 1;

  -- Check if coupon exists
  if v_coupon.id is null then
    return query select
      false::boolean,
      null::uuid,
      null::text,
      null::numeric,
      null::integer,
      null::integer,
      null::uuid[],
      'Invalid coupon code'::text;
    return;
  end if;

  -- Check if active
  if not v_coupon.is_active then
    return query select
      false::boolean,
      v_coupon.id,
      v_coupon.type,
      v_coupon.value,
      v_coupon.max_discount_cents,
      v_coupon.min_order_cents,
      v_coupon.excluded_product_ids,
      'Coupon is no longer active'::text;
    return;
  end if;

  -- Check validity dates
  if v_coupon.valid_from > now() then
    return query select
      false::boolean,
      v_coupon.id,
      v_coupon.type,
      v_coupon.value,
      v_coupon.max_discount_cents,
      v_coupon.min_order_cents,
      v_coupon.excluded_product_ids,
      'Coupon is not yet valid'::text;
    return;
  end if;

  if v_coupon.valid_until is not null and v_coupon.valid_until < now() then
    return query select
      false::boolean,
      v_coupon.id,
      v_coupon.type,
      v_coupon.value,
      v_coupon.max_discount_cents,
      v_coupon.min_order_cents,
      v_coupon.excluded_product_ids,
      'Coupon has expired'::text;
    return;
  end if;

  -- Check usage limit
  if v_coupon.used_count >= v_coupon.max_uses then
    return query select
      false::boolean,
      v_coupon.id,
      v_coupon.type,
      v_coupon.value,
      v_coupon.max_discount_cents,
      v_coupon.min_order_cents,
      v_coupon.excluded_product_ids,
      'Coupon has reached its usage limit'::text;
    return;
  end if;

  -- Check minimum order
  if p_order_total_cents < v_coupon.min_order_cents then
    return query select
      false::boolean,
      v_coupon.id,
      v_coupon.type,
      v_coupon.value,
      v_coupon.max_discount_cents,
      v_coupon.min_order_cents,
      v_coupon.excluded_product_ids,
      format('Minimum order of R%.2f required', v_coupon.min_order_cents / 100.0)::text;
    return;
  end if;

  -- Coupon is valid
  return query select
    true::boolean,
    v_coupon.id,
    v_coupon.type,
    v_coupon.value,
    v_coupon.max_discount_cents,
    v_coupon.min_order_cents,
    v_coupon.excluded_product_ids,
    null::text;
end;
$$;