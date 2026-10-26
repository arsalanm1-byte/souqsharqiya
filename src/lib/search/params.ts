import { filterFields, getCategory, isCategoryId, type CategoryId } from "@/lib/categories";
import { ALL_CITIES, getCity } from "@/lib/locations";

export const PAGE_SIZE = 24;

export type SearchParams = {
  q?: string;
  category?: CategoryId;
  sub?: string;
  city?: string;
  district?: string;
  min?: number;
  max?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  posted?: 1 | 7 | 30;
  seller?: "individual" | "business";
  page: number;
  /** Category field filters: `transmission` → eq, `year_min`/`year_max` → range. */
  fields: Record<string, string>;
};

type Raw = Record<string, string | string[] | undefined>;

function one(raw: Raw, key: string): string | undefined {
  const v = raw[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() !== "" ? s.trim().slice(0, 100) : undefined;
}

function num(raw: Raw, key: string): number | undefined {
  const s = one(raw, key);
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Parses and validates the search page's query string. Unknown keys are dropped. */
export function parseSearchParams(raw: Raw): SearchParams {
  const categoryRaw = one(raw, "category");
  const category = isCategoryId(categoryRaw) ? categoryRaw : undefined;
  const cat = getCategory(category);
  const sub = one(raw, "sub");
  const cityRaw = one(raw, "city");
  const city = getCity(cityRaw) ? cityRaw : undefined;
  const district = city ? one(raw, "district") : undefined;
  const sort = one(raw, "sort");
  const posted = num(raw, "posted");
  const seller = one(raw, "seller");

  const fields: Record<string, string> = {};
  if (cat) {
    for (const f of filterFields(cat)) {
      if (f.filter === "eq") {
        const v = one(raw, f.key);
        if (v) fields[f.key] = v;
      } else {
        for (const suffix of ["_min", "_max"]) {
          const v = num(raw, f.key + suffix);
          if (v !== undefined) fields[f.key + suffix] = String(v);
        }
      }
    }
  }

  return {
    q: one(raw, "q"),
    category,
    sub: cat && cat.subcategories.some((s) => s.value === sub) ? sub : undefined,
    city,
    district,
    min: num(raw, "min"),
    max: num(raw, "max"),
    sort: sort === "price_asc" || sort === "price_desc" ? sort : "newest",
    posted: posted === 1 || posted === 7 || posted === 30 ? posted : undefined,
    seller: seller === "individual" || seller === "business" ? seller : undefined,
    page: Math.max(1, Math.min(100, Math.floor(num(raw, "page") ?? 1))),
    fields,
  };
}

/** Back to a query string (for links, pagination and saved searches). */
export function toQueryObject(p: SearchParams, overrides: Partial<Record<string, string | undefined>> = {}) {
  const out: Record<string, string> = {};
  const set = (k: string, v: string | number | undefined) => {
    if (v !== undefined && v !== "") out[k] = String(v);
  };
  set("q", p.q);
  set("category", p.category);
  set("sub", p.sub);
  set("city", p.city);
  set("district", p.district);
  set("min", p.min);
  set("max", p.max);
  if (p.sort && p.sort !== "newest") set("sort", p.sort);
  set("posted", p.posted);
  set("seller", p.seller);
  for (const [k, v] of Object.entries(p.fields)) set(k, v);
  if (p.page > 1) set("page", p.page);
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete out[k];
    else out[k] = v;
  }
  return out;
}

export function toQueryString(p: SearchParams, overrides: Partial<Record<string, string | undefined>> = {}): string {
  const qs = new URLSearchParams(toQueryObject(p, overrides)).toString();
  return qs ? `?${qs}` : "";
}

export { ALL_CITIES };
