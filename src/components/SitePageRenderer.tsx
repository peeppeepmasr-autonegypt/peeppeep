import { query } from '@/lib/db';
import { unitsByModel, listOffersForModel } from '@/lib/units';
import type { MinisiteView, Slide } from '@/lib/minisite';
import { localePath } from '@/lib/site-locale';
import GalleryCarousel from '@/components/GalleryCarousel';
import FinanceCalculator from '@/components/FinanceCalculator';
import type { SitePage, SitePageComponent } from '@/lib/site-pages';

type GalleryRow = {
  id: string;
  url: string;
  caption: string | null;
  caption_ar: string | null;
  is_hero: number;
  section_id: string | null;
};

type RelatedBusiness = {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  type_id: string;
};

const COMPONENT_TITLES: Record<SitePageComponent['type'], { en: string; ar: string }> = {
  hero_carousel: { en: 'Featured', ar: 'مميز' },
  model_details: { en: 'Details', ar: 'التفاصيل' },
  model_lineup: { en: 'Models and variants', ar: 'الطرازات والفئات' },
  inventory: { en: 'Available vehicles', ar: 'المركبات المتاحة' },
  offers: { en: 'Offers and pricing', ar: 'العروض والأسعار' },
  gallery: { en: 'Gallery', ar: 'معرض الصور' },
  blog: { en: 'Updates and stories', ar: 'الأخبار والمقالات' },
  finance_calculator: { en: 'Finance calculator', ar: 'حاسبة التمويل' },
  faq: { en: 'Updates', ar: 'التحديثات' },
  contact: { en: 'Contact', ar: 'تواصل معنا' },
};

function localized(en: string | null | undefined, ar: string | null | undefined, locale: 'ar' | 'en') {
  return locale === 'ar' ? (ar?.trim() || '') : (en?.trim() || '');
}

function titleFor(component: SitePageComponent, locale: 'ar' | 'en') {
  return localized(component.props.title, component.props.title_ar, locale)
    || COMPONENT_TITLES[component.type][locale];
}

function formatPrice(value: number | null, locale: 'ar' | 'en') {
  if (value == null) return '';
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export default async function SitePageRenderer({
  view,
  page,
}: {
  view: MinisiteView;
  page: SitePage;
}) {
  const locale = view.locale;
  const publishedComponents = page.publishedComponents ?? [];
  const types = new Set(publishedComponents.map((component) => component.type));
  const [gallery, related] = await Promise.all([
    types.has('hero_carousel') || types.has('gallery')
      ? query<GalleryRow>(
          `SELECT id, url, caption, caption_ar, is_hero, section_id
             FROM vendor_gallery
            WHERE business_id = ? AND approval_status = 'approved'
              AND show_on_minisite = 1
            ORDER BY is_hero DESC, display_order, id`,
          [view.business.id],
        )
      : Promise.resolve([] as GalleryRow[]),
    (types.has('model_lineup') || types.has('inventory'))
      ? query<RelatedBusiness>(
          `SELECT id, name, name_ar, slug, type_id FROM businesses
            WHERE parent_business_id = ? AND published = 1 AND status = 'active'
            ORDER BY name`,
          [view.business.id],
        )
      : Promise.resolve([] as RelatedBusiness[]),
  ]);
  const activeSection = view.active;
  const title = locale === 'ar'
    ? page.publishedTitleAr || view.business.name_ar || 'المركبة'
    : page.publishedTitle || view.business.name;

  const imageSlides: Slide[] = gallery.map((item) => ({
    id: item.id,
    fieldKey: '',
    fieldSectionId: item.section_id ?? '',
    eyebrow: '',
    title: localized(item.caption, item.caption_ar, locale),
    note: null,
    url: item.url,
    isHero: item.is_hero,
    placeholder: false,
    mediaType: 'image',
    videoId: null,
  }));
  const heroSlides = activeSection?.slides.length ? activeSection.slides : imageSlides;
  if (!heroSlides.length) {
    heroSlides.push({
      id: `page-hero-${page.id}`,
      fieldKey: '',
      fieldSectionId: '',
      eyebrow: '',
      title,
      note: null,
      url: null,
      isHero: 1,
      placeholder: true,
      mediaType: 'branded',
      videoId: null,
      displayMode: 'text_only',
    });
  }

  let inventory = [] as Awaited<ReturnType<typeof unitsByModel>>;
  if (types.has('inventory')) {
    const modelIds = view.business.type_id === 'vehicle_model'
      ? [view.business.id]
      : related.filter((item) => item.type_id === 'vehicle_model').map((item) => item.id).slice(0, 20);
    const result = await Promise.all(modelIds.map((id) =>
      unitsByModel(id, { locale, limit: 50 }),
    ));
    inventory = result.flat().slice(0, 50);
  }

  const offers = (types.has('offers') || types.has('finance_calculator')) && view.business.type_id === 'vehicle_model'
    ? await listOffersForModel(view.business.id)
    : [];
  const blogPosts = types.has('blog')
    ? await query<{
        id: string; title: string | null; title_ar: string | null;
        content: string | null; content_ar: string | null;
      }>(
        `SELECT id, title, title_ar, content, content_ar FROM section_blogs
          WHERE business_id = ? AND status = 'published' AND show_on_minisite = 1
          ORDER BY id DESC LIMIT ?`,
        [view.business.id, Math.min(Math.max(publishedComponents.find((component) => component.type === 'blog')?.props.limit ?? 6, 1), 50)],
      )
    : [];

  return (
    <div className="space-y-5">
      {publishedComponents.map((component) => {
        const heading = titleFor(component, locale);
        const limit = Math.min(Math.max(component.props.limit ?? 12, 1), 50);
        switch (component.type) {
          case 'hero_carousel':
            return (
              <section key={component.id} className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
                <GalleryCarousel
                  slides={heroSlides}
                  locale={locale}
                  label={heading}
                  defaults={view.carousel}
                  fieldsIndex={view.fieldsIndex}
                  brand={title}
                  slug={view.business.slug}
                />
              </section>
            );
          case 'model_details':
            return (
              <section key={component.id} className="panel">
                <div className="panel-head"><h2 className="panel-title">{heading}</h2><span className="panel-rule" /></div>
                {view.specifications.some((section) => section.groups.some((group) => group.fields.length)) ? (
                  view.specifications.map(({ section, groups }) => {
                    const populated = groups.filter((group) => group.fields.length);
                    return populated.length ? (
                      <div key={section.id} className="mb-5 last:mb-0">
                        <h3 className="mb-3 text-base font-bold">{localized(section.name, section.name_ar, locale)}</h3>
                        {populated.map((group) => (
                          <div key={group.key} className="mb-4 last:mb-0">
                            {groups.length > 1 ? <h4 className="mb-2 text-sm font-bold">{localized(group.label, group.label_ar, locale)}</h4> : null}
                            <dl className="speclist">
                              {group.fields.map((field) => (
                                <div key={field.name} className="specitem">
                                  <dt className="speckey">{localized(field.label, field.label_ar, locale)}</dt>
                                  <dd className="specval">{field.value ?? '—'}</dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })
                ) : (
                  <p className="text-sm text-[var(--ink-soft)]">{locale === 'ar' ? 'لا توجد تفاصيل منشورة بعد.' : 'No published specifications yet.'}</p>
                )}
              </section>
            );
          case 'model_lineup': {
            const items = related.filter((item) =>
              view.business.type_id === 'vehicle_brand'
                ? item.type_id === 'vehicle_model'
                : item.type_id === 'vehicle_trim',
            ).slice(0, limit);
            return items.length ? (
              <section key={component.id} className="panel">
                <div className="panel-head"><h2 className="panel-title">{heading}</h2><span className="panel-rule" /></div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <a key={item.id} href={localePath(locale, [item.slug])} className="border border-[var(--line)] bg-white p-4 text-[var(--ink)] no-underline hover:border-[var(--signal)]">
                      {localized(item.name, item.name_ar, locale)}
                    </a>
                  ))}
                </div>
              </section>
            ) : null;
          }
          case 'inventory':
            return inventory.length ? (
              <section key={component.id} className="panel">
                <div className="panel-head"><h2 className="panel-title">{heading}</h2><span className="panel-rule" /></div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {inventory.slice(0, limit).map((unit) => (
                    <a key={unit.id} href={unit.href} className="border border-[var(--line)] bg-white p-4 text-[var(--ink)] no-underline hover:border-[var(--signal)]">
                      <span className="block font-semibold">{unit.title}</span>
                      <span className="mt-1 block text-sm text-[var(--ink-soft)]">{unit.priceEgp == null ? (locale === 'ar' ? 'السعر عند الاتصال' : 'Price on request') : formatPrice(unit.priceEgp, locale)}</span>
                    </a>
                  ))}
                </div>
              </section>
            ) : null;
          case 'offers':
            return offers.length ? (
              <section key={component.id} className="panel">
                <div className="panel-head"><h2 className="panel-title">{heading}</h2><span className="panel-rule" /></div>
                <div className="space-y-2">
                  {offers.slice(0, limit).map((offer) => (
                    <a key={offer.id} href={localePath(locale, [offer.sellerSlug])} className="flex flex-wrap justify-between gap-2 border border-[var(--line)] bg-white p-4 text-[var(--ink)] no-underline hover:border-[var(--signal)]">
                      <span>{localized(offer.sellerName, offer.sellerNameAr, locale)}</span>
                      <span>{formatPrice(offer.priceFromEgp, locale)}</span>
                    </a>
                  ))}
                </div>
              </section>
            ) : null;
          case 'gallery':
            return gallery.length ? (
              <section key={component.id} className="panel">
                <div className="panel-head"><h2 className="panel-title">{heading}</h2><span className="panel-rule" /></div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {gallery.slice(0, limit).map((item) => (
                    <figure key={item.id} className="overflow-hidden border border-[var(--line)] bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.url} alt={localized(item.caption, item.caption_ar, locale)} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                      {localized(item.caption, item.caption_ar, locale) ? <figcaption className="p-3 text-sm">{localized(item.caption, item.caption_ar, locale)}</figcaption> : null}
                    </figure>
                  ))}
                </div>
              </section>
            ) : null;
          case 'blog':
            return blogPosts.length ? (
              <section key={component.id} className="panel">
                <div className="panel-head"><h2 className="panel-title">{heading}</h2><span className="panel-rule" /></div>
                <div className="grid gap-3 md:grid-cols-2">
                  {blogPosts.slice(0, limit).map((post) => (
                    <article key={post.id} className="border border-[var(--line)] bg-white p-4">
                      <h3 className="font-display text-lg">{localized(post.title, post.title_ar, locale)}</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--ink-soft)]">{localized(post.content, post.content_ar, locale)}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null;
          case 'finance_calculator': {
            const startingPrice = offers.find((offer) => offer.priceFromEgp && offer.priceFromEgp > 0)?.priceFromEgp;
            return (
              <section key={component.id} className="panel">
                <div className="panel-head"><h2 className="panel-title">{heading}</h2><span className="panel-rule" /></div>
                {startingPrice ? <FinanceCalculator price={startingPrice} locale={locale} /> : (
                  <p className="text-sm text-[var(--ink-soft)]">{locale === 'ar' ? 'تظهر الحاسبة عند توفر سعر منشور للطراز.' : 'The calculator appears when a published model price is available.'}</p>
                )}
              </section>
            );
          }
          case 'faq':
            return text(localized(component.props.text, component.props.text_ar, locale)) ? (
              <section key={component.id} className="panel">
                <div className="panel-head"><h2 className="panel-title">{heading}</h2><span className="panel-rule" /></div>
                <p className="whitespace-pre-wrap text-[15px] leading-8">{localized(component.props.text, component.props.text_ar, locale)}</p>
              </section>
            ) : null;
          case 'contact': {
            const phone = text(view.business.contact.phone);
            const address = text(locale === 'ar' ? view.business.contact.address_ar : view.business.contact.address);
            return phone || address ? (
              <section key={component.id} className="panel">
                <div className="panel-head"><h2 className="panel-title">{heading}</h2><span className="panel-rule" /></div>
                {address ? <p>{address}</p> : null}
                {phone ? <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="text-[var(--signal)]">{phone}</a> : null}
              </section>
            ) : null;
        }
        }
      })}
    </div>
  );
}
