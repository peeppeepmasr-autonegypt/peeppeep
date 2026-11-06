import Link from 'next/link';
import type { ReactNode } from 'react';
import { localePath, type SiteLocale } from '@/lib/site-locale';
import PublicLanguageSwitch from '@/components/PublicLanguageSwitch';

export default function PublicSiteChrome({
  locale,
  children,
}: {
  locale: SiteLocale;
  children: ReactNode;
}) {
  const isAr = locale === 'ar';

  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="public-header-inner">
          <Link className="public-brand" href={localePath(locale, [])} aria-label={isAr ? 'أوتو بورتال' : 'AutoPortal'}>
            <span className="public-brand-mark" aria-hidden="true">{isAr ? 'أ' : 'A'}</span>
            <span className="public-brand-copy">
              <span className="public-brand-name">{isAr ? 'أوتو بورتال' : 'AutoPortal'}</span>
              <span className="public-brand-caption">{isAr ? 'دليل السيارات في مصر' : 'THE EGYPT AUTOMOTIVE EDITION'}</span>
            </span>
          </Link>

          <nav className="public-nav" aria-label={isAr ? 'التنقل الرئيسي' : 'Main navigation'}>
            <Link href={localePath(locale, ['cars'])}>{isAr ? 'المركبات' : 'Vehicles'}</Link>
            <Link href={localePath(locale, ['brands'])}>{isAr ? 'العلامات التجارية' : 'Brands'}</Link>
            <Link href={localePath(locale, ['blog'])}>{isAr ? 'المقالات' : 'Journal'}</Link>
          </nav>

          <div className="public-header-actions">
            <Link className="public-join-link" href="/join">
              {isAr ? 'للمعارض' : 'For dealers'}
            </Link>
            <PublicLanguageSwitch locale={locale} />
          </div>
        </div>
      </header>

      <div className="public-content">{children}</div>

      <footer className="public-footer">
        <div className="public-footer-inner">
          <div>
            <span className="public-footer-brand">{isAr ? 'أوتو بورتال' : 'AutoPortal'}</span>
            <p>{isAr ? 'مساحة واحدة لاكتشاف السيارات والمعارض في مصر.' : 'A considered way to discover cars and showrooms in Egypt.'}</p>
          </div>
          <nav aria-label={isAr ? 'روابط إضافية' : 'Additional links'}>
            <Link href="/join">{isAr ? 'انضم كمعرض' : 'List your showroom'}</Link>
            <Link href="/almostashar">{isAr ? 'المستشار' : 'Al-Mostashar'}</Link>
            <Link href="/admin" prefetch={false}>{isAr ? 'دخول الإدارة' : 'Admin'}</Link>
          </nav>
          <span className="public-footer-note">© {new Date().getFullYear()} {isAr ? 'أوتو بورتال' : 'AutoPortal'}</span>
        </div>
      </footer>
    </div>
  );
}
