-- ============================================================
-- v2: ticket activity timeline
-- An append-only event log per ticket, populated by triggers on
-- tickets / ticket_items / invoices / payments. Rendered as the
-- "Історія" tab on the ticket card.
-- ============================================================

create table ticket_events (
  id         bigint generated always as identity primary key,
  ticket_id  bigint not null references tickets on delete cascade,
  actor_id   uuid references profiles on delete set null,  -- null = system
  kind       text not null check (kind in (
               'created','status_changed','item_added','item_removed',
               'invoice_added','payment_added'
             )),
  -- User-authored text only: a comment body or an attachment file name.
  -- Empty for trigger-logged events — those carry structured data in `meta`
  -- and the UI composes the sentence, so the timeline follows the reader's
  -- locale instead of freezing one language at insert time.
  summary    text not null default '',
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index ticket_events_ticket_id_idx on ticket_events (ticket_id, created_at);

-- ------------------------------------------------------------
-- Trigger functions. SECURITY DEFINER so the log write isn't blocked
-- by RLS regardless of the acting role; search_path pinned for safety.
-- actor_id comes from auth.uid() (the JWT sub == profiles.id), or null
-- when run by a non-user role (service role / seed / psql).
--
-- They write structured data only — no prose. Wording lives in the app
-- dictionaries (T.ticket.timeline.events); status labels are resolved from
-- ticket_statuses at render time, and amounts are formatted by useMoney()
-- with the profile's locale and the configured currency.
-- ------------------------------------------------------------

create or replace function log_ticket_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into ticket_events (ticket_id, actor_id, kind, meta)
  values (new.id, auth.uid(), 'created', '{}'::jsonb);
  return new;
end;
$$;

create or replace function log_ticket_status_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into ticket_events (ticket_id, actor_id, kind, meta)
    values (
      new.id, auth.uid(), 'status_changed',
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;
  return new;
end;
$$;

create or replace function log_ticket_item_added()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into ticket_events (ticket_id, actor_id, kind, meta)
  values (
    new.ticket_id, auth.uid(), 'item_added',
    jsonb_build_object('name', new.name, 'qty', new.qty, 'price', new.price)
  );
  return new;
end;
$$;

create or replace function log_ticket_item_removed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into ticket_events (ticket_id, actor_id, kind, meta)
  values (
    old.ticket_id, auth.uid(), 'item_removed',
    jsonb_build_object('name', old.name, 'qty', old.qty, 'price', old.price)
  );
  return old;
end;
$$;

create or replace function log_invoice_added()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into ticket_events (ticket_id, actor_id, kind, meta)
  values (
    new.ticket_id, auth.uid(), 'invoice_added',
    jsonb_build_object('amount', new.amount, 'status', new.status)
  );
  return new;
end;
$$;

create or replace function log_payment_added()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.ticket_id is null then
    return new;  -- contact-level payment, not tied to a ticket timeline
  end if;
  insert into ticket_events (ticket_id, actor_id, kind, meta)
  values (
    new.ticket_id, auth.uid(), 'payment_added',
    jsonb_build_object('kind', new.kind, 'amount', new.amount)
  );
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------
create trigger tickets_log_created
  after insert on tickets
  for each row execute function log_ticket_created();

create trigger tickets_log_status_changed
  after update on tickets
  for each row execute function log_ticket_status_changed();

create trigger ticket_items_log_added
  after insert on ticket_items
  for each row execute function log_ticket_item_added();

create trigger ticket_items_log_removed
  after delete on ticket_items
  for each row execute function log_ticket_item_removed();

create trigger invoices_log_added
  after insert on invoices
  for each row execute function log_invoice_added();

create trigger payments_log_added
  after insert on payments
  for each row execute function log_payment_added();

-- ------------------------------------------------------------
-- RLS + grants (match init.sql pattern). Log is read-only from the
-- client; all writes flow through the SECURITY DEFINER triggers above.
-- ------------------------------------------------------------
alter table ticket_events enable row level security;

create policy ticket_events_authenticated_read on ticket_events
  for select to authenticated using (true);

grant select on ticket_events to authenticated, service_role;
grant insert on ticket_events to service_role;
grant usage, select on all sequences in schema public
  to authenticated, service_role;
