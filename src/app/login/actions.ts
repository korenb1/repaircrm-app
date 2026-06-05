"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { T } from "@/lib/constants";

export type LoginState = { error: string | null };

// Server Action so login works even before (or without) client-side
// hydration — a native form POST signs in and sets the auth cookies on
// the server, then redirects. The client form enhances this when JS loads.
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: T.login.error };

  redirect("/workflows");
}
