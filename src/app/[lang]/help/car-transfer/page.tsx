import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { ProsePage, type ProseSection } from "@/components/prose-page";

const content: Record<Locale, ProseSection[]> = {
  en: [
    { paragraphs: ["Souq Sharqiya does not handle car payments or transfers. Ownership is transferred online through Absher (Ministry of Interior), usually in a few minutes once both parties agree."] },
    {
      heading: "Before you pay",
      paragraphs: [
        "Meet in a public place and inspect the car in daylight, ideally with a mechanic or at an inspection centre.",
        "Check the Istimara (registration) and that the seller's name matches it. Ask for the service history.",
        "Check for unpaid traffic violations: they must be settled before the transfer can be completed.",
        "Make sure the car has valid insurance; the buyer needs insurance in their name before the transfer.",
      ],
    },
    {
      heading: "Transferring ownership",
      paragraphs: [
        "The seller starts the sale in Absher (Vehicles → Vehicle ownership transfer), enters the buyer's ID number and the agreed price, and pays the transfer fee.",
        "The buyer accepts the request in their own Absher account within the time limit.",
        "Pay only once the transfer request is in progress, using a traceable method such as a bank transfer. Never pay a deposit in advance to someone you have not met.",
        "After the transfer, mark the ad as sold on Souq Sharqiya and rate each other.",
      ],
    },
  ],
  ar: [
    { paragraphs: ["لا يتعامل سوق الشرقية مع مدفوعات السيارات أو نقل ملكيتها. يتم نقل الملكية إلكترونيًا عبر منصة أبشر (وزارة الداخلية)، وعادةً خلال دقائق بعد اتفاق الطرفين."] },
    {
      heading: "قبل الدفع",
      paragraphs: [
        "قابل البائع في مكان عام وافحص السيارة في النهار، ويفضل مع ميكانيكي أو في مركز فحص.",
        "تحقق من الاستمارة وأن اسم البائع مطابق لها، واطلب سجل الصيانة.",
        "تحقق من عدم وجود مخالفات مرورية غير مسددة، فلا يكتمل النقل قبل سدادها.",
        "تأكد من وجود تأمين ساري؛ يحتاج المشتري إلى تأمين باسمه قبل نقل الملكية.",
      ],
    },
    {
      heading: "نقل الملكية",
      paragraphs: [
        "يبدأ البائع عملية البيع في أبشر (المركبات ← نقل ملكية مركبة)، ويدخل رقم هوية المشتري والسعر المتفق عليه، ويدفع رسوم النقل.",
        "يقبل المشتري الطلب من حسابه في أبشر خلال المدة المحددة.",
        "ادفع فقط بعد بدء طلب النقل، وبطريقة يمكن تتبعها مثل التحويل البنكي. لا تدفع عربونًا مقدمًا لشخص لم تقابله.",
        "بعد النقل، علّم الإعلان كمُباع في سوق الشرقية وقيّما بعضكما.",
      ],
    },
  ],
};

export async function generateMetadata({ params }: PageProps<"/[lang]/help/car-transfer">): Promise<Metadata> {
  const { lang } = await params;
  return { title: isLocale(lang) ? getDictionary(lang).help.carTransferTitle : undefined };
}

export default async function CarTransferPage({ params }: PageProps<"/[lang]/help/car-transfer">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <ProsePage lang={lang} title={getDictionary(lang).help.carTransferTitle} sections={content[lang]} />;
}
