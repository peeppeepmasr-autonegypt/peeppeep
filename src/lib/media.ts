/**
 * R2 media helper — image storage for gallery uploads (Cloudflare R2 binding).
 *
 * Isolation rule: nothing here touches MySQL/TiDB or the legacy marketplace.
 * The bucket is the `MEDIA` R2 binding declared in wrangler.jsonc, read the same
 * connectionless way as D1 (getCloudflareContext), so it works under Workers and
 * local dev (Miniflare). Objects are served back through GET /api/media/[...key].
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';

// ── Minimal structural types (no @cloudflare/workers-types needed) ────────────
interface R2Uploaded { key: string; }
interface R2ObjectLike {
  body: ReadableStream | null;
  contentType?: string | null;
}
interface R2Bucket {
  put(key: string, value: ArrayBuffer | Uint8Array | string, options?: {
    httpMediaType?: string;
    contentType?: string;
  }): Promise<R2Uploaded | null>;
  get(key: string): Promise<R2ObjectLike | null>;
}

async function getBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  const bucket = (env as unknown as { MEDIA?: R2Bucket }).MEDIA;
  if (!bucket) throw new Error('R2 binding "MEDIA" is not available. Check wrangler.jsonc.');
  return bucket;
}

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

export function isAllowedImageType(mime: string): boolean {
  return Object.prototype.hasOwnProperty.call(ALLOWED_IMAGE_TYPES, mime);
}

function extensionFor(mime: string, fileName: string): string {
  if (ALLOWED_IMAGE_TYPES[mime]) return ALLOWED_IMAGE_TYPES[mime];
  // Fall back to a sanitized extension from the name; never allow traversal.
  const m = /\.([a-z0-9]+)$/i.exec(fileName || '');
  return m ? m[1].toLowerCase().slice(0, 5) : 'bin';
}

/** Mime type for a stored key, used when the object carries no content type. */
function mimeFromKey(key: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(key);
  const ext = m ? m[1].toLowerCase() : '';
  const found = Object.entries(ALLOWED_IMAGE_TYPES).find(([, e]) => e === ext);
  return found ? found[0] : 'application/octet-stream';
}

/**
 * Store an image in R2 under gallery/ and return the storage key.
 * Key is content-addressed-ish (basename + short uuid) and always safe.
 */
export async function putImage(
  data: ArrayBuffer,
  contentType: string,
  baseName: string,
): Promise<{ key: string }> {
  const clean = (baseName || 'image')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'image';
  const ext = extensionFor(contentType, baseName);
  // Web Crypto, not Node's 'crypto' module: the edge runtime rejects the latter.
  const uuid = globalThis.crypto.randomUUID();
  const key = `gallery/${clean}-${uuid.slice(0, 8)}.${ext}`;

  const bucket = await getBucket();
  // Both fields: Workers uses httpMediaType for the stored content type, while
  // local Miniflare only honours contentType.
  const res = await bucket.put(key, data, { httpMediaType: contentType, contentType });
  if (!res) throw new Error('R2 put failed');
  return { key };
}

/** Read an image back out of R2 for streaming to the client. */
export async function getImage(key: string): Promise<{ stream: ReadableStream | null; contentType: string } | null> {
  const bucket = await getBucket();
  const obj = await bucket.get(key);
  if (!obj) return null;
  return {
    stream: obj.body ?? null,
    contentType: obj.contentType || mimeFromKey(key),
  };
}

/** Public path that GET /api/media/[...key] serves this key from. */
export function mediaUrl(key: string): string {
  return `/api/media/${key}`;
}
