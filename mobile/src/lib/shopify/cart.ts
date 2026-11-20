import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { storefront } from './client';
import { Money, packValue, parsePack, parseTitle } from './model';

/**
 * The cart lives in Shopify (Storefront Cart API), so prices, availability and the checkout link
 * always come from the store. Only the cart ID is kept on the phone.
 */

export type CartLine = {
  id: string;
  quantity: number;
  variantId: string;
  label: string;
  sizes: string[];
  pieces: number;
  unitPrice: number;
  unitMrp: number | null;
  lineTotal: number;
  productHandle: string;
  productTitle: string;
  code: string | null;
  colour: string | null;
  name: string;
  image: string | null;
  available: boolean;
};
export type Cart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  subtotal: number;
  total: number;
  lines: CartLine[];
  pieces: number;
  /** Stock message from Shopify after the last change, e.g. a set that just sold out. */
  note?: string | null;
};

const CART_KEY = 'b2bstore.cartId';

const cartFields = `
  id checkoutUrl totalQuantity
  cost { subtotalAmount { amount } totalAmount { amount } }
  lines(first: 100) {
    nodes {
      id quantity
      cost { totalAmount { amount } }
      merchandise {
        ... on ProductVariant {
          id title availableForSale
          price { amount } compareAtPrice { amount }
          selectedOptions { name value }
          image { url(transform: { maxWidth: 240, preferredContentType: WEBP }) }
          product { handle title featuredImage { url(transform: { maxWidth: 240, preferredContentType: WEBP }) } }
        }
      }
    }
  }`;

type RawCart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { subtotalAmount: Money; totalAmount: Money };
  lines: { nodes: any[] };
};

function toCart(raw: RawCart): Cart {
  const lines: CartLine[] = raw.lines.nodes.filter(n => n.quantity > 0).map(n => {
    const v = n.merchandise;
    const pack = parsePack(packValue({ ...v, price: v.price }).pack);
    const t = parseTitle(v.product.title);
    const price = Number(v.price.amount);
    const mrp = v.compareAtPrice ? Number(v.compareAtPrice.amount) : null;
    return {
      id: n.id,
      quantity: n.quantity,
      variantId: v.id,
      label: pack.label,
      sizes: pack.sizes,
      pieces: pack.pieces,
      unitPrice: price,
      unitMrp: mrp != null && mrp > price ? mrp : null,
      lineTotal: Number(n.cost.totalAmount.amount),
      productHandle: v.product.handle,
      productTitle: v.product.title,
      code: t.code,
      colour: t.colour,
      name: t.name,
      image: v.image?.url ?? v.product.featuredImage?.url ?? null,
      available: v.availableForSale,
    };
  });
  return {
    id: raw.id,
    checkoutUrl: raw.checkoutUrl,
    totalQuantity: raw.totalQuantity,
    subtotal: Number(raw.cost.subtotalAmount.amount),
    total: Number(raw.cost.totalAmount.amount),
    lines,
    pieces: lines.reduce((a, l) => a + l.pieces * l.quantity, 0),
  };
}

type UserError = { message: string };
const firstError = (errs?: UserError[]) => (errs && errs.length ? errs[0].message : null);
/** Shopify reports stock problems (sold out, not enough stock) as warnings, not errors. */
const stockNote = (warnings?: UserError[]) => (warnings && warnings.length ? warnings[0].message.replace(/^The product '(.+?)' is/, "$1 is") : null);

async function createCart(lines: { merchandiseId: string; quantity: number }[]): Promise<Cart> {
  const data = await storefront<{ cartCreate: { cart: RawCart | null; userErrors: UserError[]; warnings?: UserError[] } }>(
    `mutation($input: CartInput!) { cartCreate(input: $input) { cart { ${cartFields} } userErrors { message } warnings { message } } }`,
    { input: { lines, buyerIdentity: { countryCode: 'IN' } } },
  );
  const err = firstError(data.cartCreate.userErrors);
  if (err || !data.cartCreate.cart) throw new Error(err ?? 'Could not create the cart.');
  await AsyncStorage.setItem(CART_KEY, data.cartCreate.cart.id);
  return { ...toCart(data.cartCreate.cart), note: stockNote(data.cartCreate.warnings) };
}

async function fetchCart(id: string): Promise<Cart | null> {
  const data = await storefront<{ cart: RawCart | null }>(`query($id: ID!) { cart(id: $id) { ${cartFields} } }`, { id });
  return data.cart ? toCart(data.cart) : null;
}

type CartState = {
  cart: Cart | null;
  busy: boolean;
  error: string | null;
  load: () => Promise<void>;
  add: (lines: { variantId: string; quantity: number }[]) => Promise<void>;
  setQuantity: (lineId: string, quantity: number) => Promise<void>;
  remove: (lineId: string) => Promise<void>;
  reset: () => Promise<void>;
};

export const useCart = create<CartState>((set, get) => {
  /** Runs a cart mutation and stores the fresh cart Shopify returns. */
  async function mutate(field: string, query: string, variables: Record<string, unknown>) {
    set({ busy: true, error: null });
    try {
      const data = await storefront<Record<string, { cart: RawCart | null; userErrors: UserError[]; warnings?: UserError[] }>>(query, variables);
      const res = data[field];
      const err = firstError(res.userErrors);
      if (err) throw new Error(err);
      if (res.cart) set({ cart: { ...toCart(res.cart), note: stockNote(res.warnings) } });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Something went wrong.' });
      throw e;
    } finally {
      set({ busy: false });
    }
  }

  return {
    cart: null,
    busy: false,
    error: null,

    async load() {
      const id = await AsyncStorage.getItem(CART_KEY);
      if (!id) return;
      try {
        const cart = await fetchCart(id);
        if (cart) set({ cart });
        else await AsyncStorage.removeItem(CART_KEY); // expired or already checked out
      } catch {
        /* offline: keep whatever is on screen */
      }
    },

    async add(lines) {
      const clean = lines.filter(l => l.quantity > 0).map(l => ({ merchandiseId: l.variantId, quantity: l.quantity }));
      if (!clean.length) return;
      const cart = get().cart;
      if (!cart) {
        set({ busy: true, error: null });
        try {
          set({ cart: await createCart(clean) });
        } catch (e) {
          set({ error: e instanceof Error ? e.message : 'Could not add to cart.' });
          throw e;
        } finally {
          set({ busy: false });
        }
        return;
      }
      await mutate('cartLinesAdd', `mutation($cartId: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ${cartFields} } userErrors { message } warnings { message } } }`, { cartId: cart.id, lines: clean });
    },

    async setQuantity(lineId, quantity) {
      const cart = get().cart;
      if (!cart) return;
      if (quantity <= 0) return get().remove(lineId);
      await mutate('cartLinesUpdate', `mutation($cartId: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ${cartFields} } userErrors { message } warnings { message } } }`, { cartId: cart.id, lines: [{ id: lineId, quantity }] });
    },

    async remove(lineId) {
      const cart = get().cart;
      if (!cart) return;
      await mutate('cartLinesRemove', `mutation($cartId: ID!, $lineIds: [ID!]!) { cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ${cartFields} } userErrors { message } warnings { message } } }`, { cartId: cart.id, lineIds: [lineId] });
    },

    async reset() {
      await AsyncStorage.removeItem(CART_KEY);
      set({ cart: null });
    },
  };
});
