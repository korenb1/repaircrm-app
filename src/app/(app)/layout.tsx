import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import { StatusProvider } from "@/lib/status-context";
import type { TicketStatusRow, StatusTransition } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const userName = profile?.full_name ?? user.email ?? "Користувач";

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
      <AppShell userName={userName}>{children}</AppShell>
    </StatusProvider>
  );
}
