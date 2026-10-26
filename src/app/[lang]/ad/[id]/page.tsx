import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { fmt, getDictionary } from "@/lib/i18n";
import { getSession, loginPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { adPath, isLive, parseAdId, photoUrl } from "@/lib/ads";
import { fieldsFor, getCategory, optionLabel, subcategoryLabel } from "@/lib/categories";
import { cityLabel, districtLabel } from "@/lib/locations";
import { formatDate, formatHijri, formatMonthYear, formatNumber, formatPrice } from "@/lib/format";
import type { Ad, CartlowPrice, Profile, RatingSummary } from "@/lib/types";
import { Gallery } from "@/components/gallery";
import { ContactPanel } from "@/components/contact-panel";
import { SaveButton } from "@/components/save-button";
import { ReportForm } from "@/components/report-form";
import { PriceRatingBadge } from "@/components/price-rating-badge";
import { RatingLine } from "@/components/rating-line";
import { blockUser } from "@/app/actions/contact";

type AdWithSeller = Ad & {
  seller: Pick<Profile, "id" | "display_name" | "seller_type" | "verified_business" | "business_name" | "created_at">;
};

const loadAd = cache(async (id: number) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ads")
    .select("*, seller:profiles!ads_user_id_fkey(id, display_name, seller_type, verified_business, business_name, created_at)")
    .eq("id", id)
    .maybeSingle<AdWithSeller>();
  return data;
});

export async function generateMetadata({ params }: PageProps<"/[lang]/ad/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  const adId = parseAdId(id);
  if (!isLocale(lang) || !adId) return {};
  const ad = await loadAd(adId);
  if (!ad) return {};
  const price = formatPrice(ad.price, lang, ad.price_period);
  const path = adPath(lang, ad).replace(`/${lang}`, "");
  return {
    title: price ? `${ad.title} · ${price}` : ad.title,
    description: ad.description.slice(0, 160),
    alternates: { canonical: adPath(lang, ad), languages: { ar: `/ar${path}`, en: `/en${path}` } },
    openGraph: { images: ad.photos[0] ? [photoUrl(ad.photos[0])] : [] },
    robots: isLive(ad) ? undefined : { index: false },
  };
}

function attributeRows(ad: Ad, lang: Locale) {
  const cat = getCategory(ad.category);
  if (!cat) return [];
  return fieldsFor(cat, ad.subcategory)
    .filter((f) => !f.private)
    .map((f) => {
      const raw = f.column ? ad[f.column] : ad.attributes[f.key];
      if (raw === null || raw === undefined || raw === "") return null;
      let value = String(raw);
      if (f.options) value = optionLabel(f.options, value, lang);
      else if (f.type === "number" && f.column !== "year") value = formatNumber(Number(raw), lang);
      else if (f.type === "date") value = formatDate(value, lang);
      if (f.unit) value = `${value} ${f.unit[lang]}`;
      return { label: f.label[lang], value };
    })
    .filter((row): row is { label: string; value: string } => row !== null);
}

export default async function AdPage({ params, searchParams }: PageProps<"/[lang]/ad/[id]">) {
  const { lang, id } = await params;
  const adId = parseAdId(id);
  if (!isLocale(lang) || !adId) notFound();
  const ad = await loadAd(adId);
  if (!ad) notFound();

  const t = getDictionary(lang);
  const sp = await searchParams;
  const { supabase, user } = await getSession();
  const isOwner = user?.id === ad.user_id;
  const live = isLive(ad);
  const here = adPath(lang, ad);

  const [{ data: ratings }, saved, cartlow] = await Promise.all([
    supabase.from("profile_rating_summary").select("*").eq("user_id", ad.user_id),
    user
      ? supabase.from("saved_ads").select("ad_id").eq("ad_id", ad.id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    ad.category === "electronics" && ad.brand && ad.model
      ? supabase
          .rpc("cartlow_match", { p_brand: ad.brand, p_model: ad.model, p_storage: String(ad.attributes.storage ?? "") })
          .maybeSingle<CartlowPrice>()
      : Promise.resolve({ data: null }),
  ]);
  const summary = (ratings ?? []) as RatingSummary[];
  const cartlowPrice = (cartlow.data as CartlowPrice | null)?.id ? (cartlow.data as CartlowPrice) : null;

  const price = formatPrice(ad.price, lang, ad.price_period);
  const rows = attributeRows(ad, lang);
  const place = [districtLabel(ad.city, ad.district, lang), cityLabel(ad.city, lang)].filter(Boolean).join(lang === "ar" ? "، " : ", ");
  const cat = getCategory(ad.category)!;

  return (
    <article className="space-y-6">
      <nav className="text-sm text-slate-500" aria-label="breadcrumb">
        <Link href={`/${lang}/${ad.city}/${ad.category}`} className="hover:text-brand-700">{cat.label[lang]}</Link>
        {" › "}
        <Link href={`/${lang}/${ad.city}/${ad.category}/${ad.subcategory}`} className="hover:text-brand-700">
          {subcategoryLabel(ad.category, ad.subcategory, lang)}
        </Link>
        {" › "}
        <span>{cityLabel(ad.city, lang)}</span>
      </nav>

      {sp.blocked ? <p className="rounded-xl bg-slate-100 p-3 text-sm">{t.ad.blocked}</p> : null}
      {ad.status === "pending" ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{t.ad.pendingReview}</p> : null}
      {ad.status === "rejected" || ad.status === "removed" ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{t.ad.rejected}</p>
      ) : null}
      {!live && ad.status !== "pending" && ad.status !== "rejected" && ad.status !== "removed" ? (
        <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
          {ad.status === "sold" ? `${t.ad.sold}. ` : ""}
          {t.ad.notAvailable}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="lg:col-start-1 lg:row-start-1">
          <Gallery photos={ad.photos.map(photoUrl)} alt={ad.title} empty={t.ad.noPhoto} />
        </div>

        <div className="space-y-6 lg:col-start-1 lg:row-start-2">

          <section className="card p-5">
            <h2 className="mb-3 text-lg font-bold">{t.ad.details}</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {rows.map((row) => (
                <div key={row.label} className="flex justify-between gap-3 border-b border-slate-100 py-1.5">
                  <dt className="text-slate-500">{row.label}</dt>
                  <dd className="text-end font-medium">{row.value}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5">
                <dt className="text-slate-500">{t.ad.location}</dt>
                <dd className="text-end font-medium">{place}</dd>
              </div>
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-lg font-bold">{t.ad.description}</h2>
            <p className="whitespace-pre-line leading-relaxed text-slate-800">{ad.description}</p>
          </section>

          {ad.lat !== null && ad.lng !== null ? (
            <section className="card overflow-hidden">
              <iframe
                title={t.ad.location}
                className="h-64 w-full"
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${ad.lng - 0.01}%2C${ad.lat - 0.007}%2C${ad.lng + 0.01}%2C${ad.lat + 0.007}&layer=mapnik&marker=${ad.lat}%2C${ad.lng}`}
              />
              <a
                href={`https://www.openstreetmap.org/?mlat=${ad.lat}&mlon=${ad.lng}#map=16/${ad.lat}/${ad.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 text-sm font-semibold text-brand-700"
              >
                {t.ad.mapOpen} ↗
              </a>
            </section>
          ) : null}
        </div>

        {/* Second on phones (right after the photos), the side column on desktop. */}
        <aside className="space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <section className="card space-y-3 p-5">
            <p className="text-xs text-slate-500">{fmt(t.ad.adId, { id: ad.id })}</p>
            <h1 className="text-xl font-bold leading-snug">{ad.title}</h1>
            {price ? <p className="text-2xl font-bold text-brand-700">{price}</p> : null}

            {ad.price_rating ? (
              <div className="space-y-1">
                <PriceRatingBadge rating={ad.price_rating} t={t.priceRating} />
                <p className="text-xs text-slate-500">
                  {ad.price_median && ad.price_comps
                    ? fmt(t.priceRating.explain, {
                        count: ad.price_comps,
                        median: formatPrice(ad.price_median, lang, ad.price_period) ?? "",
                      })
                    : t.priceRating.explainCartlow}
                </p>
              </div>
            ) : ad.category !== "jobs" && ad.price ? (
              <p className="text-xs text-slate-500">{t.priceRating.hidden}</p>
            ) : null}

            {cartlowPrice ? (
              <a
                href={`/api/out/cartlow/${cartlowPrice.id}?ad=${ad.id}`}
                target="_blank"
                rel="sponsored nofollow noopener"
                className="block rounded-xl border border-dashed border-slate-300 p-3 text-sm hover:border-brand-500"
              >
                <span className="block font-semibold text-slate-800">
                  {fmt(t.cartlow.line, { price: formatPrice(cartlowPrice.price, lang) ?? "" })} ↗
                </span>
                <span className="text-xs text-slate-500">{t.cartlow.sponsored}</span>
              </a>
            ) : null}

            <p className="text-xs text-slate-500">
              {fmt(t.ad.posted, { date: formatDate(ad.created_at, lang) })} · {fmt(t.ad.postedHijri, { date: formatHijri(ad.created_at, lang) })}
            </p>

            {isOwner ? (
              <div className="space-y-2 rounded-xl bg-brand-50 p-3 text-sm">
                <p>{t.ad.yourAd}</p>
                <div className="flex gap-2">
                  {["active", "pending", "closed"].includes(ad.status) ? (
                    <Link href={`/${lang}/ad/${ad.id}/edit`} className="btn-secondary">{t.ad.edit}</Link>
                  ) : null}
                  <Link href={`/${lang}/my/ads`} className="btn-ghost">{t.ad.manage}</Link>
                </div>
              </div>
            ) : live ? (
              <ContactPanel lang={lang} adId={ad.id} signedIn={Boolean(user)} loginHref={loginPath(lang, here)} back={here} t={t.ad} />
            ) : null}

            {!isOwner ? (
              <SaveButton
                adId={ad.id}
                initial={Boolean(saved.data)}
                signedIn={Boolean(user)}
                loginHref={loginPath(lang, here)}
                labels={{ save: t.ad.save, saved: t.ad.saved }}
              />
            ) : null}
          </section>

          <section className="card space-y-2 p-5">
            <h2 className="text-sm font-semibold text-slate-500">{t.ad.seller}</h2>
            <Link href={`/${lang}/profile/${ad.seller.id}`} className="block text-lg font-bold hover:text-brand-700">
              {ad.seller.business_name || ad.seller.display_name}
            </Link>
            <div className="flex flex-wrap gap-1.5">
              <span className="chip bg-slate-100 text-slate-700">✉︎ {t.ad.verifiedEmail}</span>
              {ad.seller.verified_business ? <span className="chip bg-sky-100 text-sky-800">✓ {t.ad.verifiedBusiness}</span> : null}
            </div>
            <RatingLine summary={summary.find((r) => r.role === "seller")} label={t.ad.asSeller} empty={t.ad.noRatings} />
            <RatingLine summary={summary.find((r) => r.role === "buyer")} label={t.ad.asBuyer} empty={null} />
            <p className="text-xs text-slate-500">{fmt(t.ad.memberSince, { date: formatMonthYear(ad.seller.created_at, lang) })}</p>
          </section>

          <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">⚠︎ {t.ad.safety}</p>
          {ad.category === "cars" ? (
            <Link href={`/${lang}/help/car-transfer`} className="block text-sm font-semibold text-brand-700 hover:underline">
              {t.ad.carTransfer} →
            </Link>
          ) : null}

          {!isOwner ? (
            <details className="card p-4 text-sm">
              <summary className="cursor-pointer font-semibold text-slate-600">{t.ad.report}</summary>
              <div className="mt-3 space-y-4">
                {user ? (
                  <>
                    <ReportForm adId={ad.id} userId={ad.user_id} t={t.ad} />
                    <form action={blockUser}>
                      <input type="hidden" name="lang" value={lang} />
                      <input type="hidden" name="userId" value={ad.user_id} />
                      <input type="hidden" name="back" value={here} />
                      <button type="submit" className="text-sm text-slate-600 underline">{t.ad.block}</button>
                    </form>
                  </>
                ) : (
                  <Link href={loginPath(lang, here)} className="btn-secondary">{t.nav.signIn}</Link>
                )}
              </div>
            </details>
          ) : null}
        </aside>
      </div>
    </article>
  );
}
