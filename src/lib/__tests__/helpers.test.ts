import { describe, expect, it } from "vitest";
import { normalizeArabic, toTsQuery } from "@/lib/search/normalize";
import { parseSearchParams, toQueryString } from "@/lib/search/params";
import { normalizeSaudiMobile } from "@/lib/phone";
import { isDisposableEmail } from "@/lib/disposable";
import { adPath, parseAdId, safeNext } from "@/lib/ads";
import { formatPrice } from "@/lib/format";
import ar from "@/lib/i18n/dictionaries/ar";
import en from "@/lib/i18n/dictionaries/en";

describe("Arabic search normalisation", () => {
  it("folds letter variants and strips diacritics", () => {
    expect(normalizeArabic("شَقَّة للإيجار")).toBe("شقه للايجار");
    expect(normalizeArabic("مستشفى")).toBe("مستشفي");
    expect(normalizeArabic("iPhone")).toBe("iphone");
  });

  it("builds a prefix tsquery from free text", () => {
    expect(toTsQuery("Camry 2020")).toBe("camry & 2020:*");
    expect(toTsQuery("  ")).toBeNull();
    expect(toTsQuery("a' | b")).toBe("a & b:*");
  });
});

describe("search params", () => {
  it("keeps known filters and drops unknown ones", () => {
    const p = parseSearchParams({ category: "cars", make: "Toyota", year_min: "2018", evil: "x", city: "nowhere", page: "3" });
    expect(p.category).toBe("cars");
    expect(p.city).toBeUndefined();
    expect(p.fields).toEqual({ make: "Toyota", year_min: "2018" });
    expect(toQueryString(p)).toBe("?category=cars&make=Toyota&year_min=2018&page=3");
  });

  it("ignores field filters without a category", () => {
    expect(parseSearchParams({ make: "Toyota" }).fields).toEqual({});
  });
});

describe("helpers", () => {
  it("normalises Saudi mobile numbers", () => {
    expect(normalizeSaudiMobile("0501234567")).toBe("+966501234567");
    expect(normalizeSaudiMobile("+966 50 123 4567")).toBe("+966501234567");
    expect(normalizeSaudiMobile("00966501234567")).toBe("+966501234567");
    expect(normalizeSaudiMobile("0112345678")).toBeNull();
  });

  it("spots throwaway email domains", () => {
    expect(isDisposableEmail("a@Mailinator.com")).toBe(true);
    expect(isDisposableEmail("a@gmail.com")).toBe(false);
  });

  it("builds and parses ad URLs", () => {
    const path = adPath("en", { id: 42, title: "Toyota Camry 2021!" });
    expect(path).toBe("/en/ad/42-toyota-camry-2021");
    expect(parseAdId("42-toyota-camry-2021")).toBe(42);
    expect(parseAdId("abc")).toBeNull();
  });

  it("only allows on-site return paths after sign-in", () => {
    expect(safeNext("/en/ad/1", "/en")).toBe("/en/ad/1");
    expect(safeNext("//evil.com", "/en")).toBe("/en");
    expect(safeNext("https://evil.com", "/en")).toBe("/en");
    expect(safeNext("/\\evil.com", "/en")).toBe("/en");
  });

  it("formats prices in both languages", () => {
    expect(formatPrice(65000, "en")).toBe("SAR 65,000");
    expect(formatPrice(3500, "ar", "month")).toBe("3,500 ريال شهريًا");
  });
});

describe("dictionaries", () => {
  it("have the same keys in Arabic and English", () => {
    const keys = (o: object, prefix = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
    expect(keys(ar).sort()).toEqual(keys(en).sort());
  });
});
