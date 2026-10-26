import type { PriceRating } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

const styles: Record<PriceRating, string> = {
  great: "bg-emerald-100 text-emerald-800",
  good: "bg-lime-100 text-lime-800",
  fair: "bg-amber-100 text-amber-800",
  high: "bg-rose-100 text-rose-800",
};

const bars: Record<PriceRating, number> = { great: 4, good: 3, fair: 2, high: 1 };

export function PriceRatingBadge({ rating, t }: { rating: PriceRating; t: Dictionary["priceRating"] }) {
  return (
    <span className={`chip ${styles[rating]}`}>
      <span aria-hidden className="flex items-end gap-px">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`w-1 rounded-sm ${i <= bars[rating] ? "bg-current" : "bg-current/25"}`} style={{ height: 4 + i * 2 }} />
        ))}
      </span>
      {t[rating]}
    </span>
  );
}
