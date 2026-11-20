import { canReadStock, storefront } from './client';
import { isHiddenProduct, RawProduct, toProduct, Product } from './model';

/* ---------- GraphQL ---------- */

const variantFields = () => `
  id title availableForSale ${canReadStock() ? 'quantityAvailable' : ''}
  price { amount currencyCode } compareAtPrice { amount currencyCode }
  selectedOptions { name value }`;

const cardFields = () => `
  id handle title productType tags availableForSale
  featuredImage { url(transform: { maxWidth: 640, preferredContentType: WEBP }) altText }
  variants(first: 12) { nodes { ${variantFields()} } }`;

const fullFields = () => `
  ${cardFields()}
  description
  images(first: 12) { nodes { url(transform: { maxWidth: 1080, preferredContentType: WEBP }) altText } }`;

export type CollectionSummary = { id: string; handle: string; title: string; description: string; image: string | null; firstProductImage: string | null };
export type ProductPage = { products: Product[]; hasNextPage: boolean; endCursor: string | null };
export type SortKey = 'NEWEST' | 'BEST_SELLING' | 'PRICE_ASC' | 'PRICE_DESC';

const collectionSort: Record<SortKey, { sortKey: string; reverse: boolean }> = {
  NEWEST: { sortKey: 'CREATED', reverse: true },
  BEST_SELLING: { sortKey: 'BEST_SELLING', reverse: false },
  PRICE_ASC: { sortKey: 'PRICE', reverse: false },
  PRICE_DESC: { sortKey: 'PRICE', reverse: true },
};
const productSort: Record<SortKey, { sortKey: string; reverse: boolean }> = {
  NEWEST: { sortKey: 'CREATED_AT', reverse: true },
  BEST_SELLING: { sortKey: 'BEST_SELLING', reverse: false },
  PRICE_ASC: { sortKey: 'PRICE', reverse: false },
  PRICE_DESC: { sortKey: 'PRICE', reverse: true },
};

const keep = (nodes: RawProduct[]) => nodes.filter(n => !isHiddenProduct(n)).map(toProduct);

/** Collections that are internal to the website and should not be browsed in the app. */
const HIDDEN_COLLECTIONS = /^(frontpage|all-colllections|all-collections)$/i;

/* ---------- Queries ---------- */

export async function getCollections(): Promise<CollectionSummary[]> {
  const data = await storefront<{ collections: { nodes: any[] } }>(`{
    collections(first: 60, sortKey: UPDATED_AT, reverse: true) {
      nodes { id handle title description image { url(transform: { maxWidth: 240, preferredContentType: WEBP }) } products(first: 1) { nodes { featuredImage { url(transform: { maxWidth: 240, preferredContentType: WEBP }) } } } }
    }
  }`);
  return data.collections.nodes
    .filter(c => !HIDDEN_COLLECTIONS.test(c.handle))
    .filter(c => c.products.nodes.length > 0)
    .map(c => ({
      id: c.id,
      handle: c.handle,
      title: tidyCollectionTitle(c.title),
      description: c.description ?? '',
      image: c.image?.url ?? null,
      firstProductImage: c.products.nodes[0]?.featuredImage?.url ?? null,
    }));
}

/** "INFANT WINTER COLLECTION | UP TO 2 YEARS | ₹265/- ONWARDS" -> "Infant Winter Collection". */
export function tidyCollectionTitle(t: string): string {
  const first = t.split('|')[0].trim();
  if (first !== first.toUpperCase()) return first;
  return first.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).replace(/\bT\b/g, 'T');
}

export async function getCollectionProducts(handle: string, sort: SortKey = 'NEWEST', after: string | null = null): Promise<ProductPage & { title: string; description: string }> {
  const s = collectionSort[sort];
  const data = await storefront<{ collection: any }>(
    `query($handle: String!, $after: String, $sortKey: ProductCollectionSortKeys!, $reverse: Boolean!) {
      collection(handle: $handle) {
        title description
        products(first: 24, after: $after, sortKey: $sortKey, reverse: $reverse) {
          pageInfo { hasNextPage endCursor }
          nodes { ${cardFields()} }
        }
      }
    }`,
    { handle, after, sortKey: s.sortKey, reverse: s.reverse },
  );
  if (!data.collection) throw new Error('This collection is no longer available.');
  const c = data.collection;
  return {
    title: tidyCollectionTitle(c.title),
    description: c.description ?? '',
    products: keep(c.products.nodes),
    hasNextPage: c.products.pageInfo.hasNextPage,
    endCursor: c.products.pageInfo.endCursor,
  };
}

export async function getProducts(opts: { sort?: SortKey; query?: string; first?: number; after?: string | null } = {}): Promise<ProductPage> {
  const s = productSort[opts.sort ?? 'NEWEST'];
  const data = await storefront<{ products: any }>(
    `query($first: Int!, $after: String, $query: String, $sortKey: ProductSortKeys!, $reverse: Boolean!) {
      products(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
        pageInfo { hasNextPage endCursor }
        nodes { ${cardFields()} }
      }
    }`,
    { first: opts.first ?? 24, after: opts.after ?? null, query: opts.query ?? null, sortKey: s.sortKey, reverse: s.reverse },
  );
  return { products: keep(data.products.nodes), hasNextPage: data.products.pageInfo.hasNextPage, endCursor: data.products.pageInfo.endCursor };
}

export async function getProduct(handle: string): Promise<Product | null> {
  const data = await storefront<{ product: RawProduct | null }>(
    `query($handle: String!) { product(handle: $handle) { ${fullFields()} } }`,
    { handle },
  );
  if (!data.product || isHiddenProduct(data.product)) return null;
  return toProduct(data.product);
}

/** Search by style code or words. A bare number matches the style code exactly first. */
export async function searchProducts(term: string): Promise<Product[]> {
  const q = term.trim();
  if (!q) return [];
  const isCode = /^\d{2,5}$/.test(q);
  // Shopify search matches word prefixes, so "26" finds 2603, 2604, 2650 and so on.
  const { products } = await getProducts({ query: isCode ? `title:${q}*` : q, first: 30, sort: 'BEST_SELLING' });
  if (!isCode) return products;
  return products
    .filter(p => p.code?.includes(q))
    .sort((a, b) => Number(b.code === q) - Number(a.code === q) || Number(b.code?.startsWith(q)) - Number(a.code?.startsWith(q)));
}

/** All colours of one style code, e.g. every 2570 jogger. */
export async function getStyleColours(code: string): Promise<Product[]> {
  const { products } = await getProducts({ query: `title:${code}*`, first: 20 });
  return products.filter(p => p.code === code);
}
