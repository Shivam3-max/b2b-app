import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { config, hasServer } from './config';

/**
 * Login, shop profile and orders. All of it is stored in Shopify (customers, customer metafields,
 * orders); the B2B Store server is the go-between so no Shopify admin key ever sits on a phone.
 */

export type Customer = {
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

export type OrderSummary = {
  id: string;
  name: string; // "#1143"
  createdAt: string;
  status: 'placed' | 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
  financialStatus: string;
  total: number;
  pieces: number;
  images: string[];
};

export type OrderDetail = OrderSummary & {
  lines: { title: string; variant: string; quantity: number; total: number; image: string | null; productHandle: string | null; variantId: string | null }[];
  tracking: { company: string | null; number: string | null; url: string | null }[];
  timeline: { label: string; at: string | null; done: boolean }[];
  invoiceUrl: string | null;
  paymentMethod: string | null;
  shippingAddress: string | null;
};

const TOKEN_KEY = 'b2bstore.session';
const secure = {
  get: (k: string) => (Platform.OS === 'web' ? AsyncStorage.getItem(k) : SecureStore.getItemAsync(k)),
  set: (k: string, v: string) => (Platform.OS === 'web' ? AsyncStorage.setItem(k, v) : SecureStore.setItemAsync(k, v)),
  del: (k: string) => (Platform.OS === 'web' ? AsyncStorage.removeItem(k) : SecureStore.deleteItemAsync(k)),
};

export class ApiError extends Error {}

export async function api<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  if (!hasServer()) throw new ApiError('Your account will work once the B2B Store server is switched on.');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = init.token ?? useAccount.getState().token;
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}${path}`, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
  } catch {
    throw new ApiError('No internet connection. Check your network and try again.');
  }
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) { useAccount.getState().signOut(); throw new ApiError('Please sign in again.'); }
  if (!res.ok) throw new ApiError(body.error ?? `Something went wrong (${res.status}).`);
  return body as T;
}

type AccountState = {
  token: string | null;
  customer: Customer | null;
  ready: boolean;
  init: () => Promise<void>;
  requestOtp: (phone: string, channel: 'whatsapp' | 'sms') => Promise<{ requestId: string; devCode?: string }>;
  verifyOtp: (phone: string, code: string, requestId: string) => Promise<Customer>;
  refresh: () => Promise<void>;
  saveProfile: (patch: Partial<Customer>) => Promise<Customer>;
  signOut: () => Promise<void>;
};

export const useAccount = create<AccountState>((set, get) => ({
  token: null,
  customer: null,
  ready: false,

  async init() {
    const token = await secure.get(TOKEN_KEY);
    set({ token, ready: true });
    if (token && hasServer()) get().refresh().catch(() => {});
  },

  async requestOtp(phone, channel) {
    return api('/v1/auth/otp/request', { method: 'POST', body: JSON.stringify({ phone, channel }) });
  },

  async verifyOtp(phone, code, requestId) {
    const r = await api<{ token: string; customer: Customer }>('/v1/auth/otp/verify', { method: 'POST', body: JSON.stringify({ phone, code, requestId }) });
    await secure.set(TOKEN_KEY, r.token);
    set({ token: r.token, customer: r.customer });
    return r.customer;
  },

  async refresh() {
    const r = await api<{ customer: Customer }>('/v1/me');
    set({ customer: r.customer });
  },

  async saveProfile(patch) {
    const r = await api<{ customer: Customer }>('/v1/me', { method: 'PUT', body: JSON.stringify(patch) });
    set({ customer: r.customer });
    return r.customer;
  },

  async signOut() {
    await secure.del(TOKEN_KEY);
    set({ token: null, customer: null });
  },
}));

export const getOrders = () => api<{ orders: OrderSummary[] }>('/v1/orders').then(r => r.orders);
export const getOrder = (id: string) => api<{ order: OrderDetail }>(`/v1/orders/${encodeURIComponent(id)}`).then(r => r.order);

/** Normalises Indian mobile numbers to +91XXXXXXXXXX. Returns null when it isn't a valid mobile. */
export function normalisePhone(input: string): string | null {
  const d = input.replace(/\D/g, '').replace(/^0+/, '');
  const ten = d.length === 12 && d.startsWith('91') ? d.slice(2) : d;
  return /^[6-9]\d{9}$/.test(ten) ? `+91${ten}` : null;
}
