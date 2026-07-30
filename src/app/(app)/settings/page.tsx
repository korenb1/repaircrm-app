import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth";
import { getUser } from "@/lib/auth-server";
import SettingsView from "@/components/settings/SettingsView";
import type {
  Group,
  ServiceCatalogItem,
  ServiceCategory,
  Malfunction,
  EquipmentItem,
  TicketStatusRow,
  StatusTransition,
  DocumentTemplate,
  CompanySettings,
  AdminUser,
  Profile,
  FinanceCategory,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();

  const user = await getUser();
  const { data: me } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const isAdmin = me?.role === "admin";

  let users: AdminUser[] = [];
  if (isAdmin) {
    const admin = createAdminClient();
    const [authData, { data: profiles }] = await Promise.all([
      auth.api.listUsers({
        query: { limit: 1000 },
        headers: await headers(),
      }),
      admin.from("profiles").select("*"),
    ]);
    const byId = new Map(
      ((profiles ?? []) as Profile[]).map((p) => [p.id, p]),
    );
    users = (authData.users ?? []).map((u) => {
      const p = byId.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        full_name: p?.full_name ?? "",
        role: p?.role ?? "technician",
        created_at:
          u.createdAt instanceof Date
            ? u.createdAt.toISOString()
            : String(u.createdAt),
      };
    });
    users.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  const { data: groups } = await supabase
    .from("groups")
    .select("*")
    .order("name");

  const { data: malfunctions } = await supabase
    .from("malfunctions")
    .select("*")
    .order("sort_order")
    .order("name");

  const { data: equipment } = await supabase
    .from("equipment_items")
    .select("*")
    .order("sort_order")
    .order("name");

  const { data: services } = await supabase
    .from("service_catalog")
    .select("*")
    .order("kind")
    .order("name");

  const { data: serviceCategories } = await supabase
    .from("service_categories")
    .select("*")
    .order("kind")
    .order("sort_order")
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

  const { data: financeCategories } = await supabase
    .from("finance_categories")
    .select("*")
    .order("kind")
    .order("sort_order");

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
      malfunctions={(malfunctions ?? []) as Malfunction[]}
      equipment={(equipment ?? []) as EquipmentItem[]}
      services={(services ?? []) as ServiceCatalogItem[]}
      serviceCategories={(serviceCategories ?? []) as ServiceCategory[]}
      statuses={(statuses ?? []) as TicketStatusRow[]}
      transitions={(transitions ?? []) as StatusTransition[]}
      templates={(templates ?? []) as DocumentTemplate[]}
      company={(company ?? companyFallback) as CompanySettings}
      financeCategories={(financeCategories ?? []) as FinanceCategory[]}
      isAdmin={isAdmin}
      users={users}
    />
  );
}
