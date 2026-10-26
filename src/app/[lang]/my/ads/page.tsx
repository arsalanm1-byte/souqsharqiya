import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { fmt, getDictionary } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { adPath, isLive, photoUrl } from "@/lib/ads";
import { formatDate, formatPrice } from "@/lib/format";
import type { Ad } from "@/lib/types";
import { closeAd, deleteAd, markSold, renewAd } from "@/app/actions/ads";

export const metadata = { robots: { index: false } };

type Buyer = { ad_id: number; buyer: { id: string; display_name: string } | null };

const statusStyle: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  removed: "bg-red-100 text-red-800",
  closed: "bg-slate-200 text-slate-700",
  sold: "bg-sky-100 text-sky-800",
  expired: "bg-slate-200 text-slate-700",
};

export default async function MyAdsPage({ params }: PageProps<"/[lang]/my/ads">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { supabase, user } = await requireUser(lang, `/${lang}/my/ads`);
  const t = getDictionary(lang);

  const [{ data: ads }, { data: chats }, { data: myRatings }, { data: bought }] = await Promise.all([
    supabase.from("ads").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("conversations").select("ad_id, buyer:profiles!conversations_buyer_id_fkey(id, display_name)").eq("seller_id", user.id),
    supabase.from("ratings").select("ad_id").eq("rater_id", user.id),
    supabase.from("ads").select("id, title").eq("sold_to", user.id).eq("status", "sold"),
  ]);
  const myAds = (ads ?? []) as Ad[];
  const buyers = (chats ?? []) as unknown as Buyer[];
  const rated = new Set((myRatings ?? []).map((r) => r.ad_id as number));

  const toRate = [
    ...myAds.filter((a) => a.status === "sold" && a.sold_to && !rated.has(a.id)).map((a) => ({ id: a.id, text: fmt(t.my.rateBuyer, { title: a.title }) })),
    ...(bought ?? []).filter((a) => !rated.has(a.id)).map((a) => ({ id: a.id as number, text: fmt(t.my.rateSeller, { title: a.title as string }) })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.my.title}</h1>
        <Link href={`/${lang}/post`} className="btn-primary">+ {t.nav.post}</Link>
      </div>

      {toRate.length ? (
        <section className="card border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-2 font-bold">⭐ {t.my.rateRequests}</h2>
          <ul className="space-y-1">
            {toRate.map((r) => (
              <li key={`${r.id}-${r.text}`}>
                <Link href={`/${lang}/rate/${r.id}`} className="text-sm font-semibold text-brand-700 hover:underline">{r.text} →</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {myAds.length === 0 ? <p className="card p-8 text-center text-slate-600">{t.my.empty}</p> : null}

      <ul className="space-y-3">
        {myAds.map((ad) => {
          const expired = ad.status === "active" && !isLive(ad);
          const status = expired ? "expired" : ad.status;
          const adBuyers = buyers.filter((b) => b.ad_id === ad.id && b.buyer);
          return (
            <li key={ad.id} className="card flex flex-col gap-3 p-3 sm:flex-row">
              <Link href={adPath(lang, ad)} className="aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-36">
                {ad.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl(ad.photos[0])} alt="" className="size-full object-cover" />
                ) : null}
              </Link>
              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`chip ${statusStyle[status]}`}>{t.my.status[status as keyof typeof t.my.status]}</span>
                  <Link href={adPath(lang, ad)} className="font-semibold hover:text-brand-700">{ad.title}</Link>
                </div>
                <p className="text-sm text-slate-600">
                  {formatPrice(ad.price, lang, ad.price_period)}
                  {ad.status === "active" && !expired ? ` · ${fmt(t.my.views, { date: formatDate(ad.expires_at, lang) })}` : ""}
                </p>
                {ad.status === "rejected" && ad.moderation_note ? (
                  <p className="text-sm text-red-700">{fmt(t.my.rejectedReason, { reason: ad.moderation_note })}</p>
                ) : null}

                <div className="flex flex-wrap gap-2 pt-1">
                  {["active", "pending", "closed"].includes(ad.status) ? (
                    <Link href={`/${lang}/ad/${ad.id}/edit`} className="btn-secondary px-3 py-1.5">{t.ad.edit}</Link>
                  ) : null}
                  {ad.status === "active" || ad.status === "closed" ? (
                    <form action={renewAd}>
                      <input type="hidden" name="lang" value={lang} />
                      <input type="hidden" name="id" value={ad.id} />
                      <button className="btn-secondary px-3 py-1.5">{t.my.renew}</button>
                    </form>
                  ) : null}
                  {ad.status === "active" && !expired ? (
                    <form action={closeAd}>
                      <input type="hidden" name="lang" value={lang} />
                      <input type="hidden" name="id" value={ad.id} />
                      <button className="btn-ghost px-3 py-1.5">{t.my.close}</button>
                    </form>
                  ) : null}
                  {ad.status === "active" || ad.status === "closed" ? (
                    <details className="w-full sm:w-auto">
                      <summary className="btn-secondary cursor-pointer list-none px-3 py-1.5">✓ {t.my.markSold}</summary>
                      <form action={markSold} className="mt-2 space-y-2 rounded-xl bg-slate-50 p-3">
                        <input type="hidden" name="lang" value={lang} />
                        <input type="hidden" name="id" value={ad.id} />
                        <label className="label" htmlFor={`buyer-${ad.id}`}>{t.my.soldTo}</label>
                        <select id={`buyer-${ad.id}`} name="buyer" className="input">
                          {adBuyers.map((b) => (
                            <option key={b.buyer!.id} value={b.buyer!.id}>{b.buyer!.display_name}</option>
                          ))}
                          <option value="">{t.my.soldElsewhere}</option>
                        </select>
                        <label className="label" htmlFor={`price-${ad.id}`}>{t.my.soldPrice}</label>
                        <input id={`price-${ad.id}`} name="price" inputMode="numeric" className="input" dir="ltr" />
                        <button className="btn-primary">{t.my.confirmSold}</button>
                      </form>
                    </details>
                  ) : null}
                  {ad.status !== "sold" ? (
                    <details>
                      <summary className="btn-ghost cursor-pointer list-none px-3 py-1.5 text-red-700">{t.my.delete}</summary>
                      <form action={deleteAd} className="mt-2 flex items-center gap-2">
                        <input type="hidden" name="lang" value={lang} />
                        <input type="hidden" name="id" value={ad.id} />
                        <span className="text-sm">{t.my.confirmDelete}</span>
                        <button className="btn-danger px-3 py-1.5">{t.my.delete}</button>
                      </form>
                    </details>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
