-- Runs once, on first boot of an empty db volume.
--
-- The supabase/postgres image ships its own init scripts in
-- /docker-entrypoint-initdb.d/init-scripts/ — they create the anon /
-- authenticated / service_role / authenticator / supabase_* roles and the
-- auth / storage / extensions / graphql_public schemas. This file must run
-- AFTER them, hence the 99- prefix: psql runs the directory in sort order and
-- stops the whole bootstrap on the first error, so a script that lands early
-- and touches roles the image has not created yet (or pre-creates roles the
-- image then tries to create itself) aborts the rest of the Supabase
-- bootstrap.
\set pgpass `echo "$POSTGRES_PASSWORD"`

alter user authenticator with password :'pgpass';
alter user supabase_storage_admin with password :'pgpass';
alter user supabase_auth_admin with password :'pgpass';
alter user supabase_admin with password :'pgpass';
alter user supabase_read_only_user with password :'pgpass';

-- ------------------------------------------------------------
-- auth.uid()
--
-- The RLS policies and ticket_events triggers read the caller out of the JWT
-- through auth.uid(). The base image defines it against the legacy
-- `request.jwt.claim.sub` GUC only, which PostgREST does not set when
-- db-use-legacy-gucs=false — it sets `request.jwt.claims`, a single JSON blob.
-- On a normal Supabase stack GoTrue's own migrations widen the function to
-- read both; GoTrue is not deployed here (identity is Better Auth), so do it
-- ourselves. nullif() before the ::jsonb cast keeps anon requests, where the
-- setting is empty rather than absent, returning null instead of erroring.
--
-- This has to happen here and not in supabase/migrations/: it must run while
-- the bootstrap still connects as a superuser. By the time `supabase db push`
-- runs, the image has demoted postgres to NOSUPERUSER with only USAGE on the
-- auth schema, and auth.uid() belongs to supabase_auth_admin. The image's
-- later 20211124212715_update-auth-owner.sql only reassigns the owner, so the
-- body written here survives.
-- ------------------------------------------------------------
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
