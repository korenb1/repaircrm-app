-- ============================================================
-- Per-user UI preferences: interface language and display currency.
-- Language drives the i18n dictionary (en/ru/uk) and date/number
-- locale; currency drives money formatting only (amounts are stored
-- as plain numbers — no FX conversion). Defaults: English + USD.
-- ============================================================

alter table profiles
  add column language text not null default 'en'
    check (language in ('en', 'ru', 'uk')),
  add column currency text not null default 'USD';
