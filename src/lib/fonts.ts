import { Playfair_Display, Noto_Naskh_Arabic, Inter, Geist_Mono, IBM_Plex_Sans_Arabic, Cairo } from 'next/font/google';

export const cairoFont = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-cairo',
  display: 'swap',
});

/**
 * Gold-luxury type: a high-contrast editorial serif (Latin) paired with a
 * confident geometric (Arabic), over a light-thin body face.
 *
 * The heading stack is `Playfair Display → Noto Naskh Arabic → serif`: Latin
 * keeps its editorial contrast while Arabic headings use a more classical form.
 *
 * Body: Inter 300 (Latin) + IBM Plex Sans Arabic 300 — the thinnest weights
 * that still hold legibility at 14px, giving long specs a whispered authority
 * rather than shouting.
 */

/** Display voice — Playfair's high contrast is the Bentley-plate serif. */
export const headingFont = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700', '800', '900'],
  variable: '--font-playfair',
  display: 'swap',
});

/** Arabic display — a classical Naskh face for public Arabic headings. */
export const arabicDisplayFont = Noto_Naskh_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic-display',
  display: 'swap',
});

/** Latin body at light weights: luxury breathes. */
export const bodyLatin = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-inter',
  display: 'swap',
});

/** Arabic body — the technical grotesque that covers RTL script properly. */
export const bodyArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-plex-arabic',
  display: 'swap',
});

/** Tabular mono for prices, counters, IDs. */
export const monoFont = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

/** Applied to <html> by HtmlShell. */
export const fontVars =
  `${headingFont.variable} ${arabicDisplayFont.variable} ${bodyLatin.variable} ${bodyArabic.variable} ${monoFont.variable} h-full antialiased`;
