"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-bold">حدث خطأ · Something went wrong</h1>
      <button type="button" onClick={reset} className="btn-primary mt-6">
        حاول مجددًا · Try again
      </button>
    </div>
  );
}
