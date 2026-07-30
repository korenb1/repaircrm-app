#!/usr/bin/env node
// Mints the anon + service_role API keys for a self-hosted stack.
// They are plain HS256 JWTs signed with the stack's JWT_SECRET — the same
// secret PostgREST and storage-api verify against, and the same one the app
// signs user tokens with in src/lib/supabase/jwt.ts.
//
//   node deploy/supabase/gen-keys.mjs "$JWT_SECRET"
//
// No dependencies, so it runs on a bare VPS.
import { createHmac } from "node:crypto";

const secret = process.argv[2];
if (!secret) {
  console.error("usage: node gen-keys.mjs <JWT_SECRET>");
  process.exit(1);
}

const b64url = (input) =>
  Buffer.from(input).toString("base64url");

function sign(payload) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const sig = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

const iat = Math.floor(Date.now() / 1000);
const exp = iat + 60 * 60 * 24 * 365 * 10; // 10 years

for (const role of ["anon", "service_role"]) {
  console.log(`${role.toUpperCase()}_KEY=${sign({ role, iss: "supabase", iat, exp })}`);
}
