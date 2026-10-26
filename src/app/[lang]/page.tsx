import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { fmt, getDictionary } from "@/lib/i18n";
import { categories } from "@/lib/categories";
import { cities, getCity } from "@/lib/locations";
import { createClient } from "@/lib/supabase/server";
import { buildAdsQuery } from "@/lib/search/query";
import { parseSearchParams } from "@/lib/search/params";
import type { AdCardData } from "@/lib/types";
import { AdGrid } from "@/components/ad-card";

const popular = [
  { city: "khobar", category: "housing", sub: "rent-apartment" },
  { city: "dammam", category: "cars", sub: "cars-for-sale" },
  { city: "dammam", category: "housing", sub: "rent-villa" },
  { city: "jubail", category: "jobs", sub: "hiring" },
  { city: "khobar", category: "electronics", sub: "mobiles" },
  { city: "dhahran", category: "housing", sub: "rent-bedspace" },
] as const;

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const city = getCity((await cookies()).get("city")?.value);

  const supabase = await createClient();
  const { data } = await buildAdsQuery(supabase, parseSearchParams({ city: city?.slug }), { limit: 12 });
  const ads = (data ?? []) as unknown as AdCardData[];

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-500 px-5 py-10 text-white sm:px-10 sm:py-14">
        <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">{t.home.heroTitle}</h1>
        <p className="mt-3 max-w-2xl text-brand-50">{t.home.heroSubtitle}</p>
        <form action={`/${lang}/search`} role="search" className="mt-6 flex max-w-3xl flex-col gap-2 rounded-2xl bg-white p-2 sm:flex-row">
          <input name="q" type="search" placeholder={t.home.searchPlaceholder} aria-label={t.search.keyword} className="input flex-1 border-0 focus:ring-0" />
          <select name="category" aria-label={t.search.category} className="input border-0 text-slate-700 sm:w-44 focus:ring-0">
            <option value="">{t.search.allCategories}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label[lang]}
              </option>
            ))}
          </select>
          <select name="city" defaultValue={city?.slug ?? ""} aria-label={t.search.city} className="input border-0 text-slate-700 sm:w-44 focus:ring-0">
            <option value="">{t.search.any}</option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label[lang]}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary px-6">
            {t.home.search}
          </button>
        </form>
      </section>

      <section aria-labelledby="cats">
        <h2 id="cats" className="mb-4 text-xl font-bold">{t.home.categories}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {categories.map((c) => (
            <div key={c.id} className="card p-4">
              <Link href={`/${lang}/${city?.slug ?? "eastern-province"}/${c.id}`} className="flex items-center gap-3 text-lg font-bold hover:text-brand-700">
                <span aria-hidden className="grid size-11 place-items-center rounded-xl bg-sand-100 text-2xl">{c.icon}</span>
                {c.label[lang]}
              </Link>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {c.subcategories.slice(0, 5).map((s) => (
                  <li key={s.value}>
                    <Link
                      href={`/${lang}/${city?.slug ?? "eastern-province"}/${c.id}/${s.value}`}
                      className="chip bg-slate-100 font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                    >
                      {s.label[lang]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="latest">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 id="latest" className="text-xl font-bold">
            {city ? fmt(t.home.latestIn, { city: city.label[lang] }) : t.home.latest}
          </h2>
          <Link href={`/${lang}/search${city ? `?city=${city.slug}` : ""}`} className="text-sm font-semibold text-brand-700 hover:underline">
            {t.home.viewAll}
          </Link>
        </div>
        {ads.length ? <AdGrid ads={ads} lang={lang} t={t} /> : <p className="card p-8 text-center text-slate-600">{t.home.noAds}</p>}
      </section>

      <section aria-labelledby="popular">
        <h2 id="popular" className="mb-3 text-xl font-bold">{t.home.popular}</h2>
        <ul className="flex flex-wrap gap-2">
          {popular.map((p) => {
            const cat = categories.find((c) => c.id === p.category)!;
            const sub = cat.subcategories.find((s) => s.value === p.sub)!;
            return (
              <li key={`${p.city}-${p.sub}`}>
                <Link href={`/${lang}/${p.city}/${p.category}/${p.sub}`} className="chip border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:border-brand-500">
                  {sub.label[lang]} · {getCity(p.city)!.label[lang]}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          [t.home.trust1Title, t.home.trust1Body, "📊"],
          [t.home.trust2Title, t.home.trust2Body, "⭐"],
          [t.home.trust3Title, t.home.trust3Body, "✅"],
        ].map(([title, body, icon]) => (
          <div key={title} className="card p-5">
            <p className="text-2xl" aria-hidden>{icon}</p>
            <h3 className="mt-2 font-bold">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
