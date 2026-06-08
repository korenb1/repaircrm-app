-- ============================================================
-- Document templates: HTML templates (acceptance receipt, etc.)
-- authored in Settings with a TinyMCE editor + variable tokens.
-- ============================================================

create table document_templates (
  id bigint generated always as identity primary key,
  name text not null,
  kind text not null default 'other'
    check (kind in ('acceptance_receipt','completion_act','invoice','other')),
  content text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger document_templates_set_updated_at
  before update on document_templates
  for each row execute function set_updated_at();

-- RLS + grants (match init.sql pattern; new tables are not auto-granted)
alter table document_templates enable row level security;

create policy document_templates_authenticated_all on document_templates
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on document_templates
  to authenticated, service_role;
grant usage, select on sequence document_templates_id_seq
  to authenticated, service_role;
