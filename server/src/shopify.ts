import { env } from './env.ts';

/**
 * Shopify Admin API client. Uses the Dev Dashboard app's client-credentials grant (tokens last
 * about 24 hours and are refreshed automatically), or a fixed SHOPIFY_ADMIN_TOKEN.
 */

let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (env.adminToken) return env.adminToken;
  if (cached && cached.expiresAt > Date.now() + 5 * 60_000) return cached.token;
  const res = await fetch(`https://${env.shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: env.clientId, client_secret: env.clientSecret, grant_type: 'client_credentials' }),
  });
  if (!res.ok) throw new ShopifyAdminError(`Shopify refused the app credentials (${res.status}). Check the app is installed on the store.`);
  const json = (await res.json()) as { access_token: string; expires_in?: number };
  cached = { token: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 86_400) * 1000 };
  return cached.token;
}

export class ShopifyAdminError extends Error {
  details: unknown;
  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ShopifyAdminError';
    this.details = details;
  }
}

export async function admin<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const token = await accessToken();
  const res = await fetch(`https://${env.shop}/admin/api/${env.apiVersion}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  if (res.status === 401) { cached = null; throw new ShopifyAdminError('Shopify session expired. Please try again.'); }
  if (!res.ok) throw new ShopifyAdminError(`Shopify returned ${res.status}.`);
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new ShopifyAdminError(json.errors[0].message, json.errors);
  return json.data as T;
}

/** Throws the first userError from a mutation result, if any. */
export function checkUserErrors(errors: { field?: string[] | null; message: string }[] | undefined) {
  if (errors && errors.length) throw new ShopifyAdminError(errors[0].message, errors);
}
