"use client";

import { useActionState } from "react";
import { reportAd, type ReportState } from "@/app/actions/contact";
import type { Dictionary } from "@/lib/i18n";

export function ReportForm({ adId, userId, t }: { adId: number; userId: string; t: Dictionary["ad"] }) {
  const [state, action, pending] = useActionState<ReportState, FormData>(reportAd, { status: "idle" });
  if (state.status === "done") return <p className="text-sm text-brand-700">{t.reportThanks}</p>;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="adId" value={adId} />
      <input type="hidden" name="userId" value={userId} />
      <div>
        <label className="label" htmlFor="report-reason">{t.reportReason}</label>
        <select id="report-reason" name="reason" required className="input">
          {Object.entries(t.reasons).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="report-details">{t.reportDetails}</label>
        <textarea id="report-details" name="details" rows={3} maxLength={1000} className="input" />
      </div>
      <button type="submit" disabled={pending} className="btn-danger">{t.reportSend}</button>
    </form>
  );
}
