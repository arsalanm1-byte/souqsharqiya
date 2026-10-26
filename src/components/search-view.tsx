import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { fmt, getDictionary } from "@/lib/i18n";
import { dependentOptions, filterFields, getCategory, categories } from "@/lib/categories";
import { cities, getCity } from "@/lib/locations";
import { PAGE_SIZE, toQueryObject, toQueryString, type SearchParams } from "@/lib/search/params";
import { buildAdsQuery } from "@/lib/search/query";
import { getSession, loginPath } from "@/lib/auth";
import type { AdCardData } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { AdGrid } from "./ad-card";
import { saveSearch } from "@/app/actions/saved";

export async function SearchView({ lang, p, heading }: { lang: Locale; p: SearchParams; heading: string }) {
  const t = getDictionary(lang);
  const { supabase, user } = await getSession();
  const { data, count, error } = await buildAdsQuery(supabase, p, { paginate: true });
  if (error) console.error("search", error.message);
  const ads = (data ?? []) as unknown as AdCardData[];
  const total = count ?? ads.length;
  const cat = getCategory(p.category);
  const city = getCity(p.city);
  const searchPath = `/${lang}/search`;
  const here = `${searchPath}${toQueryString(p)}`;
  const hasMore = ads.length === PAGE_SIZE;

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      {/* On phones the results come first; the filters follow (reachable from the link at the top). */}
      <aside id="filters" className="order-2 lg:order-none">
        <details className="card group" open>
          <summary className="cursor-pointer list-none p-4 font-bold lg:pointer-events-none">{t.search.filters}</summary>
          <form action={searchPath} className="space-y-4 border-t border-slate-100 p-4">
            <div>
              <label className="label" htmlFor="f-q">{t.search.keyword}</label>
              <input id="f-q" name="q" type="search" defaultValue={p.q} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="f-category">{t.search.category}</label>
              <select id="f-category" name="category" defaultValue={p.category ?? ""} className="input">
                <option value="">{t.search.allCategories}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label[lang]}</option>
                ))}
              </select>
            </div>
            {cat ? (
              <div>
                <label className="label" htmlFor="f-sub">{t.search.subcategory}</label>
                <select id="f-sub" name="sub" defaultValue={p.sub ?? ""} className="input">
                  <option value="">{t.search.any}</option>
                  {cat.subcategories.map((s) => (
                    <option key={s.value} value={s.value}>{s.label[lang]}</option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <label className="label" htmlFor="f-city">{t.search.city}</label>
              <select id="f-city" name="city" defaultValue={p.city ?? ""} className="input">
                <option value="">{t.search.any}</option>
                {cities.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.label[lang]}</option>
                ))}
              </select>
            </div>
            {city ? (
              <div>
                <label className="label" htmlFor="f-district">{t.search.district}</label>
                <select id="f-district" name="district" defaultValue={p.district ?? ""} className="input">
                  <option value="">{t.search.any}</option>
                  {city.districts.map((d) => (
                    <option key={d.slug} value={d.slug}>{d.label[lang]}</option>
                  ))}
                </select>
              </div>
            ) : null}
            <fieldset>
              <legend className="label">{cat?.priceLabel[lang] ?? t.post.price}</legend>
              <div className="flex gap-2">
                <input name="min" type="number" min={0} inputMode="numeric" placeholder={t.search.min} defaultValue={p.min} className="input" aria-label={t.search.minPrice} />
                <input name="max" type="number" min={0} inputMode="numeric" placeholder={t.search.max} defaultValue={p.max} className="input" aria-label={t.search.maxPrice} />
              </div>
            </fieldset>

            {cat
              ? filterFields(cat, p.sub).map((f) =>
                  f.filter === "range" ? (
                    <fieldset key={f.key}>
                      <legend className="label">{f.label[lang]}</legend>
                      <div className="flex gap-2">
                        <input name={`${f.key}_min`} type="number" min={0} placeholder={t.search.min} defaultValue={p.fields[`${f.key}_min`]} className="input" aria-label={`${f.label[lang]} ${t.search.min}`} />
                        <input name={`${f.key}_max`} type="number" min={0} placeholder={t.search.max} defaultValue={p.fields[`${f.key}_max`]} className="input" aria-label={`${f.label[lang]} ${t.search.max}`} />
                      </div>
                    </fieldset>
                  ) : (
                    <div key={f.key}>
                      <label className="label" htmlFor={`f-${f.key}`}>{f.label[lang]}</label>
                      {f.type === "number" ? (
                        <input id={`f-${f.key}`} name={f.key} type="number" min={f.min} max={f.max} defaultValue={p.fields[f.key]} className="input" />
                      ) : (
                        <select id={`f-${f.key}`} name={f.key} defaultValue={p.fields[f.key] ?? ""} className="input">
                          <option value="">{t.search.any}</option>
                          {(f.dependsOn ? dependentOptions(f, p.fields) : f.options ?? []).map((o) => (
                            <option key={o.value} value={o.value}>{o.label[lang]}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ),
                )
              : null}

            <div>
              <label className="label" htmlFor="f-posted">{t.search.posted}</label>
              <select id="f-posted" name="posted" defaultValue={p.posted ?? ""} className="input">
                <option value="">{t.search.postedAny}</option>
                <option value="1">{t.search.posted1}</option>
                <option value="7">{t.search.posted7}</option>
                <option value="30">{t.search.posted30}</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-seller">{t.search.sellerType}</label>
              <select id="f-seller" name="seller" defaultValue={p.seller ?? ""} className="input">
                <option value="">{t.search.any}</option>
                <option value="individual">{t.search.sellerIndividual}</option>
                <option value="business">{t.search.sellerBusiness}</option>
              </select>
            </div>
            <input type="hidden" name="sort" value={p.sort} />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1">{t.search.apply}</button>
              <Link href={searchPath} className="btn-secondary">{t.search.clear}</Link>
            </div>
          </form>
        </details>
      </aside>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{heading}</h1>
            <p className="text-sm text-slate-600">
              {fmt(t.search.results, { count: formatNumber(total, lang) })}
              <a href="#filters" className="ms-3 font-semibold text-brand-700 lg:hidden">{t.search.filters} ↓</a>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav aria-label={t.search.sort} className="flex rounded-xl border border-slate-200 bg-white p-1 text-sm">
              {(
                [
                  ["newest", t.search.sortNewest],
                  ["price_asc", t.search.sortPriceAsc],
                  ["price_desc", t.search.sortPriceDesc],
                ] as const
              ).map(([value, label]) => (
                <Link
                  key={value}
                  href={`${searchPath}${toQueryString(p, { sort: value === "newest" ? undefined : value, page: undefined })}`}
                  className={`rounded-lg px-3 py-1.5 ${p.sort === value ? "bg-brand-600 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  {label}
                </Link>
              ))}
            </nav>
            {user ? (
              <form action={saveSearch}>
                <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="name" value={heading} />
                <input type="hidden" name="params" value={JSON.stringify(toQueryObject(p, { page: undefined }))} />
                <button type="submit" className="btn-secondary">🔔 {t.search.saveSearch}</button>
              </form>
            ) : (
              <Link href={loginPath(lang, here)} className="btn-secondary">🔔 {t.search.saveSearch}</Link>
            )}
          </div>
        </div>

        {ads.length ? <AdGrid ads={ads} lang={lang} t={t} /> : <p className="card p-10 text-center text-slate-600">{t.search.noResults}</p>}

        {p.page > 1 || hasMore ? (
          <nav className="mt-6 flex items-center justify-center gap-3" aria-label={fmt(t.search.page, { page: p.page })}>
            {p.page > 1 ? (
              <Link href={`${searchPath}${toQueryString(p, { page: p.page > 2 ? String(p.page - 1) : undefined })}`} className="btn-secondary" rel="prev">
                {t.search.prev}
              </Link>
            ) : null}
            <span className="text-sm text-slate-600">{fmt(t.search.page, { page: p.page })}</span>
            {hasMore ? (
              <Link href={`${searchPath}${toQueryString(p, { page: String(p.page + 1) })}`} className="btn-secondary" rel="next">
                {t.search.next}
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
