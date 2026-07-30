"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { getUser } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerDict } from "@/lib/i18n/server";

export type CreateUserState = { error: string | null; ok: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createUser(
  _prev: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const T = await getServerDict();
  const E = T.settings.users.errors;

  // Gate: only an authenticated admin may create users.
  const user = await getUser();
  if (!user) return { ok: false, error: E.forbidden };

  const supabase = await createClient();
  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (caller?.role !== "admin") return { ok: false, error: E.forbidden };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!EMAIL_RE.test(email)) return { ok: false, error: E.invalidEmail };
  if (password.length < 6) return { ok: false, error: E.tooShort };
  if (!fullName) return { ok: false, error: E.nameRequired };

  // The user.create databaseHook (src/lib/auth.ts) inserts the profiles row
  // (full_name from name, role technician).
  let created;
  try {
    created = await auth.api.createUser({
      body: { email, password, name: fullName, role: "user" },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("already") || msg.includes("exist")) {
        return { ok: false, error: E.exists };
      }
      return { ok: false, error: E.generic };
    }
    throw error;
  }

  // The hook writes via the service-role client; verify the profile landed so
  // a failure there doesn't leave an orphan auth user.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", created.user.id)
    .maybeSingle();
  if (!profile) {
    await auth.api.removeUser({
      body: { userId: created.user.id },
      headers: await headers(),
    });
    return { ok: false, error: E.generic };
  }

  revalidatePath("/settings");
  return { ok: true, error: null };
}
