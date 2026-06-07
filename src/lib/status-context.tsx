"use client";
import { createContext, useContext } from "react";
import type { TicketStatusRow, StatusTransition } from "@/lib/types";

interface StatusContextValue {
  statuses: TicketStatusRow[];
  transitions: StatusTransition[];
  byKey: Map<string, TicketStatusRow>;
}

const FALLBACK: TicketStatusRow = {
  key: "",
  label: "—",
  color: "#616161",
  bg: "#eeeeee",
  sort_order: 0,
  is_terminal: false,
  is_default: false,
};

const StatusContext = createContext<StatusContextValue>({
  statuses: [],
  transitions: [],
  byKey: new Map(),
});

export function StatusProvider({
  statuses,
  transitions,
  children,
}: {
  statuses: TicketStatusRow[];
  transitions: StatusTransition[];
  children: React.ReactNode;
}) {
  const byKey = new Map(statuses.map((s) => [s.key, s]));
  return (
    <StatusContext.Provider value={{ statuses, transitions, byKey }}>
      {children}
    </StatusContext.Provider>
  );
}

export function useStatuses() {
  return useContext(StatusContext);
}

// Status metadata for a given key, with a safe fallback for unknown keys.
export function useStatusMeta(key: string): TicketStatusRow {
  const { byKey } = useContext(StatusContext);
  return byKey.get(key) ?? { ...FALLBACK, key, label: key };
}

// Keys reachable from `current` (the allowed "to" set), always including
// `current` itself so the badge can render its own state in the menu.
export function useAllowedTargets(current: string): TicketStatusRow[] {
  const { statuses, transitions } = useContext(StatusContext);
  const allowed = new Set(
    transitions.filter((t) => t.from_key === current).map((t) => t.to_key),
  );
  allowed.add(current);
  return statuses.filter((s) => allowed.has(s.key));
}

// Terminal status keys (used by overdue logic).
export function useTerminalKeys(): Set<string> {
  const { statuses } = useContext(StatusContext);
  return new Set(statuses.filter((s) => s.is_terminal).map((s) => s.key));
}
