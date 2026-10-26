"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toggleSavedAd } from "@/app/actions/saved";

export function SaveButton(props: { adId: number; initial: boolean; signedIn: boolean; loginHref: string; labels: { save: string; saved: string } }) {
  const [saved, setSaved] = useState(props.initial);
  const [pending, startTransition] = useTransition();
  const label = saved ? `♥ ${props.labels.saved}` : `♡ ${props.labels.save}`;
  if (!props.signedIn) {
    return <Link href={props.loginHref} className="btn-secondary">{label}</Link>;
  }
  return (
    <button
      type="button"
      aria-pressed={saved}
      disabled={pending}
      className={saved ? "btn-secondary border-rose-200 text-rose-700" : "btn-secondary"}
      onClick={() => startTransition(async () => setSaved(await toggleSavedAd(props.adId, !saved)))}
    >
      {label}
    </button>
  );
}
