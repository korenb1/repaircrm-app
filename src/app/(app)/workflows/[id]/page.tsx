import { notFound } from "next/navigation";
import TicketCard from "@/components/tickets/TicketCard";
import { getTicketDetail } from "@/lib/data/ticket";

export const dynamic = "force-dynamic";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (Number.isNaN(id)) notFound();

  const data = await getTicketDetail(id);
  if (!data) notFound();

  return (
    <TicketCard
      ticket={data.ticket as any}
      items={data.items}
      invoices={data.invoices}
      payments={data.payments}
      profiles={data.profiles}
      catalog={data.catalog}
    />
  );
}
