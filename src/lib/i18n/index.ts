import ar from "./dictionaries/ar";
import en, { type Dictionary } from "./dictionaries/en";
import type { Locale } from "./config";

export type { Dictionary };

export function getDictionary(locale: Locale): Dictionary {
  return locale === "ar" ? ar : en;
}

/** Fills {placeholders} in a dictionary string. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
