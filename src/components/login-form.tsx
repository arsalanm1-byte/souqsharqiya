"use client";

import { useActionState } from "react";
import { signInWithEmail, type SignInState } from "@/app/actions/auth";
import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

export function LoginForm({ lang, next, t }: { lang: Locale; next: string; t: Dictionary["auth"] }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signInWithEmail, { status: "idle" });

  if (state.status === "sent") {
    return (
      <p className="rounded-xl bg-brand-50 p-4 text-sm text-brand-900" role="status">
        {fmt(t.linkSent, { email: state.email ?? "" })}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="next" value={next} />
      <label className="label" htmlFor="email">
        {t.email}
      </label>
      <input id="email" name="email" type="email" required autoComplete="email" dir="ltr" className="input" />
      {state.status === "error" ? (
        <p className="text-sm text-red-700" role="alert">
          {state.message === "disposable" ? t.disposable : state.message === "invalidEmail" ? t.invalidEmail : t.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="btn-primary w-full py-3">
        {t.sendLink}
      </button>
    </form>
  );
}
