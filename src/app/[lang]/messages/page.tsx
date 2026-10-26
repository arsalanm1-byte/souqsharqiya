import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { fmt, getDictionary } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { photoUrl } from "@/lib/ads";
import { timeAgo } from "@/lib/format";

export const metadata = { robots: { index: false } };

type Row = {
  id: number;
  buyer_id: string;
  last_message_at: string;
  buyer_last_read_at: string;
  seller_last_read_at: string;
  ad: { title: string; photos: string[] } | null;
  buyer: { display_name: string } | null;
  seller: { display_name: string } | null;
};

export default async function MessagesPage({ params }: PageProps<"/[lang]/messages">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { supabase, user } = await requireUser(lang, `/${lang}/messages`);
  const t = getDictionary(lang);
  const { data } = await supabase
    .from("conversations")
    .select("id, buyer_id, last_message_at, buyer_last_read_at, seller_last_read_at, ad:ads(title, photos), buyer:profiles!conversations_buyer_id_fkey(display_name), seller:profiles!conversations_seller_id_fkey(display_name)")
    .order("last_message_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">{t.messages.title}</h1>
      {rows.length === 0 ? <p className="card p-8 text-center text-slate-600">{t.messages.empty}</p> : null}
      <ul className="card divide-y divide-slate-100">
        {rows.map((c) => {
          const amBuyer = c.buyer_id === user.id;
          const other = amBuyer ? c.seller : c.buyer;
          const unread = new Date(c.last_message_at) > new Date(amBuyer ? c.buyer_last_read_at : c.seller_last_read_at);
          return (
            <li key={c.id}>
              <Link href={`/${lang}/messages/${c.id}`} className="flex items-center gap-3 p-3 hover:bg-slate-50">
                <span className="size-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {c.ad?.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl(c.ad.photos[0])} alt="" className="size-full object-cover" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${unread ? "font-bold" : "font-medium"}`}>{other?.display_name}</span>
                  <span className="block truncate text-sm text-slate-600">{fmt(t.messages.about, { title: c.ad?.title ?? "" })}</span>
                </span>
                <span className="shrink-0 text-end text-xs text-slate-500">
                  {timeAgo(c.last_message_at, lang)}
                  {unread ? <span className="mt-1 block font-semibold text-brand-700">● {t.messages.unread}</span> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
