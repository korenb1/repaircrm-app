import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS and can use the auth admin API.
// MUST only be imported from server-side code (server actions / route handlers).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
