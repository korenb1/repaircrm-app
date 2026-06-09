-- ============================================================
-- Per-user profile fields: contact info + avatar, plus a policy
-- letting each user edit their OWN profiles row (writes were
-- previously reserved for the service role). Email/password are
-- managed by Supabase auth, not stored here.
-- ============================================================

alter table profiles
  add column phone text not null default '',
  add column telegram_username text not null default '',  -- stored without leading '@'
  add column avatar_path text;

-- Authenticated users may update their own row only.
create policy profiles_update_own on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Storage bucket for user avatars (public read for simple <img> URLs)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy avatars_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars');

create policy avatars_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars');

create policy avatars_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars');

create policy avatars_read on storage.objects
  for select to public
  using (bucket_id = 'avatars');
