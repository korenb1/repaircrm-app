/**
 * Creates the admin auth user + matching profile row using the service-role key.
 * Run after `supabase start` + `supabase db reset`:
 *   npm run create-admin
 *
 * Reads SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL from .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Minimal .env.local loader (avoids extra dep)
function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* ignore */
  }
}
loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@repair.local";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";
const FULL_NAME = "Адмін";

async function main() {
  if (!URL || !SERVICE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }
  const admin = createClient(URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // create (or find) the auth user
  let userId: string | undefined;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });

  if (createErr) {
    if (createErr.message.toLowerCase().includes("already")) {
      const { data: list } = await admin.auth.admin.listUsers();
      userId = list?.users.find((u) => u.email === EMAIL)?.id;
      console.log("User already exists, reusing:", userId);
    } else {
      throw createErr;
    }
  } else {
    userId = created.user?.id;
    console.log("Created auth user:", userId);
  }

  if (!userId) throw new Error("Could not resolve admin user id");

  // upsert the profile
  const { error: profErr } = await admin
    .from("profiles")
    .upsert({ id: userId, full_name: FULL_NAME, role: "admin" });
  if (profErr) throw profErr;

  console.log(`\n✅ Admin ready: ${EMAIL} / ${PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
