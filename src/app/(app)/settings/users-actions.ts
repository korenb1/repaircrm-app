"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { T } from "@/lib/constants";

export type CreateUserState = { error: string | null; ok: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createUser(
  _prev: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const E = T.settings.users.errors;

  // Gate: only an authenticated admin may create users.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: E.forbidden };

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

  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    const msg = createErr?.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("exist")) {
      return { ok: false, error: E.exists };
    }
    return { ok: false, error: E.generic };
  }

  const { error: profErr } = await admin
    .from("profiles")
    .upsert({ id: created.user.id, full_name: fullName, role: "technician" });
  if (profErr) {
    // Roll back the orphan auth user so the email can be retried cleanly.
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: E.generic };
  }

  revalidatePath("/settings");
  return { ok: true, error: null };
}
