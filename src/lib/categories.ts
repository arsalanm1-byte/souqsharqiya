import type { Label, Locale } from "@/lib/i18n/config";
import { carMakes, electronicsBrands } from "@/lib/catalog";

export type CategoryId = "cars" | "housing" | "jobs" | "electronics";

/** Columns on `ads` that a field writes to instead of `attributes`. */
export type PromotedColumn = "brand" | "model" | "year" | "mileage_km" | "bedrooms" | "size_m2";

export type Option = { value: string; label: Label };

export type Field = {
  key: string;
  label: Label;
  type: "select" | "number" | "text" | "date";
  options?: Option[];
  /** For a select whose options depend on another field (car model by make). */
  dependsOn?: string;
  /** Suggestions for a free-text field. */
  suggestions?: (values: Record<string, string>) => string[];
  required?: boolean;
  column?: PromotedColumn;
  /** How the field appears in search filters. */
  filter?: "eq" | "range";
  /** Only these subcategories use the field. */
  subcategories?: string[];
  min?: number;
  max?: number;
  unit?: Label;
  /** Collected but never shown publicly (e.g. IMEI). */
  private?: boolean;
  /** Required only for some subcategories. */
  requiredFor?: string[];
};

export type Category = {
  id: CategoryId;
  label: Label;
  icon: string;
  subcategories: Option[];
  fields: Field[];
  priceLabel: Label;
  /** Whether the price can be per month or per year, by subcategory prefix. */
  pricePeriod?: (subcategory: string) => boolean;
  priceOptional?: boolean;
};

const o = (value: string, en: string, ar: string): Option => ({ value, label: { en, ar } });

const conditionOptions = [
  o("new", "New", "جديد"),
  o("like-new", "Like new", "شبه جديد"),
  o("good", "Good", "جيد"),
  o("fair", "Fair", "مقبول"),
];

const storageOptions = ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "2TB"].map((s) => o(s, s, s));

const housingRent = ["rent-apartment", "rent-villa", "rent-room", "rent-bedspace", "rent-commercial"];
const housingResidential = ["rent-apartment", "rent-villa", "sale-apartment", "sale-villa"];

export const categories: Category[] = [
  {
    id: "cars",
    label: { en: "Cars", ar: "سيارات" },
    icon: "🚗",
    priceLabel: { en: "Price (SAR)", ar: "السعر (ريال)" },
    subcategories: [
      o("cars-for-sale", "Cars for sale", "سيارات للبيع"),
      o("motorcycles", "Motorcycles", "دراجات نارية"),
      o("parts-accessories", "Parts & accessories", "قطع غيار وإكسسوارات"),
    ],
    fields: [
      {
        key: "make",
        label: { en: "Make", ar: "الماركة" },
        type: "select",
        options: carMakes.map((m) => o(m.name, m.name, m.ar)),
        required: true,
        column: "brand",
        filter: "eq",
        subcategories: ["cars-for-sale"],
      },
      {
        key: "model",
        label: { en: "Model", ar: "الموديل" },
        type: "select",
        dependsOn: "make",
        required: true,
        column: "model",
        filter: "eq",
        subcategories: ["cars-for-sale"],
      },
      {
        key: "make",
        label: { en: "Make", ar: "الماركة" },
        type: "text",
        column: "brand",
        subcategories: ["motorcycles"],
      },
      {
        key: "model",
        label: { en: "Model", ar: "الموديل" },
        type: "text",
        column: "model",
        subcategories: ["motorcycles"],
      },
      {
        key: "year",
        label: { en: "Year", ar: "سنة الصنع" },
        type: "number",
        min: 1950,
        max: new Date().getFullYear() + 1,
        required: true,
        column: "year",
        filter: "range",
        subcategories: ["cars-for-sale", "motorcycles"],
      },
      {
        key: "mileage_km",
        label: { en: "Mileage", ar: "الممشى" },
        type: "number",
        min: 0,
        max: 2_000_000,
        unit: { en: "km", ar: "كم" },
        required: true,
        column: "mileage_km",
        filter: "range",
        subcategories: ["cars-for-sale", "motorcycles"],
      },
      {
        key: "body_type",
        label: { en: "Body type", ar: "نوع الهيكل" },
        type: "select",
        options: [
          o("sedan", "Sedan", "سيدان"),
          o("suv", "SUV", "دفع رباعي"),
          o("pickup", "Pickup", "بيك أب"),
          o("hatchback", "Hatchback", "هاتشباك"),
          o("coupe", "Coupe", "كوبيه"),
          o("van", "Van / bus", "فان / باص"),
          o("other", "Other", "أخرى"),
        ],
        subcategories: ["cars-for-sale"],
      },
      {
        key: "transmission",
        label: { en: "Transmission", ar: "ناقل الحركة" },
        type: "select",
        options: [o("automatic", "Automatic", "أوتوماتيك"), o("manual", "Manual", "عادي")],
        required: true,
        filter: "eq",
        subcategories: ["cars-for-sale"],
      },
      {
        key: "fuel",
        label: { en: "Fuel", ar: "الوقود" },
        type: "select",
        options: [
          o("petrol", "Petrol", "بنزين"),
          o("diesel", "Diesel", "ديزل"),
          o("hybrid", "Hybrid", "هايبرد"),
          o("electric", "Electric", "كهربائي"),
        ],
        subcategories: ["cars-for-sale"],
      },
      {
        key: "colour",
        label: { en: "Colour", ar: "اللون" },
        type: "text",
        subcategories: ["cars-for-sale"],
      },
      {
        key: "regional_spec",
        label: { en: "Regional spec", ar: "المواصفات" },
        type: "select",
        options: [
          o("gcc", "GCC", "خليجي"),
          o("american", "American", "أمريكي"),
          o("european", "European", "أوروبي"),
          o("japanese", "Japanese", "ياباني"),
          o("other", "Other", "أخرى"),
        ],
        filter: "eq",
        subcategories: ["cars-for-sale"],
      },
      {
        key: "accident_history",
        label: { en: "Accident history", ar: "سجل الحوادث" },
        type: "select",
        options: [
          o("none", "No accidents", "بدون حوادث"),
          o("minor", "Minor accidents", "حوادث بسيطة"),
          o("major", "Major accident", "حادث كبير"),
        ],
        subcategories: ["cars-for-sale"],
      },
      {
        key: "istimara_expiry",
        label: { en: "Istimara valid until", ar: "الاستمارة سارية حتى" },
        type: "date",
        subcategories: ["cars-for-sale"],
      },
      {
        key: "condition",
        label: { en: "Condition", ar: "الحالة" },
        type: "select",
        options: [o("new", "New", "جديد"), o("used", "Used", "مستعمل")],
        required: true,
        filter: "eq",
        subcategories: ["parts-accessories"],
      },
    ],
  },
  {
    id: "housing",
    label: { en: "Housing", ar: "عقارات" },
    icon: "🏠",
    priceLabel: { en: "Rent or price (SAR)", ar: "الإيجار أو السعر (ريال)" },
    pricePeriod: (sub) => sub.startsWith("rent-"),
    subcategories: [
      o("rent-apartment", "Apartments for rent", "شقق للإيجار"),
      o("rent-villa", "Villas for rent", "فلل للإيجار"),
      o("rent-room", "Rooms for rent", "غرف للإيجار"),
      o("rent-bedspace", "Bed space", "سكن مشترك"),
      o("rent-commercial", "Commercial for rent", "تجاري للإيجار"),
      o("sale-apartment", "Apartments for sale", "شقق للبيع"),
      o("sale-villa", "Villas for sale", "فلل للبيع"),
      o("sale-land", "Land for sale", "أراضي للبيع"),
      o("sale-commercial", "Commercial for sale", "تجاري للبيع"),
    ],
    fields: [
      {
        key: "bedrooms",
        label: { en: "Bedrooms", ar: "غرف النوم" },
        type: "number",
        min: 0,
        max: 20,
        required: true,
        column: "bedrooms",
        filter: "eq",
        subcategories: housingResidential,
      },
      {
        key: "bathrooms",
        label: { en: "Bathrooms", ar: "دورات المياه" },
        type: "number",
        min: 0,
        max: 20,
        subcategories: housingResidential,
      },
      {
        key: "size_m2",
        label: { en: "Size", ar: "المساحة" },
        type: "number",
        min: 1,
        max: 1_000_000,
        unit: { en: "m²", ar: "م²" },
        column: "size_m2",
        requiredFor: ["rent-apartment", "rent-villa", "sale-apartment", "sale-villa", "sale-land"],
      },
      {
        key: "furnished",
        label: { en: "Furnished", ar: "التأثيث" },
        type: "select",
        options: [
          o("furnished", "Furnished", "مفروش"),
          o("semi", "Semi-furnished", "شبه مفروش"),
          o("unfurnished", "Unfurnished", "غير مفروش"),
        ],
        filter: "eq",
        subcategories: [...housingRent, "sale-apartment", "sale-villa"],
      },
      {
        key: "tenant_type",
        label: { en: "For", ar: "مناسب لـ" },
        type: "select",
        options: [
          o("family", "Families", "عائلات"),
          o("bachelor", "Bachelors", "عزاب"),
          o("any", "Anyone", "الجميع"),
        ],
        filter: "eq",
        subcategories: housingRent,
      },
      {
        key: "rega_licence",
        label: { en: "REGA ad licence no.", ar: "رقم ترخيص الإعلان (الهيئة العامة للعقار)" },
        type: "text",
        requiredFor: ["sale-apartment", "sale-villa", "sale-land", "sale-commercial"],
      },
    ],
  },
  {
    id: "jobs",
    label: { en: "Jobs", ar: "وظائف" },
    icon: "💼",
    priceLabel: { en: "Monthly salary (SAR)", ar: "الراتب الشهري (ريال)" },
    priceOptional: true,
    subcategories: [o("hiring", "Hiring", "مطلوب موظفين"), o("seeking", "Looking for work", "باحث عن عمل")],
    fields: [
      {
        key: "sector",
        label: { en: "Sector", ar: "القطاع" },
        type: "select",
        required: true,
        filter: "eq",
        options: [
          o("oil-gas", "Oil & gas", "النفط والغاز"),
          o("construction", "Construction", "المقاولات"),
          o("engineering", "Engineering", "الهندسة"),
          o("healthcare", "Healthcare", "الصحة"),
          o("it", "IT & software", "تقنية المعلومات"),
          o("education", "Education", "التعليم"),
          o("hospitality", "Hotels & restaurants", "الفنادق والمطاعم"),
          o("retail", "Retail & sales", "التجزئة والمبيعات"),
          o("admin", "Admin & accounting", "الإدارة والمحاسبة"),
          o("driving", "Drivers & logistics", "السائقين والنقل"),
          o("domestic", "Domestic help", "العمالة المنزلية"),
          o("other", "Other", "أخرى"),
        ],
      },
      {
        key: "job_type",
        label: { en: "Job type", ar: "نوع الوظيفة" },
        type: "select",
        required: true,
        filter: "eq",
        options: [
          o("full-time", "Full-time", "دوام كامل"),
          o("part-time", "Part-time", "دوام جزئي"),
          o("contract", "Contract", "عقد"),
          o("temporary", "Temporary", "مؤقت"),
        ],
      },
      {
        key: "experience_years",
        label: { en: "Experience (years)", ar: "سنوات الخبرة" },
        type: "number",
        min: 0,
        max: 50,
      },
      {
        key: "nationality_note",
        label: { en: "Nationality / Saudization note", ar: "الجنسية / ملاحظة التوطين" },
        type: "text",
      },
      {
        key: "iqama_status",
        label: { en: "Iqama / visa", ar: "الإقامة / التأشيرة" },
        type: "select",
        options: [
          o("transferable", "Transferable iqama", "إقامة قابلة للنقل"),
          o("visa-provided", "Visa provided", "التأشيرة متوفرة"),
          o("saudi", "Saudi national", "سعودي الجنسية"),
          o("visit", "Visit visa", "تأشيرة زيارة"),
          o("not-applicable", "Not applicable", "لا ينطبق"),
        ],
      },
      {
        key: "apply_email",
        label: { en: "Apply by email (optional)", ar: "التقديم عبر البريد (اختياري)" },
        type: "text",
        subcategories: ["hiring"],
      },
    ],
  },
  {
    id: "electronics",
    label: { en: "Used electronics", ar: "إلكترونيات مستعملة" },
    icon: "📱",
    priceLabel: { en: "Price (SAR)", ar: "السعر (ريال)" },
    subcategories: [
      o("mobiles", "Mobile phones", "جوالات"),
      o("laptops", "Laptops", "لابتوبات"),
      o("desktops", "Desktop PCs", "كمبيوترات مكتبية"),
      o("tablets", "Tablets", "أجهزة لوحية"),
      o("gaming", "Gaming", "ألعاب"),
      o("accessories", "Accessories", "إكسسوارات"),
    ],
    fields: [
      {
        key: "brand",
        label: { en: "Brand", ar: "الماركة" },
        type: "select",
        options: electronicsBrands.map((b) => o(b.name, b.name, b.name)),
        required: true,
        column: "brand",
        filter: "eq",
        subcategories: ["mobiles", "laptops", "desktops", "tablets", "gaming"],
      },
      {
        key: "model",
        label: { en: "Model", ar: "الموديل" },
        type: "text",
        required: true,
        column: "model",
        suggestions: (values) => electronicsBrands.find((b) => b.name === values.brand)?.models ?? [],
        subcategories: ["mobiles", "laptops", "desktops", "tablets", "gaming"],
      },
      {
        key: "storage",
        label: { en: "Storage", ar: "السعة" },
        type: "select",
        options: storageOptions,
        filter: "eq",
        subcategories: ["mobiles", "laptops", "desktops", "tablets", "gaming"],
      },
      {
        key: "condition",
        label: { en: "Condition", ar: "الحالة" },
        type: "select",
        options: conditionOptions,
        required: true,
        filter: "eq",
      },
      {
        key: "battery_health",
        label: { en: "Battery health", ar: "صحة البطارية" },
        type: "number",
        min: 1,
        max: 100,
        unit: { en: "%", ar: "٪" },
        subcategories: ["mobiles", "tablets", "laptops"],
      },
      {
        key: "warranty_months",
        label: { en: "Warranty left (months)", ar: "الضمان المتبقي (شهور)" },
        type: "number",
        min: 0,
        max: 60,
      },
      {
        key: "imei",
        label: { en: "IMEI (optional, not shown)", ar: "رقم IMEI (اختياري، لا يظهر)" },
        type: "text",
        private: true,
        subcategories: ["mobiles", "tablets"],
      },
    ],
  },
];

export const categoryIds = categories.map((c) => c.id);

export function getCategory(id: string | undefined | null): Category | undefined {
  return categories.find((c) => c.id === id);
}

export function isCategoryId(id: string | undefined | null): id is CategoryId {
  return categoryIds.includes(id as CategoryId);
}

export function fieldsFor(category: Category, subcategory: string | undefined): Field[] {
  return category.fields.filter((f) => !f.subcategories || (subcategory && f.subcategories.includes(subcategory)));
}

/** Fields offered as search filters for a category (any subcategory). */
export function filterFields(category: Category, subcategory?: string): Field[] {
  const seen = new Set<string>();
  return category.fields.filter((f) => {
    if (!f.filter || seen.has(f.key)) return false;
    if (subcategory && f.subcategories && !f.subcategories.includes(subcategory)) return false;
    seen.add(f.key);
    return true;
  });
}

export function isFieldRequired(field: Field, subcategory: string): boolean {
  return Boolean(field.required || field.requiredFor?.includes(subcategory));
}

export function optionLabel(options: Option[] | undefined, value: string, locale: Locale): string {
  return options?.find((opt) => opt.value === value)?.label[locale] ?? value;
}

export function subcategoryLabel(categoryId: string, sub: string, locale: Locale): string {
  return optionLabel(getCategory(categoryId)?.subcategories, sub, locale);
}

/** Options for a dependent select (car models for the chosen make). */
export function dependentOptions(field: Field, values: Record<string, string>): Option[] {
  if (field.key === "model" && field.dependsOn === "make") {
    const make = carMakes.find((m) => m.name === values.make);
    return (make?.models ?? []).map((m) => o(m, m, m));
  }
  return field.options ?? [];
}
