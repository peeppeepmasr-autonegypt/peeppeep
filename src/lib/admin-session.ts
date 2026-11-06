import { getCloudflareContext } from '@opennextjs/cloudflare';

const DEV_SESSION_SECRET = 'autoportal-local-session-key-not-for-production';
const encoder = new TextEncoder();
const runtimeEnv: Record<string, string | undefined> = process.env;

async function getSessionKey(): Promise<CryptoKey> {
  const context = await getCloudflareContext({ async: true });
  const env = context.env as { ADMIN_SESSION_SECRET?: string };
  const secret = env.ADMIN_SESSION_SECRET || runtimeEnv.ADMIN_SESSION_SECRET;
  const usableSecret = secret || (runtimeEnv.NODE_ENV !== 'production' ? DEV_SESSION_SECRET : '');
  if (!usableSecret) {
    throw new Error('ADMIN_SESSION_SECRET must be configured before issuing or verifying admin sessions.');
  }
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(usableSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function toBase64Url(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(value.byteLength);
  new Uint8Array(copy).set(value);
  return copy;
}

export async function createAdminSession(email: string, expiresAt: number): Promise<string> {
  const payload = `${email}\n${expiresAt}`;
  const signature = await crypto.subtle.sign('HMAC', await getSessionKey(), encoder.encode(payload));
  return `${toBase64Url(encoder.encode(email))}.${expiresAt}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyAdminSession(value: string): Promise<string | null> {
  const [encodedEmail, expiry, encodedSignature, ...extra] = value.split('.');
  if (!encodedEmail || !expiry || !encodedSignature || extra.length) return null;
  const expiresAt = Number(expiry);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;
  try {
    const email = new TextDecoder().decode(fromBase64Url(encodedEmail));
    if (!email.includes('@')) return null;
    const payload = `${email}\n${expiresAt}`;
    const signature = toArrayBuffer(fromBase64Url(encodedSignature));
    const valid = await crypto.subtle.verify(
      'HMAC',
      await getSessionKey(),
      signature,
      encoder.encode(payload),
    );
    return valid ? email : null;
  } catch (error) {
    if (error instanceof Error && error.message.includes('ADMIN_SESSION_SECRET')) throw error;
    return null;
  }
}
