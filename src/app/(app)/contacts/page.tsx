import { createClient } from "@/lib/supabase/server";
import ContactsTable from "@/components/contacts/ContactsTable";
import type { ContactBalance } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const supabase = createClient();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .order("first_name");

  const { data: balances } = await supabase.from("contact_balances").select("*");
  const balMap = new Map<number, number>(
    (balances ?? []).map((b: ContactBalance) => [b.contact_id, b.balance]),
  );

  const rows = (contacts ?? []).map((c) => ({
    ...c,
    balance: balMap.get(c.id) ?? 0,
  }));

  return <ContactsTable rows={rows} />;
}
