import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/ads";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";

/**
 * Landing point for email sign-in links and Google/Apple sign-in.
 * Handles both the PKCE `code` flow and the `token_hash` flow (which also works
 * when the link is opened in a different browser than the one that asked).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const savedLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const lang = isLocale(savedLocale) ? savedLocale : "ar";
  const next = safeNext(url.searchParams.get("next"), `/${lang}`);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "email") as EmailOtpType;

  const supabase = await createClient();
  let ok = false;
  if (tokenHash) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  const target = new URL(ok ? next : `/${lang}/login?error=link&next=${encodeURIComponent(next)}`, url.origin);
  return NextResponse.redirect(target);
}
