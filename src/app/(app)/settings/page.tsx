import { createClient } from "@/lib/supabase/server";
import SettingsView from "@/components/settings/SettingsView";
import type {
  Group,
  ServiceCatalogItem,
  TicketStatusRow,
  StatusTransition,
  DocumentTemplate,
  CompanySettings,
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

  const { data: templates } = await supabase
    .from("document_templates")
    .select("*")
    .order("created_at");

  const { data: company } = await supabase
    .from("company_settings")
    .select("*")
    .eq("id", 1)
    .single();

  const companyFallback: CompanySettings = {
    id: 1,
    name: "",
    address: "",
    phone: "",
    email: "",
    logo_path: null,
    additional_info: "",
    updated_at: new Date().toISOString(),
  };

  return (
    <SettingsView
      groups={(groups ?? []) as Group[]}
      services={(services ?? []) as ServiceCatalogItem[]}
      statuses={(statuses ?? []) as TicketStatusRow[]}
      transitions={(transitions ?? []) as StatusTransition[]}
      templates={(templates ?? []) as DocumentTemplate[]}
      company={(company ?? companyFallback) as CompanySettings}
    />
  );
}
