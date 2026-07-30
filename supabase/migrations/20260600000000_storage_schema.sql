-- ============================================================
-- Storage schema for Supabase Storage API
-- ============================================================
-- Creates the storage schema with buckets and objects tables
-- that the storage-api service expects. This runs before any
-- migrations that insert into storage.buckets.
-- ============================================================

create schema if not exists storage;

-- storage.buckets: defines storage buckets (like S3 buckets)
create table if not exists storage.buckets (
  id text primary key,
  name text not null unique,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  public boolean default false,
  avif_autodetection boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

-- storage.objects: tracks uploaded files
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id) on delete cascade,
  name text not null,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_accessed_at timestamptz default now(),
  metadata jsonb,
  path_tokens text[] generated always as (string_to_array(name, '/')) stored,
  version text,
  unique (bucket_id, name)
);

-- Indexes for performance
create index if not exists objects_bucket_id_idx on storage.objects (bucket_id);
create index if not exists objects_name_idx on storage.objects (name);

-- Enable RLS on storage tables
alter table storage.buckets enable row level security;
alter table storage.objects enable row level security;

-- Grant access to storage schema
grant usage on schema storage to anon, authenticated, service_role, supabase_storage_admin;
grant all on storage.buckets to anon, authenticated, service_role, supabase_storage_admin;
grant all on storage.objects to anon, authenticated, service_role, supabase_storage_admin;
grant all on all sequences in schema storage to anon, authenticated, service_role, supabase_storage_admin;

-- Default policies: service_role has full access
create policy "service_role full access buckets" on storage.buckets
  for all to service_role using (true) with check (true);

create policy "service_role full access objects" on storage.objects
  for all to service_role using (true) with check (true);
