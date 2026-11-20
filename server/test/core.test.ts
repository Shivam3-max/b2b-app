import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';

process.env.SESSION_SECRET = 'test-secret-test-secret-test-secret-123';
process.env.SHOPIFY_CLIENT_SECRET = 'whsec';
const { sign, verify, verifyShopifyWebhook } = await import('../src/crypto.ts');
const { checkOtp, startOtp } = await import('../src/otp.ts');
const { orderStatus, piecesPerUnit } = await import('../src/orders.ts');
const { normalisePhone } = await import('../src/app.ts');
const { fieldsToSettings } = await import('../src/settings.ts');
const { toAppCustomer } = await import('../src/customers.ts');

test('signed tokens verify, reject tampering and expire', () => {
  const t = sign({ sub: 'x' }, 'k', 60);
  assert.equal(verify<{ sub: string }>(t, 'k')?.sub, 'x');
  assert.equal(verify(t, 'other'), null);
  assert.equal(verify(t.slice(0, -2) + 'aa', 'k'), null);
  assert.equal(verify(sign({ sub: 'x' }, 'k', -1), 'k'), null);
});

test('OTP: right code passes, wrong code and wrong phone fail, then locks', async () => {
  process.env.OTP_DEV_MODE = 'true';
  const { env } = await import('../src/env.ts');
  env.otpDevMode = true;
  const { requestId, devCode } = await startOtp('+919876543210', 'sms');
  assert.ok(devCode && /^\d{6}$/.test(devCode));
  assert.equal(checkOtp('+919876543210', devCode!, requestId), 'ok');
  assert.equal(checkOtp('+919811111111', devCode!, requestId), 'expired');
  const r2 = await startOtp('+919876543211', 'sms');
  const wrong = r2.devCode === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) assert.equal(checkOtp('+919876543211', wrong, r2.requestId), 'wrong');
  assert.equal(checkOtp('+919876543211', r2.devCode!, r2.requestId), 'locked');
});

test('Shopify webhook signatures', () => {
  const body = '{"id":1}';
  const good = createHmac('sha256', 'whsec').update(body).digest('base64');
  assert.equal(verifyShopifyWebhook(body, good, 'whsec'), true);
  assert.equal(verifyShopifyWebhook(body + ' ', good, 'whsec'), false);
  assert.equal(verifyShopifyWebhook(body, undefined, 'whsec'), false);
});

test('phone numbers', () => {
  assert.equal(normalisePhone('98765 43210'), '+919876543210');
  assert.equal(normalisePhone('+91 98765-43210'), '+919876543210');
  assert.equal(normalisePhone('09876543210'), '+919876543210');
  assert.equal(normalisePhone('12345'), null);
  assert.equal(normalisePhone('5876543210'), null);
});

test('order pieces and status from real Shopify shapes', () => {
  assert.equal(piecesPerUnit('Set of 4 pcs | 22-24-26-28 | 1 Pcs each'), 4);
  assert.equal(piecesPerUnit('Pack Of 7 | 24-26-28-30-32-34-36'), 7);
  assert.equal(piecesPerUnit('Sample pc'), 1);
  assert.equal(piecesPerUnit('18-24 Month'), 1);
  assert.equal(orderStatus({ cancelledAt: null, displayFulfillmentStatus: 'UNFULFILLED', fulfillments: [] }), 'placed');
  assert.equal(orderStatus({ cancelledAt: null, displayFulfillmentStatus: 'FULFILLED', fulfillments: [{ status: 'SUCCESS', displayStatus: 'FULFILLED', createdAt: '', inTransitAt: null, deliveredAt: null }] }), 'packed');
  assert.equal(orderStatus({ cancelledAt: null, displayFulfillmentStatus: 'FULFILLED', fulfillments: [{ status: 'SUCCESS', displayStatus: 'IN_TRANSIT', createdAt: '', inTransitAt: '2026-11-17', deliveredAt: null }] }), 'shipped');
  assert.equal(orderStatus({ cancelledAt: '2026-11-01', displayFulfillmentStatus: 'UNFULFILLED', fulfillments: [] }), 'cancelled');
});

test('settings from the Shopify metaobject', () => {
  const s = fieldsToSettings([{ key: 'offer_banner', value: '' }, { key: 'whatsapp_number', value: '+91 98765 43210' }, { key: 'home_collections', value: '["infant-winter-wear"]' }]);
  assert.equal(s.offerBanner, null);
  assert.equal(s.whatsappNumber, '+91 98765 43210');
  assert.deepEqual(s.homeCollections, ['infant-winter-wear']);
  assert.equal(fieldsToSettings([]).offerBanner, 'Extra 2% off on full advance payment');
});

test('customer mapping hides placeholder emails and falls back to name as shop name', () => {
  const c = toAppCustomer({
    id: 'gid://shopify/Customer/1', firstName: 'sample', lastName: 'kids', tags: [], numberOfOrders: '3', amountSpent: { amount: '14356.16' },
    defaultPhoneNumber: { phoneNumber: '+919876500001' }, defaultEmailAddress: { emailAddress: 'no-email-919876500001@gmail.com' },
    defaultAddress: { id: 'a', address1: 'shop 19', address2: null, city: 'Pune', zip: '411038', province: 'Maharashtra', provinceCode: 'MH', phone: null },
    metafields: { nodes: [{ key: 'gstin', value: '27ABCDE1234F1Z5' }] },
  });
  assert.equal(c.email, null);
  assert.equal(c.shopName, 'sample kids');
  assert.equal(c.gstin, '27ABCDE1234F1Z5');
  assert.equal(c.ordersCount, 3);
});
