-- ============================================================
-- Status groups: every ticket status belongs to one of 7 fixed
-- groups. The group drives the status color, terminal-ness and
-- (in the app) the allowed transitions and close behavior.
--
-- Colors are no longer chosen per-status; they mirror the group.
-- "Terminal" is no longer a per-status flag the user toggles —
-- it is derived from the group (closed_success / closed_fail).
-- ============================================================

alter table ticket_statuses add column "group" text;

-- map the existing seeded statuses onto the new groups
update ticket_statuses set "group" = 'new'            where key in ('draft', 'new');
update ticket_statuses set "group" = 'in_work'        where key = 'in_progress';
update ticket_statuses set "group" = 'ready'          where key = 'ready';
update ticket_statuses set "group" = 'closed_success' where key = 'issued';
update ticket_statuses set "group" = 'postponed'      where key = 'return_no_repair';

-- apply the fixed group palette + derive is_terminal from the group
update ticket_statuses set color = '#0288d1', bg = '#e1f5fe', is_terminal = false where "group" = 'new';
update ticket_statuses set color = '#2e7d32', bg = '#e8f5e9', is_terminal = false where "group" = 'in_work';
update ticket_statuses set color = '#B76E00', bg = '#FEEFDB', is_terminal = false where "group" = 'postponed';
update ticket_statuses set color = '#2e7d32', bg = '#c8e6c9', is_terminal = false where "group" = 'ready';
update ticket_statuses set color = '#ffffff', bg = '#0097a7', is_terminal = false where "group" = 'delivery';
update ticket_statuses set color = '#616161', bg = '#eeeeee', is_terminal = true  where "group" = 'closed_success';
update ticket_statuses set color = '#B71D18', bg = '#FFE4DE', is_terminal = true  where "group" = 'closed_fail';

alter table ticket_statuses
  add constraint ticket_statuses_group_check
  check ("group" in (
    'new', 'in_work', 'postponed', 'ready', 'delivery', 'closed_success', 'closed_fail'
  ));

alter table ticket_statuses alter column "group" set not null;

-- allow refunds in the contact payments ledger (negative-amount rows that
-- reverse a prepayment when a ticket is closed without repair)
alter table payments drop constraint payments_kind_check;
alter table payments
  add constraint payments_kind_check
  check (kind in ('payment', 'prepayment', 'advance', 'payout', 'correction', 'refund'));
