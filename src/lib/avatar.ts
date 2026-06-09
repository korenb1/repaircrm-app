// Public URL for an avatar stored in the `avatars` bucket. The bucket is
// public, so the URL is deterministic and matches supabase getPublicUrl()
// output — no client round-trip needed to render an <img>.
export function avatarUrl(path?: string | null): string | undefined {
  return path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`
    : undefined;
}
