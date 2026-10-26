"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { isDisposableEmail } from "@/lib/disposable";
import { safeNext } from "@/lib/ads";
import { siteUrl } from "@/lib/email";

export type SignInState = { status: "idle" | "sent" | "error"; message?: "disposable" | "invalidEmail" | "error"; email?: string };

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return process.env.NEXT_PUBLIC_SITE_URL ? siteUrl() : `${proto}://${host}`;
}

function readLocale(form: FormData): Locale {
  const lang = String(form.get("lang") ?? "");
  return isLocale(lang) ? lang : "ar";
}

function callbackUrl(base: string, next: string): string {
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function signInWithEmail(_prev: SignInState, form: FormData): Promise<SignInState> {
  const lang = readLocale(form);
  const parsed = z.email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { status: "error", message: "invalidEmail" };
  const email = parsed.data;
  if (isDisposableEmail(email)) return { status: "error", message: "disposable" };

  const next = safeNext(String(form.get("next") ?? ""), `/${lang}`);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl(await origin(), next), shouldCreateUser: true },
  });
  if (error) {
    console.error("signInWithOtp", error.message);
    return { status: "error", message: error.message.includes("disposable") ? "disposable" : "error" };
  }
  return { status: "sent", email };
}

export async function signInWithProvider(form: FormData) {
  const lang = readLocale(form);
  const provider = form.get("provider") === "apple" ? "apple" : "google";
  const next = safeNext(String(form.get("next") ?? ""), `/${lang}`);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl(await origin(), next) },
  });
  if (error || !data.url) redirect(`/${lang}/login?error=1&next=${encodeURIComponent(next)}`);
  redirect(data.url);
}

export async function signOut(form: FormData) {
  const lang = readLocale(form);
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${lang}`);
}
