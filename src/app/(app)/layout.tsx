import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth-server";
import AppShell from "@/components/AppShell";
import { StatusProvider } from "@/lib/status-context";
import { I18nProvider } from "@/lib/i18n/context";
import { DEFAULT_CURRENCY } from "@/lib/i18n/currencies";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import type { TicketStatusRow, StatusTransition } from "@/lib/types";

export default async function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_path, language, currency")
    .eq("id", user.id)
    .single();

  const userName = profile?.full_name ?? user.email ?? "User";
  const language = profile?.language ?? DEFAULT_LOCALE;
  const currency = profile?.currency ?? DEFAULT_CURRENCY;
  const avatarUrl = profile?.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data
        .publicUrl
    : null;

  const { data: statuses } = await supabase
    .from("ticket_statuses")
    .select("*")
    .order("sort_order");
  const { data: transitions } = await supabase
    .from("status_transitions")
    .select("*");

  return (
    <I18nProvider locale={language} currency={currency}>
      <StatusProvider
        statuses={(statuses ?? []) as TicketStatusRow[]}
        transitions={(transitions ?? []) as StatusTransition[]}
      >
        <AppShell userName={userName} avatarUrl={avatarUrl}>
          {children}
          {modal}
        </AppShell>
      </StatusProvider>
    </I18nProvider>
  );
}
