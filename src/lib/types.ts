import type { CategoryId } from "@/lib/categories";

export type AdStatus = "pending" | "active" | "rejected" | "closed" | "sold" | "removed";
export type PriceRating = "great" | "good" | "fair" | "high";
export type SellerType = "individual" | "dealer" | "agency" | "employer";

export type Profile = {
  id: string;
  display_name: string;
  seller_type: SellerType;
  business_name: string | null;
  verified_business: boolean;
  role: "user" | "admin";
  is_banned: boolean;
  preferred_locale: "ar" | "en";
  created_at: string;
};

export type Ad = {
  id: number;
  user_id: string;
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
  photos: string[];
  status: AdStatus;
  moderation_note: string | null;
  price_rating: PriceRating | null;
  price_median: number | null;
  price_comps: number | null;
  sold_to: string | null;
  sold_price: number | null;
  sold_at: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
};

/** The columns an ad card needs. */
export const AD_CARD_COLUMNS =
  "id, title, category, subcategory, city, district, price, price_period, photos, price_rating, created_at, status, expires_at, profiles!ads_user_id_fkey(verified_business)";

export type AdCardData = Pick<
  Ad,
  | "id"
  | "title"
  | "category"
  | "subcategory"
  | "city"
  | "district"
  | "price"
  | "price_period"
  | "photos"
  | "price_rating"
  | "created_at"
  | "status"
  | "expires_at"
> & { profiles: { verified_business: boolean } | null };

export type RatingSummary = { user_id: string; role: "seller" | "buyer"; average: number; count: number };

export type CartlowPrice = {
  id: number;
  brand: string;
  model: string;
  storage: string | null;
  price: number;
  url: string;
  updated_at: string;
};
