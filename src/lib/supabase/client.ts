import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Token cache shared by every client instance in the tab. Refreshed 60 s
// before expiry; a 401 (signed out) clears it and falls back to anon.
let cached: { token: string; expiresAt: number } | null = null;
let pending: Promise<string | null> | null = null;

async function fetchToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/supabase-token");
    if (!res.ok) {
      cached = null;
      return null;
    }
    cached = await res.json();
    return cached!.token;
  } catch {
    cached = null;
    return null;
  }
}

async function getToken(): Promise<string | null> {
  if (cached && cached.expiresAt - 60 > Date.now() / 1000) return cached.token;
  pending ??= fetchToken().finally(() => {
    pending = null;
  });
  return pending;
}

// RLS-scoped browser client, authenticated by the Better Auth session via a
// minted Supabase JWT — never call supabase.auth.* on these clients.
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { accessToken: getToken },
  );
}
