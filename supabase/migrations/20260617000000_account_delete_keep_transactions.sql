-- ============================================================
-- Deleting a financial account must keep its historical
-- transactions (the ledger is the source of truth for past
-- finances). Switch the FK from ON DELETE CASCADE to
-- ON DELETE SET NULL so removing an account card leaves its
-- transaction rows intact (orphaned with account_id = null).
-- ============================================================

alter table finance_transactions
  drop constraint finance_transactions_account_id_fkey;

alter table finance_transactions
  alter column account_id drop not null;

alter table finance_transactions
  add constraint finance_transactions_account_id_fkey
  foreign key (account_id) references financial_accounts(id) on delete set null;
