-- ============================================================
-- Redefine contact balance as "what the client owes us".
--
--   balance = Σ(price of the client's ready/issued tickets)
--           − Σ(all signed payment rows for the client)
--
-- A ticket only becomes a charge against the balance once it is
-- ready or issued (its work is priced and owed). Payments (prepayment,
-- payment received, etc.) reduce the balance. Example:
--   prepayment 400        -> balance -400
--   ticket ready (1600)   -> balance +1600 => 1200
--   payment 1200 on issue -> balance -1200 => 0
-- ============================================================

create or replace view contact_balances as
select
  c.id as contact_id,
  coalesce((
    select sum(tt.price)
    from tickets t
    join ticket_totals tt on tt.ticket_id = t.id
    where t.client_id = c.id
      and t.status in ('ready', 'issued')
  ), 0)
  - coalesce((
    select sum(p.amount) from payments p where p.contact_id = c.id
  ), 0) as balance
from contacts c;

grant select on contact_balances to authenticated, service_role;
