import Link from "next/link";

// Rendered inside [lang]/layout; the language is not known here, so both are shown.
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-5xl">🧭</p>
      <h1 className="mt-4 text-2xl font-bold">الصفحة غير موجودة · Page not found</h1>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/ar" className="btn-primary">الرئيسية</Link>
        <Link href="/en" className="btn-secondary">Home</Link>
      </div>
    </div>
  );
}
