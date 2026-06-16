-- ============================================================
-- Secure the financial views.
--
-- ticket_totals and contact_balances were running as SECURITY DEFINER
-- (owner = postgres), bypassing the RLS on tickets/payments/contacts, and
-- Supabase's default privileges had auto-granted SELECT to the public `anon`
-- role. Net effect: anyone with the anon API key could read every contact
-- balance and ticket total without authenticating.
--
-- Fix: run the views with the caller's privileges (so they respect the base
-- tables' RLS — anon has no policy there and sees nothing) and revoke the
-- public grant.
-- ============================================================

alter view ticket_totals    set (security_invoker = on);
alter view contact_balances set (security_invoker = on);

revoke all on ticket_totals, contact_balances from anon;
