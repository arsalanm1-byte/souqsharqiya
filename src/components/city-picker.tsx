"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";
import { ALL_CITIES, allCitiesLabel, cities } from "@/lib/locations";

/** Remembers the visitor's city on this device (cookie) and refreshes the page. */
export function CityPicker({ lang, current, label }: { lang: Locale; current: string; label: string }) {
  const router = useRouter();
  return (
    <select
      aria-label={label}
      defaultValue={current || ALL_CITIES}
      className="hidden max-w-44 rounded-xl border-0 bg-transparent py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:ring-2 focus:ring-brand-100 sm:block"
      onChange={(e) => {
        const value = e.target.value === ALL_CITIES ? "" : e.target.value;
        document.cookie = `city=${value}; path=/; max-age=${value ? 31536000 : 0}; samesite=lax`;
        router.refresh();
      }}
    >
      <option value={ALL_CITIES}>{allCitiesLabel[lang]}</option>
      {cities.map((c) => (
        <option key={c.slug} value={c.slug}>
          {c.label[lang]}
        </option>
      ))}
    </select>
  );
}
