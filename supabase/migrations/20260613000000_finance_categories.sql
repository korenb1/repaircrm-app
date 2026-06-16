-- ============================================================
-- Finance categories: user-defined expense / revenue buckets.
-- Each kind may flag a single category as the default applied to
-- closed (terminal-status) tickets. Consumption (transactions)
-- is a later step; this migration only sets up the catalog.
-- ============================================================

create table finance_categories (
  id          serial primary key,
  kind        text not null check (kind in ('expense', 'revenue')),
  name        text not null,
  is_default_closed boolean not null default false,
  sort_order  int  not null default 0,
  created_at  timestamptz default now()
);

-- At most one default-for-closed category per kind.
create unique index finance_categories_one_default_per_kind
  on finance_categories (kind)
  where is_default_closed;

-- Seed a couple of common buckets, one default each.
insert into finance_categories (kind, name, is_default_closed, sort_order) values
  ('revenue', 'Ремонт',     true,  1),
  ('revenue', 'Продаж',     false, 2),
  ('expense', 'Запчастини', true,  1),
  ('expense', 'Оренда',     false, 2);

-- RLS + grants (match init.sql pattern; new tables are not auto-granted)
alter table finance_categories enable row level security;

create policy finance_categories_authenticated_all on finance_categories
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on finance_categories
  to authenticated, service_role;

grant usage, select on sequence finance_categories_id_seq
  to authenticated, service_role;
