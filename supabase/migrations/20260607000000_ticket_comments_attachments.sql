-- ============================================================
-- v2: timeline comments + file attachments
-- User-authored timeline entries (text comments and uploaded files)
-- live in the same ticket_events log. Files go to a public Storage
-- bucket; the event row carries the path/name/size/mime in `meta`.
-- ============================================================

-- widen the kind enum with the two user-authored kinds
alter table ticket_events drop constraint ticket_events_kind_check;
alter table ticket_events add constraint ticket_events_kind_check check (kind in (
  'created','status_changed','item_added','item_removed',
  'invoice_added','payment_added','comment','attachment'
));

-- authenticated users may append comment/attachment events, but only as
-- themselves. All other kinds stay trigger-only (SECURITY DEFINER inserts
-- bypass RLS, so this does not affect the auto-logged events).
create policy ticket_events_authenticated_write on ticket_events
  for insert to authenticated
  with check (kind in ('comment','attachment') and actor_id = auth.uid());

grant insert on ticket_events to authenticated;

-- ------------------------------------------------------------
-- Storage bucket for ticket files (public read for simple download URLs)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('ticket-files', 'ticket-files', true)
on conflict (id) do nothing;

-- authenticated users can upload; anyone can read (public bucket).
create policy "ticket-files authenticated insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ticket-files');

create policy "ticket-files public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'ticket-files');

create policy "ticket-files authenticated delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ticket-files');
