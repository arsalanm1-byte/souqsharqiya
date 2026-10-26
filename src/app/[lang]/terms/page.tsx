import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { ProsePage, type ProseSection } from "@/components/prose-page";

const note: Record<Locale, string> = {
  en: "Draft for the MVP. Have it reviewed by a Saudi lawyer before launch.",
  ar: "مسودة للنسخة الأولى. يجب مراجعتها من محامٍ سعودي قبل الإطلاق.",
};

const content: Record<Locale, ProseSection[]> = {
  en: [
    { paragraphs: ["Souq Sharqiya is a free classifieds platform. We are not a party to any deal between users and do not handle payments, deliveries or transfers."] },
    { heading: "Posting", paragraphs: ["Post only items, properties and jobs you are entitled to offer, in the right category, with a true description and price. Property ads must follow REGA rules, including an ad licence number where required. Ads run for 30 days and can be renewed."] },
    { heading: "Not allowed", paragraphs: ["Anything illegal in Saudi Arabia, including weapons, drugs, alcohol, counterfeit goods, and the sale of visas or iqamas; misleading or duplicate ads; and harassment or spam in messages."] },
    { heading: "Moderation", paragraphs: ["We may review, edit, reject or remove ads and suspend accounts that break these terms. Ratings must reflect a real deal."] },
    { heading: "Sponsored links", paragraphs: ["Some electronics ads show a reference price from Cartlow. This is an affiliate link marked “Sponsored link”, and we may earn a commission if you buy through it."] },
  ],
  ar: [
    { paragraphs: ["سوق الشرقية منصة إعلانات مبوبة مجانية. لسنا طرفًا في أي صفقة بين المستخدمين، ولا نتعامل مع المدفوعات أو التوصيل أو نقل الملكية."] },
    { heading: "النشر", paragraphs: ["انشر فقط ما يحق لك عرضه من سلع وعقارات ووظائف، في القسم الصحيح، بوصف وسعر صحيحين. يجب أن تلتزم إعلانات العقار بأنظمة الهيئة العامة للعقار، بما في ذلك رقم ترخيص الإعلان عند الحاجة. تبقى الإعلانات 30 يومًا ويمكن تجديدها."] },
    { heading: "الممنوعات", paragraphs: ["كل ما يخالف أنظمة المملكة، ومنها الأسلحة والمخدرات والكحول والبضائع المقلدة وبيع التأشيرات أو الإقامات؛ والإعلانات المضللة أو المكررة؛ والإزعاج أو الرسائل المزعجة."] },
    { heading: "الإشراف", paragraphs: ["يحق لنا مراجعة الإعلانات أو تعديلها أو رفضها أو حذفها، وإيقاف الحسابات المخالفة. يجب أن تعكس التقييمات صفقة حقيقية."] },
    { heading: "الروابط الإعلانية", paragraphs: ["تعرض بعض إعلانات الإلكترونيات سعرًا مرجعيًا من كارتلو. هذا رابط إحالة موسوم «رابط إعلاني»، وقد نحصل على عمولة إذا اشتريت من خلاله."] },
  ],
};

export async function generateMetadata({ params }: PageProps<"/[lang]/terms">): Promise<Metadata> {
  const { lang } = await params;
  return { title: isLocale(lang) ? getDictionary(lang).help.terms : undefined };
}

export default async function TermsPage({ params }: PageProps<"/[lang]/terms">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <ProsePage lang={lang} title={getDictionary(lang).help.terms} sections={content[lang]} note={note[lang]} />;
}
