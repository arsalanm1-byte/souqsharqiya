"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";

export function LanguageSwitch({ lang, label }: { lang: Locale; label: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const other: Locale = lang === "ar" ? "en" : "ar";
  const rest = pathname.replace(/^\/(ar|en)(?=\/|$)/, "");
  const qs = searchParams.toString();
  return (
    <Link href={`/${other}${rest}${qs ? `?${qs}` : ""}`} hrefLang={other} className="btn-ghost px-2 sm:px-3">
      {label}
    </Link>
  );
}
