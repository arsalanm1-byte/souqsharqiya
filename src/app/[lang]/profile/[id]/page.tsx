import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { fmt, getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { formatDate, formatMonthYear } from "@/lib/format";
import { AD_CARD_COLUMNS, type AdCardData, type Profile, type RatingSummary } from "@/lib/types";
import { AdGrid } from "@/components/ad-card";
import { RatingLine } from "@/components/rating-line";
import { setBanned } from "@/app/actions/admin";

const UUID = /^[0-9a-f-]{36}$/i;

export async function generateMetadata({ params }: PageProps<"/[lang]/profile/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return {};
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("display_name, business_name").eq("id", id).maybeSingle();
  return { title: data?.business_name || data?.display_name };
}

export default async function ProfilePage({ params }: PageProps<"/[lang]/profile/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang) || !UUID.test(id)) notFound();
  const t = getDictionary(lang);
  const { supabase, profile: viewer } = await getSession();

  const [{ data: profile }, { data: summary }, { data: reviews }, { data: ads }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>(),
    supabase.from("profile_rating_summary").select("*").eq("user_id", id),
    supabase
      .from("ratings")
      .select("id, stars, comment, ratee_role, created_at, rater:profiles!ratings_rater_id_fkey(display_name)")
      .eq("ratee_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("ads")
      .select(AD_CARD_COLUMNS)
      .eq("user_id", id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(48),
  ]);
  if (!profile) notFound();
  const sums = (summary ?? []) as RatingSummary[];
  const name = profile.business_name || profile.display_name;

  return (
    <div className="space-y-6">
      <section className="card flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{name}</h1>
          <div className="flex flex-wrap gap-1.5">
            <span className="chip bg-slate-100 text-slate-700">{t.account.sellerTypes[profile.seller_type]}</span>
            <span className="chip bg-slate-100 text-slate-700">✉︎ {t.ad.verifiedEmail}</span>
            {profile.verified_business ? <span className="chip bg-sky-100 text-sky-800">✓ {t.ad.verifiedBusiness}</span> : null}
          </div>
          <p className="text-sm text-slate-500">{fmt(t.ad.memberSince, { date: formatMonthYear(profile.created_at, lang) })}</p>
        </div>
        <div className="space-y-1">
          <RatingLine summary={sums.find((s) => s.role === "seller")} label={t.ad.asSeller} empty={`${t.ad.noRatings} (${t.ad.asSeller})`} />
          <RatingLine summary={sums.find((s) => s.role === "buyer")} label={t.ad.asBuyer} empty={`${t.ad.noRatings} (${t.ad.asBuyer})`} />
        </div>
        {viewer?.role === "admin" && profile.role !== "admin" ? (
          <form action={setBanned}>
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="userId" value={profile.id} />
            <input type="hidden" name="banned" value={profile.is_banned ? "0" : "1"} />
            <button className="btn-danger">{profile.is_banned ? t.admin.unban : t.admin.ban}</button>
          </form>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">{fmt(t.profile.ads, { name })}</h2>
        {ads?.length ? <AdGrid ads={ads as unknown as AdCardData[]} lang={lang} t={t} /> : <p className="card p-6 text-slate-600">{t.profile.noAds}</p>}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">{t.profile.ratings}</h2>
        {reviews?.length ? (
          <ul className="card divide-y divide-slate-100">
            {reviews.map((r) => (
              <li key={r.id} className="p-4">
                <p className="text-sm">
                  <span className="text-amber-500">{"★".repeat(r.stars)}</span>
                  <span className="text-slate-300">{"★".repeat(5 - r.stars)}</span>{" "}
                  <span className="text-slate-500">
                    {r.ratee_role === "seller" ? t.profile.asSellerTitle : t.profile.asBuyerTitle} ·{" "}
                    {(r.rater as unknown as { display_name: string } | null)?.display_name} · {formatDate(r.created_at, lang)}
                  </span>
                </p>
                {r.comment ? <p className="mt-1 text-slate-800">{r.comment}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="card p-6 text-slate-600">{t.profile.noReviews}</p>
        )}
      </section>
    </div>
  );
}
