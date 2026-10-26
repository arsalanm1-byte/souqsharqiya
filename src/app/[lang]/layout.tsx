import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "../globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { dirFor, isLocale, locales } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { siteUrl } from "@/lib/email";

const plex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${t.site.name} | ${t.site.tagline}`, template: `%s | ${t.site.name}` },
    description: t.site.description,
    alternates: { languages: { ar: "/ar", en: "/en" } },
    openGraph: { siteName: t.site.name, locale: lang === "ar" ? "ar_SA" : "en_SA", type: "website" },
  };
}

export const viewport: Viewport = { themeColor: "#0b7765" };

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <html lang={lang} dir={dirFor(lang)} className={`${plex.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header lang={lang} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
        <Footer lang={lang} />
      </body>
    </html>
  );
}
