// Server-side dictionary access for Server Components and Server Actions,
// where the React context hooks (useT) are unavailable. Resolves the locale
// from the signed-in user's profile; falls back to the default (English) when
// there is no user (pre-auth) or no profile row yet.

import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth-server";
import { getDict, normalizeLocale, type Dict, type Locale } from "./index";

export async function getServerLocale(): Promise<Locale> {
  const user = await getUser();
  if (!user) return normalizeLocale(undefined);

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("language")
    .eq("id", user.id)
    .single();

  return normalizeLocale(data?.language);
}

export async function getServerDict(): Promise<Dict> {
  return getDict(await getServerLocale());
}
