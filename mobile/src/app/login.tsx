import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ChevronLeft, ShieldCheck } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, IconButton, Note, T } from '../components/ui';
import { normalisePhone, useAccount } from '../lib/account';
import { hasServer } from '../lib/config';
import { color, font, gutter } from '../theme/tokens';

const LOGO = require('../../assets/logo.png');

export default function Login() {
  const { requestOtp, verifyOtp } = useAccount();
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [code, setCode] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalised = normalisePhone(phone);

  async function send() {
    if (!normalised) return setError('Enter a 10-digit Indian mobile number.');
    setBusy(true); setError(null);
    try {
      const r = await requestOtp(normalised, channel);
      setRequestId(r.requestId);
      if (r.devCode) setCode(r.devCode); // only when the server runs in test mode
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function verify() {
    if (!requestId || !normalised) return;
    setBusy(true); setError(null);
    try {
      const c = await verifyOtp(normalised, code.trim(), requestId);
      router.replace(c.shopName ? '/myshop' : '/profile?setup=1');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.paper }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row' }}><IconButton icon={ChevronLeft} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} /></View>
          <Image source={LOGO} style={{ width: 110, height: 110, alignSelf: 'center' }} contentFit="contain" />
          {!requestId ? (
            <>
              <T v="display">Sign in to order wholesale</T>
              <T v="small">Use the mobile number you order with. Your past website orders will show up here.</T>
              <View style={{ gap: 6 }}>
                <T v="label">Mobile number</T>
                <View style={st.field}>
                  <T v="bodyB">+91</T>
                  <View style={{ width: 1, height: 24, backgroundColor: color.line2 }} />
                  <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={14} placeholder="98765 43210" placeholderTextColor={color.ink3} style={st.input} accessibilityLabel="Mobile number" autoFocus />
                </View>
              </View>
              <View style={{ gap: 6 }}>
                <T v="label">Get the code on</T>
                <View style={st.seg}>
                  {(['whatsapp', 'sms'] as const).map(c => (
                    <T key={c} v="smallB" onPress={() => setChannel(c)} style={[st.segItem, channel === c && st.segOn]}>{c === 'whatsapp' ? 'WhatsApp' : 'SMS'}</T>
                  ))}
                </View>
              </View>
              {!hasServer() ? <Note tone="sun">Sign-in starts working once the B2B Store server is switched on. You can browse and order without signing in.</Note> : null}
              {error ? <Note tone="red">{error}</Note> : null}
              <Button title="Get OTP" onPress={send} loading={busy} disabled={!normalised} full />
            </>
          ) : (
            <>
              <T v="display">Enter the 6-digit code</T>
              <T v="small">Sent on {channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} to {normalised}. <T v="smallB" tone="orangeDeep" onPress={() => { setRequestId(null); setCode(''); }}>Change number</T></T>
              <TextInput value={code} onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={6} style={st.otp} accessibilityLabel="OTP code" autoFocus />
              <Note tone="green" icon={ShieldCheck}>We never ask for this code on a phone call.</Note>
              {error ? <Note tone="red">{error}</Note> : null}
              <Button title="Verify" onPress={verify} loading={busy} disabled={code.length !== 6} full />
              <Button title="Send the code again" kind="ghost" size="sm" onPress={send} disabled={busy} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  body: { paddingHorizontal: gutter, paddingBottom: 30, gap: 16, maxWidth: 520, width: '100%', alignSelf: 'center' },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, borderWidth: 1.5, borderColor: color.ink, borderRadius: 14, paddingHorizontal: 16 },
  input: { flex: 1, fontFamily: font.bold, fontSize: 17, color: color.ink, paddingVertical: 12 },
  seg: { flexDirection: 'row', backgroundColor: color.wash, borderRadius: 12, padding: 3 },
  segItem: { flex: 1, textAlign: 'center', paddingVertical: 9, borderRadius: 10, overflow: 'hidden', color: color.ink2 },
  segOn: { backgroundColor: color.paper, color: color.ink },
  otp: { minHeight: 64, borderWidth: 1.5, borderColor: color.ink, borderRadius: 14, textAlign: 'center', fontFamily: font.bold, fontSize: 28, letterSpacing: 12, color: color.ink },
});
