import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/uk";

dayjs.extend(relativeTime);
dayjs.locale("uk");

// Format as a plain grouped number then append the ₴ symbol, rather than using
// currency style — Node and the browser ship different ICU currency data
// (₴ vs "грн"), which caused SSR/client hydration mismatches.
const uah = new Intl.NumberFormat("uk-UA", {
  maximumFractionDigits: 0,
});

export function formatUAH(value: number | null | undefined): string {
  return `${uah.format(value ?? 0)} ₴`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return dayjs(value).format("DD MMM YYYY HH:mm");
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return dayjs(value).format("DD.MM.YYYY HH:mm");
}

// Returns relative due info + overdue flag for the workflows "Термін" column.
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
