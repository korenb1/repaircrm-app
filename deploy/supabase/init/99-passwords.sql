-- Runs once, on first boot of an empty db volume.
--
-- The supabase/postgres image ships its own init scripts in
-- /docker-entrypoint-initdb.d/init-scripts/ — they create the anon /
-- authenticated / service_role / authenticator / supabase_* roles and the
-- auth / storage / extensions / graphql_public schemas. This file must run
-- AFTER them, hence the 99- prefix: psql runs the directory in sort order and
-- stops the whole bootstrap on the first error, so a script that lands early
-- and touches roles the image has not created yet (or pre-creates roles the
-- image then tries to create itself) silently aborts the rest of the Supabase
-- bootstrap. Only set passwords here.
\set pgpass `echo "$POSTGRES_PASSWORD"`

alter user authenticator with password :'pgpass';
alter user supabase_storage_admin with password :'pgpass';
alter user supabase_auth_admin with password :'pgpass';
alter user supabase_admin with password :'pgpass';
alter user supabase_read_only_user with password :'pgpass';
