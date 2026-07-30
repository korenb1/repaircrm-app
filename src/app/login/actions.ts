"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { getDict } from "@/lib/i18n";

// Login is pre-auth (no profile yet), so it uses the default-locale dictionary.
const T = getDict(undefined);

export type LoginState = { error: string | null };

// Server Action so login works even before (or without) client-side
// hydration — a native form POST signs in and sets the auth cookies on
// the server (via the nextCookies plugin), then redirects. The client
// form enhances this when JS loads.
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) return { error: T.login.error };
    throw error;
  }

  redirect("/workflows");
}
