/**
 * Home listing — links to the published root minisites.
 * Shared by the Arabic (bare `/`) and English (`/en`) home pages.
 */
import { localePath, localeDir, type SiteLocale } from '@/lib/site-locale';
import type { FeaturedItem } from '@/lib/minisite';

export default function HomeListing({
  locale,
  items,
}: {
  locale: SiteLocale;
  items: FeaturedItem[];
}) {
  const dir = localeDir(locale);
  const title = locale === 'ar' ? 'بوابة السيارات' : 'AutoPortal';
  const subtitle =
    locale === 'ar'
      ? 'دليل سيارات ثنائي اللغة على Cloudflare D1'
      : 'A bilingual automotive directory on Cloudflare D1';
  const brandsHeading = locale === 'ar' ? 'العلامات والمعارض' : 'Brands & dealers';
  const empty = locale === 'ar' ? 'لا توجد علامات بعد.' : 'No brands yet.';

  return (
    <div dir={dir} lang={locale} className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="opacity-70 mt-1">{subtitle}</p>
        </header>

        <nav className="mb-6 flex gap-4 text-sm">
          <a
            href={localePath('ar', [])}
            className={locale === 'ar' ? 'font-semibold underline' : 'opacity-70 hover:underline'}
          >
            العربية
          </a>
          <a
            href={localePath('en', [])}
            className={locale === 'en' ? 'font-semibold underline' : 'opacity-70 hover:underline'}
          >
            English
          </a>
        </nav>

        {items.length ? (
          <>
            <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60 mb-3">{brandsHeading}</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((it) => (
                <li key={it.id}>
                  <a
                    href={localePath(locale, [it.slug])}
                    className="block rounded-lg border border-black/10 dark:border-white/15 p-4 hover:bg-black/[.03] dark:hover:bg-white/[.05]"
                  >
                    <div className="text-xs uppercase tracking-wide opacity-60">
                      {locale === 'ar' ? (it.typeName_ar?.trim() || it.typeName) : it.typeName ?? ''}
                    </div>
                    <div className="font-semibold mt-0.5">
                      {locale === 'ar' ? (it.name_ar?.trim() || it.name) : it.name}
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="opacity-60">{empty}</p>
        )}
      </div>
    </div>
  );
}
