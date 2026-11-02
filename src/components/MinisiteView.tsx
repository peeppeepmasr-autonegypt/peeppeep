/**
 * Minisite renderer — presents a loaded MinisiteView bilingually.
 *
 * Renders: ancestry breadcrumb, node header (identity), the section-shelf nav,
 * and the active shelf body: the value carousel (one slide per representable
 * field), authored field groups, graph shelves (children / typed edges as cards
 * | list | chips | table | tree), the unbound gallery, and blogs with
 * caption #1 (from the row) and caption #2 (media_data overlay OR the
 * group-derived dynamic line). Direction (rtl/ltr) is applied by the caller.
 */
import type { MinisiteView as MinisiteData, ShelfItem, GraphShelf, GalleryItem, ActiveSectionView } from '@/lib/minisite';
import GalleryCarousel from '@/components/GalleryCarousel';
import FinanceCalculator from '@/components/FinanceCalculator';
import { localePath, localeDir, type SiteLocale } from '@/lib/site-locale';

// ── UI string dictionary (labels around the data, not the data itself) ─────────
const UI: Record<string, { en: string; ar: string }> = {
  overview: { en: 'Overview', ar: 'نظرة عامة' },
  models: { en: 'Models', ar: 'الطرازات' },
  variants: { en: 'Variants', ar: 'الفئات' },
  inventory: { en: 'Inventory', ar: 'المخزون' },
  network: { en: 'Network', ar: 'الشبكة' },
  origin: { en: 'Manufactured at', ar: 'بلد المنشأ' },
  protection: { en: 'Protection', ar: 'الحماية' },
  portfolio: { en: 'Portfolio', ar: 'المحفظة' },
  home: { en: 'Home', ar: 'الرئيسية' },
  specs: { en: 'Specifications', ar: 'المواصفات' },
  gallery: { en: 'Gallery', ar: 'معرض الصور' },
  related: { en: 'Related', ar: 'عناصر ذات صلة' },
  none: { en: 'Nothing here yet.', ar: 'لا يوجد محتوى بعد.' },
};
const t = (k: string, locale: SiteLocale) => UI[k]?.[locale] ?? k;

function displayName(row: { name: string; name_ar: string | null }, locale: SiteLocale): string {
  return locale === 'ar' ? (row.name_ar?.trim() || row.name) : row.name;
}

function ShelfHeading(label: string, as: string, locale: SiteLocale): string {
  const known: Record<string, string> = {
    sec_auto_models: t('models', locale),
    sec_auto_variants: t('variants', locale),
    sec_auto_inventory: t('inventory', locale),
    sec_auto_network: t('network', locale),
    sec_auto_origin: t('origin', locale),
    sec_auto_protection: t('protection', locale),
    sec_auto_portfolio: t('portfolio', locale),
  };
  return known[label] ?? label;
}

// ── links ────────────────────────────────────────────────────────────────────
function homeHref(locale: SiteLocale, slug: string) {
  return localePath(locale, [slug]);
}
function sectionHref(locale: SiteLocale, slug: string, sectionId: string) {
  return localePath(locale, [slug, sectionId]);
}

// ── shelf renderers ──────────────────────────────────────────────────────────
function ShelfCards({ shelf, locale }: { shelf: GraphShelf; locale: SiteLocale }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {shelf.items.map((it: ShelfItem) => (
        <a
          key={it.id}
          href={it.slug ? homeHref(locale, it.slug) : '#'}
          className="block rounded-lg border border-black/10 dark:border-white/15 p-4 hover:bg-black/[.03] dark:hover:bg-white/[.05]"
        >
          <div className="font-semibold">{displayName(it, locale)}</div>
          {it.meta ? <div className="text-sm opacity-70 mt-1">{it.meta}</div> : null}
        </a>
      ))}
    </div>
  );
}
function ShelfList({ shelf, locale }: { shelf: GraphShelf; locale: SiteLocale }) {
  return (
    <ul className="divide-y divide-black/10 dark:divide-white/10">
      {shelf.items.map((it) => (
        <li key={it.id} className="py-2">
          <a href={it.slug ? homeHref(locale, it.slug) : '#'} className="hover:underline">
            {displayName(it, locale)}
            {it.meta ? <span className="opacity-60 text-sm ms-2">— {it.meta}</span> : null}
          </a>
        </li>
      ))}
    </ul>
  );
}
function ShelfChips({ shelf, locale }: { shelf: GraphShelf; locale: SiteLocale }) {
  return (
    <div className="flex flex-wrap gap-2">
      {shelf.items.map((it) => (
        <a
          key={it.id}
          href={it.slug ? homeHref(locale, it.slug) : '#'}
          className="rounded-full border border-black/15 dark:border-white/20 px-3 py-1 text-sm hover:bg-black/[.05] dark:hover:bg-white/[.08]"
        >
          {displayName(it, locale)}
        </a>
      ))}
    </div>
  );
}
function ShelfTable({ shelf, locale }: { shelf: GraphShelf; locale: SiteLocale }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
      <table className="w-full text-sm">
        <tbody>
          {shelf.items.map((it) => (
            <tr key={it.id} className="border-b border-black/5 dark:border-white/10 last:border-0">
              <td className="px-4 py-2 font-medium">
                <a href={it.slug ? homeHref(locale, it.slug) : '#'} className="hover:underline">
                  {displayName(it, locale)}
                </a>
              </td>
              <td className="px-4 py-2 opacity-70">{it.meta ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ShelfTree({ shelf, locale }: { shelf: GraphShelf; locale: SiteLocale }) {
  return (
    <ul className="space-y-1 border-s-2 border-black/10 dark:border-white/15 ps-4">
      {shelf.items.map((it) => (
        <li key={it.id}>
          <a href={it.slug ? homeHref(locale, it.slug) : '#'} className="hover:underline">
            └ {displayName(it, locale)}
          </a>
        </li>
      ))}
    </ul>
  );
}

function renderShelf(shelf: GraphShelf, locale: SiteLocale) {
  switch (shelf.as) {
    case 'list': return <ShelfList shelf={shelf} locale={locale} />;
    case 'chips': return <ShelfChips shelf={shelf} locale={locale} />;
    case 'table': return <ShelfTable shelf={shelf} locale={locale} />;
    case 'tree': return <ShelfTree shelf={shelf} locale={locale} />;
    default: return <ShelfCards shelf={shelf} locale={locale} />;
  }
}

// ── gallery body grid: caption #1 + caption #2 (already locale-resolved) ─────
function GalleryGrid({ items }: { items: GalleryItem[] }) {
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map((g) => (
        <figure key={g.id} className="rounded-lg overflow-hidden border border-black/10 dark:border-white/15">
          {/* External placeholder URLs -> plain <img> (avoids remote Image config). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={g.url} alt={g.caption} className="w-full h-56 object-cover" loading="lazy" />
          <figcaption className="p-3">
            {g.caption ? <div className="font-medium">{g.caption}</div> : null}
            {g.caption2Title ? (
              <div className="text-sm opacity-80 mt-0.5">{g.caption2Title}</div>
            ) : null}
            {g.caption2Subtitle ? (
              <div className="text-xs opacity-60 mt-0.5">{g.caption2Subtitle}</div>
            ) : null}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

// ── active section body ──────────────────────────────────────────────────────
function SectionBody({ active, locale, identity }: { active: ActiveSectionView; locale: SiteLocale; identity: Record<string, unknown> }) {
  const { section, groups, gallery, slides, shelves, blogs } = active;
  const isOverview = section.id === 'sec_1_identity';
  return (
    <div className="space-y-8">
      {isOverview ? (
        <div>
          <h2 className="text-xl font-semibold mb-2">{displayName({ name: section.name, name_ar: section.name_ar }, locale)}</h2>
          {typeof identity.tagline === 'string' || typeof identity.tagline_ar === 'string' ? (
            <p className="text-lg opacity-80">
              {(locale === 'ar' ? (identity.tagline_ar as string) : (identity.tagline as string)) || identity.tagline as string}
            </p>
          ) : null}
          {typeof identity.description === 'string' || typeof identity.description_ar === 'string' ? (
            <p className="mt-3 leading-relaxed opacity-90">
              {(locale === 'ar' ? (identity.description_ar as string) : (identity.description as string)) || (identity.description as string)}
            </p>
          ) : null}
        </div>
      ) : null}

      {slides.length ? (
        <GalleryCarousel
          slides={slides}
          locale={locale}
          label={displayName({ name: section.name, name_ar: section.name_ar }, locale)}
        />
      ) : null}

      {/* Interactive Finance Calculator if pricing section */}
      {section.id === 'sec_listing_price' && (() => {
        const priceField = groups.flatMap((g) => g.fields).find((f) => f.name === 'price_egp');
        const rawNum = priceField ? parseFloat(String(priceField.value).replace(/[^0-9.]/g, '')) : 0;
        return rawNum > 0 ? <FinanceCalculator price={rawNum} locale={locale} /> : null;
      })()}

      {groups.map((g) => (
        <div key={g.key}>
          <h3 className="text-lg font-semibold mb-3">{locale === 'ar' ? (g.label_ar?.trim() || g.label) : g.label}</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {g.fields.map((f) => (
              <div key={f.name} className="flex justify-between gap-4 border-b border-black/5 dark:border-white/10 py-1.5">
                <dt className="opacity-70">{locale === 'ar' ? (f.label_ar?.trim() || f.label) : f.label}</dt>
                <dd className="font-medium text-end">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}

      {shelves.map((shelf, i) => (
        <div key={`${section.id}-${i}`}>
          {shelves.length > 1 || shelf.label !== displayName({ name: section.name, name_ar: section.name_ar }, locale) ? (
            <h3 className="text-lg font-semibold mb-3">{ShelfHeading(section.id, shelf.as, locale)}</h3>
          ) : null}
          {renderShelf(shelf, locale)}
        </div>
      ))}

      {gallery.length ? (
        <div>
          <h3 className="text-lg font-semibold mb-3">{t('gallery', locale)}</h3>
          <GalleryGrid items={gallery} />
        </div>
      ) : null}

      {blogs.map((b) => (
        <article key={b.id} className="prose dark:prose-invert max-w-none">
          <h3 className="text-lg font-semibold">{b.title}</h3>
          <p className="opacity-90 whitespace-pre-wrap">{b.content}</p>
        </article>
      ))}

      {!isOverview && !slides.length && !groups.length && !shelves.length && !gallery.length && !blogs.length ? (
        <p className="opacity-60">{t('none', locale)}</p>
      ) : null}
    </div>
  );
}

// ── top-level renderer ───────────────────────────────────────────────────────
export default function MinisiteView({ view }: { view: MinisiteData }) {
  const locale = view.locale;
  const dir = localeDir(locale);
  const b = view.business;

  return (
    <div dir={dir} lang={locale} className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm opacity-70 mb-4 flex flex-wrap items-center gap-1">
          <a href={localePath(locale, [])} className="hover:underline">{t('home', locale)}</a>
          {view.ancestry.map((a) => (
            <span key={a.id} className="flex items-center gap-1">
              <span aria-hidden>/</span>
              {a.slug ? (
                <a href={homeHref(locale, a.slug)} className="hover:underline">{displayName(a, locale)}</a>
              ) : (
                <span>{displayName(a, locale)}</span>
              )}
            </span>
          ))}
        </nav>

        {/* Header */}
        <header className="mb-6">
          <div className="text-xs uppercase tracking-wide opacity-60">
            {locale === 'ar' ? (b.typeName_ar?.trim() || b.typeName) : b.typeName}
          </div>
          <h1 className="text-3xl font-bold mt-1">{displayName(b, locale)}</h1>
        </header>

        {/* Section shelf nav */}
        {view.sections.length > 1 ? (
          <nav className="flex flex-wrap gap-2 mb-8 border-b border-black/10 dark:border-white/10 pb-3">
            {view.sections.map((s) => {
              const activeTab = s.id === view.activeSectionId;
              return (
                <a
                  key={s.id}
                  href={sectionHref(locale, b.slug, s.id)}
                  className={
                    'px-3 py-1.5 rounded-md text-sm ' +
                    (activeTab
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'hover:bg-black/[.05] dark:hover:bg-white/[.08]')
                  }
                >
                  {locale === 'ar' ? (s.name_ar?.trim() || s.name) : s.name}
                </a>
              );
            })}
          </nav>
        ) : null}

        {/* Active shelf */}
        {view.active ? (
          <SectionBody active={view.active} locale={locale} identity={b.identity} />
        ) : (
          <p className="opacity-60">{t('none', locale)}</p>
        )}
      </div>
    </div>
  );
}
