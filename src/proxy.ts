import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Optimistic cookie-presence check only (edge-safe, no DB hit). Real
// enforcement lives in (app)/layout.tsx (session lookup + redirect) and RLS.
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/supabase-token"];

export async function proxy(request: NextRequest) {
  const cookie = getSessionCookie(request);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!cookie && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (cookie && path === "/login") {
    return NextResponse.redirect(new URL("/workflows", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // run on everything except static assets / images
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
