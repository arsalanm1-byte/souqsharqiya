import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { daysAgoIso, formatDate, formatPrice, isOlderThanDays } from "@/lib/format";
import type { CartlowPrice } from "@/lib/types";
import { deleteCartlowPrice, saveCartlowPrice } from "@/app/actions/admin";

const STALE_DAYS = 35;

export default async function CartlowPage({ params }: PageProps<"/[lang]/admin/cartlow">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const supabase = await createClient();
  const since = daysAgoIso(30);
  const [{ data: prices }, { data: clicks }] = await Promise.all([
    supabase.from("cartlow_prices").select("*").order("brand").order("model"),
    supabase.from("cartlow_clicks").select("cartlow_price_id").gt("created_at", since).limit(10000),
  ]);
  const clickCount = new Map<number, number>();
  for (const c of clicks ?? []) clickCount.set(c.cartlow_price_id, (clickCount.get(c.cartlow_price_id) ?? 0) + 1);

  return (
    <div className="space-y-4">
      <form action={saveCartlowPrice} className="card grid gap-3 p-4 sm:grid-cols-6">
        <h2 className="font-bold sm:col-span-6">{t.admin.addPrice}</h2>
        <input name="brand" required placeholder={t.admin.brand} className="input" />
        <input name="model" required placeholder={t.admin.model} className="input" />
        <input name="storage" placeholder={t.admin.storage} className="input" />
        <input name="price" required type="number" min={1} placeholder={t.admin.price} className="input" />
        <input name="url" required type="url" placeholder={t.admin.url} dir="ltr" className="input sm:col-span-2" />
        <button className="btn-primary sm:col-span-6 sm:justify-self-start">{t.admin.addPrice}</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-start text-slate-600">
            <tr>
              <th className="p-3 text-start">{t.admin.brand}</th>
              <th className="p-3 text-start">{t.admin.model}</th>
              <th className="p-3 text-start">{t.admin.storage}</th>
              <th className="p-3 text-start">{t.admin.price}</th>
              <th className="p-3 text-start">{t.admin.clicks}</th>
              <th className="p-3 text-start">{t.admin.updated}</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {((prices ?? []) as CartlowPrice[]).map((p) => {
              const stale = isOlderThanDays(p.updated_at, STALE_DAYS);
              return (
                <tr key={p.id}>
                  <td className="p-3">{p.brand}</td>
                  <td className="p-3">
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">{p.model}</a>
                  </td>
                  <td className="p-3">{p.storage ?? "—"}</td>
                  <td className="p-3">{formatPrice(p.price, lang)}</td>
                  <td className="p-3">{clickCount.get(p.id) ?? 0}</td>
                  <td className={`p-3 ${stale ? "text-red-700" : ""}`} title={stale ? t.admin.stale : undefined}>
                    {formatDate(p.updated_at, lang)}{stale ? " ⚠︎" : ""}
                  </td>
                  <td className="p-3">
                    <form action={deleteCartlowPrice}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="text-red-700 hover:underline">{t.admin.delete}</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
