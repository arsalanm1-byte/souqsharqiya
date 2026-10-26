import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { getCity } from "@/lib/locations";
import { PostForm } from "@/components/post-form";

export async function generateMetadata({ params }: PageProps<"/[lang]/post">): Promise<Metadata> {
  const { lang } = await params;
  return { title: isLocale(lang) ? getDictionary(lang).post.title : undefined, robots: { index: false } };
}

export default async function PostPage({ params }: PageProps<"/[lang]/post">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { supabase, user } = await requireUser(lang, `/${lang}/post`);
  const t = getDictionary(lang);
  const { data: contact } = await supabase.from("profile_contacts").select("phone").eq("user_id", user.id).maybeSingle();
  const city = getCity((await cookies()).get("city")?.value)?.slug ?? "";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 text-2xl font-bold">{t.post.title}</h1>
      <PostForm
        lang={lang}
        userId={user.id}
        hasPhone={Boolean(contact?.phone)}
        t={t.post}
        initial={{
          category: "",
          subcategory: "",
          city,
          district: "",
          title: "",
          description: "",
          price: "",
          pricePeriod: "",
          values: {},
          lat: null,
          lng: null,
          photos: [],
          photoHashes: [],
        }}
      />
    </div>
  );
}
