import "server-only";
import { SignJWT } from "jose";

const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!);

const TTL_SECONDS = 60 * 60;

// Bridges Better Auth sessions to the Supabase data layer: PostgREST and
// storage accept any HS256 JWT signed with the project JWT secret, and RLS
// resolves auth.uid() from `sub`.
export async function mintSupabaseJwt(userId: string, email?: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const token = await new SignJWT({ role: "authenticated", email })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret);
  return { token, expiresAt };
}
