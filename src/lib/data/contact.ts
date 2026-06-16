import { createClient } from "@/lib/supabase/server";
import type { TicketRow, TicketTotals } from "@/lib/types";

// Shared loader for a single contact's detail view, used by both the
// full-page route and the intercepting modal route.
export async function getContactDetail(id: number) {
  const supabase = await createClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();
  if (!contact) return null;

  const [
    { data: balanceRow },
    { data: payments },
    { data: tickets },
    { data: totals },
    { data: phones },
    { data: documents },
  ] = await Promise.all([
    supabase.from("contact_balances").select("*").eq("contact_id", id).single(),
    supabase.from("payments").select("*").eq("contact_id", id).order("created_at", { ascending: false }),
    supabase
      .from("tickets")
      .select(
        `*, group:groups(name), brand:brands(name), model:models(name), modification:modifications(name), manager:profiles!tickets_manager_id_fkey(full_name)`,
      )
      .eq("client_id", id)
      .order("id", { ascending: false }),
    supabase.from("ticket_totals").select("*"),
    supabase
      .from("contact_phones")
      .select("*")
      .eq("contact_id", id)
      .order("is_primary", { ascending: false })
      .order("sort_order")
      .order("id"),
    supabase
      .from("contact_documents")
      .select("*")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const totalsMap = new Map<number, TicketTotals>(
    (totals ?? []).map((t) => [t.ticket_id, t]),
  );
  const ticketRows: TicketRow[] = (tickets ?? []).map((t: any) => ({
    ...t,
    price: totalsMap.get(t.id)?.price ?? 0,
    paid: totalsMap.get(t.id)?.paid ?? 0,
  }));

  // A ticket's charge hits the balance when it first becomes ready/issued, not
  // when it was created — pull that timestamp from the status-change log.
  const readyAt: Record<number, string> = {};
  const ticketIds = ticketRows.map((t) => t.id);
  if (ticketIds.length > 0) {
    const { data: statusEvents } = await supabase
      .from("ticket_events")
      .select("ticket_id, meta, created_at")
      .in("ticket_id", ticketIds)
      .eq("kind", "status_changed")
      .order("created_at", { ascending: true });
    for (const e of statusEvents ?? []) {
      const to = (e.meta as { to?: string } | null)?.to;
      if ((to === "ready" || to === "issued") && readyAt[e.ticket_id] === undefined) {
        readyAt[e.ticket_id] = e.created_at;
      }
    }
  }

  return {
    contact,
    balance: balanceRow?.balance ?? 0,
    payments: payments ?? [],
    tickets: ticketRows,
    readyAt,
    phones: phones ?? [],
    documents: documents ?? [],
  };
}
