/**
 * App configuration. Values come from EXPO_PUBLIC_* environment variables (see .env.example),
 * with safe defaults so the catalogue works before any keys exist.
 */
export const config = {
  /** The store's permanent myshopify domain. */
  shopDomain: process.env.EXPO_PUBLIC_SHOPIFY_DOMAIN ?? 'aub1my-11.myshopify.com',
  /** Storefront API version. */
  apiVersion: process.env.EXPO_PUBLIC_SHOPIFY_API_VERSION ?? '2025-07',
  /**
   * Public Storefront API token from the Headless channel. Optional: without it the app uses
   * Shopify's tokenless access (products, collections, cart), and stock counts stay hidden.
   */
  storefrontToken: process.env.EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN ?? '',
  /** The B2B Store app server (login, orders, bills, settings, alerts). Empty until deployed. */
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, ''),
  /** Public website, used for links to policies. */
  website: 'https://www.b2bstore.in',
} as const;

export const hasServer = () => config.apiUrl.length > 0;
