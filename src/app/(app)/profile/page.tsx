import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileManager from "@/components/profile/ProfileManager";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const fallback: Profile = {
    id: user.id,
    full_name: "",
    role: "technician",
    phone: "",
    telegram_username: "",
    avatar_path: null,
    created_at: new Date().toISOString(),
  };

  return (
    <ProfileManager
      profile={(profile ?? fallback) as Profile}
      email={user.email ?? ""}
    />
  );
}
