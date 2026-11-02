import type { ReactNode } from 'react';
import { localeDir, type SiteLocale } from '@/lib/site-locale';
import { fontVars } from '@/lib/fonts';

const BODY =
  'min-h-full flex flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100';

/**
 * The document shell.
 *
 * `lang` and `dir` have to be decided by the route tree that answers the request,
 * not by one global root: Arabic owns the bare path, English lives under `/en`.
 * A single root layout could only ever describe one of the two correctly, and an
 * English page declaring `<html lang="ar" dir="rtl">` is not a cosmetic slip --
 * crawlers index it as Arabic, screen readers pick an Arabic voice for English
 * text, and every `rtl:` style variant fires on the wrong pages.
 */
export default function HtmlShell({
  locale,
  children,
}: {
  locale: SiteLocale;
  children: ReactNode;
}) {
  return (
    <html lang={locale} dir={localeDir(locale)} className={fontVars}>
      <body className={BODY}>{children}</body>
    </html>
  );
}
