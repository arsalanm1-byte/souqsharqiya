import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getSession } from "@/lib/auth";
import { safeNext } from "@/lib/ads";
import { LoginForm } from "@/components/login-form";
import { signInWithProvider } from "@/app/actions/auth";

export async function generateMetadata({ params }: PageProps<"/[lang]/login">): Promise<Metadata> {
  const { lang } = await params;
  return { title: isLocale(lang) ? getDictionary(lang).nav.signIn : undefined, robots: { index: false } };
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined, `/${lang}`);
  const { user } = await getSession();
  if (user) redirect(next);

  const t = getDictionary(lang);
  // Apple sign-in needs a paid Apple Developer account, so each provider is opt-in.
  const providers = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "google")
    .split(",")
    .map((p) => p.trim())
    .filter((p): p is "google" | "apple" => p === "google" || p === "apple");
  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-bold">{t.auth.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{t.auth.subtitle}</p>
        {sp.error ? (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {sp.error === "link" ? t.auth.callbackError : t.auth.error}
          </p>
        ) : null}

        <div className="mt-6 space-y-3">
          {providers.map((provider) => (
            <form key={provider} action={signInWithProvider}>
              <input type="hidden" name="lang" value={lang} />
              <input type="hidden" name="next" value={next} />
              <input type="hidden" name="provider" value={provider} />
              <button type="submit" className="btn-secondary w-full py-3">
                <span aria-hidden className="font-bold">{provider === "google" ? "G" : ""}</span>
                {provider === "google" ? t.auth.google : t.auth.apple}
              </button>
            </form>
          ))}
        </div>

        <div className={`my-6 flex items-center gap-3 text-xs text-slate-500${providers.length ? "" : " hidden"}`}>
          <span className="h-px flex-1 bg-slate-200" />
          {t.auth.or}
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <LoginForm lang={lang} next={next} t={t.auth} />
        <p className="mt-6 text-xs text-slate-500">{t.auth.terms}</p>
      </div>
    </div>
  );
}
