/**
 * GET /api/media/[...key] — stream an image out of R2 to the browser.
 *
 * R2 buckets are private by default; this route is how `mediaUrl(key)` becomes a
 * viewable <img> src. It guards against path traversal and caches hard, since
 * gallery keys are effectively immutable (they carry a random suffix).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getImage } from '@/lib/media';

export const runtime = 'edge';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  const path = (key ?? []).join('/');

  if (!path || path.includes('..') || path.includes('//')) {
    return new NextResponse('bad key', { status: 400 });
  }

  const obj = await getImage(path);
  if (!obj || !obj.stream) {
    return new NextResponse('not found', { status: 404 });
  }

  return new NextResponse(obj.stream as unknown as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': obj.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
