import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getSession } from "@/lib/auth";
import { LanguageSwitch } from "./language-switch";
import { CityPicker } from "./city-picker";
import { signOut } from "@/app/actions/auth";

export async function Header({ lang }: { lang: Locale }) {
  const t = getDictionary(lang);
  const [{ user, profile }, cookieStore] = await Promise.all([getSession(), cookies()]);
  const city = cookieStore.get("city")?.value ?? "";

  const links = [
    { href: `/${lang}/messages`, label: t.nav.messages },
    { href: `/${lang}/saved`, label: t.nav.saved },
    { href: `/${lang}/my/ads`, label: t.nav.myAds },
    { href: `/${lang}/account`, label: t.nav.account },
    ...(profile?.role === "admin" ? [{ href: `/${lang}/admin`, label: t.nav.admin }] : []),
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href={`/${lang}`} className="flex shrink-0 items-center gap-2 text-lg font-bold text-brand-700">
          <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white">س</span>
          <span className="hidden sm:inline">{t.site.name}</span>
        </Link>

        <form action={`/${lang}/search`} className="hidden flex-1 md:block" role="search">
          <input
            name="q"
            type="search"
            placeholder={t.home.searchPlaceholder}
            aria-label={t.home.search}
            className="input max-w-md"
          />
        </form>

        <div className="ms-auto flex items-center gap-1 sm:gap-2">
          <CityPicker lang={lang} current={city} label={t.nav.city} />
          <Suspense>
            <LanguageSwitch lang={lang} label={t.nav.language} />
          </Suspense>
          <Link href={`/${lang}/post`} className="btn-primary px-3 sm:px-4">
            <span aria-hidden>+</span>
            <span>{t.nav.post}</span>
          </Link>
          {user ? (
            <details className="relative">
              <summary className="btn-ghost cursor-pointer list-none px-3" aria-label={t.nav.menu}>
                <span className="grid size-7 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {(profile?.display_name || user.email || "?").slice(0, 1).toUpperCase()}
                </span>
              </summary>
              <nav className="card absolute end-0 mt-2 w-52 overflow-hidden p-1">
                {links.map((l) => (
                  <Link key={l.href} href={l.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100">
                    {l.label}
                  </Link>
                ))}
                <form action={signOut}>
                  <input type="hidden" name="lang" value={lang} />
                  <button type="submit" className="block w-full rounded-lg px-3 py-2 text-start text-sm text-red-700 hover:bg-red-50">
                    {t.nav.signOut}
                  </button>
                </form>
              </nav>
            </details>
          ) : (
            <Link href={`/${lang}/login`} className="btn-secondary px-3">
              {t.nav.signIn}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
