import { CUSTOMER_ORDERS, ORDER_DETAIL } from './queries.ts';
import { admin } from './shopify.ts';

export type OrderStatus = 'placed' | 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'cancelled';

type Fulfillment = { status: string; displayStatus: string | null; createdAt: string; inTransitAt: string | null; deliveredAt: string | null; trackingInfo?: { company: string | null; number: string | null; url: string | null }[] };
type RawOrder = {
  id: string;
  name: string;
  createdAt: string;
  cancelledAt: string | null;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string;
  currentSubtotalLineItemsQuantity: number;
  currentTotalPriceSet: { shopMoney: { amount: string } };
  lineItems: { nodes: { image: { url: string } | null; quantity: number; variantTitle: string | null }[] };
  detailLines?: { nodes: { name: string; title: string; variantTitle: string | null; quantity: number; image: { url: string } | null; originalTotalSet: { shopMoney: { amount: string } }; variant: { id: string; product: { handle: string } } | null }[] };
  fulfillments: Fulfillment[];
  customer: { id: string } | null;
  statusPageUrl?: string;
  paymentGatewayNames?: string[];
  totalOutstandingSet?: { shopMoney: { amount: string } };
  shippingAddress?: { address1: string | null; city: string | null; zip: string | null; province: string | null } | null;
};

/** Pieces in a line: "Set of 4 pcs | …" counts 4 per unit, a sample or single size counts 1. */
export function piecesPerUnit(variantTitle: string | null): number {
  const m = (variantTitle ?? '').match(/\b(?:set|pack)\s*(?:of)?\s*(\d+)/i);
  return m ? Number(m[1]) : 1;
}

/** Maps Shopify's statuses to the simple steps a shopkeeper understands. */
export function orderStatus(o: Pick<RawOrder, 'cancelledAt' | 'displayFulfillmentStatus' | 'fulfillments'>): OrderStatus {
  if (o.cancelledAt) return 'cancelled';
  const f = o.fulfillments ?? [];
  if (f.some(x => x.deliveredAt || x.displayStatus === 'DELIVERED')) return 'delivered';
  if (f.some(x => x.inTransitAt || ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'ATTEMPTED_DELIVERY'].includes(x.displayStatus ?? ''))) return 'shipped';
  if (o.displayFulfillmentStatus === 'FULFILLED' || o.displayFulfillmentStatus === 'PARTIALLY_FULFILLED') return 'packed';
  if (['IN_PROGRESS', 'SCHEDULED', 'ON_HOLD', 'PENDING_FULFILLMENT'].includes(o.displayFulfillmentStatus)) return 'confirmed';
  return 'placed';
}

const FINANCIAL: Record<string, string> = {
  PAID: 'Paid in full', PARTIALLY_PAID: 'Part-paid', PENDING: 'Payment pending', AUTHORIZED: 'Payment authorised',
  REFUNDED: 'Refunded', PARTIALLY_REFUNDED: 'Partly refunded', VOIDED: 'Cancelled', EXPIRED: 'Payment expired',
};

function summary(o: RawOrder) {
  return {
    id: o.id,
    name: o.name,
    createdAt: o.createdAt,
    status: orderStatus(o),
    financialStatus: FINANCIAL[o.displayFinancialStatus ?? ''] ?? (o.displayFinancialStatus ?? ''),
    total: Number(o.currentTotalPriceSet.shopMoney.amount),
    pieces: o.lineItems.nodes.reduce((a, l) => a + l.quantity * piecesPerUnit(l.variantTitle), 0),
    images: [...new Set(o.lineItems.nodes.map(l => l.image?.url).filter((u): u is string => !!u))].slice(0, 4),
  };
}

export async function listOrders(customerId: string) {
  const r = await admin<{ customer: { orders: { nodes: RawOrder[] } } | null }>(CUSTOMER_ORDERS, { id: customerId });
  return (r.customer?.orders.nodes ?? []).map(summary);
}

/** Order detail, only if it belongs to this customer. */
export async function getOrder(customerId: string, orderId: string) {
  const r = await admin<{ order: RawOrder | null }>(ORDER_DETAIL, { id: orderId });
  const o = r.order;
  if (!o || o.customer?.id !== customerId) return null;
  const s = summary(o);
  const f = o.fulfillments ?? [];
  const firstShip = f.find(x => x.inTransitAt)?.inTransitAt ?? null;
  const delivered = f.find(x => x.deliveredAt)?.deliveredAt ?? null;
  const order = ['placed', 'confirmed', 'packed', 'shipped', 'delivered'];
  const reached = (st: OrderStatus) => s.status !== 'cancelled' && order.indexOf(s.status) >= order.indexOf(st);
  const outstanding = Number(o.totalOutstandingSet?.shopMoney.amount ?? 0);
  return {
    ...s,
    financialStatus: outstanding > 0 ? `${s.financialStatus} · ₹${Math.round(outstanding).toLocaleString('en-IN')} due` : s.financialStatus,
    lines: (o.detailLines?.nodes ?? []).map(l => ({
      title: l.title ?? l.name ?? '',
      variant: l.variantTitle ?? '',
      quantity: l.quantity,
      total: Number(l.originalTotalSet?.shopMoney.amount ?? 0),
      image: l.image?.url ?? null,
      productHandle: l.variant?.product.handle ?? null,
      variantId: l.variant?.id ?? null,
    })),
    tracking: f.flatMap(x => x.trackingInfo ?? []).map(t => ({ company: t.company, number: t.number, url: t.url })),
    timeline: [
      { label: 'Order placed', at: o.createdAt, done: true },
      { label: 'Confirmed by factory', at: null, done: reached('confirmed') },
      { label: 'Packed', at: f[0]?.createdAt ?? null, done: reached('packed') },
      { label: 'Shipped', at: firstShip, done: reached('shipped') },
      { label: 'Delivered', at: delivered, done: reached('delivered') },
    ],
    // Shopify's order status page; a GST invoice link replaces this once an invoice app is chosen.
    invoiceUrl: o.statusPageUrl ?? null,
    paymentMethod: (o.paymentGatewayNames ?? []).filter(g => g !== 'manual').join(', ') || null,
    shippingAddress: o.shippingAddress ? [o.shippingAddress.address1, o.shippingAddress.city, o.shippingAddress.zip].filter(Boolean).join(', ') : null,
  };
}
