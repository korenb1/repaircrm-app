import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { passkey } from "@better-auth/passkey";
import { Pool } from "pg";
import { createAdminClient } from "@/lib/supabase/admin";

// Identity source of truth. Tables live in the same Postgres as the app data
// (public schema, RLS-locked) and are reached over a direct connection that
// bypasses PostgREST entirely.
export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: { enabled: true, minPasswordLength: 6 },
  advanced: {
    // UUID ids so profiles.id / RLS auth.uid() / actor FKs keep working.
    database: { generateId: () => crypto.randomUUID() },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Every auth user needs a profiles row (role gate, actor FKs).
          // Callers that know the intended role update it right after.
          const supabase = createAdminClient();
          await supabase
            .from("profiles")
            .upsert({ id: user.id, full_name: user.name, role: "technician" });
        },
      },
    },
  },
  plugins: [
    passkey(),
    admin(),
    nextCookies(), // must stay last — sets cookies from server actions
  ],
});
