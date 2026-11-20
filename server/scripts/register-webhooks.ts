/**
 * Registers the order-alert webhooks for the Dev Dashboard app (run once after the server is deployed).
 * Safe to re-run: existing subscriptions to the same address are kept.
 * Run: SERVER_URL=https://<your-server> npm run webhooks
 */
import { admin, checkUserErrors } from '../src/shopify.ts';

const base = (process.env.SERVER_URL ?? '').replace(/\/$/, '');
if (!/^https:\/\//.test(base)) throw new Error('Set SERVER_URL to the deployed server, e.g. https://b2bstore-app-server.vercel.app');
const uri = `${base}/webhooks/shopify`;
const TOPICS = ['ORDERS_CREATE', 'ORDERS_FULFILLED', 'FULFILLMENTS_CREATE', 'FULFILLMENTS_UPDATE'];

const existing = await admin<{ webhookSubscriptions: { nodes: { topic: string; uri: string }[] } }>(
  `query { webhookSubscriptions(first: 50) { nodes { topic uri } } }`);
for (const topic of TOPICS) {
  if (existing.webhookSubscriptions.nodes.some(w => w.topic === topic && w.uri === uri)) {
    console.log('already subscribed:', topic);
    continue;
  }
  const r = await admin<{ webhookSubscriptionCreate: { userErrors: { field: string[]; message: string }[] } }>(
    `mutation($topic: WebhookSubscriptionTopic!, $sub: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $sub) { webhookSubscription { id } userErrors { field message } }
    }`, { topic, sub: { uri, format: 'JSON' } });
  checkUserErrors(r.webhookSubscriptionCreate.userErrors);
  console.log('subscribed:', topic);
}
console.log('Order alerts will be sent to', uri);
