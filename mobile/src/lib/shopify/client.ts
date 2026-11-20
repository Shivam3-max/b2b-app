import { config } from '../config';

export class ShopifyError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'ShopifyError';
  }
}

/** Calls the Shopify Storefront API. Every price, product, collection and cart comes through here. */
export async function storefront<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (config.storefrontToken) headers['X-Shopify-Storefront-Access-Token'] = config.storefrontToken;

  let res: Response;
  try {
    res = await fetch(`https://${config.shopDomain}/api/${config.apiVersion}/graphql.json`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });
  } catch (e) {
    throw new ShopifyError('No internet connection. Check your network and try again.', e);
  }
  if (!res.ok) throw new ShopifyError(`The store did not respond (${res.status}). Please try again.`);

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new ShopifyError(json.errors[0].message, json.errors);
  if (!json.data) throw new ShopifyError('The store sent an empty reply.');
  return json.data;
}

/** True when a Storefront token is configured, which unlocks stock counts. */
export const canReadStock = () => config.storefrontToken.length > 0;
