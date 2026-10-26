import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { fmt, getDictionary } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { AccountForm, BusinessForm } from "@/components/account-forms";

export const metadata = { robots: { index: false } };

export default async function AccountPage({ params }: PageProps<"/[lang]/account">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { supabase, user, profile } = await requireUser(lang, `/${lang}/account`);
  const t = getDictionary(lang);
  const [{ data: contact }, { data: requests }] = await Promise.all([
    supabase.from("profile_contacts").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("business_verifications").select("status, admin_note").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
  ]);
  const latest = requests?.[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.account.title}</h1>
        <p className="text-sm text-slate-600">
          {fmt(t.account.email, { email: user.email ?? "" })} ·{" "}
          <Link href={`/${lang}/profile/${user.id}`} className="text-brand-700 hover:underline">{t.account.viewPublic}</Link>
        </p>
      </div>

      <AccountForm
        t={t.account}
        initial={{
          display_name: profile.display_name,
          seller_type: profile.seller_type,
          preferred_locale: profile.preferred_locale,
          phone: contact?.phone ? `0${String(contact.phone).slice(4)}` : "",
          allow_calls: contact?.allow_calls ?? true,
          allow_whatsapp: contact?.allow_whatsapp ?? true,
        }}
      />

      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-bold">{t.account.business}</h2>
        {profile.verified_business ? (
          <p className="text-brand-700">✓ {t.account.badgeApproved}</p>
        ) : latest?.status === "pending" ? (
          <p className="text-amber-800">{t.account.badgePending}</p>
        ) : (
          <>
            {latest?.status === "rejected" ? (
              <p className="text-sm text-red-700">{fmt(t.account.badgeRejected, { note: latest.admin_note ?? "" })}</p>
            ) : null}
            <p className="text-sm text-slate-600">{t.account.businessIntro}</p>
            <BusinessForm t={t.account} />
          </>
        )}
      </section>
    </div>
  );
}
