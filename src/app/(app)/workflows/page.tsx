import { createClient } from "@/lib/supabase/server";
import TicketsTable from "@/components/tickets/TicketsTable";
import type { TicketRow, TicketTotals } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: tickets } = await supabase
    .from("tickets")
    .select(
      `*,
       group:groups(name),
       brand:brands(name),
       model:models(name),
       modification:modifications(name),
       client:contacts(id,first_name,last_name,phone),
       manager:profiles!tickets_manager_id_fkey(id,full_name,avatar_path),
       technician:profiles!tickets_technician_id_fkey(id,full_name,avatar_path),
       items:ticket_items(technician:profiles(id,full_name,avatar_path))`,
    )
    .order("id", { ascending: false });

  const { data: totals } = await supabase.from("ticket_totals").select("*");
  const totalsMap = new Map<number, TicketTotals>(
    (totals ?? []).map((t) => [t.ticket_id, t]),
  );

  const rows: TicketRow[] = (tickets ?? []).map((t: any) => ({
    ...t,
    price: totalsMap.get(t.id)?.price ?? 0,
    paid: totalsMap.get(t.id)?.paid ?? 0,
  }));

  return <TicketsTable rows={rows} currentUserId={user?.id ?? null} />;
}
