/**
 * UnitView — the shared server renderer for a unit detail page.
 *
 * One component, two locales. Arabic owns the bare path (`/[seller]/u/[unit]`)
 * and English the prefixed one (`/en/[seller]/u/[unit]`); both call `loadUnit`
 * with their locale, then hand the same shape here. Copy is picked by locale
 * so a missing `title_ar` gracefully falls back to the Latin one — the same
 * rule `pick()` uses elsewhere.
 *
 * The offers panel is fetched here too. An offer is a MODEL-level claim, so a
 * unit only has offers when its `model_business_id` is set. When the model is
 * absent the panel simply does not render — that is honest, not a gap.
 */
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { localePath, localeDir, type SiteLocale } from '@/lib/site-locale';
import { listOffersForModel, type UnitPage, type PublicOffer } from '@/lib/units';
import { vehicleCategoryLabel } from '@/lib/unit-terms';
import GalleryCarousel from '@/components/GalleryCarousel';

const KIND_LABEL: Record<SiteLocale, Record<string, string>> = {
  ar: { new: 'جديد', used: 'مستعمل', demo: 'تجريبي', lease_return: 'إرجاع تأجير' },
  en: { new: 'New', used: 'Used', demo: 'Demo', lease_return: 'Lease return' },
};
const T = (locale: SiteLocale) => ({
  home: locale === 'ar' ? 'الرئيسية' : 'Home',
  vehicle: locale === 'ar' ? 'المركبة' : 'Vehicle',
  specs: locale === 'ar' ? 'المواصفات' : 'Specifications',
  priceHistory: locale === 'ar' ? 'سجل الأسعار' : 'Price history',
  points: (n: number) => (locale === 'ar' ? `${n} نقطة` : `${n} entries`),
  seller: locale === 'ar' ? 'يبيعها' : 'Sold by',
  visitShowroom: locale === 'ar' ? 'زيارة المعرض ↗' : 'Visit showroom ↗',
  similar: locale === 'ar' ? 'مركبات مشابهة' : 'Similar vehicles',
  trim: locale === 'ar' ? 'الفئة' : 'Trim',
  callPrice: locale === 'ar' ? 'السعر عند الاتصال' : 'Price on request',
  negotiable: locale === 'ar' ? '✓ قابل للتفاوض' : '✓ Negotiable',
  dropped: (n: string) => (locale === 'ar' ? `↓ انخفض من ${n}` : `↓ Down from ${n}`),
  rose: (n: string) => (locale === 'ar' ? `↑ ارتفع من ${n}` : `↑ Up from ${n}`),
  offersFor: locale === 'ar' ? 'أسعار هذا الموديل' : 'This model — published offers',
  official: locale === 'ar' ? 'رسمي' : 'Official',
  distributor: locale === 'ar' ? 'موزّع' : 'Distributor',
  dealer: locale === 'ar' ? 'تاجر' : 'Dealer',
  broker: locale === 'ar' ? 'وسيط' : 'Broker',
  from: locale === 'ar' ? 'يبدأ من' : 'From',
  km: locale === 'ar' ? 'كم' : 'km',
  browseAll: locale === 'ar' ? 'تصفّح كل المركبات ←' : 'Browse all vehicles →',
});

function authorityLabel(t: ReturnType<typeof T>, a: string): string {
  if (a === 'agency_official') return t.official;
  if (a === 'distributor') return t.distributor;
  if (a === 'dealer') return t.dealer;
  return t.broker;
}

async function offersFor(modelId: string | null): Promise<PublicOffer[]> {
  if (!modelId) return [];
  return listOffersForModel(modelId);
}

export default async function UnitView({ page, locale }: { page: UnitPage; locale: SiteLocale }) {
  const { unit, seller, model, trim, price, values, history, siblings, contact, reading } = page;
  const t = T(locale);
  const dir = localeDir(locale);
  const dateLocale = locale === 'ar' ? 'ar-EG' : 'en-EG';
  const offers = await offersFor(model?.id ?? null);
  const carouselShelf = reading.shelves.find((shelf) => shelf.slides.length > 0);
  const carouselSection = carouselShelf
    ? reading.sections.find((section) => section.id === carouselShelf.section.id)
    : null;
  const siteStyle = {
    '--gold': page.siteProfile.accentColor,
    '--signal': page.siteProfile.accentColor,
    '--page': page.siteProfile.backgroundColor,
  } as CSSProperties;
  const formatPrice = (amount: number) => new Intl.NumberFormat(dateLocale, {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(amount);
  const sourceLabel = (source: string) => locale === 'ar'
    ? ({
        agency_price_list: 'قائمة الوكيل الرسمي',
        dealer_listing: 'سعر المعرض',
        broker_listing: 'سعر الوسيط',
        portal: 'إعلان على المنصة',
        news: 'سعر منشور بالأخبار',
        bank_valuation: 'تقييم بنكي',
      }[source] ?? '')
    : source.replace(/_/g, ' ');
  const localizedSpecValue = (sectionId: string, key: string, value: unknown): string | null => {
    if (typeof value === 'number') return value.toLocaleString(dateLocale);
    if (value == null || value === '' || key.endsWith('_ar')) return null;
    const sectionValues = values[sectionId] ?? {};
    const arabicValue = locale === 'ar' ? sectionValues[`${key}_ar`] : undefined;
    const text = String(arabicValue ?? value);
    if (locale === 'ar' && /[A-Za-z]/.test(text) && !/[\u0600-\u06FF]/.test(text)) return null;
    if (locale === 'en' && /[\u0600-\u06FF]/.test(text)) return null;
    return text;
  };
  const fieldLabel = (sectionId: string, key: string) => {
    const section = reading.shelves.find((shelf) => shelf.section.id === sectionId);
    const field = section?.groups.flatMap((group) => group.fields).find((item) => item.name === key);
    return field?.label || (locale === 'ar' ? '' : key.replace(/_/g, ' '));
  };
  const sectionLabel = (sectionId: string) => {
    const section = reading.sections.find((item) => item.id === sectionId);
    if (locale === 'en') return section?.name || 'Specifications';
    const known: Record<string, string> = {
      sec_auto_specs: 'المواصفات الفنية',
      sec_auto_inventory: 'تفاصيل المركبة',
      sec_auto_exterior: 'التصميم الخارجي',
    };
    return section?.name_ar || known[sectionId] || 'المواصفات';
  };

  const nameOf = (x: { name: string; name_ar: string | null } | null) =>
    x ? (locale === 'ar' ? (x.name_ar?.trim() || 'غير محدد') : x.name) : '';

  return (
    <main
      dir={dir}
      className={`unit-page catalog-page minisite-template minisite-template--${page.siteProfile.layout}`}
      data-template={page.siteProfile.layout}
      style={siteStyle}
    >
      {/* Breadcrumb */}
      <nav className="catalog-breadcrumb">
        <Link href={localePath(locale, [])} className="hover:underline">{t.home}</Link>
        <span>/</span>
        <Link href={localePath(locale, [seller.slug])} className="hover:underline">{nameOf(seller)}</Link>
        {model && (
          <>
            <span>/</span>
            <Link href={localePath(locale, [model.slug])} className="hover:underline">{nameOf(model)}</Link>
          </>
        )}
        <span>/</span>
        <span className="font-bold">{locale === 'ar' ? (unit.title_ar || t.vehicle) : unit.title}</span>
      </nav>

      {/* Header */}
      <header className="catalog-heading space-y-3">
        <h1>
          {locale === 'ar' ? (unit.title_ar || t.vehicle) : unit.title}
        </h1>
        <div className="flex flex-wrap gap-2">
          <span className="unit-tag">{vehicleCategoryLabel(unit.vehicle_category, locale === 'ar')}</span>
          <span className="unit-tag unit-tag--gold">
            {KIND_LABEL[locale][unit.unit_kind] ?? unit.unit_kind}
          </span>
          {unit.year && <span className="unit-tag">{unit.year}</span>}
          {locale === 'ar' && unit.color_ar && (
            <span className="unit-tag">{unit.color_ar}</span>
          )}
          {locale === 'en' && unit.color && (
            <span className="unit-tag">{unit.color}</span>
          )}
          {unit.mileage_km != null && unit.mileage_km > 0 && (
            <span className="unit-tag">
              {unit.mileage_km.toLocaleString()} {t.km}
            </span>
          )}
        </div>
      </header>

      {page.siteProfile.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={page.siteProfile.logoUrl} alt="" className="mb-4 max-h-16 max-w-40 object-contain" />
      ) : null}

      {carouselShelf ? (
        <section className="panel panel--hero">
          <GalleryCarousel
            slides={carouselShelf.slides}
            locale={locale}
            label={locale === 'ar' ? 'معرض صور المركبة' : 'Vehicle carousel'}
            defaults={carouselSection?.options.carousel ?? {}}
            fieldsIndex={reading.fieldsIndex}
            brand={nameOf(model) || nameOf(seller)}
            slug={seller.slug}
          />
        </section>
      ) : null}

      {/* Price Plate */}
      <section className="unit-price-plate p-5 space-y-2">
        <div className="unit-price-value text-3xl font-bold">
          {price.priceEgp ? formatPrice(price.priceEgp) : t.callPrice}
        </div>
        {price.negotiable && (
          <span className="unit-tag unit-tag--gold">{t.negotiable}</span>
        )}
        {price.said && (
          <div className="text-xs opacity-60 mt-1">
            {(locale === 'ar' ? price.said.labelAr : price.said.label)} · {new Date(price.said.capturedAt).toLocaleDateString(dateLocale)}
          </div>
        )}
        {price.movement && (
          <div className={`text-xs font-bold mt-1 ${price.movement.deltaEgp < 0 ? 'text-green-600' : 'text-red-500'}`}>
            {price.movement.deltaEgp < 0
              ? t.dropped(price.movement.fromEgp.toLocaleString())
              : t.rose(price.movement.fromEgp.toLocaleString())}
          </div>
        )}
      </section>

      {unit.vin && <div className="text-xs font-mono opacity-40">{locale === 'ar' ? 'رقم الشاسيه:' : 'VIN:'} {unit.vin}</div>}

      {/* Specs */}
      {Object.entries(values).length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold">{t.specs}</h2>
          {Object.entries(values).map(([sectionId, fields]) => {
            if (!fields || typeof fields !== 'object' || Object.keys(fields).length === 0) return null;
            return (
              <div key={sectionId} className="unit-info-card p-4 space-y-2">
                <div className="text-xs font-bold opacity-50 uppercase">{sectionLabel(sectionId)}</div>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                  {Object.entries(fields).map(([k, v]) => {
                    const value = localizedSpecValue(sectionId, k, v);
                    const label = fieldLabel(sectionId, k);
                    return value !== null && label ? (
                      <div key={k}>
                        <dt className="text-[11px] opacity-50">{label}</dt>
                        <dd className="font-semibold">{value}</dd>
                      </div>
                    ) : null;
                  })}
                </dl>
              </div>
            );
          })}
        </section>
      )}

      {/* Published offers for the same model */}
      {offers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">{t.offersFor}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {offers.map((o) => (
              <div key={o.id} className="unit-info-card p-4 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="unit-tag">
                    {authorityLabel(t, o.authority)}
                  </span>
                  {(o.trim || o.unitKind) && (
                    <span className="text-[11px] opacity-60">
                      {locale === 'ar'
                        ? (KIND_LABEL.ar[o.unitKind] ?? '')
                        : [o.trim, KIND_LABEL.en[o.unitKind] ?? o.unitKind].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold">
                  {o.priceFromEgp ? `${t.from} ${formatPrice(o.priceFromEgp)}` : '—'}
                </div>
                <Link
                  href={localePath(locale, [o.sellerSlug])}
                  className="text-xs opacity-70 hover:underline"
                >
                  {locale === 'ar' ? (o.sellerNameAr || 'البائع') : o.sellerName}
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Price history */}
      {history.length > 1 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold opacity-60 hover:opacity-100">
            {t.priceHistory} ({t.points(history.length)})
          </summary>
          <ul className="mt-2 space-y-1 text-xs">
            {history.map((p, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-mono opacity-40">{new Date(p.capturedAt).toLocaleDateString(dateLocale)}</span>
                <span className="font-bold">{formatPrice(p.priceEgp)}</span>
                <span className="opacity-50">{sourceLabel(p.sourceType)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Seller card */}
      <section className="unit-info-card p-5 space-y-3">
        <div className="text-xs font-bold opacity-50">{t.seller}</div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link href={localePath(locale, [seller.slug])} className="text-lg font-bold hover:underline">{nameOf(seller)}</Link>
            {contact?.phone ? <div className="text-xs opacity-60 mt-1">📞 {String(contact.phone)}</div> : null}
            {contact?.whatsapp ? <div className="text-xs opacity-60">💬 {locale === 'ar' ? 'واتساب' : 'WhatsApp'}: {String(contact.whatsapp)}</div> : null}
          </div>
          <Link
            href={localePath(locale, [seller.slug])}
            className="unit-primary-link"
          >
            {t.visitShowroom}
          </Link>
        </div>
      </section>

      {trim && (
        <div className="text-xs opacity-50">
          {t.trim}:{' '}
          <Link href={localePath(locale, [trim.slug])} className="hover:underline font-semibold">{nameOf(trim)}</Link>
        </div>
      )}

      {/* Siblings */}
      {siblings.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold opacity-70">{t.similar}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {siblings.map((sib) => (
              <Link
                key={sib.id}
                href={sib.href}
                className="unit-info-card block p-4 space-y-1"
              >
                <div className="font-bold text-sm">{sib.title}</div>
                <div className="text-xs opacity-60 flex gap-3">
                  {sib.year && <span>{sib.year}</span>}
                  {sib.priceEgp && <span className="text-[var(--gold-deep)] font-semibold">{formatPrice(sib.priceEgp)}</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="catalog-breadcrumb">
        <Link href={localePath(locale, ['cars'])}>
          {t.browseAll}
        </Link>
      </div>
    </main>
  );
}
