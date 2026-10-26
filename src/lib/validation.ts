import {
  dependentOptions,
  fieldsFor,
  getCategory,
  isFieldRequired,
  type CategoryId,
  type PromotedColumn,
} from "@/lib/categories";
import { getCity } from "@/lib/locations";
import type { SellerType } from "@/lib/types";

export type AdInput = {
  category: string;
  subcategory: string;
  city: string;
  district: string;
  title: string;
  description: string;
  price: string;
  pricePeriod: string;
  values: Record<string, string>;
  lat: number | null;
  lng: number | null;
};

export type AdRow = {
  category: CategoryId;
  subcategory: string;
  city: string;
  district: string | null;
  title: string;
  description: string;
  price: number | null;
  price_period: "month" | "year" | null;
  attributes: Record<string, string | number>;
  brand: string | null;
  model: string | null;
  year: number | null;
  mileage_km: number | null;
  bedrooms: number | null;
  size_m2: number | null;
  lat: number | null;
  lng: number | null;
};

export type FieldErrors = Record<string, "required" | "invalid">;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PRICE = 100_000_000;

/**
 * Validates a posted ad against its category's field definitions and maps it
 * to database columns. The database re-checks the parts that matter for trust
 * (REGA licence, limits, moderation), so this is about clear form errors.
 */
export function validateAd(
  input: AdInput,
  sellerType: SellerType = "individual",
): { ok: true; row: AdRow } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const cat = getCategory(input.category);
  if (!cat) return { ok: false, errors: { category: "required" } };

  const sub = cat.subcategories.find((s) => s.value === input.subcategory)?.value;
  if (!sub) errors.subcategory = "required";

  const city = getCity(input.city);
  if (!city) errors.city = "required";
  const district = input.district.trim();
  if (district && city && !city.districts.some((d) => d.slug === district)) errors.district = "invalid";
  if (!district && cat.id === "housing") errors.district = "required";

  const title = input.title.trim().replace(/\s+/g, " ");
  if (!title) errors.title = "required";
  else if (title.length < 5 || title.length > 120) errors.title = "invalid";

  const description = input.description.trim();
  if (!description) errors.description = "required";
  else if (description.length < 10 || description.length > 5000) errors.description = "invalid";

  let price: number | null = null;
  const priceRaw = input.price.trim().replace(/,/g, "");
  if (priceRaw) {
    price = Number(priceRaw);
    if (!Number.isFinite(price) || price < 0 || price > MAX_PRICE) errors.price = "invalid";
  } else if (!cat.priceOptional) {
    errors.price = "required";
  }

  let pricePeriod: AdRow["price_period"] = null;
  if (sub && cat.pricePeriod?.(sub)) {
    if (input.pricePeriod === "month" || input.pricePeriod === "year") pricePeriod = input.pricePeriod;
    else errors.pricePeriod = "required";
  } else if (cat.id === "jobs" && price !== null) {
    pricePeriod = "month";
  }

  const attributes: Record<string, string | number> = {};
  const columns: Partial<Record<PromotedColumn, string | number>> = {};
  for (const field of sub ? fieldsFor(cat, sub) : []) {
    const raw = (input.values[field.key] ?? "").trim();
    const required = isFieldRequired(field, sub!) || (field.key === "rega_licence" && sellerType === "agency");
    if (!raw) {
      if (required) errors[field.key] = "required";
      continue;
    }

    let value: string | number = raw.slice(0, 200);
    if (field.type === "select") {
      const options = field.dependsOn ? dependentOptions(field, input.values) : (field.options ?? []);
      if (!options.some((o) => o.value === raw)) {
        errors[field.key] = "invalid";
        continue;
      }
    } else if (field.type === "number") {
      const n = Number(raw);
      const integer = field.column !== "size_m2";
      if (!Number.isFinite(n) || (integer && !Number.isInteger(n)) || (field.min !== undefined && n < field.min) || (field.max !== undefined && n > field.max)) {
        errors[field.key] = "invalid";
        continue;
      }
      value = n;
    } else if (field.type === "date") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(raw))) {
        errors[field.key] = "invalid";
        continue;
      }
    } else if (field.key === "apply_email" && !EMAIL.test(raw)) {
      errors[field.key] = "invalid";
      continue;
    }

    if (field.column) columns[field.column] = value;
    else attributes[field.key] = value;
  }

  // Rounded to about 100 m so a pin never pinpoints someone's door.
  const coordsOk =
    input.lat !== null && input.lng !== null && Math.abs(input.lat) <= 90 && Math.abs(input.lng) <= 180;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const num = (v: string | number | undefined) => (v === undefined ? null : Number(v));
  const str = (v: string | number | undefined) => (v === undefined ? null : String(v));
  return {
    ok: true,
    row: {
      category: cat.id,
      subcategory: sub!,
      city: city!.slug,
      district: district || null,
      title,
      description,
      price,
      price_period: pricePeriod,
      attributes,
      brand: str(columns.brand),
      model: str(columns.model),
      year: num(columns.year),
      mileage_km: num(columns.mileage_km),
      bedrooms: num(columns.bedrooms),
      size_m2: num(columns.size_m2),
      lat: coordsOk ? Math.round(input.lat! * 1e3) / 1e3 : null,
      lng: coordsOk ? Math.round(input.lng! * 1e3) / 1e3 : null,
    },
  };
}

/** Values for the form when editing: the inverse of validateAd's mapping. */
export function adToValues(ad: {
  category: string;
  subcategory: string;
  attributes: Record<string, string | number>;
} & Partial<Record<PromotedColumn, string | number | null>>): Record<string, string> {
  const cat = getCategory(ad.category);
  const values: Record<string, string> = {};
  for (const field of cat ? fieldsFor(cat, ad.subcategory) : []) {
    const v = field.column ? ad[field.column] : ad.attributes[field.key];
    if (v !== null && v !== undefined) values[field.key] = String(v);
  }
  return values;
}
