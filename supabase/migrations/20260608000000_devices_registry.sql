-- ============================================================
-- Device registry: SN/IMEI is a unique, device-bound key
-- ------------------------------------------------------------
-- One device == one SN/IMEI, globally. A device pins its catalog
-- (group/brand/model/modification) and its owner (client). Tickets
-- reference a device via tickets.device_id while keeping their own
-- denormalized device columns so existing readers keep working.
-- Also adds a 6-digit SN generator (000001, 000002, …).
-- ============================================================

create table devices (
  id bigint generated always as identity primary key,
  sn_imei text not null unique,            -- global uniqueness — the core rule
  group_id        bigint references groups,
  brand_id        bigint references brands,
  model_id        bigint references models,
  modification_id bigint references modifications,
  client_id       bigint references contacts,
  created_at timestamptz default now()
);
create index devices_client_id_idx on devices (client_id);

alter table tickets add column device_id bigint references devices;

-- ------------------------------------------------------------
-- Backfill: one device per distinct non-empty ticket SN/IMEI.
-- Use the most recent ticket's device fields + client for each SN.
-- ------------------------------------------------------------
insert into devices (sn_imei, group_id, brand_id, model_id, modification_id, client_id, created_at)
select distinct on (t.sn_imei)
  t.sn_imei, t.group_id, t.brand_id, t.model_id, t.modification_id, t.client_id, t.created_at
from tickets t
where t.sn_imei is not null and t.sn_imei <> ''
order by t.sn_imei, t.created_at desc;

update tickets t
set device_id = d.id
from devices d
where t.sn_imei = d.sn_imei;

-- ------------------------------------------------------------
-- 6-digit SN generator: 000001, 000002, … (+1 each call),
-- skipping any value already present in devices.sn_imei.
-- ------------------------------------------------------------
create sequence if not exists device_sn_seq start 1;

create or replace function next_device_sn()
returns text language plpgsql security definer as $$
declare
  n bigint;
  candidate text;
begin
  loop
    n := nextval('device_sn_seq');
    candidate := lpad(n::text, 6, '0');
    exit when not exists (select 1 from devices where sn_imei = candidate);
  end loop;
  return candidate;
end$$;

-- ------------------------------------------------------------
-- RLS: single-tenant local app — full access for authenticated users.
-- ------------------------------------------------------------
alter table devices enable row level security;
create policy devices_authenticated_all on devices
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on devices to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on function next_device_sn() to authenticated, service_role;
