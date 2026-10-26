import type { Label, Locale } from "@/lib/i18n/config";

export type District = { slug: string; label: Label };
export type City = { slug: string; label: Label; districts: District[] };

const d = (slug: string, en: string, ar: string): District => ({ slug, label: { en, ar } });

/** Pseudo-city used in URLs for "the whole Eastern Province". */
export const ALL_CITIES = "eastern-province";
export const allCitiesLabel: Label = { en: "All Eastern Province", ar: "كل المنطقة الشرقية" };

// Launch cities first. District lists are a starting set; extend as ads come in.
export const cities: City[] = [
  {
    slug: "dammam",
    label: { en: "Dammam", ar: "الدمام" },
    districts: [
      d("al-faisaliyah", "Al Faisaliyah", "الفيصلية"),
      d("al-shati-al-gharbi", "Al Shati Al Gharbi", "الشاطئ الغربي"),
      d("al-shati-al-sharqi", "Al Shati Al Sharqi", "الشاطئ الشرقي"),
      d("al-mazruiyah", "Al Mazruiyah", "المزروعية"),
      d("al-muraikabat", "Al Muraikabat", "المريكبات"),
      d("al-adamah", "Al Adamah", "العدامة"),
      d("al-jalawiyah", "Al Jalawiyah", "الجلوية"),
      d("al-hamra", "Al Hamra", "الحمراء"),
      d("al-nur", "Al Nur", "النور"),
      d("al-nakheel", "Al Nakheel", "النخيل"),
      d("al-iskan", "Al Iskan", "الإسكان"),
      d("uhud", "Uhud", "أحد"),
      d("al-badiyah", "Al Badiyah", "البادية"),
      d("al-anud", "Al Anud", "العنود"),
      d("al-rawdah", "Al Rawdah", "الروضة"),
      d("al-manar", "Al Manar", "المنار"),
      d("al-fursan", "Al Fursan", "الفرسان"),
      d("taibah", "Taibah", "طيبة"),
    ],
  },
  {
    slug: "khobar",
    label: { en: "Al Khobar", ar: "الخبر" },
    districts: [
      d("al-aqrabiyah", "Al Aqrabiyah", "العقربية"),
      d("al-thuqbah", "Al Thuqbah", "الثقبة"),
      d("al-rakah", "Al Rakah", "الراكة"),
      d("al-ulaya", "Al Ulaya", "العليا"),
      d("al-khobar-al-shamaliyah", "North Khobar", "الخبر الشمالية"),
      d("al-khobar-al-janubiyah", "South Khobar", "الخبر الجنوبية"),
      d("al-hizam-al-akhdar", "Al Hizam Al Akhdar", "الحزام الأخضر"),
      d("al-yarmouk", "Al Yarmouk", "اليرموك"),
      d("al-corniche", "Al Corniche", "الكورنيش"),
      d("al-aziziyah", "Al Aziziyah", "العزيزية"),
      d("al-bandariyah", "Al Bandariyah", "البندرية"),
      d("al-hamra", "Al Hamra", "الحمراء"),
      d("al-jisr", "Al Jisr", "الجسر"),
      d("al-andalus", "Al Andalus", "الأندلس"),
      d("al-khuzama", "Al Khuzama", "الخزامى"),
      d("al-rawabi", "Al Rawabi", "الروابي"),
    ],
  },
  {
    slug: "dhahran",
    label: { en: "Dhahran", ar: "الظهران" },
    districts: [
      d("al-doha-al-shamaliyah", "North Doha", "الدوحة الشمالية"),
      d("al-doha-al-janubiyah", "South Doha", "الدوحة الجنوبية"),
      d("al-qusur", "Al Qusur", "القصور"),
      d("dhahran-hills", "Dhahran Hills", "تلال الظهران"),
      d("al-jamiah", "University area", "الجامعة"),
      d("gulf-palace", "Gulf Palace", "قصر الخليج"),
    ],
  },
  {
    slug: "jubail",
    label: { en: "Jubail", ar: "الجبيل" },
    districts: [
      d("jubail-industrial", "Jubail Industrial City", "الجبيل الصناعية"),
      d("jubail-al-balad", "Jubail Al Balad", "الجبيل البلد"),
      d("al-fanateer", "Al Fanateer", "الفناتير"),
      d("al-deffi", "Al Deffi", "الدفي"),
      d("al-huwaylat", "Al Huwaylat", "الحويلات"),
    ],
  },
  {
    slug: "al-ahsa",
    label: { en: "Al Ahsa (Hofuf)", ar: "الأحساء (الهفوف)" },
    districts: [
      d("al-hofuf", "Al Hofuf", "الهفوف"),
      d("al-mubarraz", "Al Mubarraz", "المبرز"),
      d("al-muhammadiyah", "Al Muhammadiyah", "المحمدية"),
      d("al-khalidiyah", "Al Khalidiyah", "الخالدية"),
      d("al-yarmouk", "Al Yarmouk", "اليرموك"),
    ],
  },
  {
    slug: "qatif",
    label: { en: "Qatif", ar: "القطيف" },
    districts: [
      d("saihat", "Saihat", "سيهات"),
      d("safwa", "Safwa", "صفوى"),
      d("tarout", "Tarout", "تاروت"),
      d("anak", "Anak", "عنك"),
      d("al-qatif-center", "Qatif centre", "وسط القطيف"),
    ],
  },
  {
    slug: "ras-tanura",
    label: { en: "Ras Tanura", ar: "رأس تنورة" },
    districts: [d("ras-tanura-center", "Ras Tanura centre", "وسط رأس تنورة"), d("rahimah", "Rahimah", "رحيمة")],
  },
  {
    slug: "abqaiq",
    label: { en: "Abqaiq", ar: "بقيق" },
    districts: [d("abqaiq-center", "Abqaiq centre", "وسط بقيق")],
  },
];

export function getCity(slug: string | undefined | null): City | undefined {
  return cities.find((c) => c.slug === slug);
}

export function cityLabel(slug: string | undefined | null, locale: Locale): string {
  if (slug === ALL_CITIES) return allCitiesLabel[locale];
  return getCity(slug)?.label[locale] ?? slug ?? "";
}

export function districtLabel(citySlug: string, districtSlug: string | null | undefined, locale: Locale): string {
  if (!districtSlug) return "";
  return getCity(citySlug)?.districts.find((x) => x.slug === districtSlug)?.label[locale] ?? districtSlug;
}
