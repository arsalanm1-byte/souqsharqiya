import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { parseSearchParams } from "@/lib/search/params";
import { getCategory, subcategoryLabel } from "@/lib/categories";
import { cityLabel } from "@/lib/locations";
import { SearchView } from "@/components/search-view";

export async function generateMetadata({ params }: PageProps<"/[lang]/search">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  // Filtered result pages are endless; search engines get the /city/category pages instead.
  return { title: getDictionary(lang).search.title, robots: { index: false, follow: true } };
}

export default async function SearchPage({ params, searchParams }: PageProps<"/[lang]/search">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const p = parseSearchParams(await searchParams);
  const parts = [
    p.q ? `“${p.q}”` : null,
    p.sub && p.category ? subcategoryLabel(p.category, p.sub, lang) : getCategory(p.category)?.label[lang],
    p.city ? cityLabel(p.city, lang) : null,
  ].filter(Boolean);
  return <SearchView lang={lang} p={p} heading={parts.length ? parts.join(" · ") : t.search.title} />;
}
