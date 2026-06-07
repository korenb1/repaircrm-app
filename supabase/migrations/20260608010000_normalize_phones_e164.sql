-- ============================================================
-- Normalize stored phone numbers to E.164 ("+380XXXXXXXXX").
-- ------------------------------------------------------------
-- Earlier rows were saved formatted (e.g. "+380 (50) 384 16 14"). SMS provider
-- integration needs bare E.164, so strip every non-digit and re-prefix "+".
-- These rows already carry their country code, so digits-only + "+" is correct.
-- The contact_phones trigger re-mirrors the primary into contacts.phone.
-- ============================================================

update contact_phones
set phone = '+' || regexp_replace(phone, '\D', '', 'g')
where phone is not null
  and phone !~ '^\+[0-9]+$';

-- Mirror any contacts.phone not covered by a trigger fire (defensive).
update contacts
set phone = '+' || regexp_replace(phone, '\D', '', 'g')
where phone is not null
  and phone !~ '^\+[0-9]+$';
