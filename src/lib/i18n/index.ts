// i18n entry point: locale registry, dictionary lookup, and the string
// interpolation helper. The English dictionary (en.ts) is canonical; `Dict`
// is derived from it so ru/uk are structurally checked against it.

import en from "./en";

// `en` is declared `as const`, so every leaf is a string-literal type. Widen
// leaves to `string` while preserving the key structure — this is what other
// locales (ru/uk) are checked against: same keys, free-form string values.
type Localized<T> = {
  [K in keyof T]: T[K] extends string ? string : Localized<T[K]>;
};

export type Dict = Localized<typeof en>;

export type Locale = "en" | "ru" | "uk";

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  { code: "uk", label: "Українська" },
];

export const DEFAULT_LOCALE: Locale = "en";

// dayjs / Intl BCP-47 tags per locale.
export const INTL_LOCALE: Record<Locale, string> = {
  en: "en-US",
  ru: "ru-RU",
  uk: "uk-UA",
};

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ru" || value === "uk";
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

// Lazily-required so server code can load a single dictionary synchronously
// without bundling all three into every client component that only needs one.
import ru from "./ru";
import uk from "./uk";

const DICTS: Record<Locale, Dict> = { en, ru, uk };

export function getDict(locale: Locale | string | null | undefined): Dict {
  return DICTS[normalizeLocale(locale)];
}

// Replaces {token} placeholders in a template string. Used for messages like
// "Delete «{name}»?" and "{kind} for ticket".
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_m, key) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}
