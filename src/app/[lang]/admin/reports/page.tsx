import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { adPath } from "@/lib/ads";
import { timeAgo } from "@/lib/format";
import { setAdStatus, setBanned, setReportStatus } from "@/app/actions/admin";

export default async function ReportsPage({ params }: PageProps<"/[lang]/admin/reports">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const supabase = await createClient();
  const { data: reports } = await supabase
    .from("reports")
    .select("id, reason, details, created_at, ad:ads(id, title, status), reported_user_id, reported:profiles!reports_reported_user_id_fkey(display_name), reporter:profiles!reports_reporter_id_fkey(display_name)")
    .eq("status", "open")
    .order("created_at")
    .limit(100);

  if (!reports?.length) return <p className="card p-8 text-center text-slate-600">{t.admin.empty}</p>;
  return (
    <ul className="space-y-3">
      {reports.map((r) => {
        const ad = r.ad as unknown as { id: number; title: string; status: string } | null;
        const reported = r.reported as unknown as { display_name: string } | null;
        const reporter = r.reporter as unknown as { display_name: string } | null;
        return (
          <li key={r.id} className="card space-y-2 p-4">
            <p className="text-sm">
              <span className="chip bg-red-100 text-red-800">{t.ad.reasons[r.reason as keyof typeof t.ad.reasons]}</span>{" "}
              {ad ? <Link href={adPath(lang, ad)} className="font-semibold hover:text-brand-700">{ad.title}</Link> : null}
              {r.reported_user_id ? (
                <>
                  {" · "}
                  <Link href={`/${lang}/profile/${r.reported_user_id}`} className="text-brand-700">{reported?.display_name}</Link>
                </>
              ) : null}
              <span className="text-slate-500"> · {reporter?.display_name} · {timeAgo(r.created_at, lang)}</span>
            </p>
            {r.details ? <p className="text-sm text-slate-700">{r.details}</p> : null}
            <div className="flex flex-wrap gap-2">
              {ad && ad.status === "active" ? (
                <form action={setAdStatus}>
                  <input type="hidden" name="id" value={ad.id} />
                  <input type="hidden" name="note" value={`report:${r.reason}`} />
                  <button name="status" value="removed" className="btn-danger px-3 py-1.5">{t.admin.remove}</button>
                </form>
              ) : null}
              {r.reported_user_id ? (
                <form action={setBanned}>
                  <input type="hidden" name="userId" value={r.reported_user_id} />
                  <input type="hidden" name="banned" value="1" />
                  <button className="btn-danger px-3 py-1.5">{t.admin.ban}</button>
                </form>
              ) : null}
              <form action={setReportStatus}>
                <input type="hidden" name="id" value={r.id} />
                <button name="status" value="resolved" className="btn-primary px-3 py-1.5">{t.admin.resolve}</button>{" "}
                <button name="status" value="dismissed" className="btn-ghost px-3 py-1.5">{t.admin.dismiss}</button>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
