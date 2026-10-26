import type { Locale } from "@/lib/i18n/config";

const intlLocale = (locale: Locale) => (locale === "ar" ? "ar-SA-u-nu-latn" : "en-SA");

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 0 }).format(value);
}

export function formatPrice(
  price: number | null | undefined,
  locale: Locale,
  period?: "month" | "year" | null,
): string | null {
  if (price === null || price === undefined) return null;
  const amount = formatNumber(Number(price), locale);
  const currency = locale === "ar" ? "ريال" : "SAR";
  const base = locale === "ar" ? `${amount} ${currency}` : `${currency} ${amount}`;
  if (!period) return base;
  const per = locale === "ar" ? (period === "month" ? "شهريًا" : "سنويًا") : period === "month" ? "/ month" : "/ year";
  return `${base} ${per}`;
}

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium" }).format(new Date(iso));
}

/** Hijri (Umm al-Qura) date, shown alongside the Gregorian one where useful. */
export function formatHijri(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(`${locale === "ar" ? "ar-SA" : "en-SA"}-u-ca-islamic-umalqura-nu-latn`, {
    dateStyle: "medium",
  }).format(new Date(iso));
}

export function formatMonthYear(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { month: "long", year: "numeric" }).format(new Date(iso));
}

export function timeAgo(iso: string, locale: Locale, now: Date = new Date()): string {
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" });
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(seconds, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
  return formatDate(iso, locale);
}

export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function isOlderThanDays(iso: string, days: number): boolean {
  return Date.now() - new Date(iso).getTime() > days * 86_400_000;
}
