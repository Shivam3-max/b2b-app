/**
 * Turns raw Shopify products into the shapes the app shows: style code, colour, GSM, fabric,
 * and buying options (sample, sets of N, packs, single sizes) with price per piece and MRP.
 * Pure functions: no network, easy to test (see model.test.ts).
 */

export type Money = { amount: string; currencyCode?: string };
export type RawOption = { name: string; value: string };
export type RawVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  quantityAvailable?: number | null;
  price: Money;
  compareAtPrice?: Money | null;
  selectedOptions?: RawOption[];
  image?: { url: string } | null;
};
export type RawProduct = {
  id: string;
  handle: string;
  title: string;
  productType?: string;
  tags?: string[];
  availableForSale: boolean;
  description?: string;
  featuredImage?: { url: string; altText?: string | null } | null;
  images?: { nodes: { url: string; altText?: string | null }[] };
  variants: { nodes: RawVariant[] };
};

export type BuyOptionKind = 'sample' | 'set' | 'size';
export type BuyOption = {
  variantId: string;
  kind: BuyOptionKind;
  /** Short label such as "Sample", "Set of 4", "6–9 M". */
  label: string;
  /** Sizes inside the set, e.g. ["22","24","26","28"]. Empty for samples. */
  sizes: string[];
  pieces: number;
  price: number;
  mrp: number | null;
  pricePerPiece: number;
  mrpPerPiece: number | null;
  available: boolean;
  stock: number | null;
  colour: string | null;
};
export type Product = {
  id: string;
  handle: string;
  title: string;
  code: string | null;
  colour: string | null;
  name: string;
  gsm: string | null;
  fabric: string | null;
  category: string | null;
  image: string | null;
  images: string[];
  description: string;
  available: boolean;
  options: BuyOption[];
  /** The option shown on cards: the first set or pack, else the first option. */
  main: BuyOption | null;
};

const num = (m?: Money | null) => (m ? Number(m.amount) : NaN);
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Products that are not garments and must never show in the catalogue. */
export function isHiddenProduct(p: Pick<RawProduct, 'title' | 'tags'>): boolean {
  return /partial\s*payment|part\s*payment/i.test(p.title) || (p.tags ?? []).some(t => /^app-hidden$/i.test(t));
}

/** Reads the size/pack value of a variant, ignoring a separate Colour option. */
export function packValue(v: RawVariant): { pack: string; colour: string | null } {
  const opts = v.selectedOptions ?? [];
  const colourOpt = opts.find(o => /colou?r/i.test(o.name));
  const packOpt = opts.find(o => !/colou?r/i.test(o.name) && /sample|set|pack|\d/i.test(o.value)) ?? opts.find(o => !/colou?r/i.test(o.name));
  if (packOpt) return { pack: packOpt.value, colour: colourOpt?.value ?? null };
  // Fallback: split "Sample / Beige" style titles.
  const parts = v.title.split(' / ').map(clean);
  const pack = parts.find(p => /sample|set|pack|\d/i.test(p)) ?? parts[0];
  const colour = parts.find(p => p !== pack) ?? null;
  return { pack, colour };
}

/** Parses a pack value such as "Set of 4 pcs | 22-24-26-28 | 1 Pcs each". */
export function parsePack(value: string): { kind: BuyOptionKind; pieces: number; sizes: string[]; label: string } {
  const v = clean(value);
  if (/^sample$/i.test(v)) return { kind: 'sample', pieces: 1, sizes: [], label: 'Sample' };
  const m = v.match(/\b(set|pack)\s*(?:of)?\s*(\d+)/i);
  if (m) {
    const pieces = Number(m[2]);
    const word = m[1].toLowerCase() === 'pack' ? 'Pack' : 'Set';
    const rest = v
      .replace(m[0], ' ')
      .replace(/\b\d+\s*pcs?\s*e\w*/gi, ' ') // "1 pcs each", "1 pcs ech"
      .replace(/\bpcs?\b|\bsizes?\b/gi, ' ');
    const sizes = (rest.match(/\d+\s*(?:m|y|yrs?|months?)?\b/gi) ?? []).map(s => clean(s).toUpperCase());
    return { kind: 'set', pieces, sizes, label: `${word} of ${pieces}` };
  }
  // A single size such as "6-9 Month" or "12-18 months".
  const label = v.replace(/\s*months?$/i, ' M').replace(/\s*-\s*/g, '–');
  return { kind: 'size', pieces: 1, sizes: [label], label: clean(label) };
}

/** Splits "2603 - Pink - Girls Cord Set | 330 - 350 GSM Premium Cotton Fleece" into its parts. */
export function parseTitle(title: string): { code: string | null; colour: string | null; name: string; gsm: string | null; fabric: string | null } {
  const segments = title.split('|').map(clean).filter(Boolean);
  const head = segments[0] ?? title;
  const gsmMatch = title.match(/(\d{3})\s*[-–]\s*(\d{3})\s*gsm/i) ?? title.match(/(\d{3})\s*gsm/i);
  const gsm = gsmMatch ? (gsmMatch[2] ? `${gsmMatch[1]}–${gsmMatch[2]}` : gsmMatch[1]) : null;

  let fabric: string | null = null;
  const gsmSeg = segments.find(s => /gsm/i.test(s));
  if (gsmSeg) {
    const f = clean(gsmSeg.replace(/(\d{3})\s*[-–]\s*(\d{3})\s*gsm|(\d{3})\s*gsm/i, ' '));
    fabric = f && f.length <= 48 ? f : f ? f.slice(0, 45).replace(/\s+\S*$/, '') + '…' : null;
  }

  const m = head.match(/^(?:(YB|FL)\s*-\s*)?(\d{3,5})\s*-?\s*(.*)$/i);
  if (!m) return { code: null, colour: null, name: clean(head.replace(/\d{3}\s*[-–]\s*\d{3}\s*gsm.*/i, '')) || head, gsm, fabric };
  const code = m[2];
  const rest = clean(m[3].replace(/^-+|-+$/g, ''));
  const parts = rest.split(/\s+-\s*|\s*-\s+/).map(clean).filter(Boolean);
  let colour: string | null = null;
  let name: string;
  if (parts.length >= 2) {
    colour = parts[0];
    name = parts.slice(1).join(' - ');
  } else {
    name = parts[0] ?? rest;
  }
  if (!rest) return { code, colour: null, name: '', gsm, fabric };
  name = clean(name.replace(/\d{3}\s*[-–]\s*\d{3}\s*gsm.*/i, '').replace(/\d{3}\s*gsm.*/i, '')) || name;
  // Sentence-case all-lowercase names: "infant cord set" -> "Infant cord set".
  if (name === name.toLowerCase()) name = name.charAt(0).toUpperCase() + name.slice(1);
  return { code, colour, name, gsm, fabric };
}

export function toBuyOption(v: RawVariant): BuyOption {
  const { pack, colour } = packValue(v);
  const p = parsePack(pack);
  const price = num(v.price);
  const mrpRaw = num(v.compareAtPrice);
  const mrp = Number.isFinite(mrpRaw) && mrpRaw > price ? mrpRaw : null;
  return {
    variantId: v.id,
    kind: p.kind,
    label: p.label,
    sizes: p.sizes,
    pieces: p.pieces,
    price,
    mrp,
    pricePerPiece: price / p.pieces,
    mrpPerPiece: mrp != null ? mrp / p.pieces : null,
    available: v.availableForSale,
    stock: v.quantityAvailable ?? null,
    colour,
  };
}

export function toProduct(raw: RawProduct): Product {
  const t = parseTitle(raw.title);
  const options = raw.variants.nodes.map(toBuyOption).filter(o => !/part\s*payment/i.test(o.label));
  const main = options.find(o => o.kind === 'set' && o.available) ?? options.find(o => o.kind === 'set') ?? options.find(o => o.kind !== 'sample') ?? options[0] ?? null;
  const images = raw.images?.nodes.map(i => i.url) ?? (raw.featuredImage ? [raw.featuredImage.url] : []);
  const colourFromOption = options.find(o => o.colour)?.colour ?? null;
  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    code: t.code,
    colour: t.colour ?? colourFromOption,
    name: t.name || raw.productType || t.fabric || raw.title,
    gsm: t.gsm,
    fabric: t.fabric,
    category: raw.productType || null,
    image: raw.featuredImage?.url ?? images[0] ?? null,
    images,
    description: raw.description ?? '',
    available: raw.availableForSale,
    options,
    main,
  };
}

/** What the shopkeeper earns per piece: MRP minus price, or their markup when there is no MRP. */
export function earning(o: BuyOption, markupPct: number): { sellPerPiece: number; earnPerPiece: number; pctOfMrp: number | null; fromMrp: boolean } {
  if (o.mrpPerPiece != null) {
    return { sellPerPiece: o.mrpPerPiece, earnPerPiece: o.mrpPerPiece - o.pricePerPiece, pctOfMrp: ((o.mrpPerPiece - o.pricePerPiece) / o.mrpPerPiece) * 100, fromMrp: true };
  }
  const sell = Math.round(o.pricePerPiece * (1 + markupPct / 100));
  return { sellPerPiece: sell, earnPerPiece: sell - o.pricePerPiece, pctOfMrp: null, fromMrp: false };
}

/** Display name for a product: "2603 · Pink", or the cleaned name when there is no code. */
export const displayName = (p: Pick<Product, 'code' | 'colour' | 'name'>) =>
  p.code ? `${p.code} · ${p.colour ?? p.name}` : p.name;

export const rupees = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
