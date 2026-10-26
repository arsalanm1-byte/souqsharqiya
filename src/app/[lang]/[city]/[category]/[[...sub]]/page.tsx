import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { parseSearchParams } from "@/lib/search/params";
import { getCategory, isCategoryId } from "@/lib/categories";
import { ALL_CITIES, cityLabel, getCity } from "@/lib/locations";
import { SearchView } from "@/components/search-view";

type Props = PageProps<"/[lang]/[city]/[category]/[[...sub]]">;

// SEO landing pages such as /en/khobar/housing/rent-apartment.
async function resolve(props: Props) {
  const { lang, city, category, sub } = await props.params;
  if (!isLocale(lang) || !isCategoryId(category)) return null;
  if (city !== ALL_CITIES && !getCity(city)) return null;
  const cat = getCategory(category)!;
  const subValue = sub?.[0];
  if (sub && (sub.length > 1 || !cat.subcategories.some((s) => s.value === subValue))) return null;
  const heading = `${subValue ? cat.subcategories.find((s) => s.value === subValue)!.label[lang] : cat.label[lang]} · ${cityLabel(city, lang)}`;
  return { lang: lang as Locale, city, category, sub: subValue, heading };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const r = await resolve(props);
  if (!r) return {};
  const t = getDictionary(r.lang);
  const path = `/${r.city}/${r.category}${r.sub ? `/${r.sub}` : ""}`;
  return {
    title: r.heading,
    description: `${r.heading}. ${t.site.description}`,
    alternates: { canonical: `/${r.lang}${path}`, languages: { ar: `/ar${path}`, en: `/en${path}` } },
  };
}

export default async function BrowsePage(props: Props) {
  const r = await resolve(props);
  if (!r) notFound();
  const raw = await props.searchParams;
  const p = parseSearchParams({
    ...raw,
    category: r.category,
    sub: r.sub,
    city: r.city === ALL_CITIES ? undefined : r.city,
  });
  return <SearchView lang={r.lang} p={p} heading={r.heading} />;
}
