'use client';

import Link from 'next/link';

export default function EnglishError({ reset }: { reset: () => void }) {
  return (
    <div dir="ltr" className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
      <div className="text-5xl">⚠️</div>
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-sm opacity-70">
        We could not load this page. Try again or return to the home page.
      </p>
      <div className="flex justify-center gap-3 pt-2">
        <button
          onClick={reset}
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm"
        >
          Retry
        </button>
        <Link href="/en" className="px-5 py-2 rounded-lg border border-black/15 dark:border-white/15 text-sm font-bold">
          Home
        </Link>
      </div>
    </div>
  );
}
