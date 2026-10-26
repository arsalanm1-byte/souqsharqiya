import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { categories } from "@/lib/categories";
import { cities } from "@/lib/locations";

export function Footer({ lang }: { lang: Locale }) {
  const t = getDictionary(lang);
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-3">
        <div>
          <p className="font-bold text-brand-700">{t.site.name}</p>
          <p className="mt-2 text-slate-600">{t.footer.about}</p>
        </div>
        <ul className="grid grid-cols-2 gap-2 text-slate-600">
          {categories.map((c) =>
            cities.slice(0, 2).map((city) => (
              <li key={`${c.id}-${city.slug}`}>
                <Link href={`/${lang}/${city.slug}/${c.id}`} className="hover:text-brand-700">
                  {c.label[lang]} · {city.label[lang]}
                </Link>
              </li>
            )),
          )}
        </ul>
        <ul className="space-y-2 text-slate-600">
          <li><Link href={`/${lang}/help/car-transfer`} className="hover:text-brand-700">{t.help.carTransferTitle}</Link></li>
          <li><Link href={`/${lang}/privacy`} className="hover:text-brand-700">{t.help.privacy}</Link></li>
          <li><Link href={`/${lang}/terms`} className="hover:text-brand-700">{t.help.terms}</Link></li>
        </ul>
      </div>
      <p className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {t.site.name}. {t.footer.rights}
      </p>
    </footer>
  );
}
