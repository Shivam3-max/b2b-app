import { orderStatus } from './orders.ts';
import { ORDER_FOR_ALERT } from './queries.ts';
import { admin } from './shopify.ts';

/**
 * Order alerts. Shopify calls /webhooks/shopify when an order is created or a fulfillment changes;
 * we look up the customer's phones and send a push through Expo's push service.
 */

const MESSAGES: Record<string, (name: string) => { title: string; body: string }> = {
  'orders/create': n => ({ title: `Order ${n} received`, body: 'The factory team will confirm it shortly.' }),
  packed: n => ({ title: `Order ${n} is packed`, body: 'It will be handed to the courier soon.' }),
  shipped: n => ({ title: `Order ${n} is on its way`, body: 'Tap to track your delivery.' }),
  delivered: n => ({ title: `Order ${n} delivered`, body: 'Thank you for ordering with B2B Store.' }),
};

export async function handleOrderWebhook(topic: string, payload: { id?: number; admin_graphql_api_id?: string; order_id?: number }) {
  const orderGid = payload.admin_graphql_api_id?.includes('/Order/')
    ? payload.admin_graphql_api_id
    : payload.order_id ? `gid://shopify/Order/${payload.order_id}` : payload.id ? `gid://shopify/Order/${payload.id}` : null;
  if (!orderGid) return { sent: 0, reason: 'no order id' };

  const r = await admin<{ order: { name: string; cancelledAt: string | null; displayFulfillmentStatus: string; fulfillments: { status: string; displayStatus: string | null; createdAt: string; inTransitAt: string | null; deliveredAt: string | null }[]; customer: { id: string; metafield: { value: string } | null } | null } | null }>(ORDER_FOR_ALERT, { id: orderGid });
  const o = r.order;
  if (!o?.customer?.metafield) return { sent: 0, reason: 'customer has no app' };
  let tokens: string[] = [];
  try { tokens = JSON.parse(o.customer.metafield.value); } catch { tokens = []; }
  if (!tokens.length) return { sent: 0, reason: 'no tokens' };

  const key = topic === 'orders/create' ? topic : orderStatus(o);
  const make = MESSAGES[key] ?? (topic.startsWith('fulfillment') ? MESSAGES.shipped : null);
  if (!make) return { sent: 0, reason: `no message for ${key}` };
  const msg = make(o.name);

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(tokens.map(to => ({ to, sound: 'default', title: msg.title, body: msg.body, data: { url: `b2bstore://order/${encodeURIComponent(orderGid)}` } }))),
  });
  return { sent: res.ok ? tokens.length : 0, reason: res.ok ? 'ok' : `expo ${res.status}` };
}
