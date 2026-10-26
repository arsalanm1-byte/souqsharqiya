"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { parseSearchParams, toQueryObject } from "@/lib/search/params";
import { loginPath } from "@/lib/auth";

function langOf(form: FormData): Locale {
  const lang = String(form.get("lang") ?? "");
  return isLocale(lang) ? lang : "ar";
}

export async function saveSearch(form: FormData) {
  const lang = langOf(form);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(loginPath(lang, `/${lang}/search`));

  let raw: Record<string, string> = {};
  try {
    raw = JSON.parse(String(form.get("params") ?? "{}"));
  } catch {}
  // Re-validate so only known filters are stored.
  const params = toQueryObject(parseSearchParams(raw), { page: undefined });
  const name = String(form.get("name") ?? "").slice(0, 80) || "Search";
  await supabase.from("saved_searches").insert({ user_id: user.id, name, params });
  redirect(`/${lang}/saved?saved=search`);
}

export async function toggleSavedAd(adId: number, save: boolean): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  if (save) {
    await supabase.from("saved_ads").upsert({ user_id: user.id, ad_id: adId });
  } else {
    await supabase.from("saved_ads").delete().eq("user_id", user.id).eq("ad_id", adId);
  }
  revalidatePath("/[lang]/saved", "page");
  return save;
}

export async function deleteSavedSearch(form: FormData) {
  const supabase = await createClient();
  await supabase.from("saved_searches").delete().eq("id", Number(form.get("id")));
  revalidatePath("/[lang]/saved", "page");
}

export async function setSearchAlerts(form: FormData) {
  const supabase = await createClient();
  await supabase
    .from("saved_searches")
    .update({ email_alerts: form.get("on") === "1" })
    .eq("id", Number(form.get("id")));
  revalidatePath("/[lang]/saved", "page");
}
