import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TicketCard from "@/components/tickets/TicketCard";

export const dynamic = "force-dynamic";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (Number.isNaN(id)) notFound();

  const supabase = await createClient();

  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      `*,
       group:groups(name),
       brand:brands(name),
       model:models(name),
       client:contacts(id,first_name,last_name,phone),
       manager:profiles!tickets_manager_id_fkey(full_name),
       technician:profiles!tickets_technician_id_fkey(full_name)`,
    )
    .eq("id", id)
    .single();

  if (!ticket) notFound();

  const [{ data: items }, { data: invoices }, { data: payments }, { data: profiles }, { data: catalog }] =
    await Promise.all([
      supabase.from("ticket_items").select("*").eq("ticket_id", id).order("id"),
      supabase.from("invoices").select("*").eq("ticket_id", id).order("id"),
      supabase.from("payments").select("*").eq("ticket_id", id).order("created_at"),
      supabase.from("profiles").select("*"),
      supabase.from("service_catalog").select("*").order("name"),
    ]);

  return (
    <TicketCard
      ticket={ticket as any}
      items={items ?? []}
      invoices={invoices ?? []}
      payments={payments ?? []}
      profiles={profiles ?? []}
      catalog={catalog ?? []}
    />
  );
}
