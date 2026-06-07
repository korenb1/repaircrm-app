-- ============================================================
-- v2: editable ticket statuses + transition rules
-- Moves the hardcoded tickets.status enum into a data table,
-- and adds directed transition edges (from_key -> to_key).
-- ============================================================

create table ticket_statuses (
  key        text primary key,
  label      text not null,
  color      text not null default '#616161',
  bg         text not null default '#eeeeee',
  sort_order int  not null default 0,
  is_terminal boolean not null default false,
  is_default  boolean not null default false
);

-- directed allowed transitions: a ticket in `from_key` may move to `to_key`
create table status_transitions (
  from_key text not null references ticket_statuses(key) on delete cascade,
  to_key   text not null references ticket_statuses(key) on delete cascade,
  primary key (from_key, to_key),
  check (from_key <> to_key)
);

-- seed the existing six statuses (values mirror the former STATUSES constant)
insert into ticket_statuses (key, label, color, bg, sort_order, is_terminal, is_default) values
  ('draft',            'Чернетка',            '#1976d2', '#e3f2fd', 1, false, false),
  ('new',              'Нове',                '#0288d1', '#e1f5fe', 2, false, true),
  ('in_progress',      'В роботі',            '#2e7d32', '#e8f5e9', 3, false, false),
  ('ready',            'Готове',              '#2e7d32', '#c8e6c9', 4, false, false),
  ('issued',           'Видано',              '#616161', '#eeeeee', 5, true,  false),
  ('return_no_repair', 'Видати без ремонту',  '#ffffff', '#ed6c02', 6, true,  false);

-- seed a sensible default workflow
insert into status_transitions (from_key, to_key) values
  ('draft',       'new'),
  ('new',         'in_progress'),
  ('new',         'return_no_repair'),
  ('in_progress', 'ready'),
  ('in_progress', 'return_no_repair'),
  ('ready',       'issued'),
  ('ready',       'in_progress');

-- repoint tickets.status: drop the old check, add an FK
alter table tickets drop constraint tickets_status_check;
alter table tickets
  add constraint tickets_status_fkey
  foreign key (status) references ticket_statuses(key) on update cascade on delete restrict;

-- RLS + grants (match init.sql pattern)
alter table ticket_statuses    enable row level security;
alter table status_transitions enable row level security;

create policy ticket_statuses_authenticated_all on ticket_statuses
  for all to authenticated using (true) with check (true);
create policy status_transitions_authenticated_all on status_transitions
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on ticket_statuses, status_transitions
  to authenticated, service_role;
