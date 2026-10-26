import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { ProsePage, type ProseSection } from "@/components/prose-page";

const note: Record<Locale, string> = {
  en: "Draft for the MVP. Have it reviewed against the Personal Data Protection Law (PDPL) before launch.",
  ar: "مسودة للنسخة الأولى. يجب مراجعتها وفق نظام حماية البيانات الشخصية قبل الإطلاق.",
};

const content: Record<Locale, ProseSection[]> = {
  en: [
    { heading: "What we collect", paragraphs: ["Your email address and sign-in details; the name, phone number and business details you choose to add; the ads, photos, messages, ratings and reports you post; and basic technical logs needed to keep the site secure."] },
    { heading: "How we use it", paragraphs: ["To run your account, show your ads, deliver messages and email alerts you asked for, prevent fraud and spam, and improve the price rating. We do not sell your data."] },
    { heading: "Who sees what", paragraphs: ["Your display name, ads, ratings and member-since date are public. Your phone number is shown only to signed-in users who tap “Show phone” on your live ad, and every view is logged. Messages are visible only to the two people in the conversation and, when a report is investigated, to our moderators."] },
    { heading: "Where it is stored", paragraphs: ["Data is stored with our hosting providers (Supabase and Vercel). Emails are sent through Resend."] },
    { heading: "Your choices", paragraphs: ["You can edit or delete your ads, remove your phone number, turn off email alerts, or ask us to delete your account and data at any time."] },
  ],
  ar: [
    { heading: "البيانات التي نجمعها", paragraphs: ["بريدك الإلكتروني وبيانات الدخول؛ والاسم ورقم الجوال وبيانات النشاط التي تختار إضافتها؛ والإعلانات والصور والرسائل والتقييمات والبلاغات التي تنشرها؛ وسجلات تقنية أساسية لحماية الموقع."] },
    { heading: "كيف نستخدمها", paragraphs: ["لتشغيل حسابك وعرض إعلاناتك وتوصيل الرسائل والتنبيهات التي طلبتها، ومنع الاحتيال والرسائل المزعجة، وتحسين تقييم الأسعار. لا نبيع بياناتك."] },
    { heading: "من يرى ماذا", paragraphs: ["اسمك الظاهر وإعلاناتك وتقييماتك وتاريخ انضمامك عامة. يظهر رقم جوالك فقط للمستخدمين المسجلين الذين يضغطون «إظهار الرقم» في إعلانك المنشور، ويُسجَّل كل عرض. الرسائل لا يراها إلا طرفا المحادثة، ومشرفونا عند التحقق من بلاغ."] },
    { heading: "أين تُحفظ", paragraphs: ["تُحفظ البيانات لدى مزودي الاستضافة (Supabase وVercel)، وتُرسل الرسائل البريدية عبر Resend."] },
    { heading: "خياراتك", paragraphs: ["يمكنك تعديل إعلاناتك أو حذفها، وإزالة رقم جوالك، وإيقاف التنبيهات، أو طلب حذف حسابك وبياناتك في أي وقت."] },
  ],
};

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const { lang } = await params;
  return { title: isLocale(lang) ? getDictionary(lang).help.privacy : undefined };
}

export default async function PrivacyPage({ params }: PageProps<"/[lang]/privacy">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <ProsePage lang={lang} title={getDictionary(lang).help.privacy} sections={content[lang]} note={note[lang]} />;
}
