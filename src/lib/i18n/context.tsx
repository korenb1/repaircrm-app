"use client";
// Client-side i18n context. Seeded by the app layout with the signed-in
// user's language + currency (from their profiles row). Components read the
// dictionary via useT() and format money via useMoney(); both react when the
// provider is re-rendered with new values after a profile change.

import { createContext, useContext, useMemo } from "react";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/uk";
import "dayjs/locale/ru";
import "dayjs/locale/en";
import {
  type Dict,
  type Locale,
  getDict,
  INTL_LOCALE,
  normalizeLocale,
} from "./index";
import { currencyDef } from "./currencies";
import { makeMoneyFormatter, type MoneyFormatter } from "@/lib/money";

// dayjs BCP-47 locale per app locale (matches the loaded "dayjs/locale/*").
const DAYJS_LOCALE: Record<Locale, string> = {
  en: "en",
  ru: "ru",
  uk: "uk",
};

interface I18nValue {
  locale: Locale;
  currency: string;
  t: Dict;
  formatMoney: MoneyFormatter;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  currency,
  children,
}: {
  locale: string;
  currency: string;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nValue>(() => {
    const loc = normalizeLocale(locale);
    const cur = currencyDef(currency);
    // Set the global dayjs locale so relativeTime / month names follow the UI
    // language. dayjs locale is global state; setting it here keeps formatDate /
    // relativeDue (which use the default dayjs instance) in sync.
    dayjs.locale(DAYJS_LOCALE[loc]);
    return {
      locale: loc,
      currency: cur.code,
      t: getDict(loc),
      formatMoney: makeMoneyFormatter(INTL_LOCALE[loc], cur),
    };
  }, [locale, currency]);

  return (
    <I18nContext.Provider value={value}>
      <LocalizationProvider
        dateAdapter={AdapterDayjs}
        adapterLocale={DAYJS_LOCALE[value.locale]}
      >
        {children}
      </LocalizationProvider>
    </I18nContext.Provider>
  );
}

function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}

// The translation dictionary for the current locale.
export function useT(): Dict {
  return useI18n().t;
}

export function useLocale(): Locale {
  return useI18n().locale;
}

export function useCurrency(): string {
  return useI18n().currency;
}

// Money formatter bound to the current currency + locale.
export function useMoney(): MoneyFormatter {
  return useI18n().formatMoney;
}
