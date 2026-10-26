"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { loginPath } from "@/lib/auth";
import { safeNext } from "@/lib/ads";

function langOf(form: FormData): Locale {
  const lang = String(form.get("lang") ?? "");
  return isLocale(lang) ? lang : "ar";
}

export type RevealResult =
  | { ok: true; phone: string | null; allowCalls: boolean; allowWhatsapp: boolean }
  | { ok: false; error: "sign_in" | "limit" | "blocked" | "error" };

/** Logged and rate-limited in the database (reveal_contact). */
export async function revealContact(adId: number): Promise<RevealResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reveal_contact", { p_ad_id: adId });
  if (error) {
    if (error.message.includes("sign_in_required")) return { ok: false, error: "sign_in" };
    if (error.message.includes("reveal_limit")) return { ok: false, error: "limit" };
    if (error.message.includes("blocked")) return { ok: false, error: "blocked" };
    return { ok: false, error: "error" };
  }
  const row = (data as { phone: string; allow_calls: boolean; allow_whatsapp: boolean }[] | null)?.[0];
  return row
    ? { ok: true, phone: row.phone, allowCalls: row.allow_calls, allowWhatsapp: row.allow_whatsapp }
    : { ok: true, phone: null, allowCalls: false, allowWhatsapp: false };
}

export async function startChat(form: FormData) {
  const lang = langOf(form);
  const adId = Number(form.get("adId"));
  const back = safeNext(String(form.get("back") ?? ""), `/${lang}`);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(loginPath(lang, back));
  const { data, error } = await supabase.rpc("start_conversation", { p_ad_id: adId });
  if (error || !data) redirect(back);
  redirect(`/${lang}/messages/${data}`);
}

export type ReportState = { status: "idle" | "done" | "error" };

export async function reportAd(_prev: ReportState, form: FormData): Promise<ReportState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error" };
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    ad_id: Number(form.get("adId")) || null,
    reported_user_id: String(form.get("userId") ?? "") || null,
    reason: String(form.get("reason")),
    details: String(form.get("details") ?? "").slice(0, 1000) || null,
  });
  return { status: error ? "error" : "done" };
}

export async function blockUser(form: FormData) {
  const lang = langOf(form);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(loginPath(lang, `/${lang}`));
  await supabase.from("blocks").upsert({ blocker_id: user.id, blocked_id: String(form.get("userId")) });
  redirect(`${safeNext(String(form.get("back") ?? ""), `/${lang}`)}?blocked=1`);
}
