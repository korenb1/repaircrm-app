import type { ItemKind } from "./types";

// Item-kind keys. Labels live in the i18n dictionaries (dict.itemKinds);
// resolve with `t.itemKinds[kind]`.
export const ITEM_KINDS: ItemKind[] = ["labor", "service", "product"];

// Fixed status groups. A status's color, terminal-ness and the allowed
// transitions between statuses are all derived from its group. Labels live in
// the i18n dictionaries (dict.statusGroups[key]); only structural data
// (colors, order) is kept here.
export interface StatusGroup {
  key: string;
  color: string; // text color
  bg: string; // background color
}

export const STATUS_GROUPS: StatusGroup[] = [
  { key: "new", color: "#0288d1", bg: "#e1f5fe" },
  { key: "in_work", color: "#2e7d32", bg: "#e8f5e9" },
  { key: "postponed", color: "#B76E00", bg: "#FEEFDB" },
  { key: "ready", color: "#2e7d32", bg: "#c8e6c9" },
  { key: "delivery", color: "#ffffff", bg: "#0097a7" },
  { key: "closed_success", color: "#616161", bg: "#eeeeee" },
  { key: "closed_fail", color: "#B71D18", bg: "#FFE4DE" },
];

export const STATUS_GROUP_BY_KEY: Record<string, StatusGroup> = Object.fromEntries(
  STATUS_GROUPS.map((g) => [g.key, g]),
);

// Terminal groups: moving a ticket into one of these closes it and opens the
// close dialog (pay for closed_success, refund for closed_fail).
export const TERMINAL_GROUPS = ["closed_success", "closed_fail"] as const;

export function isTerminalGroup(group: string | undefined | null): boolean {
  return group === "closed_success" || group === "closed_fail";
}
