-- ============================================================
-- Saved ticket filters: named, icon-tagged filter presets for the
-- tickets table. Each filter stores its criteria as jsonb. A filter
-- is private to its owner unless is_shared = true, in which case all
-- authenticated users can read (but not modify) it.
-- ============================================================

create table ticket_filters (
  id         bigint generated always as identity primary key,
  owner_id   uuid not null references profiles default auth.uid(),
  name       text not null,
  icon       text,                       -- icon key from FILTER_ICONS (src/lib/filterIcons)
  is_shared  boolean not null default false,
  criteria   jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

-- RLS: visible to owner or when shared; writable only by the owner.
alter table ticket_filters enable row level security;

create policy ticket_filters_select on ticket_filters
  for select to authenticated
  using (owner_id = auth.uid() or is_shared);

create policy ticket_filters_insert on ticket_filters
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy ticket_filters_update on ticket_filters
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy ticket_filters_delete on ticket_filters
  for delete to authenticated
  using (owner_id = auth.uid());

-- Grants (new tables are not auto-granted; match init.sql pattern)
grant select, insert, update, delete on ticket_filters
  to authenticated, service_role;
