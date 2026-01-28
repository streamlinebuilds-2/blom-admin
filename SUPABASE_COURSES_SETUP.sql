-- Courses table + policies + Storage bucket for course images

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  price numeric(10,2),
  image_url text,
  duration text,
  level text,
  template_key text,
  course_type text not null default 'in-person',
  is_active boolean default true,
  created_at timestamp default now()
);

-- Ensure columns exist for existing tables (idempotent)
alter table public.courses add column if not exists image_url text;
alter table public.courses add column if not exists duration text;
alter table public.courses add column if not exists level text;
alter table public.courses add column if not exists template_key text;
alter table public.courses add column if not exists course_type text not null default 'in-person';

alter table public.courses add column if not exists instructor_name text;
alter table public.courses add column if not exists instructor_bio text;

alter table public.courses add column if not exists deposit_amount numeric(10,2);
alter table public.courses add column if not exists available_dates jsonb;
alter table public.courses add column if not exists packages jsonb;
alter table public.courses add column if not exists key_details jsonb;

alter table public.courses drop constraint if exists courses_course_type_check;
alter table public.courses add constraint courses_course_type_check check (course_type in ('online', 'in-person'));

alter table public.courses enable row level security;

drop policy if exists "Public can read active courses" on public.courses;
create policy "Public can read active courses"
  on public.courses
  for select
  to anon
  using (is_active = true);

drop policy if exists "Authenticated can read all courses" on public.courses;
create policy "Authenticated can read all courses"
  on public.courses
  for select
  to authenticated
  using (true);

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('course-images', 'course-images', true)
on conflict (id) do update set public = true;

-- Storage policies (course-images)
drop policy if exists "Public can read course images" on storage.objects;
create policy "Public can read course images"
  on storage.objects
  for select
  using (bucket_id = 'course-images');

drop policy if exists "Authenticated can upload course images" on storage.objects;
create policy "Authenticated can upload course images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'course-images');

drop policy if exists "Authenticated can update course images" on storage.objects;
create policy "Authenticated can update course images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'course-images')
  with check (bucket_id = 'course-images');

drop policy if exists "Authenticated can delete course images" on storage.objects;
create policy "Authenticated can delete course images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'course-images');
