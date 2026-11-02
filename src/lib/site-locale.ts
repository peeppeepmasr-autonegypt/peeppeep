/**
 * Site locale for public pages.
 *
 * Arabic is the language of the market, so it owns the bare address: `/`,
 * `/demo-bmw`, `/demo-bmw/sec_auto_exterior` are all Arabic. English is the
 * explicit alternate and lives under `/en/...`.
 *
 * Routing shape (no rewrite middleware needed): the App Router ranks the
 * static `en/...` tree above the dynamic `[slug]` tree, so `/en/<x>` renders the
 * English pages and a bare `/<x>` renders Arabic. Each locale tree passes this
 * constant down; `dir` follows from it.
 */
export type SiteLocale = 'ar' | 'en';

export const SITE_LOCALES: SiteLocale[] = ['ar', 'en'];

/** The language a URL with no prefix speaks. */
export const DEFAULT_LOCALE: SiteLocale = 'ar';

export function isSiteLocale(v: unknown): v is SiteLocale {
  return v === 'ar' || v === 'en';
}

/** Text direction for a locale — Arabic is right-to-left. */
export function localeDir(locale: SiteLocale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

/** Pick a localized value, falling back across locales then to any string. */
export function pick<T extends Record<string, unknown>>(
  row: T | null | undefined,
  enKey: string,
  arKey: string,
  locale: SiteLocale,
): string | null {
  if (!row) return null;
  const primary = locale === 'ar' ? row[arKey] : row[enKey];
  if (typeof primary === 'string' && primary.trim()) return primary;
  const fallback = locale === 'ar' ? row[enKey] : row[arKey];
  if (typeof fallback === 'string' && fallback.trim()) return fallback;
  return null;
}

/**
 * Build a locale-correct URL path. Arabic is the bare path; English carries the
 * `/en` prefix. `segments` are joined with slashes (e.g. ['demo-bmw', 'sec_auto_specs']).
 */
export function localePath(locale: SiteLocale, segments: (string | number)[]): string {
  const clean = segments
    .filter((s) => s !== '' && s != null)
    .map((s) => String(s))
    .join('/');
  const suffix = clean ? `/${clean}` : '';
  return locale === 'en' ? `/en${suffix || '/'}` : suffix || '/';
}
