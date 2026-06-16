import { notFound } from "next/navigation";
import RouteDialog from "@/components/ui/RouteDialog";
import ClientCard from "@/components/contacts/ClientCard";
import { getContactDetail } from "@/lib/data/contact";

export const dynamic = "force-dynamic";

// Intercepts soft navigation to /contacts/[id] from anywhere in the app and
// shows the client card as a modal overlaid on the current page. A hard load
// of the same URL falls back to the full-page route.
export default async function ContactModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (Number.isNaN(id)) notFound();

  const data = await getContactDetail(id);
  if (!data) notFound();

  return (
    <RouteDialog>
      <ClientCard
        embedded
        contact={data.contact}
        balance={data.balance}
        payments={data.payments}
        tickets={data.tickets}
        readyAt={data.readyAt}
        phones={data.phones}
        documents={data.documents}
      />
    </RouteDialog>
  );
}
