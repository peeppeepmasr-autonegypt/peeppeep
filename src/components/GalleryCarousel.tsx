'use client';

/**
 * Section carousel — one slide per representable value.
 *
 * A slide is a VALUE, not a photo: the headline is the bound field's authored
 * answer ("Matrix LED"), the eyebrow is the field's label, and `note` is the
 * optional editorial line. `url === null` means the field is carousel-eligible
 * but no photo has been uploaded yet; it still gets a slide, rendered as a
 * labelled placeholder, so an unfinished minisite shows as unfinished.
 *
 * Kept deliberately small: no dependency, no autoplay (motion should be opt-in,
 * and autoplay would fight the browser's own reduced-motion preference). The
 * first slide arrives server-rendered with the rest of the page, so the AR and
 * EN pages stay crawlable and there is no layout shift on hydration.
 */
import { useState, useCallback } from 'react';
import type { Slide } from '@/lib/minisite';
import type { SiteLocale } from '@/lib/site-locale';

const UI = {
  photoNeeded: { en: 'Photo needed', ar: 'صورة مطلوبة' },
  valueNeeded: { en: 'Value not authored yet', ar: 'لم تُدخل القيمة بعد' },
  prev: { en: 'Previous slide', ar: 'الشريحة السابقة' },
  next: { en: 'Next slide', ar: 'الشريحة التالية' },
};

function text(key: keyof typeof UI, locale: SiteLocale): string {
  return UI[key][locale];
}

export default function GalleryCarousel({
  slides,
  locale,
  label,
}: {
  slides: Slide[];
  locale: SiteLocale;
  label: string;
}) {
  const [index, setIndex] = useState(() => {
    const hero = slides.findIndex((s) => s.isHero === 1);
    return hero < 0 ? 0 : hero;
  });
  const last = slides.length - 1;

  const go = useCallback((delta: number) => {
    setIndex((i) => (i + delta + slides.length) % slides.length);
  }, [slides.length]);

  if (!slides.length) return null;
  const slide = slides[Math.min(index, last)] ?? slides[0];

  return (
    <section
      className="relative rounded-lg overflow-hidden border border-black/10 dark:border-white/15"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        // Logical directions: the browser already knows the page is RTL, so an
        // ArrowLeft means "previous" here and the glyph below flips itself.
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      }}
    >
      <div className="relative aspect-video bg-black/5 dark:bg-white/5">
        {slide.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={slide.id}
            src={slide.url}
            alt={slide.title || slide.eyebrow}
            className="absolute inset-0 w-full h-full object-cover"
            // The active slide must not lazy-load; the neighbours are fetched on demand.
            loading="eager"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-black/15 dark:border-white/20 text-center p-6">
            <span className="text-3xl opacity-40" aria-hidden>▢</span>
            <span className="text-sm opacity-60">{text('photoNeeded', locale)}</span>
            {!slide.title ? (
              <span className="text-sm opacity-50">{text('valueNeeded', locale)}</span>
            ) : null}
          </div>
        )}

        {/* caption scrim: pinned to the trailing edge in both reading directions */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent text-white p-4 sm:p-6">
          <div className="text-[0.7rem] uppercase tracking-wider opacity-80">{slide.eyebrow}</div>
          <div className="text-xl sm:text-2xl font-semibold leading-snug">{slide.title || slide.eyebrow}</div>
          {slide.note ? <div className="text-sm opacity-85 mt-1">{slide.note}</div> : null}
        </div>

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={text('prev', locale)}
              className="absolute top-1/2 -translate-y-1/2 start-3 size-9 grid place-items-center rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur"
            >
              {/* one glyph, mirrored for RTL so "back" always points backwards */}
              <span className="rtl:rotate-180" aria-hidden>‹</span>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={text('next', locale)}
              className="absolute top-1/2 -translate-y-1/2 end-3 size-9 grid place-items-center rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur"
            >
              <span className="rtl:rotate-180" aria-hidden>›</span>
            </button>
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-2 px-4 py-3 flex-wrap">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={s.title || s.eyebrow}
            aria-current={i === index}
            className={`size-2 rounded-full transition ${
              i === index ? 'bg-current' : 'bg-current/25 hover:bg-current/50'
            }`}
          />
        ))}
        <span className="ms-auto text-xs opacity-60 tabular-nums" aria-live="polite">
          {index + 1} / {slides.length}
        </span>
      </div>
    </section>
  );
}
