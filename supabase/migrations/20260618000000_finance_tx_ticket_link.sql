-- ============================================================
-- Link cash-moving ticket payments to their finance ledger row.
--
-- Payments collected against a ticket (prepayment, payment,
-- payout, refund on close) are mirrored into finance_transactions
-- so the money shows up in an account. Previously the mirror row
-- carried no ticket reference, so the Finances table could not show
-- which ticket it belonged to (rendered as "—").
--
--   ticket_id    -> the ticket this cash movement settles
--   source_kind  -> original payments.kind (prepayment/payment/
--                   advance/payout/refund), so the ledger can label
--                   the row even when no finance_category is set.
-- ============================================================

alter table finance_transactions
  add column ticket_id   bigint references tickets(id) on delete set null,
  add column source_kind text;

create index finance_transactions_ticket_idx on finance_transactions (ticket_id);
