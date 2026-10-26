import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { categories } from "@/lib/categories";
import { ALL_CITIES, cities } from "@/lib/locations";
import { adPath } from "@/lib/ads";
import { siteUrl } from "@/lib/email";
import { locales } from "@/lib/i18n/config";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const entries: MetadataRoute.Sitemap = [];
  for (const lang of locales) {
    entries.push({ url: `${base}/${lang}`, changeFrequency: "hourly", priority: 1 });
    for (const city of [ALL_CITIES, ...cities.map((c) => c.slug)]) {
      for (const cat of categories) {
        entries.push({ url: `${base}/${lang}/${city}/${cat.id}`, changeFrequency: "hourly", priority: 0.8 });
        for (const sub of cat.subcategories) {
          entries.push({ url: `${base}/${lang}/${city}/${cat.id}/${sub.value}`, changeFrequency: "daily", priority: 0.6 });
        }
      }
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await supabase
      .from("ads")
      .select("id, title, updated_at")
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(20000);
    for (const ad of data ?? []) {
      for (const lang of locales) {
        entries.push({ url: `${base}${adPath(lang, ad)}`, lastModified: ad.updated_at, changeFrequency: "weekly", priority: 0.5 });
      }
    }
  }
  return entries;
}
