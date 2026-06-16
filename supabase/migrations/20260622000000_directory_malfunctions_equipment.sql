-- ============================================================
-- Directory reference lists used by the ticket forms:
--   malfunctions    — несправності (problem catalog)
--   equipment_items — комплектація (accessories handed in with a device)
-- Both are flat name lists, managed in Settings → Довідник, and offered as
-- multi-select chip options on the malfunction / equipment ticket fields.
-- RLS / grant pattern mirrors finance_categories (new tables aren't auto-granted).
-- ============================================================

create table malfunctions (
  id         serial primary key,
  name       text not null,
  sort_order int  not null default 0,
  created_at timestamptz default now()
);

create table equipment_items (
  id         serial primary key,
  name       text not null,
  sort_order int  not null default 0,
  created_at timestamptz default now()
);

-- Seed a few common entries.
insert into malfunctions (name, sort_order) values
  ('Не вмикається', 1), ('Розбитий екран', 2), ('Не заряджається', 3), ('Залиття', 4);
insert into equipment_items (name, sort_order) values
  ('Коробка', 1), ('Зарядний пристрій', 2), ('Кабель', 3), ('Чохол', 4), ('Навушники', 5);

alter table malfunctions    enable row level security;
alter table equipment_items enable row level security;

create policy malfunctions_authenticated_all on malfunctions
  for all to authenticated using (true) with check (true);
create policy equipment_items_authenticated_all on equipment_items
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on malfunctions, equipment_items
  to authenticated, service_role;

grant usage, select on sequence malfunctions_id_seq    to authenticated, service_role;
grant usage, select on sequence equipment_items_id_seq to authenticated, service_role;
