"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Every admin action is re-checked in the database (is_admin() in the RPCs and
// RLS policies), so these only pass the request through.

async function rpc(fn: string, args: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, args);
  if (error) console.error(fn, error.message);
  revalidatePath("/[lang]/admin", "layout");
}

export async function setAdStatus(form: FormData) {
  await rpc("admin_set_ad_status", {
    p_ad_id: Number(form.get("id")),
    p_status: String(form.get("status")),
    p_note: String(form.get("note") ?? "").trim() || null,
  });
}

export async function reviewBusiness(form: FormData) {
  await rpc("admin_review_business", {
    p_id: Number(form.get("id")),
    p_approve: form.get("approve") === "1",
    p_note: String(form.get("note") ?? "").trim() || null,
  });
}

export async function setBanned(form: FormData) {
  await rpc("admin_set_banned", { p_user: String(form.get("userId")), p_banned: form.get("banned") === "1" });
  revalidatePath("/[lang]/profile/[id]", "page");
}

export async function setReportStatus(form: FormData) {
  await rpc("admin_set_report_status", { p_id: Number(form.get("id")), p_status: String(form.get("status")) });
}

export async function saveCartlowPrice(form: FormData) {
  const supabase = await createClient();
  const brand = String(form.get("brand") ?? "").trim();
  const model = String(form.get("model") ?? "").trim();
  const storage = String(form.get("storage") ?? "").trim() || null;
  const price = Number(form.get("price"));
  const url = String(form.get("url") ?? "").trim();
  if (!brand || !model || !(price > 0) || !url.startsWith("https://")) return;

  let existing = supabase.from("cartlow_prices").select("id").ilike("brand", brand).ilike("model", model);
  existing = storage ? existing.ilike("storage", storage) : existing.is("storage", null);
  const { data } = await existing.maybeSingle();
  const row = { brand, model, storage, price, url, updated_at: new Date().toISOString() };
  const { error } = data
    ? await supabase.from("cartlow_prices").update(row).eq("id", data.id)
    : await supabase.from("cartlow_prices").insert(row);
  if (error) console.error("saveCartlowPrice", error.message);
  revalidatePath("/[lang]/admin/cartlow", "page");
}

export async function deleteCartlowPrice(form: FormData) {
  const supabase = await createClient();
  await supabase.from("cartlow_prices").delete().eq("id", Number(form.get("id")));
  revalidatePath("/[lang]/admin/cartlow", "page");
}
