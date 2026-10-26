"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeSaudiMobile } from "@/lib/phone";

export type AccountState = { status: "idle" | "saved" | "error"; field?: string };

const SELLER_TYPES = ["individual", "dealer", "agency", "employer"];

export async function saveAccount(_prev: AccountState, form: FormData): Promise<AccountState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error" };

  const displayName = String(form.get("display_name") ?? "").trim().slice(0, 60);
  const sellerType = String(form.get("seller_type") ?? "individual");
  const locale = form.get("preferred_locale") === "en" ? "en" : "ar";
  if (!displayName) return { status: "error", field: "display_name" };

  const phoneRaw = String(form.get("phone") ?? "").trim();
  const phone = phoneRaw ? normalizeSaudiMobile(phoneRaw) : null;
  if (phoneRaw && !phone) return { status: "error", field: "phone" };

  const [a, b] = await Promise.all([
    supabase
      .from("profiles")
      .update({
        display_name: displayName,
        seller_type: SELLER_TYPES.includes(sellerType) ? sellerType : "individual",
        preferred_locale: locale,
      })
      .eq("id", user.id),
    supabase
      .from("profile_contacts")
      .update({
        phone,
        allow_calls: form.get("allow_calls") === "on",
        allow_whatsapp: form.get("allow_whatsapp") === "on",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id),
  ]);
  if (a.error || b.error) return { status: "error" };
  revalidatePath("/[lang]", "layout");
  return { status: "saved" };
}

export async function requestBusinessBadge(_prev: AccountState, form: FormData): Promise<AccountState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error" };
  const type = String(form.get("business_type"));
  const cr = String(form.get("cr_number") ?? "").replace(/\D/g, "");
  const fal = String(form.get("fal_licence") ?? "").trim();
  if (!["dealer", "agency", "employer"].includes(type)) return { status: "error", field: "business_type" };
  if (!/^\d{10}$/.test(cr)) return { status: "error", field: "cr_number" };
  if (type === "agency" && !fal) return { status: "error", field: "fal_licence" };

  const { error } = await supabase.from("business_verifications").insert({
    user_id: user.id,
    business_type: type,
    business_name: String(form.get("business_name") ?? "").trim().slice(0, 120),
    cr_number: cr,
    fal_licence: fal || null,
  });
  if (error) return { status: "error" };
  revalidatePath("/[lang]/account", "page");
  return { status: "saved" };
}
