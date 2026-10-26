import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth";

export const metadata = { robots: { index: false } };

export default async function AdminLayout({ children, params }: LayoutProps<"/[lang]/admin">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireAdmin(lang);
  const t = getDictionary(lang);
  const tabs = [
    [`/${lang}/admin`, t.admin.queue],
    [`/${lang}/admin/reports`, t.admin.reports],
    [`/${lang}/admin/businesses`, t.admin.businesses],
    [`/${lang}/admin/cartlow`, t.admin.cartlow],
  ];
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t.admin.title}</h1>
      <nav className="flex flex-wrap gap-2">
        {tabs.map(([href, label]) => (
          <Link key={href} href={href} className="btn-secondary px-3 py-1.5">{label}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
