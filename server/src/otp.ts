import { hashCode, newCode, newNonce, safeEqual, sign, verify } from './crypto.ts';
import { env } from './env.ts';

/**
 * OTP login without a database: the request token carries a hash of the code (bound to the phone),
 * so verifying needs only the token, the phone and the code the shopkeeper typed.
 */

const OTP_TTL = 10 * 60; // 10 minutes
const MAX_ATTEMPTS = 5;

/** Per-instance limits. Serverless instances are short-lived, so this is a first line of defence only. */
const recentSends = new Map<string, number[]>();
const attempts = new Map<string, number>();

export function canSend(phone: string): boolean {
  const now = Date.now();
  const list = (recentSends.get(phone) ?? []).filter(t => now - t < 60 * 60_000);
  if (list.length >= 5 || (list.length && now - list[list.length - 1] < 30_000)) return false;
  list.push(now);
  recentSends.set(phone, list);
  return true;
}

export async function startOtp(phone: string, channel: 'whatsapp' | 'sms'): Promise<{ requestId: string; devCode?: string }> {
  const isReview = env.reviewPhone && env.reviewCode && phone === env.reviewPhone;
  const code = isReview ? env.reviewCode : newCode();
  const nonce = newNonce();
  const requestId = sign({ typ: 'otp', phone, nonce, h: hashCode(code, phone, nonce, env.sessionSecret) }, env.sessionSecret, OTP_TTL);
  if (!isReview) await deliver(phone, code, channel);
  return { requestId, ...(env.otpDevMode ? { devCode: code } : {}) };
}

export function checkOtp(phone: string, code: string, requestId: string): 'ok' | 'expired' | 'wrong' | 'locked' {
  const p = verify<{ typ: string; phone: string; nonce: string; h: string }>(requestId, env.sessionSecret);
  if (!p || p.typ !== 'otp' || p.phone !== phone) return 'expired';
  const n = (attempts.get(p.nonce) ?? 0) + 1;
  attempts.set(p.nonce, n);
  if (n > MAX_ATTEMPTS) return 'locked';
  return safeEqual(hashCode(code, phone, p.nonce, env.sessionSecret), p.h) ? 'ok' : 'wrong';
}

async function deliver(phone: string, code: string, channel: 'whatsapp' | 'sms') {
  if (env.otpProvider === 'console') {
    console.log(`[otp] ${phone} -> ${code} (${channel}, console provider: not sent)`);
    return;
  }
  const mobile = phone.replace(/^\+/, '');
  if (channel === 'whatsapp' && env.msg91.whatsappNumber && env.msg91.whatsappTemplate) {
    const res = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
      method: 'POST',
      headers: { authkey: env.msg91.authKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        integrated_number: env.msg91.whatsappNumber,
        content_type: 'template',
        payload: {
          messaging_product: 'whatsapp',
          type: 'template',
          template: {
            name: env.msg91.whatsappTemplate,
            language: { code: 'en', policy: 'deterministic' },
            to_and_components: [{ to: [mobile], components: { body_1: { type: 'text', value: code }, button_1: { subtype: 'url', type: 'text', value: code } } }],
          },
        },
      }),
    });
    if (res.ok) return;
    console.warn('[otp] WhatsApp send failed, falling back to SMS', res.status);
  }
  const res = await fetch('https://control.msg91.com/api/v5/otp?' + new URLSearchParams({ template_id: env.msg91.smsTemplateId, mobile, otp: code }), {
    method: 'POST',
    headers: { authkey: env.msg91.authKey, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Could not send the code. Please try again in a minute.');
}
