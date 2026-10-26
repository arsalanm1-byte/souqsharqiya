import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/config";
import type { Profile } from "@/lib/types";

/** The signed-in user and their profile, or nulls for a visitor. */
export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  return { supabase, user, profile };
}

export function loginPath(locale: Locale, next: string): string {
  return `/${locale}/login?next=${encodeURIComponent(next)}`;
}

/** For pages that need an account: sends visitors to sign in, then back. */
export async function requireUser(locale: Locale, next: string) {
  const session = await getSession();
  if (!session.user || !session.profile) redirect(loginPath(locale, next));
  return { supabase: session.supabase, user: session.user, profile: session.profile };
}

export async function requireAdmin(locale: Locale) {
  const session = await requireUser(locale, `/${locale}/admin`);
  if (session.profile.role !== "admin") redirect(`/${locale}`);
  return session;
}
