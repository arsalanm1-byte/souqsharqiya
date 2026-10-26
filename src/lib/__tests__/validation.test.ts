import { describe, expect, it } from "vitest";
import { adToValues, validateAd, type AdInput } from "@/lib/validation";

const base: AdInput = {
  category: "cars",
  subcategory: "cars-for-sale",
  city: "dammam",
  district: "",
  title: "Toyota Camry 2021 GLE",
  description: "Single owner, full service history.",
  price: "65,000",
  pricePeriod: "",
  values: { make: "Toyota", model: "Camry", year: "2021", mileage_km: "80000", transmission: "automatic" },
  lat: null,
  lng: null,
};

describe("validateAd", () => {
  it("maps car fields to promoted columns and attributes", () => {
    const r = validateAd(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.row).toMatchObject({ brand: "Toyota", model: "Camry", year: 2021, mileage_km: 80000, price: 65000 });
    expect(r.row.attributes).toEqual({ transmission: "automatic" });
  });

  it("rejects a model that does not belong to the make", () => {
    const r = validateAd({ ...base, values: { ...base.values, model: "Patrol" } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.model).toBe("invalid");
  });

  it("requires the category's required fields", () => {
    const r = validateAd({ ...base, values: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toMatchObject({ make: "required", model: "required", year: "required" });
  });

  it("needs a rent period and district for housing", () => {
    const r = validateAd({
      ...base,
      category: "housing",
      subcategory: "rent-apartment",
      values: { bedrooms: "3", size_m2: "140" },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toMatchObject({ pricePeriod: "required", district: "required" });
  });

  it("requires a REGA licence for property sales and for agencies", () => {
    const sale = validateAd({
      ...base,
      category: "housing",
      subcategory: "sale-villa",
      district: "al-rakah",
      city: "khobar",
      values: { bedrooms: "5", size_m2: "400" },
    });
    expect(sale.ok).toBe(false);
    if (!sale.ok) expect(sale.errors.rega_licence).toBe("required");

    const rent = {
      ...base,
      category: "housing",
      subcategory: "rent-apartment",
      city: "khobar",
      district: "al-rakah",
      pricePeriod: "year",
      values: { bedrooms: "2", size_m2: "110" },
    };
    expect(validateAd(rent).ok).toBe(true);
    expect(validateAd(rent, "agency").ok).toBe(false);
  });

  it("lets jobs skip the salary and defaults the period to monthly", () => {
    const job = { ...base, category: "jobs", subcategory: "hiring", values: { sector: "it", job_type: "full-time" } };
    const noSalary = validateAd({ ...job, price: "" });
    expect(noSalary.ok && noSalary.row.price).toBe(null);
    const withSalary = validateAd({ ...job, price: "9000" });
    expect(withSalary.ok && withSalary.row.price_period).toBe("month");
  });

  it("rounds map pins to about 100 m", () => {
    const r = validateAd({ ...base, lat: 26.2794321, lng: 50.2083912 });
    expect(r.ok && [r.row.lat, r.row.lng]).toEqual([26.279, 50.208]);
  });

  it("round-trips values for the edit form", () => {
    const r = validateAd(base);
    if (!r.ok) throw new Error("invalid");
    expect(adToValues(r.row)).toEqual(base.values);
  });
});
