/**
 * Minisite renderer — presents a loaded MinisiteView bilingually.
 *
 * The page is built for one visitor: a buyer deciding between cars and needing
 * to reach the showroom to finish. So the order is the order of that decision:
 *
 *   who is this  → identity plate, with the showroom's address, hours and phone
 *                  beside it, never buried under the fold
 *   show me      → the value carousel: one pane per authored answer, photo or
 *                  walkaround film behind it
 *   the numbers  → the spec groups the carousel did not already print
 *   what else    → graph shelves (models, inventory, network), the unbound
 *                  gallery, then notes
 *
 * Direction is carried by the caller's locale tree, and every surface uses
 * logical properties, so the Arabic page is a mirror rather than a translation
 * of the layout.
 */
import type {
  ActiveSectionView, ClaimedKeys, GalleryItem, GraphShelf, MinisiteView as MinisiteData,
  SlideFieldsIndex, CarouselDefaults,
} from '@/lib/minisite';
import type { CSSProperties } from 'react';
import GalleryCarousel from '@/components/GalleryCarousel';
import SitePageRenderer from '@/components/SitePageRenderer';
import { getPublishedSitePage, listPublishedCustomPages } from '@/lib/site-pages';
import { notFound } from 'next/navigation';
import FinanceCalculator from '@/components/FinanceCalculator';
import ContactDock from '@/components/ContactDock';
import { IconClock, IconPhone, IconPin, IconWhatsApp } from '@/components/icons';
import { localeDir, localePath, type SiteLocale } from '@/lib/site-locale';

// ── UI strings: labels around the data, never the data itself ────────────────
const UI: Record<string, { en: string; ar: string }> = {
  home: { en: 'Home', ar: 'الرئيسية' },
  overview: { en: 'Overview', ar: 'نظرة عامة' },
  gallery: { en: 'Gallery', ar: 'معرض الصور' },
  none: { en: 'Nothing authored on this shelf yet.', ar: 'لا يوجد محتوى على هذا الرف بعد.' },
  visit: { en: 'Visit the showroom', ar: 'زيارة المعرض' },
  phone: { en: 'Phone', ar: 'الهاتف' },
  address: { en: 'Address', ar: 'العنوان' },
  hours: { en: 'Opening hours', ar: 'مواعيد العمل' },
  call: { en: 'Call', ar: 'اتصال' },
  whatsapp: { en: 'WhatsApp', ar: 'واتساب' },
  models: { en: 'Models', ar: 'الطرازات' },
  variants: { en: 'Variants', ar: 'الفئات' },
  inventory: { en: 'Inventory', ar: 'المخزون' },
  relation: { en: 'Network', ar: 'الشبكة' },
  origin: { en: 'Manufactured at', ar: 'بلد المنشأ' },
  protection: { en: 'Protection', ar: 'الحماية' },
  portfolio: { en: 'Portfolio', ar: 'المحفظة' },
};

const t = (k: keyof typeof UI, locale: SiteLocale): string => UI[k]?.[locale] ?? String(k);

function loc(en: unknown, ar: unknown, locale: SiteLocale): string | null {
  const primary = locale === 'ar' ? ar : en;
  if (typeof primary === 'string' && primary.trim()) return primary.trim();
  return null;
}

function displayName(row: { name: string; name_ar: string | null }, locale: SiteLocale): string {
  return loc(row.name, row.name_ar, locale) ?? '';
}

function displayMeta(value: string | null, locale: SiteLocale): string {
  if (!value) return '';
  if (locale === 'ar' && /[A-Za-z]/.test(value) && !/[\u0600-\u06FF]/.test(value)) return '';
  if (locale === 'en' && /[\u0600-\u06FF]/.test(value)) return '';
  return value;
}

/** Section shelves get a human heading; unknown ids keep their authored name. */
function shelfHeading(sectionId: string, fallback: string, locale: SiteLocale): string {
  const known: Record<string, keyof typeof UI> = {
    sec_auto_models: 'models', sec_auto_variants: 'variants', sec_auto_inventory: 'inventory',
    sec_auto_network: 'relation', sec_auto_origin: 'origin', sec_auto_protection: 'protection',
    sec_auto_portfolio: 'portfolio',
  };
  const key = known[sectionId];
  return key ? t(key, locale) : fallback;
}

const homeHref = (locale: SiteLocale, slug: string) => localePath(locale, [slug]);
const sectionHref = (locale: SiteLocale, slug: string, sectionId: string) =>
  localePath(locale, [slug, sectionId]);

// ── graph shelves ────────────────────────────────────────────────────────────
function ShelfItems({ shelf, locale }: { shelf: GraphShelf; locale: SiteLocale }) {
  const items = shelf.items;
  if (shelf.as === 'chips') {
    return (
      <ul className="flex flex-wrap gap-2">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={it.slug ? homeHref(locale, it.slug) : undefined}
              className="inline-flex items-center gap-2 border border-[var(--line)] bg-white/70 px-3 py-1.5 text-sm text-[var(--ink)] no-underline transition-colors hover:border-[var(--signal)]"
            >
              {displayName(it, locale)}
              {displayMeta(it.meta, locale) ? <span className="text-xs text-[var(--ink-soft)]">{displayMeta(it.meta, locale)}</span> : null}
            </a>
          </li>
        ))}
      </ul>
    );
  }

  if (shelf.as === 'table') {
    return (
      <div className="overflow-x-auto border border-[var(--line)]">
        <table className="w-full text-sm">
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-[rgba(150,160,148,0.28)] last:border-0">
                <td className="px-4 py-2.5 font-medium">
                  <a href={it.slug ? homeHref(locale, it.slug) : undefined} className="text-[var(--ink)] no-underline hover:text-[var(--signal)]">
                    {displayName(it, locale)}
                  </a>
                </td>
                <td className="px-4 py-2.5 text-end text-[var(--ink-soft)]">{displayMeta(it.meta, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (shelf.as === 'tree' || shelf.as === 'list') {
    return (
      <ul className={shelf.as === 'tree' ? 'ms-4 border-s border-[var(--line)] ps-4' : ''}>
        {items.map((it) => (
          <li key={it.id} className="border-b border-[rgba(150,160,148,0.22)] last:border-0">
            <a
              href={it.slug ? homeHref(locale, it.slug) : undefined}
              className="flex items-baseline justify-between gap-4 py-2.5 text-[var(--ink)] no-underline hover:text-[var(--signal)]"
            >
              <span className="font-medium">{displayName(it, locale)}</span>
              {displayMeta(it.meta, locale) ? <span className="text-sm text-[var(--ink-soft)]">{displayMeta(it.meta, locale)}</span> : null}
            </a>
          </li>
        ))}
      </ul>
    );
  }

  // cards
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <a
          key={it.id}
          href={it.slug ? homeHref(locale, it.slug) : undefined}
          className="block border border-[var(--line)] bg-white/70 p-4 no-underline transition-colors hover:border-[var(--line-strong)] hover:bg-white"
        >
          <span className="block font-display text-[var(--ink)]">{displayName(it, locale)}</span>
          {displayMeta(it.meta, locale) ? <span className="mt-1 block text-sm text-[var(--ink-soft)]">{displayMeta(it.meta, locale)}</span> : null}
        </a>
      ))}
    </div>
  );
}

// ── the unbound gallery: photographs with no value attached to them ──────────
function GalleryGrid({ items }: { items: GalleryItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((g) => (
        <figure key={g.id} className="group overflow-hidden border border-[var(--line)] bg-white">
          {/* External/CDN URLs of unknown dimensions: plain <img> avoids a remote
              image allow-list, and `cover` keeps the grid honest. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={g.url}
            alt={g.caption || g.caption2Title || ''}
            className="aspect-[4/3] w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          {(g.caption || g.caption2Title || g.caption2Subtitle) ? (
            <figcaption className="px-3.5 py-3">
              {g.caption ? <p className="text-sm font-medium text-[var(--ink)]">{g.caption}</p> : null}
              {g.caption2Title ? (
                <p className="mt-0.5 text-[13px] text-[var(--ink-soft)]">{g.caption2Title}</p>
              ) : null}
              {g.caption2Subtitle ? (
                <p className="mt-0.5 font-mono text-xs text-[var(--ink-soft)]">{g.caption2Subtitle}</p>
              ) : null}
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}

// ── contact plate: the buyer's exit, beside the name that earned the trust ───
function ContactPlate({
  contact, locale, phone,
}: {
  contact: Record<string, unknown>; locale: SiteLocale; phone: string | null;
}) {
  const address = loc(contact.address, contact.address_ar, locale);
  const hours = loc(contact.opening_hours, contact.opening_hours_ar, locale);
  const rows: Array<{ key: keyof typeof UI; icon: React.ReactNode; value: string | null }> = [
    { key: 'address', icon: <IconPin size={13} />, value: address },
    { key: 'hours', icon: <IconClock size={13} />, value: hours },
    { key: 'phone', icon: <IconPhone size={13} />, value: phone },
  ];
  const shown = rows.filter((r) => r.value);
  const digits = phone ? phone.replace(/\D/g, '') : '';

  return (
    <section className="plate" aria-label={t('visit', locale)}>
      <header className="plate-head">
        <IconPin size={13} />
        {t('visit', locale)}
      </header>
      {shown.length ? shown.map((r) => (
        <div className="plate-row" key={r.key}>
          <span className="plate-key">{r.icon}{t(r.key, locale)}</span>
          <p className="plate-val">{r.value}</p>
        </div>
      )) : (
        <div className="plate-row">
          <p className="plate-val text-start text-[var(--ink-soft)]">{t('none', locale)}</p>
        </div>
      )}
      {digits ? (
        <div className="plate-actions">
          <a className="act act--call" href={`tel:${phone!.replace(/[^\d+]/g, '')}`}>
            <IconPhone size={14} />{t('call', locale)}
          </a>
          <a
            className="act act--wa"
            href={`https://wa.me/${digits.replace(/^0/, '20')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconWhatsApp size={14} />{t('whatsapp', locale)}
          </a>
        </div>
      ) : null}
    </section>
  );
}

// ── active shelf body ────────────────────────────────────────────────────────
interface BodyProps {
  active: ActiveSectionView;
  locale: SiteLocale;
  identity: Record<string, unknown>;
  fieldsIndex: SlideFieldsIndex;
  claimed: ClaimedKeys;
  carousel: CarouselDefaults;
  brand: string;
  /** Carried to the carousel so a slide can link out to a shelf not on this page. */
  slug: string;
  /**
   * The front page lifts the carousel above the identity block so the hero is what
   * a visitor meets first; when it does, this body must not print the same rail a
   * second time below the fold.
   */
  heroHoisted?: boolean;
}

function SectionBody({ active, locale, identity, fieldsIndex, claimed, carousel, brand, slug, heroHoisted }: BodyProps) {
  const { section, groups, gallery, slides, shelves, blogs } = active;
  const isOverview = section.id === 'sec_1_identity';
  const sectionName = displayName(section, locale);

  // A value the hero already prints does not get printed twice on one page.
  const claimedHere = new Set([...claimed.anySection, ...(claimed.bySection[section.id] ?? [])]);

  const priceRaw = isOverview ? null : (() => {
    const field = groups.flatMap((g) => g.fields).find((f) => f.name === 'price_egp');
    const num = field ? Number(String(field.value).replace(/[^0-9.]/g, '')) : 0;
    return num > 0 ? num : null;
  })();

  const tagline = loc(identity.tagline, identity.tagline_ar, locale);
  const description = loc(identity.description, identity.description_ar, locale);

  return (
    <>
      {isOverview && (tagline || description) ? (
        <section className="panel" id={section.id}>
          <div className="panel-head">
            <h2 className="panel-title">{sectionName}</h2>
            <span className="panel-rule" />
          </div>
          {description ? (
            <p className="lede">{description}</p>
          ) : null}
        </section>
      ) : null}

      {slides.length && !heroHoisted ? (
        <section className="panel" id={`${section.id}-carousel`} aria-label={sectionName}>
          <GalleryCarousel
            slides={slides}
            locale={locale}
            label={sectionName}
            defaults={carousel}
            fieldsIndex={fieldsIndex}
            brand={brand}
            slug={slug}
          />
        </section>
      ) : null}

      {priceRaw ? (
        <section className="panel" id="finance">
          <div className="panel-head">
            <h2 className="panel-title">{locale === 'ar' ? 'حاسبة التمويل' : 'Finance calculator'}</h2>
            <span className="panel-rule" />
          </div>
          <FinanceCalculator price={priceRaw} locale={locale} />
        </section>
      ) : null}

      {groups.map((g) => {
        const fields = g.fields.filter((f) => !claimedHere.has(f.name));
        if (!fields.length) return null;
        return (
          <section className="panel" id={`${section.id}:${g.key}`} key={g.key}>
            <div className="panel-head">
              <h2 className="panel-title">{loc(g.label, g.label_ar, locale) ?? (locale === 'ar' ? '' : g.key)}</h2>
              <span className="panel-rule" />
            </div>
            <dl className="speclist">
              {fields.map((f) => (
                <div className="specitem" key={f.name}>
                  <dt className="speckey">{loc(f.label, f.label_ar, locale) ?? (locale === 'ar' ? '' : f.name)}</dt>
                  <dd className="specval">{f.value ?? '—'}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}

      {shelves.map((shelf, i) => {
        const heading = shelfHeading(section.id, shelf.label, locale);
        const showHeading = shelves.length > 1 || shelf.label !== sectionName;
        return (
          <section className="panel" id={`${section.id}-shelf-${i}`} key={`${section.id}-${i}`}>
            {showHeading ? (
              <div className="panel-head">
                <h2 className="panel-title">{heading}</h2>
                <span className="panel-rule" />
              </div>
            ) : null}
            <ShelfItems shelf={shelf} locale={locale} />
          </section>
        );
      })}

      {gallery.length ? (
        <section className="panel" id={`${section.id}-gallery`}>
          <div className="panel-head">
            <h2 className="panel-title">{t('gallery', locale)}</h2>
            <span className="panel-rule" />
          </div>
          <GalleryGrid items={gallery} />
        </section>
      ) : null}

      {blogs.map((b) => (
        <article className="panel" key={b.id} id={`${section.id}-blog-${b.id}`}>
          <div className="panel-head">
            <h2 className="panel-title">{b.title}</h2>
            <span className="panel-rule" />
          </div>
          <p className="max-w-[68ch] whitespace-pre-wrap text-[15px] leading-[1.85] text-[var(--ink)]">
            {b.content}
          </p>
        </article>
      ))}

      {!isOverview && !slides.length && !groups.length && !shelves.length && !gallery.length && !blogs.length ? (
        <p className="panel text-[var(--ink-soft)]">{t('none', locale)}</p>
      ) : null}
    </>
  );
}

// ── top-level renderer ───────────────────────────────────────────────────────
export default async function MinisiteView({
  view,
  pageSlug,
}: {
  view: MinisiteData;
  pageSlug?: string;
}) {
  const [sitePage, customPages] = await Promise.all([
    getPublishedSitePage(view.business.id, pageSlug ?? ''),
    listPublishedCustomPages(view.business.id),
  ]);
  if (pageSlug && !sitePage) notFound();

  const locale = view.locale;
  const b = view.business;
  const name = displayName(b, locale);
  const typeName = loc(b.typeName, b.typeName_ar, locale) ?? '';
  const tagline = loc(b.identity.tagline, b.identity.tagline_ar, locale);
  const phone = typeof b.contact.phone === 'string' ? b.contact.phone : null;
  const siteStyle = {
    '--gold': view.siteProfile.accentColor,
    '--signal': view.siteProfile.accentColor,
    '--page': view.siteProfile.backgroundColor,
  } as CSSProperties;

  // On the front page the carousel is the hero, not a section: measured at 390px it
  // began 739px down, so the buyer's first screen was a name and a phone number and
  // the car itself was below the fold. The rail is lifted above the identity block
  // there, and SectionBody is told not to print it again.
  const active = view.active;
  const heroFirst = Boolean(active && active.section.id === 'sec_1_identity' && active.slides.length);
  const heroLabel = active ? displayName(active.section, locale) : '';

  return (
    <div
      dir={localeDir(locale)}
      lang={locale}
      className={`minisite-template minisite-template--${view.siteProfile.layout}`}
      data-template={view.siteProfile.layout}
      style={siteStyle}
    >
      <div className="sheet">
        {/* The seller trail sits beneath the shared portal navigation. */}
        <div className="mark">
          <nav aria-label={t('home', locale)} className="flex flex-wrap items-center gap-2">
            <a className="link-quiet" href={localePath(locale, [])}>{t('home', locale)}</a>
            {view.ancestry.map((a) => (
              <span key={a.id} className="flex items-center gap-2">
                <span aria-hidden className="opacity-40">/</span>
                {a.slug
                  ? <a className="link-quiet" href={homeHref(locale, a.slug)}>{displayName(a, locale)}</a>
                  : <span>{displayName(a, locale)}</span>}
              </span>
            ))}
          </nav>
        </div>

        {!sitePage && heroFirst && active ? (
          <section className="panel panel--hero" id={`${active.section.id}-carousel`} aria-label={heroLabel}>
            <GalleryCarousel
              slides={active.slides}
              locale={locale}
              label={heroLabel}
              defaults={view.carousel}
              fieldsIndex={view.fieldsIndex}
              brand={name}
              slug={b.slug}
            />
          </section>
        ) : null}

        {!sitePage ? <header className="identity">
          <div>
            {view.siteProfile.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={view.siteProfile.logoUrl} alt={name} className="mb-3 max-h-16 max-w-40 object-contain" />
            ) : null}
            <h1 className="nameplate">{name}</h1>
            {typeName ? <p className="kicker">{typeName}</p> : null}
            {tagline ? <p className="tagline">{tagline}</p> : null}
          </div>
          <ContactPlate contact={b.contact} locale={locale} phone={phone} />
        </header> : null}

        {view.sections.length > 1 ? (
          <nav className="nav-shelf" aria-label={t('overview', locale)}>
            {view.sections.map((s) => {
              const on = s.id === view.activeSectionId;
              return (
                <a
                  key={s.id}
                  href={sectionHref(locale, b.slug, s.id)}
                  aria-current={on ? 'page' : undefined}
                  className={`shelf-link${on ? ' is-on' : ''}`}
                >
                  {displayName(s, locale)}
                </a>
              );
            })}
          </nav>
        ) : null}

        {customPages.length ? (
          <nav className="nav-shelf" aria-label={locale === 'ar' ? 'صفحات الموقع' : 'Site pages'}>
            <a
              href={localePath(locale, [b.slug])}
              aria-current={!pageSlug ? 'page' : undefined}
              className={`shelf-link${!pageSlug ? ' is-on' : ''}`}
            >
              {locale === 'ar' ? 'الرئيسية' : 'Main page'}
            </a>
            {customPages.map((page) => {
              const label = locale === 'ar' ? page.publishedTitleAr : page.publishedTitle;
              if (!label?.trim() || !page.publishedSlug) return null;
              const href = localePath(locale, [b.slug, 'pages', page.publishedSlug]);
              return (
                <a
                  key={page.id}
                  href={href}
                  aria-current={pageSlug === page.publishedSlug ? 'page' : undefined}
                  className={`shelf-link${pageSlug === page.publishedSlug ? ' is-on' : ''}`}
                >
                  {label}
                </a>
              );
            })}
          </nav>
        ) : null}

        {sitePage ? (
          <SitePageRenderer view={view} page={sitePage} />
        ) : view.active ? (
          <SectionBody
            active={view.active}
            locale={locale}
            identity={b.identity}
            fieldsIndex={view.fieldsIndex}
            claimed={view.claimed}
            carousel={view.carousel}
            brand={name}
            slug={b.slug}
            heroHoisted={heroFirst}
          />
        ) : (
          <p className="panel text-[var(--ink-soft)]">{t('none', locale)}</p>
        )}

      </div>

      {phone ? (
        <ContactDock
          phone={phone}
          brand={name}
          carTitle={view.activeSectionId === 'sec_1_identity' ? null : name}
          locale={locale}
        />
      ) : null}
    </div>
  );
}
