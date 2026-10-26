"use client";

import { useActionState, useState } from "react";
import { requestBusinessBadge, saveAccount, type AccountState } from "@/app/actions/account";
import type { Dictionary } from "@/lib/i18n";

type Initial = {
  display_name: string;
  seller_type: string;
  preferred_locale: string;
  phone: string;
  allow_calls: boolean;
  allow_whatsapp: boolean;
};

export function AccountForm({ t, initial }: { t: Dictionary["account"]; initial: Initial }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(saveAccount, { status: "idle" });
  return (
    <form action={action} className="card space-y-4 p-5">
      <h2 className="text-lg font-bold">{t.profile}</h2>
      <div>
        <label className="label" htmlFor="display_name">{t.displayName}</label>
        <input id="display_name" name="display_name" required maxLength={60} defaultValue={initial.display_name} className="input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="seller_type">{t.sellerType}</label>
          <select id="seller_type" name="seller_type" defaultValue={initial.seller_type} className="input">
            {Object.entries(t.sellerTypes).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="preferred_locale">{t.language}</label>
          <select id="preferred_locale" name="preferred_locale" defaultValue={initial.preferred_locale} className="input">
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <h2 className="pt-2 text-lg font-bold">{t.contact}</h2>
      <div>
        <label className="label" htmlFor="phone">{t.phone}</label>
        <input id="phone" name="phone" type="tel" dir="ltr" inputMode="tel" placeholder="05XXXXXXXX" defaultValue={initial.phone} className="input" />
        <p className="mt-1 text-xs text-slate-500">{t.phoneHint}</p>
        {state.field === "phone" ? <p className="mt-1 text-sm text-red-700">{t.invalidPhone}</p> : null}
      </div>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="allow_calls" defaultChecked={initial.allow_calls} className="size-4 accent-brand-600" />
          {t.allowCalls}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="allow_whatsapp" defaultChecked={initial.allow_whatsapp} className="size-4 accent-brand-600" />
          {t.allowWhatsapp}
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">{t.save}</button>
        {state.status === "saved" ? <span className="text-sm text-brand-700">✓ {t.saved}</span> : null}
      </div>
    </form>
  );
}

export function BusinessForm({ t }: { t: Dictionary["account"] }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(requestBusinessBadge, { status: "idle" });
  const [type, setType] = useState("dealer");
  if (state.status === "saved") return <p className="text-amber-800">{t.badgePending}</p>;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="business_type">{t.businessType}</label>
        <select id="business_type" name="business_type" value={type} onChange={(e) => setType(e.target.value)} className="input">
          <option value="dealer">{t.sellerTypes.dealer}</option>
          <option value="agency">{t.sellerTypes.agency}</option>
          <option value="employer">{t.sellerTypes.employer}</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="business_name">{t.businessName}</label>
        <input id="business_name" name="business_name" required minLength={2} maxLength={120} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="cr_number">{t.crNumber}</label>
        <input id="cr_number" name="cr_number" required inputMode="numeric" dir="ltr" pattern="\d{10}" className="input" />
      </div>
      {type === "agency" ? (
        <div>
          <label className="label" htmlFor="fal_licence">{t.falLicence}</label>
          <input id="fal_licence" name="fal_licence" required dir="ltr" className="input" />
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="btn-primary">{t.requestBadge}</button>
      </div>
    </form>
  );
}
