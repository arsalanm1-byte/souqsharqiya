import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { fmt, getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { adPath, photoUrl } from "@/lib/ads";
import { formatPrice, timeAgo } from "@/lib/format";
import { cityLabel } from "@/lib/locations";
import { subcategoryLabel } from "@/lib/categories";
import { setAdStatus } from "@/app/actions/admin";

export default async function ReviewQueuePage({ params }: PageProps<"/[lang]/admin">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const supabase = await createClient();
  const { data: ads } = await supabase
    .from("ads")
    .select("id, title, description, category, subcategory, city, price, price_period, photos, moderation_note, created_at, user:profiles!ads_user_id_fkey(id, display_name)")
    .eq("status", "pending")
    .order("created_at")
    .limit(50);

  if (!ads?.length) return <p className="card p-8 text-center text-slate-600">{t.admin.empty}</p>;
  return (
    <ul className="space-y-3">
      {ads.map((ad) => {
        const user = ad.user as unknown as { id: string; display_name: string };
        return (
          <li key={ad.id} className="card flex flex-col gap-3 p-4 md:flex-row">
            <div className="flex gap-1 overflow-x-auto md:w-64 md:flex-wrap">
              {ad.photos.slice(0, 4).map((p: string) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p} src={photoUrl(p)} alt="" className="size-20 shrink-0 rounded-lg object-cover" />
              ))}
            </div>
            <div className="flex-1 space-y-1">
              <Link href={adPath(lang, ad)} className="font-semibold hover:text-brand-700">{ad.title}</Link>
              <p className="text-sm text-slate-600">
                {subcategoryLabel(ad.category, ad.subcategory, lang)} · {cityLabel(ad.city, lang)} · {formatPrice(ad.price, lang, ad.price_period)} ·{" "}
                <Link href={`/${lang}/profile/${user.id}`} className="text-brand-700">{fmt(t.admin.by, { name: user.display_name })}</Link> · {timeAgo(ad.created_at, lang)}
              </p>
              {ad.moderation_note ? <p className="chip bg-amber-100 text-amber-800">{ad.moderation_note}</p> : null}
              <p className="line-clamp-3 text-sm text-slate-700">{ad.description}</p>
            </div>
            <form action={setAdStatus} className="flex flex-col gap-2 md:w-56">
              <input type="hidden" name="id" value={ad.id} />
              <input name="note" placeholder={t.admin.note} className="input" />
              <button name="status" value="active" className="btn-primary">{t.admin.approve}</button>
              <button name="status" value="rejected" className="btn-danger">{t.admin.reject}</button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
