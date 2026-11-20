import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, Empty, Header, Note, T } from '../components/ui';
import { Customer, useAccount } from '../lib/account';
import { color, font, gutter } from '../theme/tokens';

const CATEGORIES = ['Infant wear', 'Girls', 'Boys', 'Winter wear', 'Summer wear', 'Joggers & lowers'];
const TYPES = ['Retail shop', 'Wholesaler', 'Online seller'];

/** Shop profile. Saved to the shopkeeper's Shopify customer record (name, address, metafields). */
export default function Profile() {
  const { setup } = useLocalSearchParams<{ setup?: string }>();
  const { customer, token, saveProfile } = useAccount();
  const [f, setF] = useState<Partial<Customer>>(() => ({
    shopName: customer?.shopName ?? '', firstName: customer?.firstName ?? '', gstin: customer?.gstin ?? '', pincode: customer?.pincode ?? '',
    city: customer?.city ?? '', transport: customer?.transport ?? '', businessType: customer?.businessType ?? 'Retail shop', categories: customer?.categories ?? [],
    address: customer?.address ?? { address1: '', city: '', zip: '', province: '' },
  }));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'green' | 'red'; text: string } | null>(null);

  if (!token) return <SafeAreaView style={{ flex: 1 }}><Header back title="Shop profile" /><Empty title="Sign in first" body="Your shop profile is saved with your account." /></SafeAreaView>;

  const gstOk = !f.gstin || /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(f.gstin.toUpperCase());

  async function save() {
    if (!f.shopName?.trim()) return setMsg({ tone: 'red', text: 'Add your shop name.' });
    if (!gstOk) return setMsg({ tone: 'red', text: 'That GSTIN does not look right. It has 15 characters, like 09ABCDE1234F1Z5.' });
    setBusy(true); setMsg(null);
    try {
      await saveProfile({ ...f, gstin: f.gstin ? f.gstin.toUpperCase() : null });
      if (setup) router.replace('/');
      else setMsg({ tone: 'green', text: 'Saved.' });
    } catch (e) { setMsg({ tone: 'red', text: (e as Error).message }); } finally { setBusy(false); }
  }

  const field = (label: string, key: keyof Customer, opts: { placeholder?: string; keyboard?: 'default' | 'number-pad'; caps?: 'characters' | 'words' } = {}) => (
    <View style={{ gap: 6 }}>
      <T v="label">{label}</T>
      <TextInput
        value={(f[key] as string) ?? ''} onChangeText={v => setF(s => ({ ...s, [key]: v }))}
        placeholder={opts.placeholder} placeholderTextColor={color.ink3} keyboardType={opts.keyboard ?? 'default'} autoCapitalize={opts.caps ?? 'words'}
        style={st.input} accessibilityLabel={label}
      />
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.paper }}>
      <Header back={!setup} title={setup ? 'Set up your shop' : 'Shop profile'} sub={setup ? 'Takes about a minute, only once' : 'Saved to your B2B Store account'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
          {field('Shop name', 'shopName', { placeholder: 'e.g. Shree Balaji Kids Wear' })}
          {field('Owner name', 'firstName')}
          {field('GSTIN (optional)', 'gstin', { placeholder: '15 characters', caps: 'characters' })}
          {!gstOk ? <T v="small" tone="red">GSTIN should look like 09ABCDE1234F1Z5.</T> : null}
          <View style={{ gap: 6 }}>
            <T v="label">Shop address</T>
            <TextInput value={f.address?.address1 ?? ''} onChangeText={v => setF(s => ({ ...s, address: { ...(s.address ?? { city: '', zip: '', province: '' }), address1: v } }))} placeholder="Shop number, market, area" placeholderTextColor={color.ink3} style={st.input} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput value={f.address?.zip ?? ''} onChangeText={v => setF(s => ({ ...s, pincode: v, address: { ...(s.address ?? { address1: '', city: '', province: '' }), zip: v } }))} placeholder="Pincode" keyboardType="number-pad" maxLength={6} placeholderTextColor={color.ink3} style={[st.input, { flex: 1 }]} />
              <TextInput value={f.address?.city ?? ''} onChangeText={v => setF(s => ({ ...s, city: v, address: { ...(s.address ?? { address1: '', zip: '', province: '' }), city: v } }))} placeholder="City" placeholderTextColor={color.ink3} style={[st.input, { flex: 1.4 }]} />
            </View>
          </View>
          {field('Preferred transport (optional)', 'transport', { placeholder: 'Transport name in Ludhiana, if you use one' })}
          <View style={{ gap: 8 }}>
            <T v="label">What do you sell?</T>
            <View style={st.wrap}>{CATEGORIES.map(c => <Chip key={c} label={c} on={f.categories?.includes(c)} onPress={() => setF(s => ({ ...s, categories: s.categories?.includes(c) ? s.categories.filter(x => x !== c) : [...(s.categories ?? []), c] }))} />)}</View>
          </View>
          <View style={{ gap: 8 }}>
            <T v="label">Type of business</T>
            <View style={st.wrap}>{TYPES.map(c => <Chip key={c} label={c} on={f.businessType === c} onPress={() => setF(s => ({ ...s, businessType: c }))} />)}</View>
          </View>
          {msg ? <Note tone={msg.tone}>{msg.text}</Note> : null}
          <Button title={setup ? 'Start shopping' : 'Save changes'} kind={setup ? 'orange' : 'dark'} loading={busy} onPress={save} full />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  body: { paddingHorizontal: gutter, paddingBottom: 30, gap: 14, maxWidth: 640, width: '100%', alignSelf: 'center' },
  input: { minHeight: 52, borderWidth: 1.5, borderColor: color.line2, borderRadius: 14, paddingHorizontal: 15, fontFamily: font.medium, fontSize: 15.5, color: color.ink, backgroundColor: color.paper },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
