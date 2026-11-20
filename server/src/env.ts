/** Server configuration, read once from the environment (see .env.example). */
const e = process.env;

export const env = {
  shop: e.SHOPIFY_SHOP ?? 'aub1my-11.myshopify.com',
  apiVersion: e.SHOPIFY_API_VERSION ?? '2026-10',
  /** Dev Dashboard app credentials (client-credentials grant). Preferred. */
  clientId: e.SHOPIFY_CLIENT_ID ?? '',
  clientSecret: e.SHOPIFY_CLIENT_SECRET ?? '',
  /** Or a fixed Admin API token from a custom app. */
  adminToken: e.SHOPIFY_ADMIN_TOKEN ?? '',
  /** Secret used to verify Shopify webhooks; defaults to the app's client secret. */
  webhookSecret: e.SHOPIFY_WEBHOOK_SECRET ?? e.SHOPIFY_CLIENT_SECRET ?? '',
  /** Signs login sessions and OTP requests. At least 32 random characters. */
  sessionSecret: e.SESSION_SECRET ?? '',
  /** console = print codes to the log (testing only); msg91 = real SMS/WhatsApp. */
  otpProvider: (e.OTP_PROVIDER ?? 'console') as 'console' | 'msg91',
  /** Returns the OTP in the API response. Only for local testing, never in production. */
  otpDevMode: e.OTP_DEV_MODE === 'true',
  msg91: {
    authKey: e.MSG91_AUTH_KEY ?? '',
    smsTemplateId: e.MSG91_SMS_TEMPLATE_ID ?? '',
    whatsappNumber: e.MSG91_WHATSAPP_NUMBER ?? '',
    whatsappTemplate: e.MSG91_WHATSAPP_TEMPLATE ?? '',
  },
  /** Fixed login for Apple/Google app reviewers, e.g. REVIEW_PHONE=+919999999999 REVIEW_CODE=246810. */
  reviewPhone: e.REVIEW_PHONE ?? '',
  reviewCode: e.REVIEW_CODE ?? '',
  /** Allowed web origins for the browser preview (comma separated). Phones don't need CORS. */
  corsOrigins: (e.CORS_ORIGINS ?? 'http://localhost:3850').split(',').map(s => s.trim()).filter(Boolean),
};

export function assertConfigured(): string[] {
  const missing: string[] = [];
  if (!env.adminToken && !(env.clientId && env.clientSecret)) missing.push('SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (or SHOPIFY_ADMIN_TOKEN)');
  if (env.sessionSecret.length < 32) missing.push('SESSION_SECRET (32+ characters)');
  if (env.otpProvider === 'msg91' && !env.msg91.authKey) missing.push('MSG91_AUTH_KEY');
  return missing;
}
