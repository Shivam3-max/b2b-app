import { APP_SETTINGS } from './queries.ts';
import { admin } from './shopify.ts';

/**
 * Store-wide app settings, edited by the owner in Shopify admin → Content → Metaobjects →
 * "B2B app settings". Cached for 5 minutes so the app stays fast.
 */
export type AppSettings = {
  offerBanner: string | null;
  whatsappNumber: string | null;
  supportPhone: string | null;
  factoryAddress: string;
  homeCollections: string[];
  minimumOrderNote: string | null;
  privateLabelText: string | null;
  factoryVisitText: string | null;
  supportEmail: string | null;
  businessHours: string | null;
  businessName: string | null;
  businessGstin: string | null;
  udyamNumber: string | null;
  certification: string | null;
  mapsUrl: string | null;
  minimumOrderPieces: number | null;
  paymentTerms: string | null;
  dispatchTime: string | null;
  deliveryTime: string | null;
  shippingCharges: string | null;
  exchangePolicy: string | null;
};

const DEFAULTS: AppSettings = {
  offerBanner: 'Extra 2% off on full advance payment',
  whatsappNumber: '+91 78889 15647',
  supportPhone: '+91 78889 15647',
  factoryAddress: 'Plot No. I-3, Hampton Court Business Park, Chandigarh Road, Focal Point, Ludhiana 141010, Punjab',
  homeCollections: [],
  minimumOrderNote: 'Minimum order: 6 pieces',
  privateLabelText: 'Your brand, our clothes: private label for bulk orders',
  factoryVisitText: 'Visit our Ludhiana factory',
  supportEmail: 'info@b2bstore.in',
  businessHours: 'Monday to Saturday, 10:00 AM to 7:00 PM. Sunday closed.',
  businessName: 'EMM AAR KNITWEARS',
  businessGstin: '03AEHPG3068H1ZS',
  udyamNumber: 'UDYAM-PB-12-0022839',
  certification: 'MSME ZED Bronze certified',
  mapsUrl: 'https://www.google.com/maps/dir//Emm+Aar+Knitwears,+Hampton+Court+Business+Park,+Plot+No.+I-3,+Focal+Point,+Ludhiana,+Punjab+141003/@30.8817237,75.9352416,15z',
  minimumOrderPieces: 6,
  paymentTerms: '10% advance payment + 90% cash on delivery',
  dispatchTime: 'Dispatched within 24 to 48 working hours',
  deliveryTime: '3 to 7 working days, depending on location',
  shippingCharges: 'Charged on every order, by weight, volume and delivery location',
  exchangePolicy: 'No returns or size exchanges for change of mind, fit or wrong size selection.\nDefective or wrongly supplied pieces can be exchanged after verification. Send on WhatsApp: an unedited video of opening the parcel, clear photos of the problem, and your order number. Keep the original tags, labels and packing.\nFor approved exchanges, the company pays the shipping.',
};

let cache: { at: number; value: AppSettings } | null = null;

export function fieldsToSettings(fields: { key: string; value: string | null }[]): AppSettings {
  const f = Object.fromEntries(fields.map(x => [x.key, x.value]));
  const text = (k: string) => (typeof f[k] === 'string' && f[k]!.trim() ? f[k]!.trim() : null);
  let homeCollections: string[] = [];
  try { homeCollections = f.home_collections ? JSON.parse(f.home_collections) : []; } catch { homeCollections = []; }
  return {
    offerBanner: f.offer_banner === undefined ? DEFAULTS.offerBanner : text('offer_banner'),
    whatsappNumber: text('whatsapp_number'),
    supportPhone: text('support_phone'),
    factoryAddress: text('factory_address') ?? DEFAULTS.factoryAddress,
    homeCollections: Array.isArray(homeCollections) ? homeCollections.map(String) : [],
    minimumOrderNote: text('minimum_order_note'),
    privateLabelText: f.private_label_text === undefined ? DEFAULTS.privateLabelText : text('private_label_text'),
    factoryVisitText: text('factory_visit_text') ?? DEFAULTS.factoryVisitText,
    supportEmail: text('support_email'),
    businessHours: text('business_hours'),
    businessName: text('business_name'),
    businessGstin: text('business_gstin'),
    udyamNumber: text('udyam_number'),
    certification: text('certification'),
    mapsUrl: text('maps_url'),
    minimumOrderPieces: text('minimum_order_pieces') ? Math.max(0, parseInt(text('minimum_order_pieces')!, 10)) || null : null,
    paymentTerms: text('payment_terms'),
    dispatchTime: text('dispatch_time'),
    deliveryTime: text('delivery_time'),
    shippingCharges: text('shipping_charges'),
    exchangePolicy: text('exchange_policy'),
  };
}

export async function getSettings(): Promise<AppSettings> {
  if (cache && Date.now() - cache.at < 5 * 60_000) return cache.value;
  try {
    const r = await admin<{ metaobjects: { nodes: { fields: { key: string; value: string | null }[] }[] } }>(APP_SETTINGS);
    const node = r.metaobjects.nodes[0];
    const value = node ? fieldsToSettings(node.fields) : DEFAULTS;
    cache = { at: Date.now(), value };
    return value;
  } catch (e) {
    console.warn('[settings] using defaults:', (e as Error).message);
    return cache?.value ?? DEFAULTS;
  }
}
