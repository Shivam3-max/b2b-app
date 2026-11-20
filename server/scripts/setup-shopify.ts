/**
 * One-time store setup (safe to re-run). Creates, if missing:
 *  - the "B2B app settings" metaobject definition + one entry with today's website values
 *  - customer metafield definitions for the shop profile (so they show on the customer page in admin)
 * Run: npm run setup:shopify   (needs SHOPIFY_CLIENT_ID / SECRET in .env)
 */
import { admin, checkUserErrors } from '../src/shopify.ts';

const TYPE = 'b2b_app_settings';
const FIELDS = [
  ['offer_banner', 'Offer banner (yellow strip on Home)', 'single_line_text_field'],
  ['whatsapp_number', 'WhatsApp number for support', 'single_line_text_field'],
  ['support_phone', 'Support phone', 'single_line_text_field'],
  ['factory_address', 'Factory address', 'single_line_text_field'],
  ['factory_visit_text', 'Factory visit card text', 'single_line_text_field'],
  ['private_label_text', 'Private label card text', 'single_line_text_field'],
  ['minimum_order_note', 'Minimum order note', 'single_line_text_field'],
  ['home_collections', 'Collections to feature on Home (handles)', 'json'],
] as const;
const CUSTOMER_FIELDS = [
  ['shop_name', 'Shop name (app)', 'single_line_text_field'],
  ['gstin', 'GSTIN (app)', 'single_line_text_field'],
  ['business_type', 'Business type (app)', 'single_line_text_field'],
  ['transport', 'Preferred transport (app)', 'single_line_text_field'],
  ['categories', 'Categories sold (app)', 'json'],
  ['push_tokens', 'App push tokens', 'json'],
] as const;

const existing = await admin<{ metaobjectDefinitionByType: { id: string } | null }>(
  `query($t: String!) { metaobjectDefinitionByType(type: $t) { id } }`, { t: TYPE });
if (!existing.metaobjectDefinitionByType) {
  const r = await admin<{ metaobjectDefinitionCreate: { userErrors: { field: string[]; message: string }[] } }>(
    `mutation($d: MetaobjectDefinitionCreateInput!) { metaobjectDefinitionCreate(definition: $d) { metaobjectDefinition { id } userErrors { field message } } }`,
    { d: { type: TYPE, name: 'B2B app settings', access: { admin: 'MERCHANT_READ_WRITE' }, fieldDefinitions: FIELDS.map(([key, name, type]) => ({ key, name, type })) } });
  checkUserErrors(r.metaobjectDefinitionCreate.userErrors);
  console.log('created metaobject definition', TYPE);
}

const entries = await admin<{ metaobjects: { nodes: { id: string }[] } }>(`query { metaobjects(type: "${TYPE}", first: 1) { nodes { id } } }`);
if (!entries.metaobjects.nodes.length) {
  const r = await admin<{ metaobjectCreate: { userErrors: { field: string[]; message: string }[] } }>(
    `mutation($m: MetaobjectCreateInput!) { metaobjectCreate(metaobject: $m) { metaobject { id } userErrors { field message } } }`,
    { m: { type: TYPE, handle: 'main', fields: [
      { key: 'offer_banner', value: 'Extra 2% off on full advance payment' },
      { key: 'factory_address', value: 'Ludhiana, Punjab' },
      { key: 'factory_visit_text', value: 'Visit our Ludhiana factory' },
      { key: 'private_label_text', value: 'Your brand, our clothes: private label for bulk orders' },
    ] } });
  checkUserErrors(r.metaobjectCreate.userErrors);
  console.log('created settings entry (fill in WhatsApp number in Shopify admin)');
}

for (const [key, name, type] of CUSTOMER_FIELDS) {
  const r = await admin<{ metafieldDefinitionCreate: { userErrors: { code: string; message: string }[] } }>(
    `mutation($d: MetafieldDefinitionInput!) { metafieldDefinitionCreate(definition: $d) { createdDefinition { id } userErrors { code message } } }`,
    { d: { namespace: 'b2b_app', key, name, type, ownerType: 'CUSTOMER' } });
  const errs = r.metafieldDefinitionCreate.userErrors.filter(e => e.code !== 'TAKEN');
  if (errs.length) throw new Error(errs[0].message);
}
console.log('customer metafield definitions ready');
console.log('Done. Store setup complete.');
