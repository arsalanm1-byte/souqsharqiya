import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/cron";
import { parseSearchParams } from "@/lib/search/params";
import { buildAdsQuery } from "@/lib/search/query";
import { escapeHtml, sendEmail, siteUrl } from "@/lib/email";
import { adPath } from "@/lib/ads";
import { formatPrice } from "@/lib/format";
import { fmt, getDictionary } from "@/lib/i18n";
import type { AdCardData } from "@/lib/types";

const BATCH = 500;

/** Daily: emails each saved search's new matches since the last alert. */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return new NextResponse("Unauthorized", { status: 401 });
  const admin = createAdminClient();
  if (!admin) return new NextResponse("SUPABASE_SECRET_KEY not set", { status: 500 });

  const cutoff = new Date(Date.now() - 20 * 3_600_000).toISOString();
  const { data: searches, error } = await admin
    .from("saved_searches")
    .select("id, user_id, name, params, last_alerted_at, profile:profiles(preferred_locale, is_banned)")
    .eq("email_alerts", true)
    .lt("last_alerted_at", cutoff)
    .order("last_alerted_at")
    .limit(BATCH);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const s of searches ?? []) {
    const profile = s.profile as unknown as { preferred_locale: string; is_banned: boolean } | null;
    const now = new Date().toISOString();
    if (!profile || profile.is_banned) continue;

    const p = parseSearchParams(s.params as Record<string, string>);
    const { data } = await buildAdsQuery(admin, p, { createdAfter: s.last_alerted_at, limit: 10 });
    const ads = (data ?? []) as unknown as AdCardData[];
    if (ads.length) {
      const { data: u } = await admin.auth.admin.getUserById(s.user_id);
      if (u.user?.email) {
        const lang = profile.preferred_locale === "en" ? "en" : "ar";
        const t = getDictionary(lang);
        const items = ads
          .map((ad) => `<li><a href="${siteUrl()}${adPath(lang, ad)}">${escapeHtml(ad.title)}</a> ${escapeHtml(formatPrice(ad.price, lang, ad.price_period) ?? "")}</li>`)
          .join("");
        const ok = await sendEmail(
          u.user.email,
          fmt(t.saved.alertSubject, { count: ads.length, name: s.name }),
          `<div dir="${lang === "ar" ? "rtl" : "ltr"}" style="font-family:sans-serif"><ul>${items}</ul>
           <p><a href="${siteUrl()}/${lang}/saved">${escapeHtml(t.saved.searches)}</a></p></div>`,
        );
        if (ok) sent++;
      }
    }
    await admin.from("saved_searches").update({ last_alerted_at: now }).eq("id", s.id);
  }
  return NextResponse.json({ checked: searches?.length ?? 0, sent });
}
