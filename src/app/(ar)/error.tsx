'use client';

import Link from 'next/link';

export default function ArabicError({ reset }: { reset: () => void }) {
  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
      <div className="text-5xl">⚠️</div>
      <h1 className="text-2xl font-bold">حدث خطأ غير متوقع</h1>
      <p className="text-sm opacity-70">
        لم نتمكن من تحميل هذه الصفحة. جرّب مرة أخرى أو عد إلى الصفحة الرئيسية.
      </p>
      <div className="flex justify-center gap-3 pt-2">
        <button
          onClick={reset}
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm"
        >
          إعادة المحاولة
        </button>
        <Link href="/" className="px-5 py-2 rounded-lg border border-black/15 dark:border-white/15 text-sm font-bold">
          الرئيسية
        </Link>
      </div>
    </div>
  );
}
