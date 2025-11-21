-- Ensure specials table exists with correct schema
-- This migration fixes the missing discount_value column issue

-- Drop table if exists and recreate to ensure schema is correct
DROP TABLE IF EXISTS public.specials CASCADE;

-- Recreate specials table with proper schema
create table public.specials (
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
create index idx_specials_status on public.specials(status);
create index idx_specials_starts_at on public.specials(starts_at);
create index idx_specials_ends_at on public.specials(ends_at);
create index idx_specials_scope on public.specials(scope);

-- Enable RLS
alter table public.specials enable row level security;

-- RLS Policies

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

-- Function to compute the current status of a special based on time
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

-- Trigger to automatically update status based on dates on insert/update
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
  execute function update_special_status();