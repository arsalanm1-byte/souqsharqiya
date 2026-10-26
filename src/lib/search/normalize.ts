// Mirror of public.normalize_ar() in the database migration: strips Arabic
// diacritics and tatweel, folds alef/yaa/taa marbuta variants, lowercases.
const DIACRITICS = /[ً-ٰٟـ]/g;
const FOLD: Record<string, string> = {
  "أ": "ا",
  "إ": "ا",
  "آ": "ا",
  "ٱ": "ا",
  "ى": "ي",
  "ة": "ه",
  "ؤ": "و",
  "ئ": "ي",
};

export function normalizeArabic(input: string): string {
  return input
    .replace(DIACRITICS, "")
    .replace(/[أإآٱىةؤئ]/g, (ch) => FOLD[ch] ?? ch)
    .toLowerCase();
}

/**
 * Turns free text into a tsquery for the `simple` config: every word must
 * match, and the last word matches as a prefix so results appear while typing.
 */
export function toTsQuery(input: string): string | null {
  const words = normalizeArabic(input)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);
  if (words.length === 0) return null;
  return words.map((w, i) => (i === words.length - 1 ? `${w}:*` : w)).join(" & ");
}
