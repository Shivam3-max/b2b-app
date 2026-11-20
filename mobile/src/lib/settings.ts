import { useQuery } from '@tanstack/react-query';
import { config, hasServer } from './config';

/**
 * Store-wide app settings. The owner edits these in Shopify admin (Content → Metaobjects →
 * "B2B app settings"); the app server reads them and the app shows them. The defaults below
 * mirror what b2bstore.in shows today, so the app looks right before the server is live.
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

export const DEFAULT_SETTINGS: AppSettings = {
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

async function fetchSettings(): Promise<AppSettings> {
  if (!hasServer()) return DEFAULT_SETTINGS;
  const res = await fetch(`${config.apiUrl}/v1/settings`);
  if (!res.ok) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(await res.json()) };
}

export function useSettings() {
  const q = useQuery({ queryKey: ['settings'], queryFn: fetchSettings, staleTime: 10 * 60_000 });
  return q.data ?? DEFAULT_SETTINGS;
}
