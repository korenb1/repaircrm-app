import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { mintSupabaseJwt } from "@/lib/supabase/jwt";

// Browser supabase clients fetch their PostgREST/storage token here
// (see src/lib/supabase/client.ts accessToken callback).
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { token, expiresAt } = await mintSupabaseJwt(
    session.user.id,
    session.user.email,
  );
  return NextResponse.json(
    { token, expiresAt },
    { headers: { "Cache-Control": "no-store" } },
  );
}
