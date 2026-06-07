import { createClient } from "@/lib/supabase/server";
import SettingsView from "@/components/settings/SettingsView";
import type {
  Group,
  ServiceCatalogItem,
  TicketStatusRow,
  StatusTransition,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: groups } = await supabase
    .from("groups")
    .select("*")
    .order("name");

  const { data: services } = await supabase
    .from("service_catalog")
    .select("*")
    .order("kind")
    .order("name");

  const { data: statuses } = await supabase
    .from("ticket_statuses")
    .select("*")
    .order("sort_order");

  const { data: transitions } = await supabase
    .from("status_transitions")
    .select("*");

  return (
    <SettingsView
      groups={(groups ?? []) as Group[]}
      services={(services ?? []) as ServiceCatalogItem[]}
      statuses={(statuses ?? []) as TicketStatusRow[]}
      transitions={(transitions ?? []) as StatusTransition[]}
    />
  );
}
