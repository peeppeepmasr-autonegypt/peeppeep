'use client';
/**
 * The minisite carousel — one pane per authored value.
 *
 * Ported feature set from the marketplace's `AdvancedHeroCarousel`, adapted to
 * what this portal's schema can actually feed it (see `src/lib/minisite.ts`):
 *
 *   media      image · youtube (IFrame API) · native video · other embeds ·
 *              branded typographic pane · honest "photography pending" pane
 *   dressing   per-slide animation (ken burns / fade / zoom / slide), scrim
 *              strength, fit and position, ground colour, watermark, display mode
 *   clock      autoplay with a per-slide hold, a hairline that *is* the clock,
 *              pause on hover / focus / hidden tab / explicit pause, and a longer
 *              hold for a pane that is playing a film
 *   controls   arrows, dots, counter, filmstrip, play-pause, mute (in the video
 *              pane), native fullscreen, swipe, and arrow/Home/End keys
 *   content    the slide headline is the bound value; `SlideInfoBlocksOverlay`
 *              prints the approved spec blocks over the media
 *
 * Two deliberate refusals. Nothing here fabricates a photograph: an authored
 * value with no image gets a labelled glass pane that says so, because a
 * placeholder that looks like content is worse than a placeholder that admits it.
 * And every motion stops for `prefers-reduced-motion` — the pane becomes a
 * reader, not a player.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import type { CarouselDefaults, Slide } from '@/lib/minisite';
import type { SlideFieldsIndex } from '@/lib/slide-blocks';
import type { SiteLocale } from '@/lib/site-locale';
import { localePath } from '@/lib/site-locale';
import SlideInfoBlocksOverlay from '@/components/SlideInfoBlocksOverlay';
import YouTubePane, { YouTubePoster } from '@/components/YouTubePane';
import {
  ArrowStep, IconCamera, IconCollapse, IconExpand, IconPause, IconPlay,
} from '@/components/icons';

const UI: Record<string, { en: string; ar: string }> = {
  prev: { en: 'Previous', ar: 'السابق' },
  next: { en: 'Next', ar: 'التالي' },
  play: { en: 'Start slideshow', ar: 'تشغيل العرض' },
  pause: { en: 'Pause slideshow', ar: 'إيقاف العرض مؤقتاً' },
  fullscreen: { en: 'Full screen', ar: 'ملء الشاشة' },
  exitFullscreen: { en: 'Exit full screen', ar: 'إنهاء ملء الشاشة' },
  photoPending: { en: 'Photography pending', ar: 'التصوير لم يكتمل' },
  valuePending: { en: 'Value not authored yet', ar: 'لم تُدخل القيمة بعد' },
  slideOf: { en: 'slide', ar: 'شريحة' },
  filmBadge: { en: 'Walkaround', ar: 'جولة مصوّرة' },
  view: { en: 'View', ar: 'عرض' },
  call: { en: 'Contact the showroom', ar: 'تواصل مع المعرض' },
};

const DEFAULT_ASPECT = '21 / 9';
const DEFAULT_INTERVAL = 6000;
const DEFAULT_TRANSITION = 650;
const FILM_HOLD = 20000;
const SWIPE_THRESHOLD = 45;

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(REDUCE_QUERY).matches;
}

/**
 * The reduced-motion preference is an external system, so it is subscribed to
 * rather than copied into state in an effect: the page never renders one frame
 * of full motion before the setting is applied, and flipping the OS preference
 * mid-read is picked up immediately.
 */
function subscribeReduce(cb: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener?.('change', cb);
  return () => mq.removeEventListener?.('change', cb);
}

/** Reads `"21 / 9"` and answers whether that shape already suits a phone. */
function narrowShapeFor(aspect: string): string {
  const [w, h] = aspect.split('/').map((n) => Number.parseFloat(n.trim()));
  if (!Number.isFinite(w) || !Number.isFinite(h) || h <= 0) return '4 / 5';
  return w / h <= 1.2 ? aspect : '4 / 5';
}

/** Slides within one step of the current one, wrapping at the ends. */
function lazyWindow(length: number, index: number): Set<number> {
  if (length < 2) return new Set([0]);
  const out = new Set<number>();
  for (const step of [-1, 0, 1]) {
    const i = (((index + step) % length) + length) % length;
    out.add(i);
  }
  return out;
}

function embedSource(raw: string, active: boolean, reduced: boolean): string | null {
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const autoplay = active && !reduced ? '1' : '0';

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = url.pathname.match(/(?:^|\/)(\d+)(?:\/|$)/)?.[1];
    if (host === 'vimeo.com' && !id) return null;
    if (host === 'vimeo.com') {
      url.hostname = 'player.vimeo.com';
      url.pathname = `/video/${id}`;
    }
    url.searchParams.set('autoplay', autoplay);
    url.searchParams.set('muted', '1');
    url.searchParams.set('loop', '1');
    url.searchParams.set('background', '1');
    return url.toString();
  }

  if (host === 'tiktok.com') {
    const id = url.pathname.match(/\/video\/(\d+)/)?.[1]
      ?? url.pathname.match(/\/embed\/v2\/(\d+)/)?.[1];
    if (id) return `https://www.tiktok.com/embed/v2/${id}`;
  }

  if (host === 'instagram.com') {
    const match = url.pathname.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
    if (match) return `https://www.instagram.com/${match[1]}/${match[2]}/embed/`;
  }

  return url.toString();
}

export interface GalleryCarouselProps {
  slides: Slide[];
  locale: SiteLocale;
  label: string;
  /** Shelf-level behaviour from `sections.options.carousel`. */
  defaults?: CarouselDefaults;
  fieldsIndex?: SlideFieldsIndex | null;
  /** Watermark fallback when a slide does not set its own. */
  brand?: string;
  /**
   * The business slug, so a slide aimed at a shelf that is not on this page can
   * still lead the visitor there. A slug and not a callback because a Server
   * Component cannot hand a function across the client boundary — the path is
   * built here with the same `localePath` the rest of the site uses.
   */
  slug?: string;
}

export default function GalleryCarousel({
  slides,
  locale,
  label,
  defaults = {},
  fieldsIndex,
  brand,
  slug,
}: GalleryCarouselProps) {
  const isAr = locale === 'ar';
  const t = (key: keyof typeof UI) => UI[key]?.[locale] ?? String(key);

  const heroStart = useMemo(() => {
    const hero = slides.findIndex((s) => s.isHero === 1);
    return hero < 0 ? 0 : hero;
  }, [slides]);

  const [index, setIndex] = useState(heroStart);
  const [userPaused, setUserPaused] = useState(false);
  const [mediaPlaybackEnabled, setMediaPlaybackEnabled] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const reduced = useSyncExternalStore(subscribeReduce, prefersReducedMotion, () => false);
  const [isFull, setIsFull] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const count = slides.length;
  const last = count - 1;
  const safeIndex = Math.min(Math.max(index, 0), last);
  const slide = slides[safeIndex];
  const isMediaSlide = slide?.mediaType === 'youtube'
    || slide?.mediaType === 'video'
    || slide?.mediaType === 'embed';

  // ── environment ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onVisibility = () => setTabVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const go = useCallback(
    (delta: number) => {
      setMediaPlaybackEnabled(false);
      setIndex((i) => (count ? (i + delta + count) % count : 0));
    },
    [count],
  );
  const goTo = useCallback((i: number) => {
    setMediaPlaybackEnabled(false);
    setIndex(Math.min(Math.max(i, 0), last));
  }, [last]);

  // ── the clock ──────────────────────────────────────────────────────────────
  const hold = useMemo(() => {
    const base = defaults.interval ?? DEFAULT_INTERVAL;
    const moving = slide && (slide.mediaType === 'youtube' || slide.mediaType === 'video' || slide.mediaType === 'embed');
    if (!moving) return base;
    const cap = (slide.maxDuration && slide.maxDuration > 0 ? slide.maxDuration * 1000 : 0);
    return Math.max(base, cap || FILM_HOLD);
  }, [defaults.interval, slide]);

  const autoplay = count > 1 && defaults.autoPlay !== false && !reduced
    && !userPaused && (!isMediaSlide || mediaPlaybackEnabled)
    && !hovered && !focused && tabVisible;
  const paused = userPaused || (isMediaSlide && !mediaPlaybackEnabled);
  const transition = defaults.transition ?? DEFAULT_TRANSITION;

  const toggleFullscreen = useCallback(() => {
    const node = rootRef.current;
    if (!node) return;
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void node.requestFullscreen?.().catch(() => { /* denied: stay inline */ });
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(isAr ? -1 : 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(isAr ? 1 : -1); }
    else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    else if (e.key === 'End') { e.preventDefault(); goTo(last); }
    else if (e.key === ' ') { e.preventDefault(); setUserPaused((p) => !p); }
    else if (e.key === 'Escape' && isFull) toggleFullscreen();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t0 = e.touches[0];
    touchStart.current = t0 ? { x: t0.clientX, y: t0.clientY } : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const end = e.changedTouches[0];
    if (!end) return;
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    go(isAr ? Math.sign(dx) : -Math.sign(dx));
  };

  const jumpToSection = useCallback((sectionId: string) => {
    const node = document.getElementById(sectionId);
    if (node) {
      node.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    if (slug) window.location.href = localePath(locale, [slug, sectionId]);
  }, [reduced, slug, locale]);

  if (!count || !slide) return null;

  const window_ = lazyWindow(count, safeIndex);
  const accent = defaults.accent;
  const aspect = defaults.aspect ?? DEFAULT_ASPECT;
  const aspectNarrow = narrowShapeFor(aspect);
  const scrim = slide.overlayOpacity ?? (slide.mediaType === 'branded' ? 0 : 0.58);
  const isVideoPane = slide.mediaType === 'youtube' || slide.mediaType === 'video';
  const headline = slide.title || slide.eyebrow;
  const watermark = slide.watermark ?? defaults.watermark ?? brand ?? null;
  const textOnly = slide.displayMode === 'text_only';

  return (
    <div
      ref={rootRef}
      dir={isAr ? 'rtl' : 'ltr'}
      className="rail"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Two shapes, one authored: the shelf's own ratio on wide glass, a taller
          companion on a phone. `globals.css` switches between them, and the
          fullscreen rule above replaces both with the viewport. */}
      <div
        className="pane"
        style={{ '--pane-aspect': aspect, '--pane-aspect-narrow': aspectNarrow } as CSSProperties}
      >
        {/* ── the stack: every pane holds its place, only one is visible ───── */}
        {slides.map((s, i) => {
          const active = i === safeIndex;
          const mounted = window_.has(i) || active;
          const anim = reduced ? 'fade' : (s.animation ?? 'fade');
          return (
            <div
              key={s.id}
              className={`pane-layer${active ? ' is-active' : ''}`}
              style={{ transitionDuration: `${s.transition ?? transition}ms` }}
              aria-hidden={!active}
            >
              <PaneBody
                slide={s}
                isActive={active}
                isMounted={mounted}
                animation={anim}
                reduced={reduced}
                locale={locale}
                defaults={defaults}
                brand={brand}
              />
            </div>
          );
        })}

        {/* ── scrim: text stays legible without turning the photo muddy ────── */}
        {!textOnly && slide.mediaType !== 'branded' && scrim > 0 ? (
          <div
            className="scrim"
            style={{
              opacity: scrim,
              background: `linear-gradient(to top, rgba(6,9,11,0.98) 0%, rgba(6,9,11,0.72) 26%, rgba(6,9,11,0.12) 62%, rgba(6,9,11,0) 100%)`,
            }}
          />
        ) : null}

        {/* ── watermark ────────────────────────────────────────────────────── */}
        {watermark && !textOnly ? (
          <span className="watermark" aria-hidden>{watermark}</span>
        ) : null}

        {/* ── the value, and the approved blocks around it ─────────────────── */}
        <div className={`content${textOnly ? ' content--solo' : ''}`}>
          <div className="content-inner" style={{ textAlign: slide.textAlign ?? defaults.contentAlign ?? 'start' }}>
            <p className="eyebrow">
              {slide.eyebrow}
              {isVideoPane ? (
                <span className="film-flag">
                  <IconPlay size={9} />
                  {t('filmBadge')}
                </span>
              ) : null}
            </p>
            <h3
              className="headline"
              style={{
                color: slide.titleColor,
                fontSize: slide.titleSize ? `${slide.titleSize}px` : undefined,
                fontFamily: slide.fontFamily,
              }}
            >
              {headline}
            </h3>
            {slide.note && slide.showCaption !== false ? (
              <p
                className="note"
                style={{ fontSize: slide.subtitleSize ? `${slide.subtitleSize}px` : undefined }}
              >
                {slide.note}
              </p>
            ) : null}

            {(slide.ctaText && (slide.ctaLink || slide.targetSectionId)) ? (
              <CTA
                slide={slide}
                label={slide.ctaText}
                onJump={jumpToSection}
                accent={accent}
              />
            ) : null}
          </div>

          <SlideInfoBlocksOverlay
            blocks={slide.blocks}
            fieldsIndex={fieldsIndex ?? null}
            slideCaption={slide.showCaption === false ? null : slide.caption ?? slide.note}
            ar={isAr}
          />
        </div>

        {/* ── arrows ───────────────────────────────────────────────────────── */}
        {count > 1 && defaults.showArrows !== false ? (
          <>
            <button
              type="button"
              className="arrow arrow--back"
              onClick={() => go(isAr ? 1 : -1)}
              aria-label={t('prev')}
            >
              <ArrowStep size={22} direction={isAr ? 'forward' : 'back'} />
            </button>
            <button
              type="button"
              className="arrow arrow--fwd"
              onClick={() => go(isAr ? -1 : 1)}
              aria-label={t('next')}
            >
              <ArrowStep size={22} direction={isAr ? 'back' : 'forward'} />
            </button>
          </>
        ) : null}

        {/* ── the clock, made visible ─────────────────────────────────────── */}
        {defaults.showProgress !== false && count > 1 ? (
          <div className="track" aria-hidden>
            {autoplay || count > 1 ? (
              <span
                key={safeIndex}
                className="fill"
                style={{
                  animationDuration: `${hold}ms`,
                  animationPlayState: autoplay ? 'running' : 'paused',
                }}
                onAnimationEnd={() => go(1)}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ── the control deck ───────────────────────────────────────────────── */}
      <div className="deck">
        <div className="deck-mullion">
          {count > 1 && defaults.showIndicators !== false ? (
            <div className="dots" role="tablist" aria-label={label}>
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === safeIndex}
                  aria-label={`${i + 1} · ${s.title || s.eyebrow}`}
                  className={`dot${i === safeIndex ? ' is-on' : ''}`}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
          ) : null}

          <div className="deck-tools">
            {count > 1 ? (
              <button
                type="button"
                className="tool"
                onClick={() => {
                  if (isMediaSlide && !mediaPlaybackEnabled) {
                    setMediaPlaybackEnabled(true);
                    setUserPaused(false);
                  } else {
                    setUserPaused((p) => !p);
                  }
                }}
                aria-pressed={paused}
                aria-label={paused ? t('play') : t('pause')}
                title={paused ? t('play') : t('pause')}
              >
                {paused ? <IconPlay size={16} /> : <IconPause size={16} />}
              </button>
            ) : null}
            <button
              type="button"
              className="tool"
              onClick={toggleFullscreen}
              aria-label={isFull ? t('exitFullscreen') : t('fullscreen')}
              title={isFull ? t('exitFullscreen') : t('fullscreen')}
            >
              {isFull ? <IconCollapse size={16} /> : <IconExpand size={16} />}
            </button>
            <span className="counter">
              {String(safeIndex + 1).padStart(2, '0')}
              <span className="counter-slash">/</span>
              {String(count).padStart(2, '0')}
            </span>
          </div>
        </div>

        {count > 1 ? (
          <ul className="strip">
            {slides.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={`frame${i === safeIndex ? ' is-on' : ''}`}
                  onClick={() => goTo(i)}
                  aria-label={`${s.title || s.eyebrow}`}
                  aria-current={i === safeIndex || undefined}
                >
                  {s.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.url} alt="" loading="lazy" />
                  ) : (
                    <span className="frame-void"><IconCamera size={15} /></span>
                  )}
                  <span className="frame-flag">
                    {s.mediaType === 'youtube' || s.mediaType === 'video'
                      ? <IconPlay size={9} />
                      : s.mediaType === 'embed'
                        ? <IconExpand size={9} />
                        : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Screen readers get position changes; the visual clock does not carry text. */}
      <p className="sr-only" aria-live="polite" aria-atomic>
        {`${safeIndex + 1} ${t('slideOf')} — ${headline}`}
      </p>
    </div>
  );
}

// ── the media behind the words ───────────────────────────────────────────────
/**
 * The pane that admits it is unfinished: photography the owner has not uploaded,
 * or a value nobody authored. Stating it is better than an empty frame, which a
 * visitor reads as a broken page rather than as work in progress.
 */
function PendingPane({ isAr, hasValue }: { isAr: boolean; hasValue: boolean }) {
  return (
    <div className="pending">
      <span className="pending-plate">
        <IconCamera size={26} />
        <span className="pending-line">{isAr ? UI.photoPending.ar : UI.photoPending.en}</span>
        {!hasValue ? (
          <span className="pending-sub">{isAr ? UI.valuePending.ar : UI.valuePending.en}</span>
        ) : null}
      </span>
    </div>
  );
}

function PaneBody({
  slide,
  isActive,
  isMounted,
  animation,
  reduced,
  locale,
  defaults,
  brand,
}: {
  slide: Slide;
  isActive: boolean;
  isMounted: boolean;
  animation: 'kenburns' | 'fade' | 'zoom' | 'slide';
  reduced: boolean;
  locale: SiteLocale;
  defaults: CarouselDefaults;
  brand?: string;
}) {
  const isAr = locale === 'ar';
  const fit = slide.imageFit ?? 'cover';
  const position = slide.imagePosition ?? 'center';
  const cls = `media anim-${animation}${reduced ? ' anim-off' : ''}`;

  if (slide.displayMode === 'text_only') {
    return <div className="ground" style={slide.bgColor ? { background: slide.bgColor } : undefined} />;
  }

  // A pane with nothing behind it has two honest readings, and they are not the
  // same surface. A value with no photograph yet is a *typographic* slide: the
  // number is real authoring, so it gets the branded glass. A field nobody has
  // answered has no number to print, so it says what is missing instead of
  // presenting a headline that is really a question.
  if (slide.mediaType === 'branded') {
    if (!slide.title.trim()) return <PendingPane isAr={isAr} hasValue={false} />;
    return (
      <div className="branded" style={slide.bgColor ? { background: slide.bgColor } : undefined}>
        <span className="branded-rule" aria-hidden />
        <span className="branded-rule branded-rule--2" aria-hidden />
        {(slide.watermark ?? defaults.watermark ?? brand)?.trim() ? (
          <span className="branded-mark" aria-hidden>
            {(slide.watermark ?? defaults.watermark ?? brand)!.trim()}
          </span>
        ) : null}
      </div>
    );
  }

  if (!slide.url) return <PendingPane isAr={isAr} hasValue={Boolean(slide.title.trim())} />;

  switch (slide.mediaType) {
    case 'youtube':
      return slide.videoId && isMounted ? (
        <YouTubePane
          videoId={slide.videoId}
          isActive={isActive}
          title={slide.title || slide.eyebrow}
          ar={isAr}
          posterUrl={slide.url}
          maxDuration={slide.maxDuration}
          reducedMotion={reduced}
        />
      ) : (
        // Outside the lazy window, or the row never carried an ID: the film's
        // poster still fills the pane.
        <YouTubePoster
          videoId={slide.videoId ?? ''}
          posterUrl={slide.url}
          className={cls}
          style={{ objectFit: fit, objectPosition: position }}
        />
      );

    case 'video':
      return <NativeVideo slide={slide} isActive={isActive} className={cls} />;

    case 'embed':
      if (!isMounted) return <div className="ground" />;
      const src = embedSource(slide.url, isActive, reduced);
      return src ? (
        <iframe
          className={`${cls} embed`}
          src={src}
          title={slide.title || slide.eyebrow}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : <PendingPane isAr={isAr} hasValue={Boolean(slide.title.trim())} />;

    case 'image':
    default:
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={cls}
          src={slide.url}
          alt={slide.title || slide.eyebrow}
          style={{ objectFit: fit, objectPosition: position }}
          loading={isActive ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={isActive ? 'high' : 'auto'}
        />
      );
  }
}

function NativeVideo({
  slide,
  isActive,
  className,
}: {
  slide: Slide;
  isActive: boolean;
  className: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (isActive) { void v.play().catch(() => { /* blocked: first frame stays */ }); }
    else v.pause();
  }, [isActive]);
  return (
    <video
      ref={ref}
      className={className}
      src={slide.url ?? undefined}
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={slide.title || slide.eyebrow}
    />
  );
}

function CTA({
  slide,
  label,
  onJump,
  accent,
}: {
  slide: Slide;
  label: string;
  onJump: (sectionId: string) => void;
  accent?: string;
}) {
  const style = accent ? { borderColor: accent, color: accent } : undefined;
  if (slide.targetSectionId && !slide.ctaLink) {
    return (
      <button type="button" className="cta" style={style} onClick={() => onJump(slide.targetSectionId!)}>
        {label}
      </button>
    );
  }
  const external = /^https?:/i.test(slide.ctaLink ?? '');
  return (
    <a
      className="cta"
      style={style}
      href={slide.ctaLink ?? '#'}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {label}
    </a>
  );
}
