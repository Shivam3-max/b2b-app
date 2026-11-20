import { NS, ADDRESS_CREATE, ADDRESS_UPDATE, CREATE_CUSTOMER, DELETE_METAFIELDS, FIND_CUSTOMER_BY_PHONE, GET_CUSTOMER, SET_METAFIELDS, UPDATE_CUSTOMER } from './queries.ts';
import { admin, checkUserErrors } from './shopify.ts';

/** The shop profile the app shows, built from a Shopify customer and its b2b_app metafields. */
export type AppCustomer = {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  shopName: string | null;
  gstin: string | null;
  city: string | null;
  pincode: string | null;
  businessType: string | null;
  transport: string | null;
  categories: string[];
  address: { address1: string; city: string; zip: string; province: string } | null;
  ordersCount: number;
  amountSpent: number;
};

type RawCustomer = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  tags: string[];
  numberOfOrders: string;
  amountSpent: { amount: string };
  defaultPhoneNumber: { phoneNumber: string } | null;
  defaultEmailAddress: { emailAddress: string } | null;
  defaultAddress: { id: string; address1: string | null; address2: string | null; city: string | null; zip: string | null; province: string | null; provinceCode: string | null; phone: string | null } | null;
  metafields: { nodes: { key: string; value: string }[] };
};

const PROFILE_KEYS = ['shop_name', 'gstin', 'business_type', 'transport', 'categories'] as const;

export function toAppCustomer(c: RawCustomer, phoneFallback = ''): AppCustomer {
  const mf = Object.fromEntries(c.metafields.nodes.map(n => [n.key, n.value]));
  let categories: string[] = [];
  try { categories = mf.categories ? JSON.parse(mf.categories) : []; } catch { categories = []; }
  const email = c.defaultEmailAddress?.emailAddress ?? null;
  const a = c.defaultAddress;
  return {
    id: c.id,
    phone: c.defaultPhoneNumber?.phoneNumber ?? a?.phone ?? phoneFallback,
    firstName: c.firstName,
    lastName: c.lastName,
    // Some checkout apps store placeholder emails like no-email-91...@gmail.com; hide those.
    email: email && !/^no-email-/i.test(email) ? email : null,
    // Website customers often use the shop name as their name, so fall back to it.
    shopName: mf.shop_name ?? (c.firstName || c.lastName ? [c.firstName, c.lastName].filter(Boolean).join(' ') : null),
    gstin: mf.gstin ?? null,
    city: a?.city ?? null,
    pincode: a?.zip ?? null,
    businessType: mf.business_type ?? null,
    transport: mf.transport ?? null,
    categories,
    address: a ? { address1: a.address1 ?? '', city: a.city ?? '', zip: a.zip ?? '', province: a.province ?? '' } : null,
    ordersCount: Number(c.numberOfOrders ?? 0),
    amountSpent: Number(c.amountSpent?.amount ?? 0),
  };
}

/** Finds the Shopify customer for a verified phone number, creating one for a new shop. */
export async function findOrCreateByPhone(phone: string): Promise<AppCustomer> {
  const found = await admin<{ customers: { nodes: RawCustomer[] } }>(FIND_CUSTOMER_BY_PHONE, { q: `phone:${phone}` });
  // Prefer the account that has orders, in case the same phone appears twice.
  const existing = found.customers.nodes.sort((a, b) => Number(b.numberOfOrders) - Number(a.numberOfOrders))[0];
  if (existing) return toAppCustomer(existing, phone);
  const created = await admin<{ customerCreate: { customer: RawCustomer | null; userErrors: { field: string[]; message: string }[] } }>(CREATE_CUSTOMER, {
    input: { phone, tags: ['b2b-app'] },
  });
  checkUserErrors(created.customerCreate.userErrors);
  return toAppCustomer(created.customerCreate.customer!, phone);
}

export async function getCustomer(id: string): Promise<AppCustomer | null> {
  const r = await admin<{ customer: RawCustomer | null }>(GET_CUSTOMER, { id });
  return r.customer ? toAppCustomer(r.customer) : null;
}

export type ProfilePatch = Partial<Pick<AppCustomer, 'firstName' | 'lastName' | 'shopName' | 'gstin' | 'businessType' | 'transport' | 'categories' | 'address'>>;

/** Saves the shop profile to Shopify: name on the customer, address as the default address, the rest as metafields. */
export async function updateProfile(id: string, patch: ProfilePatch): Promise<AppCustomer> {
  if (patch.firstName !== undefined || patch.lastName !== undefined) {
    const r = await admin<{ customerUpdate: { userErrors: { field: string[]; message: string }[] } }>(UPDATE_CUSTOMER, {
      input: { id, firstName: patch.firstName ?? undefined, lastName: patch.lastName ?? undefined },
    });
    checkUserErrors(r.customerUpdate.userErrors);
  }

  const values: Record<(typeof PROFILE_KEYS)[number], string | null | undefined> = {
    shop_name: patch.shopName?.trim(),
    gstin: patch.gstin === undefined ? undefined : patch.gstin ? patch.gstin.trim().toUpperCase() : null,
    business_type: patch.businessType,
    transport: patch.transport?.trim(),
    categories: patch.categories ? JSON.stringify(patch.categories.slice(0, 20)) : undefined,
  };
  const toSet = Object.entries(values).filter(([, v]) => typeof v === 'string' && v.length > 0);
  if (toSet.length) {
    const r = await admin<{ metafieldsSet: { userErrors: { field: string[]; message: string }[] } }>(SET_METAFIELDS, {
      metafields: toSet.map(([key, value]) => ({ ownerId: id, namespace: NS, key, value, type: key === 'categories' ? 'json' : 'single_line_text_field' })),
    });
    checkUserErrors(r.metafieldsSet.userErrors);
  }
  const toClear = Object.entries(values).filter(([, v]) => v === null || v === '').map(([key]) => ({ ownerId: id, namespace: NS, key }));
  if (toClear.length) await admin(DELETE_METAFIELDS, { metafields: toClear });

  if (patch.address && patch.address.address1?.trim()) {
    const current = await admin<{ customer: RawCustomer }>(GET_CUSTOMER, { id });
    const address = {
      address1: patch.address.address1.trim(),
      city: patch.address.city?.trim() || undefined,
      zip: patch.address.zip?.trim() || undefined,
      province: patch.address.province?.trim() || undefined,
      country: 'India',
      phone: current.customer.defaultPhoneNumber?.phoneNumber ?? undefined,
      company: values.shop_name ?? undefined,
    };
    const addrId = current.customer.defaultAddress?.id;
    const r = addrId
      ? await admin<{ customerAddressUpdate: { userErrors: { field: string[]; message: string }[] } }>(ADDRESS_UPDATE, { customerId: id, addressId: addrId, address })
      : await admin<{ customerAddressCreate: { userErrors: { field: string[]; message: string }[] } }>(ADDRESS_CREATE, { customerId: id, address });
    checkUserErrors('customerAddressUpdate' in r ? r.customerAddressUpdate.userErrors : r.customerAddressCreate.userErrors);
  }
  return (await getCustomer(id))!;
}

/** Account deletion: removes everything the app stored. Orders stay with the business, as the law requires. */
export async function eraseAppData(id: string): Promise<void> {
  await admin(DELETE_METAFIELDS, {
    metafields: [...PROFILE_KEYS, 'push_tokens'].map(key => ({ ownerId: id, namespace: NS, key })),
  });
}

/** Stores an Expo push token on the customer so order alerts reach their phone. */
export async function addPushToken(id: string, token: string): Promise<void> {
  const r = await admin<{ customer: { metafield: { value: string } | null } | null }>(
    `query($id: ID!) { customer(id: $id) { metafield(namespace: "${NS}", key: "push_tokens") { value } } }`, { id });
  let tokens: string[] = [];
  try { tokens = r.customer?.metafield ? JSON.parse(r.customer.metafield.value) : []; } catch { tokens = []; }
  const next = [token, ...tokens.filter(t => t !== token)].slice(0, 5);
  const res = await admin<{ metafieldsSet: { userErrors: { field: string[]; message: string }[] } }>(SET_METAFIELDS, {
    metafields: [{ ownerId: id, namespace: NS, key: 'push_tokens', type: 'json', value: JSON.stringify(next) }],
  });
  checkUserErrors(res.metafieldsSet.userErrors);
}
