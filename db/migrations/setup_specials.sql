-- Specials/Promotions Table and RLS Setup
-- Safe to run multiple times; idempotent guards included.

-- 1) Create specials table if not exists
create table if not exists public.specials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  scope text not null default 'product' check (scope in ('product', 'bundle', 'sitewide')),
  target_ids uuid[] default '{}',
  discount_type text not null check (discount_type in ('percent', 'amount_off', 'fixed_price')),
  discount_value numeric not null,
  status text not null default 'scheduled' check (status in ('active', 'scheduled', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for performance
create index if not exists idx_specials_status on public.specials(status);
create index if not exists idx_specials_starts_at on public.specials(starts_at);
create index if not exists idx_specials_ends_at on public.specials(ends_at);
create index if not exists idx_specials_scope on public.specials(scope);

-- 2) Enable RLS
alter table public.specials enable row level security;

-- 3) RLS Policies

-- Allow anyone to read active specials (for customer site)
drop policy if exists "anon read active specials" on public.specials;
create policy "anon read active specials"
on public.specials
for select
to anon
using (
  status = 'active'
  AND starts_at <= now()
  AND ends_at > now()
);

-- Allow authenticated users to read all specials (admin panel)
drop policy if exists "authenticated read all specials" on public.specials;
create policy "authenticated read all specials"
on public.specials
for select
to authenticated
using (true);

-- Allow authenticated users to insert specials (admin panel)
drop policy if exists "authenticated insert specials" on public.specials;
create policy "authenticated insert specials"
on public.specials
for insert
to authenticated
with check (true);

-- Allow authenticated users to update specials (admin panel)
drop policy if exists "authenticated update specials" on public.specials;
create policy "authenticated update specials"
on public.specials
for update
to authenticated
using (true)
with check (true);

-- Allow authenticated users to delete specials (admin panel)
drop policy if exists "authenticated delete specials" on public.specials;
create policy "authenticated delete specials"
on public.specials
for delete
to authenticated
using (true);

-- 4) Function to compute the current status of a special based on time
create or replace function public.compute_special_status(
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns text
language plpgsql
immutable
as $$
begin
  if p_ends_at <= now() then
    return 'expired';
  elsif p_starts_at > now() then
    return 'scheduled';
  else
    return 'active';
  end if;
end;
$$;

-- 5) Trigger to automatically update status based on dates on insert/update
create or replace function public.update_special_status()
returns trigger
language plpgsql
as $$
begin
  new.status := public.compute_special_status(new.starts_at, new.ends_at);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trigger_update_special_status on public.specials;
create trigger trigger_update_special_status
  before insert or update on public.specials
  for each row
  execute function public.update_special_status();

-- 6) Function to get active specials for a product
create or replace function public.get_active_specials_for_product(p_product_id uuid)
returns table (
  id uuid,
  title text,
  discount_type text,
  discount_value numeric,
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
security definer
as $$
begin
  return query
  select
    s.id,
    s.title,
    s.discount_type,
    s.discount_value,
    s.starts_at,
    s.ends_at
  from public.specials s
  where (
    s.scope = 'sitewide'
    OR (s.scope = 'product' AND p_product_id = ANY(s.target_ids))
  )
  AND s.starts_at <= now()
  AND s.ends_at > now()
  order by s.discount_value desc
  limit 1;
end;
$$;

-- 7) Function to get active specials for a bundle
create or replace function public.get_active_specials_for_bundle(p_bundle_id uuid)
returns table (
  id uuid,
  title text,
  discount_type text,
  discount_value numeric,
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
security definer
as $$
begin
  return query
  select
    s.id,
    s.title,
    s.discount_type,
    s.discount_value,
    s.starts_at,
    s.ends_at
  from public.specials s
  where (
    s.scope = 'sitewide'
    OR (s.scope = 'bundle' AND p_bundle_id = ANY(s.target_ids))
  )
  AND s.starts_at <= now()
  AND s.ends_at > now()
  order by s.discount_value desc
  limit 1;
end;
$$;

-- 8) Function to calculate discounted price
create or replace function public.calculate_special_price(
  p_original_price numeric,
  p_discount_type text,
  p_discount_value numeric
)
returns numeric
language plpgsql
immutable
as $$
begin
  case p_discount_type
    when 'percent' then
      return round(p_original_price * (1 - p_discount_value / 100.0), 2);
    when 'amount_off' then
      return greatest(0, p_original_price - p_discount_value);
    when 'fixed_price' then
      return p_discount_value;
    else
      return p_original_price;
  end case;
end;
$$;

-- 9) Function to refresh all special statuses (can be called periodically)
create or replace function public.refresh_special_statuses()
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  update public.specials
  set status = public.compute_special_status(starts_at, ends_at)
  where status != public.compute_special_status(starts_at, ends_at);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- End of script
