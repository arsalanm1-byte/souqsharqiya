import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { fmt, getDictionary } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { adPath, parseAdId } from "@/lib/ads";
import { RateForm } from "@/components/rate-form";

export const metadata = { robots: { index: false } };

export default async function RatePage({ params }: PageProps<"/[lang]/rate/[adId]">) {
  const { lang, adId: raw } = await params;
  const adId = parseAdId(raw);
  if (!isLocale(lang) || !adId) notFound();
  const { supabase, user } = await requireUser(lang, `/${lang}/rate/${adId}`);
  const t = getDictionary(lang);

  const { data: ad } = await supabase
    .from("ads")
    .select("id, title, user_id, sold_to, status, seller:profiles!ads_user_id_fkey(display_name), buyer:profiles!ads_sold_to_fkey(display_name)")
    .eq("id", adId)
    .maybeSingle();
  const isSeller = ad?.user_id === user.id;
  const isBuyer = ad?.sold_to === user.id;
  if (!ad || ad.status !== "sold" || !ad.sold_to || (!isSeller && !isBuyer)) {
    return <p className="card mx-auto max-w-lg p-6 text-center">{t.rate.notAllowed}</p>;
  }

  const { data: existing } = await supabase.from("ratings").select("id").eq("ad_id", adId).eq("rater_id", user.id).maybeSingle();
  const other = (isSeller ? ad.buyer : ad.seller) as unknown as { display_name: string } | null;

  return (
    <div className="card mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-xl font-bold">
        {isSeller ? fmt(t.my.rateBuyer, { title: ad.title }) : fmt(t.my.rateSeller, { title: ad.title })}
      </h1>
      <p className="text-slate-600">{other?.display_name}</p>
      {existing ? (
        <p className="text-brand-700">{t.rate.already}</p>
      ) : (
        <RateForm adId={ad.id} rateeId={isSeller ? ad.sold_to : ad.user_id} role={isSeller ? "buyer" : "seller"} t={t.rate} />
      )}
      <Link href={adPath(lang, ad)} className="text-sm text-brand-700 hover:underline">{ad.title}</Link>
    </div>
  );
}
