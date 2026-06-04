import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientCard from "@/components/contacts/ClientCard";
import type { TicketRow, TicketTotals } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (Number.isNaN(id)) notFound();

  const supabase = await createClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();
  if (!contact) notFound();

  const [{ data: balanceRow }, { data: payments }, { data: tickets }, { data: totals }] =
    await Promise.all([
      supabase.from("contact_balances").select("*").eq("contact_id", id).single(),
      supabase.from("payments").select("*").eq("contact_id", id).order("created_at", { ascending: false }),
      supabase
        .from("tickets")
        .select(`*, model:models(name), manager:profiles!tickets_manager_id_fkey(full_name)`)
        .eq("client_id", id)
        .order("id", { ascending: false }),
      supabase.from("ticket_totals").select("*"),
    ]);

  const totalsMap = new Map<number, TicketTotals>(
    (totals ?? []).map((t) => [t.ticket_id, t]),
  );
  const ticketRows: TicketRow[] = (tickets ?? []).map((t: any) => ({
    ...t,
    price: totalsMap.get(t.id)?.price ?? 0,
    paid: totalsMap.get(t.id)?.paid ?? 0,
  }));

  return (
    <ClientCard
      contact={contact}
      balance={balanceRow?.balance ?? 0}
      payments={payments ?? []}
      tickets={ticketRows}
    />
  );
}
