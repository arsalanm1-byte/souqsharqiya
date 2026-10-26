"use client";

import { useActionState, useState } from "react";
import { rateDeal, type RateState } from "@/app/actions/ads";
import type { Dictionary } from "@/lib/i18n";

export function RateForm({ adId, rateeId, role, t }: { adId: number; rateeId: string; role: "buyer" | "seller"; t: Dictionary["rate"] }) {
  const [state, action, pending] = useActionState<RateState, FormData>(rateDeal, { status: "idle" });
  const [stars, setStars] = useState(0);
  if (state.status === "done") return <p className="text-brand-700">{t.thanks}</p>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="adId" value={adId} />
      <input type="hidden" name="rateeId" value={rateeId} />
      <input type="hidden" name="role" value={role} />
      <fieldset>
        <legend className="label">{t.stars}</legend>
        <div className="flex gap-1 text-3xl" dir="ltr">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className={`cursor-pointer ${n <= stars ? "text-amber-500" : "text-slate-300"}`}>
              <input type="radio" name="stars" value={n} required className="sr-only" onChange={() => setStars(n)} />
              ★
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="comment">{t.comment}</label>
        <textarea id="comment" name="comment" rows={3} maxLength={500} className="input" />
      </div>
      {state.status === "error" ? <p className="text-sm text-red-700">{t.notAllowed}</p> : null}
      <button type="submit" disabled={pending || stars === 0} className="btn-primary">{t.submit}</button>
    </form>
  );
}
