-- ============================================================
-- Grant permissions for storage service and add graphql_public schema
-- ============================================================
-- 1. Supabase Storage needs permissions on the postgres database
-- 2. PostgREST expects graphql_public schema (configured in docker-compose)
-- ============================================================

-- Create graphql_public schema for PostgREST compatibility
create schema if not exists graphql_public;
grant usage on schema graphql_public to anon, authenticated, service_role, supabase_storage_admin;

-- Grant supabase_storage_admin access to the postgres database
grant connect on database postgres to supabase_storage_admin;
grant create on database postgres to supabase_storage_admin;
grant all on schema public to supabase_storage_admin;
grant all on all tables in schema public to supabase_storage_admin;
grant all on all sequences in schema public to supabase_storage_admin;
grant all on all functions in schema public to supabase_storage_admin;
grant usage on schema storage to supabase_storage_admin;
grant all on all tables in schema storage to supabase_storage_admin;
grant all on all sequences in schema storage to supabase_storage_admin;

-- Grant usage on auth schema (needed for auth.uid())
grant usage on schema auth to supabase_storage_admin;
grant execute on function auth.uid() to supabase_storage_admin;

-- Grant supabase_auth_admin access to the postgres database
grant connect on database postgres to supabase_auth_admin;
grant create on database postgres to supabase_auth_admin;
grant all on schema public to supabase_auth_admin;
grant all on all tables in schema public to supabase_auth_admin;
grant all on all sequences in schema public to supabase_auth_admin;
