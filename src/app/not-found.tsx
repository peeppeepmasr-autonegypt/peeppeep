import Link from 'next/link';
import HtmlShell from '@/components/HtmlShell';
import { DEFAULT_LOCALE } from '@/lib/site-locale';

/**
 * Root 404. The root layout is a passthrough, so this page owns the document
 * shell -- Arabic is the market language and the bare path, so it speaks for the
 * miss, with the English home offered beside it.
 */
export default function NotFound() {
  return (
    <HtmlShell locale={DEFAULT_LOCALE}>
      <main className="max-w-2xl mx-auto px-6 py-24 text-center">
        <div className="text-6xl font-bold opacity-20">404</div>
        <h1 className="text-2xl font-semibold mt-4">الصفحة غير موجودة</h1>
        <p className="opacity-70 mt-2">Page not found.</p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/" className="rounded-md bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black">
            الرئيسية
          </Link>
          <Link href="/en" className="rounded-md border border-black/20 px-4 py-2 text-sm">
            English home
          </Link>
        </div>
      </main>
    </HtmlShell>
  );
}
