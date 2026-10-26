"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { saveAd, type SaveAdResult } from "@/app/actions/ads";
import { categories, dependentOptions, fieldsFor, getCategory, isFieldRequired, type Field } from "@/lib/categories";
import { cities, getCity } from "@/lib/locations";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { adPath, photoUrl, PHOTO_BUCKET } from "@/lib/ads";
import { createClient } from "@/lib/supabase/client";
import { compressImage, sha256Hex } from "@/lib/images";
import type { FieldErrors } from "@/lib/validation";

export type PostFormInitial = {
  id?: number;
  category: string;
  subcategory: string;
  city: string;
  district: string;
  title: string;
  description: string;
  price: string;
  pricePeriod: string;
  values: Record<string, string>;
  lat: number | null;
  lng: number | null;
  photos: string[];
  photoHashes: string[];
};

type Props = {
  lang: Locale;
  userId: string;
  hasPhone: boolean;
  initial: PostFormInitial;
  t: Dictionary["post"];
};

const MAX_PHOTOS = 10;

export function PostForm({ lang, userId, hasPhone, initial, t }: Props) {
  const editing = Boolean(initial.id);
  const [step, setStep] = useState(editing ? 2 : 1);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState<Extract<SaveAdResult, { ok: true }> | null>(null);
  const [pending, startTransition] = useTransition();

  const cat = getCategory(form.category);
  const city = getCity(form.city);
  const fields = useMemo(() => (cat && form.subcategory ? fieldsFor(cat, form.subcategory) : []), [cat, form.subcategory]);

  const set = <K extends keyof PostFormInitial>(key: K, value: PostFormInitial[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setValue = (key: string, value: string) =>
    setForm((f) => {
      const values = { ...f.values, [key]: value };
      if (key === "make") delete values.model; // models depend on the make
      return { ...f, values };
    });

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setFailure(null);
    const supabase = createClient();
    const room = MAX_PHOTOS - form.photos.length;
    for (const file of Array.from(files).slice(0, room)) {
      try {
        const blob = await compressImage(file);
        const hash = await sha256Hex(blob);
        const path = `${userId}/${crypto.randomUUID()}.webp`;
        const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/webp" });
        if (error) throw error;
        setForm((f) => ({ ...f, photos: [...f.photos, path], photoHashes: [...f.photoHashes, hash] }));
      } catch (err) {
        console.error(err);
        setFailure(t.errors.photos);
      }
    }
    setUploading(false);
  }

  function removePhoto(index: number) {
    setForm((f) => ({
      ...f,
      photos: f.photos.filter((_, i) => i !== index),
      photoHashes: f.photoHashes.filter((_, i) => i !== index),
    }));
  }

  function addMyLocation() {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
    });
  }

  function submit() {
    setFailure(null);
    startTransition(async () => {
      const result = await saveAd({ ...form, id: initial.id });
      if (result.ok) {
        setDone(result);
        return;
      }
      if (result.errors) {
        setErrors(result.errors);
        setStep(result.errors.category || result.errors.subcategory ? 1 : 2);
      }
      if (result.error === "sign_in") window.location.reload();
      else if (result.error) setFailure(t.errors[result.error]);
    });
  }

  if (done) {
    return (
      <div className="card space-y-4 p-6 text-center">
        <p className="text-4xl" aria-hidden>{done.status === "active" ? "🎉" : "⏳"}</p>
        <p className="text-lg font-semibold">{done.status === "active" ? t.successLive : t.successPending}</p>
        {!hasPhone ? <p className="text-sm text-slate-600">{t.phoneMissing}</p> : null}
        <div className="flex justify-center gap-2">
          <Link href={adPath(lang, { id: done.id, title: form.title })} className="btn-primary">{t.viewAd}</Link>
          {!editing ? (
            <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>{t.postAnother}</button>
          ) : null}
        </div>
      </div>
    );
  }

  const err = (key: string) =>
    errors[key] ? (
      <p className="mt-1 text-sm text-red-700" role="alert">
        {errors[key] === "required" ? t.required : "✕"}
      </p>
    ) : null;

  const steps = [t.step1, t.step2, t.step3];

  return (
    <div className="space-y-5">
      <ol className="flex gap-2 text-sm">
        {steps.map((label, i) => (
          <li
            key={label}
            className={`flex-1 rounded-xl border px-3 py-2 text-center font-semibold ${
              step === i + 1 ? "border-brand-600 bg-brand-50 text-brand-700" : step > i + 1 ? "border-brand-200 text-brand-700" : "border-slate-200 text-slate-500"
            }`}
            aria-current={step === i + 1 ? "step" : undefined}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {failure ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{failure}</p> : null}

      {step === 1 ? (
        <section className="card space-y-5 p-5">
          <h2 className="text-lg font-bold">{t.chooseCategory}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={editing}
                onClick={() => setForm((f) => ({ ...f, category: c.id, subcategory: "", values: {} }))}
                className={`rounded-2xl border-2 p-4 text-start transition ${form.category === c.id ? "border-brand-600 bg-brand-50" : "border-slate-200 hover:border-slate-300"}`}
              >
                <span className="text-3xl" aria-hidden>{c.icon}</span>
                <span className="mt-2 block font-semibold">{c.label[lang]}</span>
              </button>
            ))}
          </div>
          {cat ? (
            <div>
              <h3 className="mb-2 font-semibold">{t.chooseSub}</h3>
              <div className="flex flex-wrap gap-2">
                {cat.subcategories.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => set("subcategory", s.value)}
                    className={`chip border px-3 py-2 text-sm ${form.subcategory === s.value ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-700"}`}
                  >
                    {s.label[lang]}
                  </button>
                ))}
              </div>
              {err("subcategory")}
            </div>
          ) : null}
          <div className="flex justify-end">
            <button type="button" className="btn-primary" disabled={!cat || !form.subcategory} onClick={() => setStep(2)}>
              {t.next}
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 && cat ? (
        <section className="card space-y-4 p-5">
          <div>
            <label className="label" htmlFor="title">{t.adTitle}</label>
            <input id="title" className="input" maxLength={120} placeholder={t.adTitleHint} value={form.title} onChange={(e) => set("title", e.target.value)} />
            {err("title")}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <FieldInput key={f.key} field={f} lang={lang} t={t} value={form.values[f.key] ?? ""} values={form.values} required={isFieldRequired(f, form.subcategory)} onChange={(v) => setValue(f.key, v)} error={err(f.key)} />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="price">{cat.priceLabel[lang]}</label>
              <input id="price" className="input" inputMode="numeric" dir="ltr" value={form.price} onChange={(e) => set("price", e.target.value.replace(/[^\d.,]/g, ""))} />
              {err("price")}
            </div>
            {cat.pricePeriod?.(form.subcategory) ? (
              <div>
                <label className="label" htmlFor="period">{t.pricePeriod}</label>
                <select id="period" className="input" value={form.pricePeriod} onChange={(e) => set("pricePeriod", e.target.value)}>
                  <option value="">{t.select}</option>
                  <option value="month">{t.perMonth}</option>
                  <option value="year">{t.perYear}</option>
                </select>
                {err("pricePeriod")}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="city">{t.city}</label>
              <select id="city" className="input" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value, district: "" }))}>
                <option value="">{t.select}</option>
                {cities.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.label[lang]}</option>
                ))}
              </select>
              {err("city")}
            </div>
            <div>
              <label className="label" htmlFor="district">{t.district}</label>
              <select id="district" className="input" value={form.district} disabled={!city} onChange={(e) => set("district", e.target.value)}>
                <option value="">{t.chooseDistrict}</option>
                {city?.districts.map((d) => (
                  <option key={d.slug} value={d.slug}>{d.label[lang]}</option>
                ))}
              </select>
              {err("district")}
            </div>
          </div>

          {cat.id === "housing" ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {form.lat !== null ? (
                <>
                  <span className="text-brand-700">📍 {t.locationAdded}</span>
                  <button type="button" className="text-slate-600 underline" onClick={() => setForm((f) => ({ ...f, lat: null, lng: null }))}>{t.removeLocation}</button>
                </>
              ) : (
                <button type="button" className="btn-secondary" onClick={addMyLocation}>📍 {t.useLocation}</button>
              )}
            </div>
          ) : null}

          <div>
            <label className="label" htmlFor="description">{t.description}</label>
            <textarea id="description" className="input" rows={6} maxLength={5000} placeholder={t.descriptionHint} value={form.description} onChange={(e) => set("description", e.target.value)} />
            {err("description")}
          </div>

          <div className="flex justify-between">
            <button type="button" className="btn-ghost" onClick={() => setStep(1)}>{t.back}</button>
            <button type="button" className="btn-primary" onClick={() => setStep(3)}>{t.next}</button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="card space-y-4 p-5">
          <div>
            <h2 className="text-lg font-bold">{t.photos}</h2>
            <p className="text-sm text-slate-600">{t.photosHint}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {form.photos.map((path, i) => (
              <div key={path} className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(path)} alt="" className="size-full object-cover" />
                <button type="button" onClick={() => removePhoto(i)} className="chip absolute end-1 top-1 bg-white/90 text-red-700">
                  {t.removePhoto}
                </button>
              </div>
            ))}
            {form.photos.length < MAX_PHOTOS ? (
              <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-slate-300 text-center text-sm text-slate-600 hover:border-brand-500">
                <span>{uploading ? t.uploading : `+ ${t.addPhotos}`}</span>
                <input type="file" accept="image/*" multiple className="sr-only" disabled={uploading} onChange={(e) => addPhotos(e.target.files)} />
              </label>
            ) : null}
          </div>
          <div className="flex justify-between">
            <button type="button" className="btn-ghost" onClick={() => setStep(2)}>{t.back}</button>
            <button type="button" className="btn-primary px-6" disabled={pending || uploading} onClick={submit}>
              {pending ? t.submitting : editing ? t.saveChanges : t.submit}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function FieldInput(props: {
  field: Field;
  lang: Locale;
  t: Dictionary["post"];
  value: string;
  values: Record<string, string>;
  required: boolean;
  onChange: (value: string) => void;
  error: React.ReactNode;
}) {
  const { field, lang, t, value, values, required, onChange, error } = props;
  const id = `field-${field.key}`;
  const label = (
    <label className="label" htmlFor={id}>
      {field.label[lang]}
      {field.unit ? ` (${field.unit[lang]})` : ""}
      {required ? <span className="text-red-600"> *</span> : null}
    </label>
  );

  if (field.type === "select") {
    const options = field.dependsOn ? dependentOptions(field, values) : (field.options ?? []);
    return (
      <div>
        {label}
        <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)} disabled={field.dependsOn ? !values[field.dependsOn] : false}>
          <option value="">{t.select}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.value === "Other" ? t.other : o.label[lang]}</option>
          ))}
        </select>
        {error}
      </div>
    );
  }

  const suggestions = field.suggestions?.(values) ?? [];
  return (
    <div className={field.key === "rega_licence" ? "sm:col-span-2" : undefined}>
      {label}
      <input
        id={id}
        className="input"
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.key === "apply_email" ? "email" : "text"}
        inputMode={field.type === "number" ? "numeric" : undefined}
        min={field.min}
        max={field.max}
        list={suggestions.length ? `${id}-list` : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {suggestions.length ? (
        <datalist id={`${id}-list`}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ) : null}
      {field.key === "rega_licence" ? <p className="mt-1 text-xs text-slate-500">{t.regaHint}</p> : null}
      {error}
    </div>
  );
}
