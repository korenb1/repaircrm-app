-- ============================================================
-- v2: contact multi-phone + devices + documents
-- Adds three child tables hanging off contacts:
--   contact_phones    — several numbers per contact (source of truth)
--   contact_devices   — devices a client owns (manual registry)
--   contact_documents — uploaded files (metadata; bytes in Storage)
-- A trigger keeps contacts.phone in sync with the primary phone so every
-- existing reader (ticket client join, contacts table, ticket card) is
-- unaffected.
-- ============================================================

-- ------------------------------------------------------------
-- contact_phones (source of truth for a contact's numbers)
-- ------------------------------------------------------------
create table contact_phones (
  id bigint generated always as identity primary key,
  contact_id bigint references contacts on delete cascade,
  phone text not null,
  label text,
  is_primary boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);
create index contact_phones_contact_id_idx on contact_phones (contact_id);

-- Backfill: each existing non-null contacts.phone becomes a primary row.
insert into contact_phones (contact_id, phone, is_primary, sort_order)
select id, phone, true, 0 from contacts where phone is not null and phone <> '';

-- Keep contacts.phone mirrored to the contact's primary number (fallback:
-- lowest sort_order, else null) so denormalized readers keep working.
create or replace function sync_contact_primary_phone()
returns trigger language plpgsql security definer as $$
declare
  cid bigint := coalesce(new.contact_id, old.contact_id);
  primary_phone text;
begin
  select phone into primary_phone
  from contact_phones
  where contact_id = cid
  order by is_primary desc, sort_order asc, id asc
  limit 1;

  update contacts set phone = primary_phone where id = cid;
  return null;
end$$;

create trigger contact_phones_sync_primary
  after insert or update or delete on contact_phones
  for each row execute function sync_contact_primary_phone();

-- ------------------------------------------------------------
-- contact_devices (devices a client owns; independent of tickets)
-- ------------------------------------------------------------
create table contact_devices (
  id bigint generated always as identity primary key,
  contact_id bigint references contacts on delete cascade,
  group_id        bigint references groups,
  brand_id        bigint references brands,
  model_id        bigint references models,
  modification_id bigint references modifications,
  sn_imei text,
  color text,
  note text,
  created_at timestamptz default now()
);
create index contact_devices_contact_id_idx on contact_devices (contact_id);

-- ------------------------------------------------------------
-- contact_documents (uploaded file metadata; bytes in Storage)
-- ------------------------------------------------------------
create table contact_documents (
  id bigint generated always as identity primary key,
  contact_id bigint references contacts on delete cascade,
  path text not null,
  name text,
  size bigint,
  mime text,
  uploaded_by uuid references profiles,
  created_at timestamptz default now()
);
create index contact_documents_contact_id_idx on contact_documents (contact_id);

-- ------------------------------------------------------------
-- RLS: single-tenant local app — full access for authenticated users.
-- ------------------------------------------------------------
alter table contact_phones    enable row level security;
alter table contact_devices   enable row level security;
alter table contact_documents enable row level security;

do $$
declare tbl text;
begin
  foreach tbl in array array[
    'contact_phones','contact_devices','contact_documents'
  ] loop
    execute format(
      'create policy %I_authenticated_all on %I for all to authenticated using (true) with check (true);',
      tbl, tbl
    );
  end loop;
end$$;

grant select, insert, update, delete
  on contact_phones, contact_devices, contact_documents
  to authenticated, service_role;
grant usage, select on all sequences in schema public
  to authenticated, service_role;

-- ------------------------------------------------------------
-- Storage bucket for contact files (public read for simple download URLs)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('contact-files', 'contact-files', true)
on conflict (id) do nothing;

create policy "contact-files authenticated insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'contact-files');

create policy "contact-files public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'contact-files');

create policy "contact-files authenticated delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'contact-files');
