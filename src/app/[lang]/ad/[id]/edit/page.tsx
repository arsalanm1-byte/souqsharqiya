import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { parseAdId } from "@/lib/ads";
import { adToValues } from "@/lib/validation";
import type { Ad } from "@/lib/types";
import { PostForm } from "@/components/post-form";

export const metadata = { robots: { index: false } };

export default async function EditAdPage({ params }: PageProps<"/[lang]/ad/[id]/edit">) {
  const { lang, id } = await params;
  const adId = parseAdId(id);
  if (!isLocale(lang) || !adId) notFound();
  const { supabase, user } = await requireUser(lang, `/${lang}/ad/${adId}/edit`);
  const { data: ad } = await supabase
    .from("ads")
    .select("*")
    .eq("id", adId)
    .eq("user_id", user.id)
    .maybeSingle<Ad & { photo_hashes: string[] }>();
  if (!ad) notFound();
  if (!["active", "pending", "closed"].includes(ad.status)) redirect(`/${lang}/my/ads`);
  const t = getDictionary(lang);
  const { data: contact } = await supabase.from("profile_contacts").select("phone").eq("user_id", user.id).maybeSingle();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 text-2xl font-bold">{t.post.editTitle}</h1>
      <PostForm
        lang={lang}
        userId={user.id}
        hasPhone={Boolean(contact?.phone)}
        t={t.post}
        initial={{
          id: ad.id,
          category: ad.category,
          subcategory: ad.subcategory,
          city: ad.city,
          district: ad.district ?? "",
          title: ad.title,
          description: ad.description,
          price: ad.price === null ? "" : String(ad.price),
          pricePeriod: ad.price_period ?? "",
          values: adToValues(ad),
          lat: ad.lat,
          lng: ad.lng,
          photos: ad.photos,
          photoHashes: ad.photo_hashes ?? [],
        }}
      />
    </div>
  );
}
