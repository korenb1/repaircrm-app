/**
 * Creates the admin user (Better Auth) + matching profile row.
 * Run after `supabase start` + `supabase db reset`:
 *   npm run create-admin
 *
 * Reads DATABASE_URL / BETTER_AUTH_SECRET / SUPABASE_* from .env.local.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Minimal .env.local loader (avoids extra dep). Must run before importing
// src/lib/auth, which reads env at module load.
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

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@repair.local";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";
const FULL_NAME = "Admin";

async function main() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) {
    throw new Error("Missing DATABASE_URL or BETTER_AUTH_SECRET in .env.local");
  }
  // Dynamic imports so loadEnv() runs first.
  const { auth } = await import("../src/lib/auth");
  const { createAdminClient } = await import("../src/lib/supabase/admin");
  const { Pool } = await import("pg");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // create (or find) the user
  let userId: string | undefined;
  try {
    const created = await auth.api.createUser({
      body: { email: EMAIL, password: PASSWORD, name: FULL_NAME, role: "admin" },
    });
    userId = created.user.id;
    console.log("Created user:", userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message.toLowerCase() : "";
    if (!msg.includes("already") && !msg.includes("exist")) throw e;
    const { rows } = await pool.query(
      `select id from "user" where email = $1`,
      [EMAIL],
    );
    userId = rows[0]?.id;
    console.log("User already exists, reusing:", userId);
  }

  if (!userId) throw new Error("Could not resolve admin user id");

  // upsert the profile (the databaseHook creates it as technician)
  const admin = createAdminClient();
  const { error: profErr } = await admin
    .from("profiles")
    .upsert({ id: userId, full_name: FULL_NAME, role: "admin" });
  if (profErr) throw profErr;

  await pool.end();
  console.log(`\n✅ Admin ready: ${EMAIL} / ${PASSWORD}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
