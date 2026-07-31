-- ============================================================
-- auth.uid() for this stack
-- ============================================================
-- Identity is Better Auth, not GoTrue, so auth.users never exists here — but
-- the RLS policies and event triggers in later migrations still call
-- auth.uid() to read the caller out of the JWT, and those JWTs are minted in
-- src/lib/supabase/jwt.ts with the user id in `sub`.
--
-- The definition has to cover both GUC shapes: PostgREST runs with
-- db-use-legacy-gucs=false, which sets `request.jwt.claims` (a JSON blob),
-- while the stock supabase/postgres auth.uid() reads the legacy per-claim
-- `request.jwt.claim.sub`. nullif() before the ::jsonb cast keeps anon
-- requests (empty setting) returning null instead of erroring.
-- ============================================================

create schema if not exists auth;

create or replace function auth.uid()
returns uuid
language sql stable
as $$
  select nullif(
    coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    ),
    ''
  )::uuid
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
