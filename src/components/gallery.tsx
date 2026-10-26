"use client";

import { useState } from "react";

export function Gallery({ photos, alt, empty }: { photos: string[]; alt: string; empty: string }) {
  const [index, setIndex] = useState(0);
  if (photos.length === 0) {
    return <div className="card grid aspect-[4/3] place-items-center text-slate-400">{empty}</div>;
  }
  const go = (delta: number) => setIndex((i) => (i + delta + photos.length) % photos.length);
  return (
    <div className="space-y-2">
      <div className="card relative aspect-[4/3] overflow-hidden bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos[index]} alt={`${alt} (${index + 1}/${photos.length})`} className="size-full object-contain" />
        {photos.length > 1 ? (
          <>
            <button type="button" onClick={() => go(-1)} className="absolute start-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl shadow" aria-label="‹">
              <span className="rtl:rotate-180">‹</span>
            </button>
            <button type="button" onClick={() => go(1)} className="absolute end-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl shadow" aria-label="›">
              <span className="rtl:rotate-180">›</span>
            </button>
            <span dir="ltr" className="chip absolute bottom-2 end-2 bg-black/60 text-white">
              {index + 1} / {photos.length}
            </span>
          </>
        ) : null}
      </div>
      {photos.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((src, i) => (
            <button key={src} type="button" onClick={() => setIndex(i)} className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === index ? "border-brand-600" : "border-transparent"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
