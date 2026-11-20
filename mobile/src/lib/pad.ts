import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getStyleColours } from './shopify/api';
import { BuyOption, Product } from './shopify/model';
import { ListLine, parseOrderList } from './orderList';

/** The order pad: rows of designs with set quantities. Kept on the phone so nothing is lost if the app closes. */
export type PadRow = { product: Product; qty: Record<string, number> };

type PadState = {
  rows: PadRow[];
  addProduct: (p: Product, qty?: Record<string, number>) => void;
  setQty: (productId: string, variantId: string, n: number) => void;
  removeRow: (productId: string) => void;
  clear: () => void;
};

export const usePad = create<PadState>()(
  persist(
    set => ({
      rows: [],
      addProduct: (product, qty = {}) =>
        set(s => {
          const existing = s.rows.find(r => r.product.id === product.id);
          if (existing) {
            const merged = { ...existing.qty };
            Object.entries(qty).forEach(([k, v]) => { merged[k] = (merged[k] ?? 0) + v; });
            return { rows: s.rows.map(r => (r.product.id === product.id ? { product, qty: merged } : r)) };
          }
          return { rows: [{ product, qty }, ...s.rows] };
        }),
      setQty: (productId, variantId, n) =>
        set(s => ({ rows: s.rows.map(r => (r.product.id === productId ? { ...r, qty: { ...r.qty, [variantId]: Math.max(0, n) } } : r)) })),
      removeRow: productId => set(s => ({ rows: s.rows.filter(r => r.product.id !== productId) })),
      clear: () => set({ rows: [] }),
    }),
    { name: 'b2bstore.pad', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export type MatchResult = ListLine & {
  product: Product | null;
  option: BuyOption | null;
  /** Other size ranges the shopkeeper can switch to. */
  alternatives: BuyOption[];
  problem: string | null;
};

/** Pick the set matching a size hint like ["26","30"], else the first available set. */
function pickOption(p: Product, sizeHint: string[]): BuyOption | null {
  const sets = p.options.filter(o => o.kind !== 'sample');
  if (sizeHint.length) {
    const [a, b] = sizeHint;
    const hit = sets.find(o => o.sizes.includes(a) && o.sizes.includes(b)) ?? sets.find(o => o.sizes.includes(a));
    if (hit) return hit;
  }
  return sets.find(o => o.available) ?? sets[0] ?? null;
}

/** Matches each pasted line to a real Shopify product and set. Never guesses an unknown code. */
export async function matchOrderList(text: string): Promise<MatchResult[]> {
  const lines = parseOrderList(text);
  const cache = new Map<string, Product[]>();
  const out: MatchResult[] = [];
  for (const line of lines) {
    if (!line.code) {
      out.push({ ...line, product: null, option: null, alternatives: [], problem: 'No style code on this line' });
      continue;
    }
    if (!cache.has(line.code)) cache.set(line.code, await getStyleColours(line.code).catch(() => []));
    const colours = cache.get(line.code)!;
    if (!colours.length) {
      out.push({ ...line, product: null, option: null, alternatives: [], problem: 'No design with this code' });
      continue;
    }
    const hint = line.colourHint?.toLowerCase();
    const product = (hint && colours.find(c => `${c.colour ?? ''} ${c.name}`.toLowerCase().includes(hint))) || (colours.length === 1 ? colours[0] : null);
    if (!product) {
      out.push({ ...line, product: colours[0], option: pickOption(colours[0], line.sizeHint), alternatives: [], problem: `${colours.length} colours: check the colour` });
      continue;
    }
    const option = pickOption(product, line.sizeHint);
    out.push({
      ...line,
      product,
      option,
      alternatives: product.options.filter(o => o.kind !== 'sample' && o.variantId !== option?.variantId),
      problem: option && !option.available ? 'This set is sold out' : null,
    });
  }
  return out;
}
