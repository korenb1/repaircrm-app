import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import SettingsView from "@/components/settings/SettingsView";
import type {
  Group,
  ServiceCatalogItem,
  TicketStatusRow,
  StatusTransition,
  DocumentTemplate,
  CompanySettings,
  AdminUser,
  Profile,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const isAdmin = me?.role === "admin";

  let users: AdminUser[] = [];
  if (isAdmin) {
    const admin = createAdminClient();
    const [{ data: authData }, { data: profiles }] = await Promise.all([
      admin.auth.admin.listUsers({ perPage: 1000 }),
      admin.from("profiles").select("*"),
    ]);
    const byId = new Map(
      ((profiles ?? []) as Profile[]).map((p) => [p.id, p]),
    );
    users = (authData?.users ?? []).map((u) => {
      const p = byId.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        full_name: p?.full_name ?? "",
        role: p?.role ?? "technician",
        created_at: u.created_at,
      };
    });
    users.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

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
      isAdmin={isAdmin}
      users={users}
    />
  );
}
