import Link from 'next/link';

/**
 * Root 404 page content.
 * Styled to fit seamlessly within whichever shell wrapped it.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <main className="max-w-md w-full text-center space-y-4">
        <div className="text-6xl font-extrabold opacity-20">404</div>
        <h1 className="text-2xl font-bold">الصفحة غير موجودة</h1>
        <p className="opacity-70 text-sm">
          لم نتمكن من العثور على الرابط المطلوب. ربما تم نقله أو حذفه.
        </p>
        <div className="pt-4 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black hover:opacity-90"
          >
            الرئيسية
          </Link>
          <Link
            href="/en"
            className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20"
          >
            English Home
          </Link>
        </div>
      </main>
    </div>
  );
}
