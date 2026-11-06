import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface D1Database {
  prepare(query: string): {
    bind(...values: string[]): {
      first<T>(): Promise<T | null>;
    };
  };
}

/**
 * Resolve managed minisite domains through D1 and keep the portal host intact.
 */
export async function middleware(req: NextRequest) {
  const hostHeader = req.headers.get('host');
  const host = new URL(`http://${hostHeader || req.nextUrl.hostname}`).hostname
    .toLowerCase()
    .replace(/\.$/, '');
  const { pathname } = req.nextUrl;

  // The main portal always owns the root domain.
  if (host === 'autofyon.com' || host === 'www.autofyon.com') {
    return NextResponse.next();
  }

  // Pass-through for assets, API routes, and admin panel.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const domainCandidates = host.startsWith('www.')
    ? [host, host.slice(4)]
    : [host, `www.${host}`];
  const { env } = getCloudflareContext();
  const db = (env as unknown as { DB?: D1Database }).DB;
  if (!db) {
    throw new Error('D1 binding "DB" is not available for custom-domain routing.');
  }

  const site = await db
    .prepare(
      `SELECT slug FROM businesses
        WHERE lower(custom_domain) IN (?, ?)
          AND published = 1 AND status = 'active'
        LIMIT 1`,
    )
    .bind(...domainCandidates)
    .first<{ slug: string }>();

  if (!site) return NextResponse.next();

  const url = req.nextUrl.clone();
  const englishPrefix = /^\/en(?:\/|$)/.test(pathname);
  const suffix = englishPrefix ? pathname.slice(3) : pathname;
  url.pathname = englishPrefix
    ? `/en/${site.slug}${suffix}`
    : `/${site.slug}${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
