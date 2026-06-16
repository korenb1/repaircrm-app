-- ============================================================
-- Financial accounts + transactions ledger.
-- Accounts are cash / cashless / card buckets shown on the
-- Finances page. Transactions are an append-style ledger:
-- revenue, expense, and the two legs of a transfer (linked by
-- transfer_id). Balances + running remainder are computed in
-- the app from these rows (no SQL view).
-- ============================================================

create table financial_accounts (
  id          serial primary key,
  name        text not null,
  type        text not null check (type in ('cash', 'cashless', 'card')),
  card_last4  text,
  sort_order  int  not null default 0,
  created_at  timestamptz default now()
);

create table finance_transactions (
  id          serial primary key,
  account_id  int  not null references financial_accounts(id) on delete cascade,
  kind        text not null check (kind in ('revenue', 'expense', 'transfer_in', 'transfer_out')),
  amount      numeric not null check (amount >= 0),
  category_id int  references finance_categories(id) on delete set null,
  contact_id  int  references contacts(id) on delete set null,
  comment     text,
  transfer_id uuid,
  created_by  uuid references profiles(id),
  created_at  timestamptz default now()
);

create index finance_transactions_account_idx  on finance_transactions (account_id);
create index finance_transactions_transfer_idx on finance_transactions (transfer_id);

-- RLS + grants (match finance_categories pattern; new tables are not auto-granted)
alter table financial_accounts   enable row level security;
alter table finance_transactions enable row level security;

create policy financial_accounts_authenticated_all on financial_accounts
  for all to authenticated using (true) with check (true);
create policy finance_transactions_authenticated_all on finance_transactions
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on financial_accounts, finance_transactions
  to authenticated, service_role;

grant usage, select on sequence financial_accounts_id_seq   to authenticated, service_role;
grant usage, select on sequence finance_transactions_id_seq to authenticated, service_role;
