-- ============================================================
-- Service / product categories: user-defined tree (arbitrary
-- subcategory nesting via parent_id), separated by kind. Each
-- kind seeds a single default root category; catalog items with
-- no explicit category fall into it. service_catalog also gains
-- a per-item cost price and (for products) a barcode.
-- ============================================================

create table service_categories (
  id          serial primary key,
  kind        text not null check (kind in ('service', 'product')),
  parent_id   int  references service_categories(id) on delete cascade,
  name        text not null,
  is_default  boolean not null default false,
  sort_order  int  not null default 0,
  created_at  timestamptz default now()
);

-- At most one default *root* category per kind.
create unique index service_categories_one_default_root_per_kind
  on service_categories (kind)
  where is_default and parent_id is null;

insert into service_categories (kind, name, is_default, sort_order) values
  ('service', 'Усі послуги', true, 0),
  ('product', 'Усі товари',  true, 0);

alter table service_catalog
  add column category_id int references service_categories(id) on delete set null,
  add column cost_price  numeric not null default 0,
  add column barcode     text;

-- Backfill existing rows into the default root of their kind
-- (labor/service -> service root, product -> product root).
update service_catalog s set category_id = c.id
  from service_categories c
  where c.is_default and c.parent_id is null
    and c.kind = case when s.kind = 'product' then 'product' else 'service' end;

-- RLS + grants (match finance_categories pattern; new tables are not auto-granted)
alter table service_categories enable row level security;

create policy service_categories_authenticated_all on service_categories
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on service_categories
  to authenticated, service_role;

grant usage, select on sequence service_categories_id_seq
  to authenticated, service_role;
