import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge Middleware for AutoPortal & Multi-Tenant Custom Showroom Domains.
 *
 * Rules:
 * 1. autonegypt.com (and www.autonegypt.com, autonegypt.local:3000):
 *    -> Dedicated Private Showroom Domain for "Auto One Egypt" (slug: 'auto-one-egypt').
 *    -> Visitor stays on autonegypt.com in their browser while viewing the showroom website!
 *
 * 2. Portal Free Domain (localhost:3000, *.workers.dev, *.pages.dev):
 *    -> Serves the National Multi-Showroom Portal Directory.
 *
 * 3. Any other registered custom showroom domain:
 *    -> Maps to that showroom's unique slug transparently.
 */
export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase();
  const { pathname } = req.nextUrl;

  // Static assets, Next internals, and API routes pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Known custom domain mappings
  const customDomainMap: Record<string, string> = {
    // Showroom's real private domain:
    'autonegypt.com': 'auto-one-egypt',
    'www.autonegypt.com': 'auto-one-egypt',
    'autonegypt.local': 'auto-one-egypt',
    'autonegypt.local:3000': 'auto-one-egypt',

    // Secondary demo showroom:
    'cairomotors.local': 'cairo-motors',
    'cairomotors.local:3000': 'cairo-motors',
    'cairomotors.com': 'cairo-motors',
  };

  const targetSlug = customDomainMap[host];

  if (targetSlug) {
    const url = req.nextUrl.clone();
    // Bilingual routing: /en (English) vs bare path (Arabic)
    if (pathname.startsWith('/en')) {
      const subpath = pathname.replace(/^\/en/, '');
      url.pathname = `/en/${targetSlug}${subpath || ''}`;
    } else {
      url.pathname = `/${targetSlug}${pathname === '/' ? '' : pathname}`;
    }
    return NextResponse.rewrite(url);
  }

  // Otherwise, request is accessing the portal root (free domain or localhost)
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
