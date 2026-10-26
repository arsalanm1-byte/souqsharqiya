import type { Locale } from "@/lib/i18n/config";

export type ProseSection = { heading?: string; paragraphs: string[] };

export function ProsePage({ title, sections, note }: { lang: Locale; title: string; sections: ProseSection[]; note?: string }) {
  return (
    <article className="card mx-auto max-w-3xl space-y-5 p-6 sm:p-8">
      <h1 className="text-2xl font-bold">{title}</h1>
      {note ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{note}</p> : null}
      {sections.map((s, i) => (
        <section key={i} className="space-y-2">
          {s.heading ? <h2 className="text-lg font-bold">{s.heading}</h2> : null}
          {s.paragraphs.map((p, j) => (
            <p key={j} className="leading-relaxed text-slate-700">{p}</p>
          ))}
        </section>
      ))}
    </article>
  );
}
