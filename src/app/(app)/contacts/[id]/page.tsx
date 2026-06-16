import { notFound } from "next/navigation";
import ClientCard from "@/components/contacts/ClientCard";
import { getContactDetail } from "@/lib/data/contact";

export const dynamic = "force-dynamic";

export default async function ContactPage({
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
    <ClientCard
      contact={data.contact}
      balance={data.balance}
      payments={data.payments}
      tickets={data.tickets}
      readyAt={data.readyAt}
      phones={data.phones}
      documents={data.documents}
    />
  );
}
