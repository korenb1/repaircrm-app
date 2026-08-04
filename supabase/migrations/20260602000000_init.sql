-- ============================================================
-- Repair CRM — initial schema
-- ============================================================

-- profiles: managers & technicians (extends Better Auth user table)
-- Note: foreign key will be added by 20260716000000_better_auth.sql after user table exists
create table profiles (
  id uuid primary key,
  full_name text not null,
  role text not null default 'technician' check (role in ('admin','manager','technician')),
  created_at timestamptz default now()
);

-- device catalog (cascading): group -> brand -> model -> modification
create table groups (
  id bigint generated always as identity primary key,
  name text not null
);

create table brands (
  id bigint generated always as identity primary key,
  group_id bigint references groups on delete cascade,
  name text not null
);

create table models (
  id bigint generated always as identity primary key,
  brand_id bigint references brands on delete cascade,
  name text not null
);

create table modifications (
  id bigint generated always as identity primary key,
  model_id bigint references models on delete cascade,
  name text not null
);

-- contacts (clients)
create table contacts (
  id bigint generated always as identity primary key,
  type text not null default 'person' check (type in ('person','organization')),
  is_supplier boolean default false,
  first_name text not null,
  last_name text,
  phone text,
  email text,
  address text,
  discount_card text,
  discount_service numeric default 0,   -- % on services (tickets/invoices)
  discount_goods   numeric default 0,   -- % on products
  note text,
  tags text[] default '{}',
  created_at timestamptz default now()
);

-- tickets
create table tickets (
  id bigint generated always as identity primary key,
  number text generated always as ('T' || lpad(id::text, 4, '0')) stored,  -- display like T0008
  status text not null default 'new'
    check (status in ('draft','new','in_progress','ready','issued','return_no_repair')),
  manager_id    uuid   references profiles,
  technician_id uuid   references profiles,
  client_id     bigint references contacts,
  group_id        bigint references groups,
  brand_id        bigint references brands,
  model_id        bigint references models,
  modification_id bigint references modifications,
  sn_imei text,
  color text,
  device_state text,
  malfunction text,
  complectation text,
  est_price numeric default 0,
  prepayment numeric default 0,
  due_date timestamptz,
  urgent boolean default false,
  manager_notes text,
  technician_notes text,
  conclusion text,                       -- "Conclusion / client recommendations"
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- services/products catalog (seeded v1, edited via Settings page v2)
create table service_catalog (
  id bigint generated always as identity primary key,
  kind text not null default 'service' check (kind in ('labor','service','product')),
  name text not null,
  sku text,
  price numeric not null default 0
);

-- ticket line items (labor / service / product)
create table ticket_items (
  id bigint generated always as identity primary key,
  ticket_id bigint references tickets on delete cascade,
  technician_id uuid references profiles,
  kind text not null default 'labor' check (kind in ('labor','service','product')),
  name text not null,
  price numeric not null default 0,
  qty numeric not null default 1
);

-- invoices (bills) per ticket
create table invoices (
  id bigint generated always as identity primary key,
  ticket_id bigint references tickets on delete cascade,
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  payment_method text,
  amount numeric not null default 0,
  created_at timestamptz default now()
);

-- payments ledger (drives contact balance)
create table payments (
  id bigint generated always as identity primary key,
  contact_id bigint references contacts on delete cascade,
  ticket_id  bigint references tickets on delete set null,
  kind text not null check (kind in ('payment','prepayment','advance','payout','correction')),
  amount numeric not null,               -- signed: +income / -payout
  comment text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- Views: derived totals
-- ------------------------------------------------------------

-- per-ticket price (sum of items) and paid (sum of ticket payments)
create view ticket_totals as
select
  t.id as ticket_id,
  coalesce((select sum(ti.price * ti.qty) from ticket_items ti where ti.ticket_id = t.id), 0) as price,
  coalesce((select sum(p.amount) from payments p
            where p.ticket_id = t.id and p.kind in ('payment','prepayment')), 0) as paid
from tickets t;

-- per-contact running balance (sum of all signed payment rows)
create view contact_balances as
select
  c.id as contact_id,
  coalesce((select sum(p.amount) from payments p where p.contact_id = c.id), 0) as balance
from contacts c;

-- ------------------------------------------------------------
-- updated_at trigger on tickets
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tickets_set_updated_at
  before update on tickets
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- RLS: single-tenant local app — any authenticated user has full access.
-- profiles inserts are reserved for the service role (admin bootstrap).
-- ------------------------------------------------------------
alter table profiles        enable row level security;
alter table groups          enable row level security;
alter table brands          enable row level security;
alter table models          enable row level security;
alter table modifications   enable row level security;
alter table contacts        enable row level security;
alter table tickets         enable row level security;
alter table service_catalog enable row level security;
alter table ticket_items    enable row level security;
alter table invoices        enable row level security;
alter table payments        enable row level security;

-- full access for authenticated users
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'groups','brands','models','modifications','contacts','tickets',
    'service_catalog','ticket_items','invoices','payments'
  ] loop
    execute format(
      'create policy %I_authenticated_all on %I for all to authenticated using (true) with check (true);',
      tbl, tbl
    );
  end loop;
end$$;

-- profiles: authenticated can read; only service_role can write
create policy profiles_authenticated_read on profiles
  for select to authenticated using (true);
create policy profiles_service_write on profiles
  for all to service_role using (true) with check (true);

-- ------------------------------------------------------------
-- Explicit grants. As of 2026-05-30 new public objects are NOT auto-exposed
-- to the Data API roles, so grant table/view/sequence privileges here.
-- (RLS policies above still govern per-row access on the base tables.)
-- ------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public
  to authenticated, service_role;
grant usage, select on all sequences in schema public
  to authenticated, service_role;
-- views (ticket_totals, contact_balances) — read only
grant select on ticket_totals, contact_balances to authenticated, service_role;
