import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth-server";
import { mintSupabaseJwt } from "@/lib/supabase/jwt";

// RLS-scoped server client. Auth comes from the Better Auth session via a
// minted Supabase JWT (accessToken mode) — never call supabase.auth.* on
// these clients. No session → anon behavior (pre-auth pages like /login).
export async function createClient() {
  const session = await getSession();
  const token = session
    ? (await mintSupabaseJwt(session.user.id, session.user.email)).token
    : null;
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    token ? { accessToken: async () => token } : {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
