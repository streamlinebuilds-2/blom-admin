-- Coupons Table and RLS Setup
-- Safe to run multiple times; idempotent guards included.

-- 1) Create coupons table if not exists
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  notes text,
  is_active boolean not null default true,
  type text not null check (type in ('percentage', 'fixed')),
  value numeric not null,
  min_order_cents integer not null default 0,
  max_discount_cents integer,
  max_uses integer not null default 1,
  used_count integer not null default 0,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  excluded_product_ids uuid[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for performance
create index if not exists idx_coupons_code on public.coupons(code);
create index if not exists idx_coupons_is_active on public.coupons(is_active);
create index if not exists idx_coupons_valid_until on public.coupons(valid_until);

-- 2) Enable RLS
alter table public.coupons enable row level security;

-- 3) RLS Policies

-- Allow anyone to read active, valid coupons (for customer site validation)
drop policy if exists "anon read active valid coupons" on public.coupons;
create policy "anon read active valid coupons"
on public.coupons
for select
to anon
using (
  is_active = true
  AND (valid_until IS NULL OR valid_until > now())
  AND valid_from <= now()
  AND used_count < max_uses
);

-- Allow authenticated users to read all coupons (admin panel)
drop policy if exists "authenticated read all coupons" on public.coupons;
create policy "authenticated read all coupons"
on public.coupons
for select
to authenticated
using (true);

-- Service role can do everything (Netlify functions use this)
-- No explicit policy needed as service_role bypasses RLS

-- 4) Function to validate a coupon code (for customer site)
create or replace function public.validate_coupon(
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

-- 5) Function to mark a coupon as used (increment used_count)
create or replace function public.mark_coupon_used(p_code text)
returns boolean
language plpgsql
security definer
as $$
declare
  v_updated boolean;
begin
  update public.coupons
  set
    used_count = used_count + 1,
    updated_at = now()
  where upper(code) = upper(p_code)
    and is_active = true
    and used_count < max_uses;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- 6) Function to calculate discount amount
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
  if v_coupon.type = 'percentage' then
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

-- 7) Trigger to update updated_at timestamp
create or replace function public.update_coupons_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_update_coupons_updated_at on public.coupons;
create trigger trigger_update_coupons_updated_at
  before update on public.coupons
  for each row
  execute function public.update_coupons_updated_at();

-- End of script
