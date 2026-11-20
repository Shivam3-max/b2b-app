import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';

/** Small signed tokens (HS256 JWT). No database: OTP requests and sessions carry their own proof. */

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url');

export function sign(payload: Record<string, unknown>, secret: string, ttlSeconds: number): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + ttlSeconds }));
  const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verify<T extends Record<string, unknown>>(token: string, secret: string): T | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = createHmac('sha256', secret).update(`${header}.${body}`).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T & { exp?: number };
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Hash of an OTP bound to the phone and the request, so a code can't be reused elsewhere. */
export const hashCode = (code: string, phone: string, nonce: string, secret: string) =>
  createHmac('sha256', secret).update(`${phone}:${nonce}:${code}`).digest('base64url');

export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');
export const newNonce = () => createHash('sha256').update(`${Date.now()}:${Math.random()}:${randomInt(0, 1e9)}`).digest('base64url').slice(0, 16);

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Shopify webhook signature check (X-Shopify-Hmac-Sha256 over the raw body). */
export function verifyShopifyWebhook(rawBody: string, hmacHeader: string | undefined, secret: string): boolean {
  if (!hmacHeader || !secret) return false;
  const digest = createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  return safeEqual(digest, hmacHeader);
}
