import { notFound } from "next/navigation";
import RouteDialog from "@/components/ui/RouteDialog";
import TicketCard from "@/components/tickets/TicketCard";
import { getTicketDetail } from "@/lib/data/ticket";

export const dynamic = "force-dynamic";

// Intercepts soft navigation to /workflows/[id] and shows the ticket card
// as a modal overlaid on the workflows list. A hard load of the same URL
// falls back to the full-page route.
export default async function TicketModal({
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
    <RouteDialog>
      <TicketCard
        embedded
        ticket={data.ticket as any}
        items={data.items}
        invoices={data.invoices}
        payments={data.payments}
        profiles={data.profiles}
        catalog={data.catalog}
      />
    </RouteDialog>
  );
}
