/**
 * CarsView — the public /cars browse page.
 *
 * Server component. Parses `searchParams` into a `SearchOpts`, runs the
 * catalog query, and renders: a facet rail, a filter form (plain HTML GET so
 * it works before hydration), the result grid, and pagination.
 *
 * Route wrappers:
 *   /(ar)/cars/page.tsx  → <CarsView locale="ar" .../>
 *   /en/cars/page.tsx    → <CarsView locale="en" .../>
 *
 * Every filter is additive and every unset filter is invisible in the WHERE
 * clause. The `q` free-text goes across title / title_ar / seller name.
 */
import Link from 'next/link';
import { searchUnits, catalogFacets, type SearchOpts } from '@/lib/units';
import { localePath, localeDir, type SiteLocale } from '@/lib/site-locale';
import { VEHICLE_CATEGORIES, vehicleCategoryLabel } from '@/lib/unit-terms';

export interface CarsSearchParams {
  brand?: string;
  model?: string;
  kind?: string;
  category?: string;
  seller_type?: string;
  year_from?: string;
  year_to?: string;
  price_from?: string;
  price_to?: string;
  q?: string;
  sort?: string;
  page?: string;
}

const PAGE_SIZE = 24;

const SELLER_TYPE_LABEL: Record<SiteLocale, Record<string, string>> = {
  ar: {
    showroom: 'معرض',
    used_car_dealer: 'تاجر مستعمل',
    agent_broker: 'وسيط',
    distributor: 'موزّع',
    main_agency: 'وكالة رئيسية',
  },
  en: {
    showroom: 'Showroom',
    used_car_dealer: 'Used-car dealer',
    agent_broker: 'Broker',
    distributor: 'Distributor',
    main_agency: 'Main agency',
  },
};
const KIND_LABEL: Record<SiteLocale, Record<string, string>> = {
  ar: { new: 'جديد', used: 'مستعمل', demo: 'تجريبي', lease_return: 'إرجاع تأجير' },
  en: { new: 'New', used: 'Used', demo: 'Demo', lease_return: 'Lease return' },
};

function num(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
function str(v: string | undefined): string | undefined {
  return v && v.trim() ? v.trim() : undefined;
}

function toOpts(p: CarsSearchParams, locale: SiteLocale, page: number): SearchOpts {
  return {
    locale,
    brand: str(p.brand),
    model: str(p.model),
    kind: str(p.kind),
    category: str(p.category),
    sellerType: str(p.seller_type),
    yearFrom: num(p.year_from),
    yearTo: num(p.year_to),
    priceFrom: num(p.price_from),
    priceTo: num(p.price_to),
    q: str(p.q),
    sort: (p.sort as SearchOpts['sort']) ?? 'recent',
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };
}

const T = (locale: SiteLocale) => ({
  title: locale === 'ar' ? 'تصفّح المركبات' : 'Browse vehicles',
  resultsCount: (n: number) => (locale === 'ar' ? `${n.toLocaleString('ar-EG')} نتيجة` : `${n.toLocaleString()} results`),
  empty: locale === 'ar' ? 'لا توجد مركبات مطابقة للفلاتر.' : 'No vehicles match these filters.',
  clearAll: locale === 'ar' ? 'مسح الكل' : 'Clear all',
  apply: locale === 'ar' ? 'تطبيق' : 'Apply',
  brand: locale === 'ar' ? 'العلامة' : 'Brand',
  allBrands: locale === 'ar' ? 'كل العلامات' : 'All brands',
  kind: locale === 'ar' ? 'الحالة' : 'Condition',
  allKinds: locale === 'ar' ? 'الكل' : 'All',
  category: locale === 'ar' ? 'نوع المركبة' : 'Vehicle type',
  allCategories: locale === 'ar' ? 'كل المركبات' : 'All vehicles',
  sellerType: locale === 'ar' ? 'نوع البائع' : 'Seller type',
  allSellers: locale === 'ar' ? 'كل الأنواع' : 'All types',
  yearRange: locale === 'ar' ? 'سنة الصنع' : 'Model year',
  priceRange: locale === 'ar' ? 'السعر (ج.م)' : 'Price (EGP)',
  search: locale === 'ar' ? 'كلمة بحث' : 'Search',
  searchPlaceholder: locale === 'ar' ? 'مثال: مركبة 2022' : 'e.g. BMW X5 2022',
  sort: locale === 'ar' ? 'الترتيب' : 'Sort',
  sortRecent: locale === 'ar' ? 'الأحدث' : 'Most recent',
  sortPriceAsc: locale === 'ar' ? 'السعر ↑' : 'Price ↑',
  sortPriceDesc: locale === 'ar' ? 'السعر ↓' : 'Price ↓',
  sortYearDesc: locale === 'ar' ? 'السنة ↓' : 'Year ↓',
  sortMileageAsc: locale === 'ar' ? 'أقل كيلومترات' : 'Lowest mileage',
  prev: locale === 'ar' ? 'السابق' : 'Previous',
  next: locale === 'ar' ? 'التالي' : 'Next',
  page: (n: number) => (locale === 'ar' ? `صفحة ${n}` : `Page ${n}`),
  callPrice: locale === 'ar' ? 'السعر عند الاتصال' : 'Price on request',
  from: locale === 'ar' ? 'من' : 'From',
  to: locale === 'ar' ? 'إلى' : 'To',
  home: locale === 'ar' ? 'الرئيسية' : 'Home',
  brands: locale === 'ar' ? 'العلامات' : 'Brands',
  km: locale === 'ar' ? 'كم' : 'km',
  viewAllBrands: locale === 'ar' ? 'دليل العلامات ←' : 'Brand directory →',
});

function qs(p: CarsSearchParams, over: Record<string, string | undefined>): string {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) if (v) merged[k] = String(v);
  for (const [k, v] of Object.entries(over)) {
    if (v === undefined || v === '') delete merged[k];
    else merged[k] = v;
  }
  const q = new URLSearchParams(merged).toString();
  return q ? `?${q}` : '';
}

export default async function CarsView({
  locale,
  searchParams,
}: {
  locale: SiteLocale;
  searchParams: CarsSearchParams;
}) {
  const t = T(locale);
  const dir = localeDir(locale);
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const opts = toOpts(searchParams, locale, page);
  const [{ cards, total }, facets] = await Promise.all([
    searchUnits(opts),
    catalogFacets(locale),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const inputCls = 'catalog-input';
  const labelCls = 'catalog-label';

  return (
    <main dir={dir} className="catalog-page">
      {/* Header */}
      <header className="catalog-heading">
        <nav className="catalog-breadcrumb">
          <Link href={localePath(locale, [])} className="hover:underline">{t.home}</Link>
          <span>/</span>
          <span className="font-bold">{t.title}</span>
        </nav>
        <h1>{t.title}</h1>
        <p>{locale === 'ar' ? 'استخدم الفلاتر للوصول إلى المركبة المناسبة لك.' : 'Use the filters to find the right vehicle for you.'}</p>
      </header>
      <div className="catalog-result-count">{t.resultsCount(total)}</div>

      {/* Filter form (GET so it works without JS) */}
      <form method="GET" className="catalog-filter-panel">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div>
            <label className={labelCls}>{t.brand}</label>
            <select name="brand" defaultValue={searchParams.brand ?? ''} className={inputCls}>
              <option value="">{t.allBrands}</option>
              {facets.brands.map((b) => (
                <option key={b.slug} value={b.slug}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>{t.kind}</label>
            <select name="kind" defaultValue={searchParams.kind ?? ''} className={inputCls}>
              <option value="">{t.allKinds}</option>
              {facets.kinds.map((k) => (
                <option key={k} value={k}>{KIND_LABEL[locale][k] ?? k}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>{t.category}</label>
            <select name="category" defaultValue={searchParams.category ?? ''} className={inputCls}>
              <option value="">{t.allCategories}</option>
              {VEHICLE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {vehicleCategoryLabel(category, locale === 'ar')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>{t.sellerType}</label>
            <select name="seller_type" defaultValue={searchParams.seller_type ?? ''} className={inputCls}>
              <option value="">{t.allSellers}</option>
              {facets.sellerTypes.map((s) => (
                <option key={s} value={s}>{SELLER_TYPE_LABEL[locale][s] ?? s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>{t.yearRange}</label>
            <div className="flex gap-1">
              <input type="number" name="year_from" placeholder={facets.yearMin ? String(facets.yearMin) : '—'} defaultValue={searchParams.year_from ?? ''} className={inputCls} />
              <input type="number" name="year_to" placeholder={facets.yearMax ? String(facets.yearMax) : '—'} defaultValue={searchParams.year_to ?? ''} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>{t.priceRange}</label>
            <div className="flex gap-1">
              <input type="number" name="price_from" placeholder={t.from} defaultValue={searchParams.price_from ?? ''} className={inputCls} />
              <input type="number" name="price_to" placeholder={t.to} defaultValue={searchParams.price_to ?? ''} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>{t.search}</label>
            <input type="search" name="q" placeholder={t.searchPlaceholder} defaultValue={searchParams.q ?? ''} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>{t.sort}</label>
            <select name="sort" defaultValue={searchParams.sort ?? 'recent'} className={inputCls}>
              <option value="recent">{t.sortRecent}</option>
              <option value="price_asc">{t.sortPriceAsc}</option>
              <option value="price_desc">{t.sortPriceDesc}</option>
              <option value="year_desc">{t.sortYearDesc}</option>
              <option value="mileage_asc">{t.sortMileageAsc}</option>
            </select>
          </div>

          <div className="col-span-2 sm:col-span-3 lg:col-span-5 flex items-end gap-2">
            <button type="submit" className="catalog-submit">
              {t.apply}
            </button>
            <Link href={localePath(locale, ['cars'])} className="catalog-clear">
              {t.clearAll}
            </Link>
          </div>
        </div>
        {/* Preserve page=1 on new filter submit */}
        <input type="hidden" name="page" value="1" />
      </form>

      {/* Result grid */}
      {cards.length === 0 ? (
        <div className="public-empty-state">
          <div className="text-4xl mb-2">🔍</div>
          <div className="font-bold">{t.empty}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Link
              key={c.id}
              href={c.href}
              className="car-card"
            >
              <div className="car-card-media">
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt={c.title} className="car-card-image" />
                ) : (
                  <div className="car-card-placeholder" aria-hidden="true">A</div>
                )}
              </div>
              <div className="car-card-body">
                <div className="car-card-meta">
                  {c.brandName && <span>{c.brandName}</span>}
                  {c.brandName && <span>·</span>}
                  <span>{vehicleCategoryLabel(c.vehicleCategory, locale === 'ar')}</span>
                  <span>·</span>
                  <span>{KIND_LABEL[locale][c.unitKind] ?? c.unitKind}</span>
                </div>
                <div className="car-card-title line-clamp-2">{c.title}</div>
                <div className="car-card-details">
                  <span>{c.year ?? '—'}{c.mileageKm ? ` · ${c.mileageKm.toLocaleString()} ${t.km}` : ''}</span>
                  <span>{c.sellerName}</span>
                </div>
                <div className="car-card-price">
                  {c.priceEgp ? `${c.priceEgp.toLocaleString()} ${c.currency}` : t.callPrice}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="catalog-pagination">
          {page > 1 && (
            <Link href={`${localePath(locale, ['cars'])}${qs(searchParams, { page: String(page - 1) })}`}>
              ← {t.prev}
            </Link>
          )}
          <span className="text-sm opacity-70 mx-4">{t.page(page)} / {totalPages}</span>
          {page < totalPages && (
            <Link href={`${localePath(locale, ['cars'])}${qs(searchParams, { page: String(page + 1) })}`}>
              {t.next} →
            </Link>
          )}
        </nav>
      )}

      <div className="catalog-breadcrumb">
        <Link href={localePath(locale, ['brands'])} className="hover:underline font-bold">{t.viewAllBrands}</Link>
        <span>·</span>
        <Link href={localePath(locale, [])} className="hover:underline">{t.home}</Link>
      </div>
    </main>
  );
}
