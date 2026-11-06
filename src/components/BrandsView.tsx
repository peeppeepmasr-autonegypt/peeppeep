/**
 * BrandsView — the public A→Z brand directory.
 *
 * Only brands with at least one live unit appear. Each tile counts the visible
 * stock, so a brand whose showrooms have not published anything is silently
 * excluded — which is honest: the directory is a shopping shortcut, not a
 * business registry.
 */
import Link from 'next/link';
import { listBrands } from '@/lib/units';
import { localePath, localeDir, type SiteLocale } from '@/lib/site-locale';

export default async function BrandsView({ locale }: { locale: SiteLocale }) {
  const brands = await listBrands(locale);
  const dir = localeDir(locale);
  const title = locale === 'ar' ? 'دليل العلامات التجارية' : 'Brand directory';
  const subtitle = locale === 'ar'
    ? 'كل العلامات المتاحة بمخزون منشور'
    : 'Every brand with live published stock';
  const carsLabel = locale === 'ar' ? 'مركبة' : 'vehicles';
  const browse = locale === 'ar' ? 'تصفّح كل المركبات ←' : 'Browse all vehicles →';
  const home = locale === 'ar' ? 'الرئيسية' : 'Home';

  return (
    <main dir={dir} className="brand-directory-page">
      <nav className="catalog-breadcrumb">
        <Link href={localePath(locale, [])}>{home}</Link>
        <span>/</span>
        <span>{title}</span>
      </nav>

      <header className="brand-directory-heading">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </header>

      {brands.length === 0 ? (
        <p className="public-empty-state">{locale === 'ar' ? 'لا توجد علامات منشورة بعد.' : 'No brands with live stock yet.'}</p>
      ) : (
        <ul className="brand-directory-grid">
          {brands.map((b) => (
            <li key={b.slug}>
              <Link
                href={localePath(locale, [b.slug])}
                className="brand-directory-card"
              >
                <div className="brand-directory-card-name">{b.name}</div>
                <div className="brand-directory-card-count">{b.count} {carsLabel}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="catalog-breadcrumb">
        <Link href={localePath(locale, ['cars'])}>{browse}</Link>
      </div>
    </main>
  );
}
