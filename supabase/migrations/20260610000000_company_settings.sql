-- ============================================================
-- Company settings: single-row table holding the org identity
-- (name, contacts, logo, free-form note) used to fill document
-- template {{company.*}} tokens when printing from a ticket.
-- ============================================================

create table company_settings (
  id smallint primary key default 1 check (id = 1),
  name text not null default '',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  logo_path text,
  additional_info text not null default '',
  updated_at timestamptz default now()
);

create trigger company_settings_set_updated_at
  before update on company_settings
  for each row execute function set_updated_at();

-- Seed the singleton row so the app can always UPDATE id = 1.
insert into company_settings (id) values (1);

-- RLS + grants (match init.sql pattern; new tables are not auto-granted)
alter table company_settings enable row level security;

create policy company_settings_authenticated_all on company_settings
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on company_settings
  to authenticated, service_role;

-- Storage bucket for the company logo (public read for simple <img> URLs)
insert into storage.buckets (id, name, public)
values ('company-files', 'company-files', true)
on conflict (id) do nothing;

create policy company_files_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'company-files');

create policy company_files_update on storage.objects
  for update to authenticated
  using (bucket_id = 'company-files');

create policy company_files_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'company-files');

create policy company_files_read on storage.objects
  for select to public
  using (bucket_id = 'company-files');
