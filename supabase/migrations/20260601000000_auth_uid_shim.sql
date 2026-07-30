-- ============================================================
-- auth.uid() shim for Better Auth compatibility
-- ============================================================
-- Better Auth uses the "user" table in public schema, not auth.users.
-- This migration creates the auth schema and an auth.uid() function
-- that extracts the user ID from the JWT token, maintaining compatibility
-- with existing RLS policies and triggers that reference auth.uid().
-- ============================================================

create schema if not exists auth;

-- Extract user ID from JWT token (same behavior as Supabase's auth.uid())
-- The JWT token is set by Better Auth and contains the user ID in the 'sub' claim
create or replace function auth.uid()
returns uuid
language sql stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      current_setting('request.jwt.claims', true)::json->>'sub'
    ),
    ''
  )::uuid;
$$;

-- Grant execute to all roles that need it
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
