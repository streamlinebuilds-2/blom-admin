-- Base-44 Admin requirements – Supabase SQL
-- Project: yvmnedjybrpvlupygusf
-- Schema: public
-- Safe to run multiple times; idempotent guards included.

create extension if not exists pgcrypto;

-- 1) Product Reviews schema + policies
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  reviewer_name text not null,
  reviewer_email text not null,
  rating int2 not null check (rating between 1 and 5),
  title text,
  comment text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  source text,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_reviews_product_id on public.product_reviews(product_id);
create index if not exists idx_product_reviews_status_created_at on public.product_reviews(status, created_at desc);

alter table public.product_reviews enable row level security;

drop policy if exists "public read approved reviews" on public.product_reviews;
create policy "public read approved reviews"
on public.product_reviews
for select
to anon
using (status = 'approved');

drop policy if exists "authenticated read all reviews" on public.product_reviews;
create policy "authenticated read all reviews"
on public.product_reviews
for select
to authenticated
using (true);

-- 2) Contacts schema + RLS (used by admin Messages)
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  image_url text,
  status text not null default 'new' check (status in ('new','responded','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contacts_status_created_at on public.contacts(status, created_at desc);

alter table public.contacts enable row level security;

drop policy if exists "authenticated read contacts" on public.contacts;
create policy "authenticated read contacts"
on public.contacts
for select
to authenticated
using (true);

drop policy if exists "authenticated update contacts" on public.contacts;
create policy "authenticated update contacts"
on public.contacts
for update
to authenticated
using (true)
with check (true);

-- 3) Orders RLS (admin reads)
do $$
begin
  if to_regclass('public.orders') is not null then
    execute 'alter table public.orders enable row level security';
    execute 'drop policy if exists "authenticated read orders" on public.orders';
    execute 'create policy "authenticated read orders" on public.orders for select to authenticated using (true)';
  end if;
end
$$;

-- End of script