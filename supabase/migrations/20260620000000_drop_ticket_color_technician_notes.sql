-- ============================================================
-- Drop unused ticket columns:
--   color            — device colour; only ever surfaced as the
--                      `device.color` document variable, never set by any form.
--   technician_notes — not referenced anywhere in the app.
-- ============================================================

alter table tickets drop column if exists color;
alter table tickets drop column if exists technician_notes;
