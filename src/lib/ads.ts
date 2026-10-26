import type { Locale } from "@/lib/i18n/config";

export const PHOTO_BUCKET = "ad-photos";

export function photoUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** /en/ad/123-toyota-camry-2020 — the slug is for people and search engines only. */
export function adPath(locale: Locale, ad: { id: number; title: string }): string {
  const slug = slugify(ad.title);
  return `/${locale}/ad/${ad.id}${slug ? `-${encodeURIComponent(slug)}` : ""}`;
}

export function parseAdId(param: string): number | null {
  const id = Number.parseInt(decodeURIComponent(param), 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function isLive(ad: { status: string; expires_at: string }): boolean {
  return ad.status === "active" && new Date(ad.expires_at) > new Date();
}

/** Internal path to return to after signing in. Rejects anything off-site. */
export function safeNext(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
