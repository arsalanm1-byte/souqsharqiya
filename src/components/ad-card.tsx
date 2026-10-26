import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n";
import type { AdCardData } from "@/lib/types";
import { adPath, photoUrl } from "@/lib/ads";
import { formatPrice, timeAgo } from "@/lib/format";
import { cityLabel, districtLabel } from "@/lib/locations";
import { getCategory, subcategoryLabel } from "@/lib/categories";
import { PriceRatingBadge } from "./price-rating-badge";

export function AdCard({ ad, lang, t }: { ad: AdCardData; lang: Locale; t: Dictionary }) {
  const price = formatPrice(ad.price, lang, ad.price_period);
  const cover = ad.photos[0];
  const place = [districtLabel(ad.city, ad.district, lang), cityLabel(ad.city, lang)].filter(Boolean).join(lang === "ar" ? "، " : ", ");
  return (
    <Link href={adPath(lang, ad)} className="card group flex flex-col overflow-hidden transition hover:shadow-md">
      <div className="relative aspect-[4/3] bg-slate-100">
        {cover ? (
          // Photos are already compressed to WebP on upload; skipping the image optimiser keeps hosting costs flat.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl(cover)} alt={ad.title} loading="lazy" className="size-full object-cover transition group-hover:scale-[1.02]" />
        ) : (
          <div className="grid size-full place-items-center text-4xl text-slate-300" aria-label={t.ad.noPhoto}>
            {getCategory(ad.category)?.icon}
          </div>
        )}
        {ad.status === "sold" ? (
          <span className="chip absolute start-2 top-2 bg-slate-900 text-white">{t.ad.sold}</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="text-xs text-slate-500">{subcategoryLabel(ad.category, ad.subcategory, lang)}</p>
        <h3 className="line-clamp-2 font-semibold leading-snug text-slate-900">{ad.title}</h3>
        {price ? <p className="text-lg font-bold text-brand-700">{price}</p> : null}
        <div className="flex flex-wrap items-center gap-1.5">
          {ad.price_rating ? <PriceRatingBadge rating={ad.price_rating} t={t.priceRating} /> : null}
          {ad.profiles?.verified_business ? (
            <span className="chip bg-sky-100 text-sky-800">✓ {t.ad.verifiedBusiness}</span>
          ) : null}
        </div>
        <p className="mt-auto pt-1 text-xs text-slate-500">
          {place} · {timeAgo(ad.created_at, lang)}
        </p>
      </div>
    </Link>
  );
}

export function AdGrid({ ads, lang, t }: { ads: AdCardData[]; lang: Locale; t: Dictionary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {ads.map((ad) => (
        <AdCard key={ad.id} ad={ad} lang={lang} t={t} />
      ))}
    </div>
  );
}
