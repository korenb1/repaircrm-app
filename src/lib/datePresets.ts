// Date-range presets for the tickets "created" filter. Keys are stored in
// FilterCriteria.created; `inPreset` decides whether a given ISO date falls in
// the preset relative to `now` (captured once at mount for render purity).

export const DATE_PRESETS: { key: string; label: string }[] = [
  { key: "all", label: "Весь час" },
  { key: "today", label: "Сьогодні" },
  { key: "yesterday", label: "Вчора" },
  { key: "last7", label: "Останні 7 днів" },
  { key: "week", label: "Цей тиждень" },
  { key: "last30", label: "Останні 30 днів" },
  { key: "month", label: "Цей місяць" },
  { key: "year", label: "Цей рік" },
];

const DAY = 86_400_000;

// Start of the day containing `t` (local time).
function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Start of the ISO week (Monday) containing `t` (local time).
function startOfWeek(t: number): number {
  const d = new Date(startOfDay(t));
  const dow = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  return d.getTime() - dow * DAY;
}

export function inPreset(
  dateISO: string | null | undefined,
  key: string | undefined,
  now: number,
): boolean {
  if (!key || key === "all") return true;
  if (!dateISO) return false;
  const t = new Date(dateISO).getTime();
  if (Number.isNaN(t)) return false;

  const today = startOfDay(now);
  const ref = new Date(now);

  switch (key) {
    case "today":
      return t >= today;
    case "yesterday":
      return t >= today - DAY && t < today;
    case "last7":
      return t >= now - 7 * DAY;
    case "week":
      return t >= startOfWeek(now);
    case "last30":
      return t >= now - 30 * DAY;
    case "month":
      return t >= new Date(ref.getFullYear(), ref.getMonth(), 1).getTime();
    case "year":
      return t >= new Date(ref.getFullYear(), 0, 1).getTime();
    default:
      return true;
  }
}
