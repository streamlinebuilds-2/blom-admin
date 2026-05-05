-- Contacts Table Setup
-- Stores customer/subscriber contact information for promotional purposes
-- Safe to run multiple times; idempotent guards included.

-- 1) Create contacts table if not exists
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  phone text,
  source text not null default 'manual' check (source in ('beauty_club_signup', 'account_creation', 'manual', 'order')),
  subscribed boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create unique index on email to prevent duplicates
create unique index if not exists idx_contacts_email on public.contacts(email);

-- Create indexes for performance
create index if not exists idx_contacts_source on public.contacts(source);
create index if not exists idx_contacts_subscribed on public.contacts(subscribed);
create index if not exists idx_contacts_created_at on public.contacts(created_at desc);

-- 2) Enable RLS
alter table public.contacts enable row level security;

-- 3) RLS Policies

-- Allow authenticated users (admin panel) to read all contacts
drop policy if exists "authenticated read all contacts" on public.contacts;
create policy "authenticated read all contacts"
on public.contacts
for select
to authenticated
using (true);

-- Allow authenticated users to insert contacts
drop policy if exists "authenticated insert contacts" on public.contacts;
create policy "authenticated insert contacts"
on public.contacts
for insert
to authenticated
with check (true);

-- Allow authenticated users to update contacts
drop policy if exists "authenticated update contacts" on public.contacts;
create policy "authenticated update contacts"
on public.contacts
for update
to authenticated
using (true);

-- Allow authenticated users to delete contacts
drop policy if exists "authenticated delete contacts" on public.contacts;
create policy "authenticated delete contacts"
on public.contacts
for delete
to authenticated
using (true);

-- Service role can do everything (Netlify functions use this)
-- No explicit policy needed as service_role bypasses RLS

-- 4) Trigger to update updated_at timestamp
create or replace function public.update_contacts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_update_contacts_updated_at on public.contacts;
create trigger trigger_update_contacts_updated_at
  before update on public.contacts
  for each row
  execute function public.update_contacts_updated_at();

-- 5) Function to upsert a contact (insert or update if email exists)
create or replace function public.upsert_contact(
  p_name text,
  p_email text,
  p_phone text default null,
  p_source text default 'manual',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_contact_id uuid;
begin
  insert into public.contacts (name, email, phone, source, notes)
  values (p_name, p_email, p_phone, p_source, p_notes)
  on conflict (email)
  do update set
    name = coalesce(excluded.name, contacts.name),
    phone = coalesce(excluded.phone, contacts.phone),
    notes = case
      when contacts.notes is null then excluded.notes
      when excluded.notes is null then contacts.notes
      else contacts.notes || E'\n' || excluded.notes
    end,
    updated_at = now()
  returning id into v_contact_id;

  return v_contact_id;
end;
$$;

-- End of script
