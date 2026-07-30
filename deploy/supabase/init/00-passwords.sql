-- Runs once on first boot of an empty db volume.
-- The supabase/postgres image creates these roles; here we only give them the
-- stack password so PostgREST and storage-api can connect.
\set pgpass `echo "$POSTGRES_PASSWORD"`

alter user authenticator with password :'pgpass';
alter user supabase_storage_admin with password :'pgpass';
alter user supabase_auth_admin with password :'pgpass';
alter user supabase_admin with password :'pgpass';
alter user supabase_read_only_user with password :'pgpass';
