// Malfunction / equipment ticket fields hold several entries as one
// comma-separated string. These helpers parse/format that string.

export function parseEntries(s: string | null | undefined): string[] {
  // Split on commas (current format) or newlines (older saved data).
  return (s ?? "")
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function formatEntries(entries: string[]): string {
  return entries.map((e) => e.trim()).filter(Boolean).join(", ");
}

// Fold a not-yet-committed input box value into the committed list so a typed
// entry isn't lost if the user clicks Save/Create before blurring the field.
export function mergePending(list: string[], input: string): string[] {
  const t = input.trim();
  if (!t || list.some((v) => v.toLowerCase() === t.toLowerCase())) return list;
  return [...list, t];
}
