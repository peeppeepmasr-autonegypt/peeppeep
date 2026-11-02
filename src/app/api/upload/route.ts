/**
 * POST /api/upload — authenticated image upload into R2.
 *
 * The future admin UI (Phase E) calls this to attach gallery photos. It is gated
 * by a bearer secret so it is never an open upload endpoint:
 *   Authorization: Bearer <UPLOAD_SECRET>
 * (UPLOAD_SECRET is a wrangler secret in prod, set in .dev.vars locally.)
 *
 * Body: multipart/form-data with a single "file" field (image/*).
 * Returns: { key, url } — store `url` as vendor_gallery.url.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { putImage, isAllowedImageType, mediaUrl } from '@/lib/media';

export const runtime = 'edge';

async function authorized(req: NextRequest): Promise<boolean> {
  const { env } = await getCloudflareContext({ async: true });
  const secret = (env as unknown as { UPLOAD_SECRET?: string }).UPLOAD_SECRET;
  if (!secret) {
    // Misconfigured: fail closed rather than allow anonymous uploads.
    return false;
  }
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return token === secret;
}

export async function POST(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'expected multipart/form-data' }, { status: 415 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing "file" field' }, { status: 400 });
  }
  if (!isAllowedImageType(file.type)) {
    return NextResponse.json({ error: `unsupported type: ${file.type || 'unknown'}` }, { status: 415 });
  }
  // 10 MB cap keeps the worker memory envelope safe.
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'file too large (max 10MB)' }, { status: 413 });
  }

  const data = await file.arrayBuffer();
  const { key } = await putImage(data, file.type || 'application/octet-stream', file.name || 'image');
  return NextResponse.json({ key, url: mediaUrl(key) }, { status: 201 });
}
