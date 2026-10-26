import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/format";
import { reviewBusiness } from "@/app/actions/admin";

export default async function BusinessesPage({ params }: PageProps<"/[lang]/admin/businesses">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("business_verifications")
    .select("*, user:profiles!business_verifications_user_id_fkey(display_name)")
    .eq("status", "pending")
    .order("created_at");

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">{t.admin.lookupHint}</p>
      {!requests?.length ? <p className="card p-8 text-center text-slate-600">{t.admin.empty}</p> : null}
      <ul className="space-y-3">
        {requests?.map((r) => (
          <li key={r.id} className="card flex flex-col gap-3 p-4 md:flex-row md:items-center">
            <div className="flex-1 text-sm">
              <p className="font-semibold">{r.business_name} · {t.account.sellerTypes[r.business_type as "dealer"]}</p>
              <p dir="ltr" className="text-start">CR {r.cr_number}{r.fal_licence ? ` · FAL ${r.fal_licence}` : ""}</p>
              <p className="text-slate-500">
                <Link href={`/${lang}/profile/${r.user_id}`} className="text-brand-700">{(r.user as { display_name: string } | null)?.display_name}</Link> · {timeAgo(r.created_at, lang)}
              </p>
            </div>
            <form action={reviewBusiness} className="flex flex-wrap gap-2">
              <input type="hidden" name="id" value={r.id} />
              <input name="note" placeholder={t.admin.note} className="input w-48" />
              <button name="approve" value="1" className="btn-primary">{t.admin.approve}</button>
              <button name="approve" value="0" className="btn-danger">{t.admin.reject}</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
