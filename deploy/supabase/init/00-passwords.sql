-- Runs once on first boot of an empty db volume.
-- Creates the Supabase roles and sets passwords so PostgREST and storage-api can connect.
\set pgpass `echo "$POSTGRES_PASSWORD"`

-- Create roles if they don't exist
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticator') then
    create role authenticator login noinherit;
    grant anon, authenticated, service_role to authenticator;
  end if;
  if not exists (select from pg_roles where rolname = 'supabase_storage_admin') then
    create role supabase_storage_admin login;
  end if;
  if not exists (select from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin login;
  end if;
  if not exists (select from pg_roles where rolname = 'supabase_admin') then
    create role supabase_admin login;
  end if;
  if not exists (select from pg_roles where rolname = 'supabase_read_only_user') then
    create role supabase_read_only_user login;
  end if;
end
$$;

-- Set passwords
alter user authenticator with password :'pgpass';
alter user supabase_storage_admin with password :'pgpass';
alter user supabase_auth_admin with password :'pgpass';
alter user supabase_admin with password :'pgpass';
alter user supabase_read_only_user with password :'pgpass';
