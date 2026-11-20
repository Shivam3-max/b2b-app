import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { handleOrderWebhook } from './alerts.ts';
import { sign, verify, verifyShopifyWebhook } from './crypto.ts';
import { addPushToken, eraseAppData, findOrCreateByPhone, getCustomer, updateProfile, type ProfilePatch } from './customers.ts';
import { assertConfigured, env } from './env.ts';
import { getOrder, listOrders } from './orders.ts';
import { canSend, checkOtp, startOtp } from './otp.ts';
import { getSettings } from './settings.ts';
import { ShopifyAdminError } from './shopify.ts';

type Vars = { customerId: string; phone: string };
export const app = new Hono<{ Variables: Vars }>();

const SESSION_TTL = 60 * 60 * 24 * 90; // 90 days: shopkeepers shouldn't have to log in often

app.use('/v1/*', cors({ origin: env.corsOrigins, allowHeaders: ['Content-Type', 'Authorization'], allowMethods: ['GET', 'POST', 'PUT', 'DELETE'] }));


app.onError((err, c) => {
  console.error('[error]', err);
  const msg = err instanceof ShopifyAdminError ? err.message : 'Something went wrong. Please try again.';
  return c.json({ error: msg }, 500);
});

/** Indian mobile in +91XXXXXXXXXX form, or null. */
export function normalisePhone(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const d = input.replace(/\D/g, '').replace(/^0+/, '');
  const ten = d.length === 12 && d.startsWith('91') ? d.slice(2) : d;
  return /^[6-9]\d{9}$/.test(ten) ? `+91${ten}` : null;
}

app.get('/', c => c.json({ name: 'B2B Store app server', ok: true }));
app.get('/health', c => {
  const missing = assertConfigured();
  return c.json({ ok: missing.length === 0, shop: env.shop, missing }, missing.length ? 503 : 200);
});

/* ---------- Public ---------- */

app.get('/v1/settings', async c => {
  c.header('Cache-Control', 'public, max-age=300');
  return c.json(await getSettings());
});

app.post('/v1/auth/otp/request', async c => {
  const body = await c.req.json().catch(() => ({}));
  const phone = normalisePhone(body.phone);
  if (!phone) return c.json({ error: 'Enter a valid 10-digit Indian mobile number.' }, 400);
  if (!canSend(phone)) return c.json({ error: 'Please wait a little before asking for another code.' }, 429);
  const channel = body.channel === 'sms' ? 'sms' : 'whatsapp';
  return c.json(await startOtp(phone, channel));
});

app.post('/v1/auth/otp/verify', async c => {
  const body = await c.req.json().catch(() => ({}));
  const phone = normalisePhone(body.phone);
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!phone || !/^\d{6}$/.test(code) || typeof body.requestId !== 'string') return c.json({ error: 'Enter the 6-digit code.' }, 400);
  const result = checkOtp(phone, code, body.requestId);
  if (result === 'expired') return c.json({ error: 'This code has expired. Ask for a new one.' }, 400);
  if (result === 'locked') return c.json({ error: 'Too many tries. Ask for a new code.' }, 429);
  if (result === 'wrong') return c.json({ error: 'That code is not right. Check and try again.' }, 400);
  const customer = await findOrCreateByPhone(phone);
  const token = sign({ typ: 'session', sub: customer.id, phone }, env.sessionSecret, SESSION_TTL);
  return c.json({ token, customer });
});

/** App crash reports. Logged only (visible in Vercel logs), never stored. */
const recentReports: number[] = [];
app.post('/v1/client-log', async c => {
  const now = Date.now();
  while (recentReports.length && now - recentReports[0] > 60_000) recentReports.shift();
  if (recentReports.length >= 30) return c.json({ ok: true });
  recentReports.push(now);
  const b = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
  console.error('[app-error]', JSON.stringify({ context: str(b.context, 20), message: str(b.message, 500), stack: str(b.stack, 3000), platform: str(b.platform, 10), version: String(b.version ?? '').slice(0, 10) }));
  return c.json({ ok: true });
});

/* ---------- Signed in ---------- */

async function requireSession(c: Context<{ Variables: Vars }>, next: () => Promise<void>) {
  const auth = c.req.header('Authorization') ?? '';
  const p = auth.startsWith('Bearer ') ? verify<{ typ: string; sub: string; phone: string }>(auth.slice(7), env.sessionSecret) : null;
  if (!p || p.typ !== 'session') return c.json({ error: 'Please sign in again.' }, 401);
  c.set('customerId', p.sub);
  c.set('phone', p.phone);
  await next();
}
app.use('/v1/me', requireSession);
app.use('/v1/me/*', requireSession);
app.use('/v1/orders', requireSession);
app.use('/v1/orders/*', requireSession);
app.use('/v1/push/*', requireSession);

app.get('/v1/me', async c => {
  const customer = await getCustomer(c.get('customerId'));
  if (!customer) return c.json({ error: 'Please sign in again.' }, 401);
  return c.json({ customer });
});

app.put('/v1/me', async c => {
  const b = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (v: unknown, max = 120) => (typeof v === 'string' ? v.slice(0, max) : undefined);
  const gstin = typeof b.gstin === 'string' ? b.gstin.trim().toUpperCase() : b.gstin === null ? null : undefined;
  if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) return c.json({ error: 'That GSTIN does not look right.' }, 400);
  const a = b.address as Record<string, unknown> | undefined;
  const patch: ProfilePatch = {
    firstName: str(b.firstName, 60), lastName: str(b.lastName, 60), shopName: str(b.shopName), gstin,
    businessType: str(b.businessType, 40), transport: str(b.transport),
    categories: Array.isArray(b.categories) ? b.categories.filter((x): x is string => typeof x === 'string').map(x => x.slice(0, 40)) : undefined,
    address: a && typeof a.address1 === 'string' ? { address1: String(a.address1).slice(0, 200), city: String(a.city ?? '').slice(0, 80), zip: String(a.zip ?? '').slice(0, 10), province: String(a.province ?? '').slice(0, 60) } : undefined,
  };
  return c.json({ customer: await updateProfile(c.get('customerId'), patch) });
});

app.delete('/v1/me', async c => {
  await eraseAppData(c.get('customerId'));
  return c.json({ ok: true });
});

app.get('/v1/orders', async c => c.json({ orders: await listOrders(c.get('customerId')) }));

app.get('/v1/orders/:id', async c => {
  const id = decodeURIComponent(c.req.param('id'));
  if (!/^gid:\/\/shopify\/Order\/\d+$/.test(id)) return c.json({ error: 'Order not found.' }, 404);
  const order = await getOrder(c.get('customerId'), id);
  return order ? c.json({ order }) : c.json({ error: 'Order not found.' }, 404);
});

app.post('/v1/push/register', async c => {
  const { token } = (await c.req.json().catch(() => ({}))) as { token?: string };
  if (!token || !/^ExponentPushToken\[.+\]$|^ExpoPushToken\[.+\]$/.test(token)) return c.json({ error: 'Invalid push token.' }, 400);
  await addPushToken(c.get('customerId'), token);
  return c.json({ ok: true });
});

/* ---------- Shopify webhooks ---------- */

app.post('/webhooks/shopify', async c => {
  const raw = await c.req.text();
  if (!verifyShopifyWebhook(raw, c.req.header('X-Shopify-Hmac-Sha256'), env.webhookSecret)) return c.text('invalid signature', 401);
  const topic = c.req.header('X-Shopify-Topic') ?? '';
  try {
    const result = await handleOrderWebhook(topic, JSON.parse(raw));
    console.log('[webhook]', topic, result);
  } catch (e) {
    console.error('[webhook] failed', topic, e); // still 200: Shopify retries would only repeat the failure
  }
  return c.text('ok');
});
