import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import { StatusProvider } from "@/lib/status-context";
import type { TicketStatusRow, StatusTransition } from "@/lib/types";

export default async function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_path")
    .eq("id", user.id)
    .single();

  const userName = profile?.full_name ?? user.email ?? "Користувач";
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
    <StatusProvider
      statuses={(statuses ?? []) as TicketStatusRow[]}
      transitions={(transitions ?? []) as StatusTransition[]}
    >
      <AppShell userName={userName} avatarUrl={avatarUrl}>
        {children}
        {modal}
      </AppShell>
    </StatusProvider>
  );
}
