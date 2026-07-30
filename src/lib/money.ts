import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/uk";
import "dayjs/locale/ru";
import "dayjs/locale/en";
import { currencyDef, type CurrencyDef } from "@/lib/i18n/currencies";

dayjs.extend(relativeTime);

export type MoneyFormatter = (value: number | null | undefined) => string;

// Builds a money formatter for a given locale + currency. We format a plain
// grouped number then append the symbol, rather than Intl currency style —
// Node and the browser ship different ICU currency data (e.g. ₴ vs "грн"),
// which caused SSR/client hydration mismatches.
export function makeMoneyFormatter(
  intlLocale: string,
  currency: CurrencyDef,
): MoneyFormatter {
  const nf = new Intl.NumberFormat(intlLocale, {
    minimumFractionDigits: currency.fractionDigits,
    maximumFractionDigits: currency.fractionDigits,
  });
  return (value) => `${nf.format(value ?? 0)} ${currency.symbol}`;
}

// One-shot money formatter for non-React call sites (e.g. server-side document
// rendering). Prefer useMoney() inside components.
export function formatMoney(
  value: number | null | undefined,
  opts?: { currency?: string; locale?: string },
): string {
  return makeMoneyFormatter(
    opts?.locale ?? "en-US",
    currencyDef(opts?.currency),
  )(value);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return dayjs(value).format("DD MMM YYYY HH:mm");
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return dayjs(value).format("DD.MM.YYYY HH:mm");
}

// Returns relative due info + overdue flag for the workflows due column.
export function relativeDue(value: string | null | undefined): {
  relative: string;
  absolute: string;
  overdue: boolean;
} {
  if (!value) return { relative: "—", absolute: "—", overdue: false };
  const d = dayjs(value);
  const overdue = d.isBefore(dayjs());
  return {
    relative: d.fromNow(),
    absolute: d.format("DD MMM YYYY HH:mm"),
    overdue,
  };
}
