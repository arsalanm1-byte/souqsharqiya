"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { loginPath } from "@/lib/auth";
import { validateAd, type AdInput, type FieldErrors } from "@/lib/validation";
import type { SellerType } from "@/lib/types";

export type SaveAdResult =
  | { ok: true; id: number; status: string }
  | { ok: false; errors?: FieldErrors; error?: "daily_limit" | "email_not_confirmed" | "banned" | "rega_licence_required" | "generic" | "sign_in" };

const KNOWN_ERRORS = ["daily_limit", "email_not_confirmed", "banned", "rega_licence_required"] as const;

export async function saveAd(
  input: AdInput & { id?: number; photos: string[]; photoHashes: string[] },
): Promise<SaveAdResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "sign_in" };

  const { data: profile } = await supabase.from("profiles").select("seller_type").eq("id", user.id).single();
  const result = validateAd(input, (profile?.seller_type ?? "individual") as SellerType);
  if (!result.ok) return { ok: false, errors: result.errors };

  // Photos must be ones this user uploaded into their own folder.
  const photos = input.photos.filter((p) => typeof p === "string" && p.startsWith(`${user.id}/`) && !p.includes("..")).slice(0, 10);
  const photoHashes = input.photoHashes.filter((h) => /^[0-9a-f]{64}$/.test(h)).slice(0, 10);
  const row = { ...result.row, photos, photo_hashes: photoHashes };
  // The category is fixed once posted (and not writable on update).
  const editable: Partial<typeof row> = { ...row };
  delete editable.category;

  const query = input.id
    ? supabase.from("ads").update(editable).eq("id", input.id).eq("user_id", user.id).select("id, status").single()
    : supabase.from("ads").insert({ ...row, user_id: user.id }).select("id, status").single();
  const { data, error } = await query;
  if (error || !data) {
    const known = KNOWN_ERRORS.find((code) => error?.message.includes(code));
    if (!known) console.error("saveAd", error?.message);
    return { ok: false, error: known ?? "generic" };
  }
  revalidatePath("/[lang]", "layout");
  return { ok: true, id: data.id, status: data.status };
}

function langOf(form: FormData): Locale {
  const lang = String(form.get("lang") ?? "");
  return isLocale(lang) ? lang : "ar";
}

async function ownerRpc(form: FormData, fn: string, args: Record<string, unknown>) {
  const lang = langOf(form);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(loginPath(lang, `/${lang}/my/ads`));
  const { error } = await supabase.rpc(fn, args);
  if (error) console.error(fn, error.message);
  revalidatePath("/[lang]/my/ads", "page");
  return { lang, error };
}

export async function closeAd(form: FormData) {
  await ownerRpc(form, "close_ad", { p_ad_id: Number(form.get("id")) });
}

export async function renewAd(form: FormData) {
  await ownerRpc(form, "renew_ad", { p_ad_id: Number(form.get("id")) });
}

export async function markSold(form: FormData) {
  const buyer = String(form.get("buyer") ?? "");
  const price = Number(String(form.get("price") ?? "").replace(/,/g, ""));
  const { lang, error } = await ownerRpc(form, "mark_sold", {
    p_ad_id: Number(form.get("id")),
    p_buyer: buyer || null,
    p_price: Number.isFinite(price) && price > 0 ? price : null,
  });
  if (!error && buyer) redirect(`/${lang}/rate/${Number(form.get("id"))}`);
}

export async function deleteAd(form: FormData) {
  const lang = langOf(form);
  const supabase = await createClient();
  await supabase.from("ads").delete().eq("id", Number(form.get("id")));
  revalidatePath("/[lang]/my/ads", "page");
  redirect(`/${lang}/my/ads`);
}

export type RateState = { status: "idle" | "done" | "error" };

export async function rateDeal(_prev: RateState, form: FormData): Promise<RateState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error" };
  const stars = Number(form.get("stars"));
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return { status: "error" };
  const { error } = await supabase.from("ratings").insert({
    ad_id: Number(form.get("adId")),
    rater_id: user.id,
    ratee_id: String(form.get("rateeId")),
    ratee_role: form.get("role") === "buyer" ? "buyer" : "seller",
    stars,
    comment: String(form.get("comment") ?? "").trim().slice(0, 500) || null,
  });
  if (error) console.error("rateDeal", error.message);
  return { status: error ? "error" : "done" };
}
