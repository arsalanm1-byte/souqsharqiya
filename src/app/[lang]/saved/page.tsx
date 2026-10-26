import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { AD_CARD_COLUMNS, type AdCardData } from "@/lib/types";
import { AdGrid } from "@/components/ad-card";
import { deleteSavedSearch, setSearchAlerts } from "@/app/actions/saved";

export const metadata = { robots: { index: false } };

export default async function SavedPage({ params, searchParams }: PageProps<"/[lang]/saved">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { supabase, user } = await requireUser(lang, `/${lang}/saved`);
  const t = getDictionary(lang);
  const sp = await searchParams;

  const [{ data: saved }, { data: searches }] = await Promise.all([
    supabase.from("saved_ads").select(`ad:ads(${AD_CARD_COLUMNS})`).eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("saved_searches").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  const ads = (saved ?? []).map((s) => s.ad).filter(Boolean) as unknown as AdCardData[];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t.saved.title}</h1>
      {sp.saved === "search" ? <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-900">{t.search.searchSaved}</p> : null}

      <section>
        <h2 className="mb-3 text-lg font-bold">{t.saved.searches}</h2>
        {searches?.length ? (
          <ul className="card divide-y divide-slate-100">
            {searches.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 p-3">
                <Link href={`/${lang}/search?${new URLSearchParams(s.params as Record<string, string>)}`} className="flex-1 font-medium hover:text-brand-700">
                  {s.name}
                </Link>
                <form action={setSearchAlerts}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="on" value={s.email_alerts ? "0" : "1"} />
                  <button className={`chip ${s.email_alerts ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                    🔔 {t.saved.alerts}: {s.email_alerts ? t.saved.on : t.saved.off}
                  </button>
                </form>
                <form action={deleteSavedSearch}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="text-sm text-red-700 hover:underline">{t.saved.remove}</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card p-6 text-sm text-slate-600">{t.saved.noSearches}</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">{t.saved.ads}</h2>
        {ads.length ? <AdGrid ads={ads} lang={lang} t={t} /> : <p className="card p-6 text-sm text-slate-600">{t.saved.noAds}</p>}
      </section>
    </div>
  );
}
