import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

// Request-cached: layout, pages and the supabase server client all share one
// session lookup per request.
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export async function getUser() {
  return (await getSession())?.user ?? null;
}
