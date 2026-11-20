import { router } from 'expo-router';
import { BadgeCheck, ChevronDown, ChevronUp, Clock, Factory, FileText, Mail, MapPin, MessageCircle, Navigation, Package, Phone, RefreshCw, Trash2, Truck } from 'lucide-react-native';
import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Header, T } from '../components/ui';
import { useAccount } from '../lib/account';
import { config } from '../lib/config';
import { useSettings } from '../lib/settings';
import { color, gutter } from '../theme/tokens';

type IconT = React.ComponentType<{ size?: number; color?: string }>;

const POLICIES = [
  ['Privacy policy', 'privacy-policy'], ['Return and exchange policy', 'refund-policy'], ['Shipping policy', 'shipping-policy'], ['Terms of service', 'terms-of-service'],
] as const;

/** Help and support. Every contact detail and policy comes from the "B2B app settings" entry in Shopify. */
export default function Help() {
  const s = useSettings();
  const { token, signOut } = useAccount();
  const [open, setOpen] = useState<number | null>(null);
  const wa = s.whatsappNumber?.replace(/\D/g, '');
  const tel = s.supportPhone?.replace(/[^\d+]/g, '');
  const waLink = (text: string) => wa && Linking.openURL(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`);

  const faq: [string, string][] = [
    ['How do sets and samples work?', 'Each design is sold as a set with one piece of every size in it, for example sizes 22, 24, 26 and 28. A sample is a single piece so you can check the quality before buying sets.'],
    ['How do I pay in the app?', 'At checkout you pay securely by UPI, card or net banking through Razorpay. GST is added at checkout.'],
    ['How do I get a GST bill?', 'Add your GSTIN in Shop profile before ordering. Your bill then carries it.'],
    ['Can I send goods through my own transport?', 'Yes. Add your transport name in Shop profile and mention it on WhatsApp after ordering.'],
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.paper }}>
      <Header back title="Help and support" sub="Call or WhatsApp us any working day" />
      <ScrollView contentContainerStyle={st.body}>
        <View style={st.grid}>
          <Tile icon={MessageCircle} label="Chat on WhatsApp" bg={color.greenSoft} disabled={!wa} onPress={() => waLink('Hi B2B Store, I need help with ')} />
          <Tile icon={Phone} label="Call us" bg={color.wash} disabled={!tel} onPress={() => tel && Linking.openURL(`tel:${tel}`)} />
          <Tile icon={Factory} label="Book a factory visit" bg={color.sunSoft} disabled={!wa} onPress={() => waLink('Hi, I would like to visit the factory. Preferred date: ')} />
          <Tile icon={Navigation} label="Get directions" bg={color.wash} disabled={!s.mapsUrl} onPress={() => s.mapsUrl && Linking.openURL(s.mapsUrl)} />
        </View>

        <Card style={{ gap: 10 }}>
          {s.businessName ? <T v="h3">{s.businessName}</T> : null}
          <Line icon={MapPin} text={s.factoryAddress} />
          {s.businessHours ? <Line icon={Clock} text={s.businessHours} /> : null}
          {s.supportPhone ? <Line icon={Phone} text={`Call / WhatsApp: ${s.supportPhone}`} /> : null}
          {s.supportEmail ? <Line icon={Mail} text={s.supportEmail} onPress={() => Linking.openURL(`mailto:${s.supportEmail}`)} /> : null}
          {s.certification ? <Line icon={BadgeCheck} text={s.certification} /> : null}
          {s.businessGstin || s.udyamNumber ? <T v="tiny">{[s.businessGstin && `GSTIN ${s.businessGstin}`, s.udyamNumber && `Udyam ${s.udyamNumber}`].filter(Boolean).join(' · ')}</T> : null}
        </Card>

        <View style={{ gap: 8 }}>
          <T v="h2">Ordering at a glance</T>
          <Card tone="wash" style={{ gap: 10 }}>
            {s.minimumOrderPieces ? <Line icon={Package} text={`Minimum order: ${s.minimumOrderPieces} pieces`} /> : null}
            {s.dispatchTime ? <Line icon={Truck} text={s.dispatchTime} /> : null}
            {s.deliveryTime ? <Line icon={Clock} text={`Delivery: ${s.deliveryTime}`} /> : null}
            {s.shippingCharges ? <Line icon={FileText} text={`Shipping: ${s.shippingCharges}`} /> : null}
          </Card>
        </View>

        {s.exchangePolicy ? (
          <View style={{ gap: 8 }}>
            <T v="h2">Returns and exchanges</T>
            <Card style={{ gap: 8 }}>
              {s.exchangePolicy.split('\n').filter(Boolean).map((p, i) => <T key={i} v="small" style={{ color: color.ink }}>{p}</T>)}
              <Button title="Report a defect on WhatsApp" kind="whatsapp" size="sm" icon={RefreshCw} disabled={!wa} onPress={() => waLink('Hi, I want to report a defect. Order number: ')} />
            </Card>
          </View>
        ) : null}

        <T v="h2">Common questions</T>
        <View>
          {faq.map(([q, a], i) => (
            <Pressable key={q} onPress={() => setOpen(open === i ? null : i)} style={st.faq} accessibilityRole="button" accessibilityState={{ expanded: open === i }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <T v="bodyB" style={{ flex: 1 }}>{q}</T>
                {open === i ? <ChevronUp size={18} color={color.ink2} /> : <ChevronDown size={18} color={color.ink2} />}
              </View>
              {open === i ? <T v="small" style={{ marginTop: 6 }}>{a}</T> : null}
            </Pressable>
          ))}
        </View>

        <T v="h2">Policies</T>
        <View>
          {POLICIES.map(([label, slug]) => (
            <Pressable key={slug} onPress={() => Linking.openURL(`${config.website}/policies/${slug}`)} style={st.faq}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><FileText size={18} color={color.ink2} /><T v="body">{label}</T></View>
            </Pressable>
          ))}
        </View>

        {token ? (
          <Card style={{ borderColor: '#F3C8C3', gap: 8 }}>
            <T v="h3" tone="red">Delete my account</T>
            <T v="small">Removes your app login and shop profile. Order and GST records that the business must keep by law stay with B2B Store.</T>
            <Button title="Ask to delete my account" kind="danger" size="sm" icon={Trash2} onPress={() => router.push('/delete-account')} />
          </Card>
        ) : null}
        {token ? <Button title="Sign out" kind="ghost" onPress={() => signOut().then(() => router.replace('/'))} full /> : null}
        <T v="tiny" style={{ textAlign: 'center' }}>B2B Store app · version 1.0</T>
      </ScrollView>
    </SafeAreaView>
  );
}

function Line({ icon: Icon, text, onPress }: { icon: IconT; text: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <Icon size={17} color={color.ink2} />
      <T v="small" style={{ flex: 1, color: color.ink }}>{text}</T>
    </Pressable>
  );
}

function Tile({ icon: Icon, label, bg, onPress, disabled }: { icon: IconT; label: string; bg: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[st.tile, { backgroundColor: bg }, disabled && { opacity: 0.45 }]} accessibilityRole="button" accessibilityLabel={label}>
      <Icon size={26} color={color.ink} />
      <T v="h3" style={{ fontSize: 14.5 }}>{label}</T>
    </Pressable>
  );
}

const st = StyleSheet.create({
  body: { paddingHorizontal: gutter, paddingBottom: 30, gap: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', flexGrow: 1, borderRadius: 18, padding: 14, gap: 8 },
  faq: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: color.line },
});
