// Date-range presets for the tickets "created" filter. Keys are stored in
// FilterCriteria.created; `inPreset` decides whether a given ISO date falls in
// the preset relative to `now` (captured once at mount for render purity).
// Labels live in the i18n dictionaries (dict.datePresets[key]).

export type DatePresetKey =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "week"
  | "last30"
  | "month"
  | "year";

export const DATE_PRESETS: DatePresetKey[] = [
  "all",
  "today",
  "yesterday",
  "last7",
  "week",
  "last30",
  "month",
  "year",
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
