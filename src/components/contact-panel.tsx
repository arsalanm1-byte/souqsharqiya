"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { revealContact, startChat, type RevealResult } from "@/app/actions/contact";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

type Props = {
  lang: Locale;
  adId: number;
  signedIn: boolean;
  loginHref: string;
  back: string;
  t: Dictionary["ad"];
};

/** Chat, call and WhatsApp. Visitors are sent to sign in first, then back here. */
export function ContactPanel({ lang, adId, signedIn, loginHref, back, t }: Props) {
  const [contact, setContact] = useState<RevealResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <Link href={loginHref} className="btn-primary w-full py-3">
        {t.signInToContact}
      </Link>
    );
  }

  const digits = contact?.ok && contact.phone ? contact.phone.replace("+", "") : null;
  return (
    <div className="space-y-2">
      <form action={startChat}>
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="adId" value={adId} />
        <input type="hidden" name="back" value={back} />
        <button type="submit" className="btn-primary w-full py-3">💬 {t.chat}</button>
      </form>
      {!contact ? (
        <button
          type="button"
          disabled={pending}
          className="btn-secondary w-full py-3"
          onClick={() => startTransition(async () => setContact(await revealContact(adId)))}
        >
          📞 {t.showPhone}
        </button>
      ) : contact.ok && contact.phone ? (
        <div className="grid grid-cols-2 gap-2">
          {contact.allowCalls ? (
            <a href={`tel:${contact.phone}`} className="btn-secondary py-3" dir="ltr">📞 {contact.phone}</a>
          ) : null}
          {contact.allowWhatsapp ? (
            <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" className="btn-secondary py-3 text-emerald-700">
              {t.whatsapp}
            </a>
          ) : null}
        </div>
      ) : (
        <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{t.noPhone}</p>
      )}
    </div>
  );
}
