/**
 * sitemap.ts — the public URLs a crawler can index.
 *
 * Sources (union, deduped by path):
 *   - home in both locales
 *   - /cars + /brands in both locales
 *   - every published businesses minisite in both locales
 *   - every published unit (car) in both locales
 *
 * Cloudflare Workers edge runtime: the file must be sync-with-Promise, not
 * streaming. Keep the query cost low; the whole site currently fits in a
 * handful of SELECTs.
 */
import type { MetadataRoute } from 'next';
import { query } from '@/lib/db';
import { localePath } from '@/lib/site-locale';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://autofyon.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [businesses, units] = await Promise.all([
    query<{ slug: string; updated_at: string }>(
      `SELECT slug, updated_at FROM businesses
        WHERE published = 1 AND status = 'active' AND parent_business_id IS NULL
          OR (published = 1 AND status = 'active')`,
    ),
    query<{ seller_slug: string; unit_slug: string; updated_at: string }>(
      `SELECT u.slug AS unit_slug, s.slug AS seller_slug, u.updated_at
         FROM units u JOIN businesses s ON s.id = u.seller_business_id
        WHERE u.published = 1 AND u.status <> 'inactive'`,
    ),
  ]);

  const out: MetadataRoute.Sitemap = [];

  // Static roots
  for (const loc of ['ar', 'en'] as const) {
    out.push({ url: `${BASE}${localePath(loc, [])}`, changeFrequency: 'daily', priority: 1.0 });
    out.push({ url: `${BASE}${localePath(loc, ['cars'])}`, changeFrequency: 'hourly', priority: 0.9 });
    out.push({ url: `${BASE}${localePath(loc, ['brands'])}`, changeFrequency: 'daily', priority: 0.7 });
  }

  // Business minisites
  for (const b of businesses) {
    const lastModified = b.updated_at ? new Date(b.updated_at) : undefined;
    for (const loc of ['ar', 'en'] as const) {
      out.push({
        url: `${BASE}${localePath(loc, [b.slug])}`,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  }

  // Units
  for (const u of units) {
    const lastModified = u.updated_at ? new Date(u.updated_at) : undefined;
    for (const loc of ['ar', 'en'] as const) {
      out.push({
        url: `${BASE}${localePath(loc, [u.seller_slug, 'u', u.unit_slug])}`,
        lastModified,
        changeFrequency: 'daily',
        priority: 0.8,
      });
    }
  }

  return out;
}
