import type { RatingSummary } from "@/lib/types";

export function RatingLine({ summary, label, empty }: { summary?: RatingSummary; label: string; empty: string | null }) {
  if (!summary) return empty ? <p className="text-sm text-slate-500">{empty}</p> : null;
  return (
    <p className="text-sm">
      <span className="text-amber-500" aria-hidden>
        {"★".repeat(Math.round(summary.average))}
        <span className="text-slate-300">{"★".repeat(5 - Math.round(summary.average))}</span>
      </span>{" "}
      <span className="font-semibold">{summary.average}</span>{" "}
      <span className="text-slate-500">
        ({summary.count}) {label}
      </span>
    </p>
  );
}
