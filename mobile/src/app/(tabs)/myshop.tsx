import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronRight, FileText, Heart, HelpCircle, Languages, List, LogOut, MapPin, Percent, Share2, ShieldCheck, Store, Truck, Undo2, Wallet } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Header, T, Tag } from '../../components/ui';
import { getOrders, useAccount } from '../../lib/account';
import { rupees } from '../../lib/shopify/model';
import { color, font, gutter } from '../../theme/tokens';

type IconT = React.ComponentType<{ size?: number; color?: string }>;

export default function MyShop() {
  const { token, customer, init, ready, signOut } = useAccount();
  useEffect(() => { if (!ready) init(); }, [ready, init]);
  const orders = useQuery({ queryKey: ['orders'], queryFn: getOrders, enabled: !!token });

  const tiles: [IconT, string, () => void][] = [
    [List, 'Orders', () => router.push('/orders')],
    [FileText, 'Bills', () => router.push('/orders?view=bills')],
    [Wallet, 'Payments', () => router.push('/orders?view=payments')],
    [Undo2, 'Returns', () => router.push('/help?topic=returns')],
    [Heart, 'Saved', () => router.push('/pad')],
    [Share2, 'Share', () => router.push('/catalogue')],
  ];

  if (!token) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.paper }}>
        <Header title="My Shop" />
        <ScrollView contentContainerStyle={st.body}>
          <Card tone="dark" style={{ gap: 12, padding: 18, borderRadius: 22 }}>
            <T v="display" style={{ color: '#fff', fontSize: 30, lineHeight: 33 }}>Your shop's back office</T>
            <T v="small" style={{ color: '#CFC8BA' }}>Sign in with your mobile number to see every order (app and website), download GST bills and track deliveries.</T>
            <Button title="Sign in with mobile" kind="orange" onPress={() => router.push('/login')} full />
          </Card>
          <Settings />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const list = orders.data ?? [];
  const inProgress = list.filter(o => ['placed', 'confirmed', 'packed', 'shipped'].includes(o.status));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.paper }}>
      <View style={st.top}>
        <View style={st.avatar}><Text style={st.avatarText}>{initials(customer?.shopName ?? customer?.firstName ?? 'B2B')}</Text></View>
        <View style={{ flex: 1 }}>
          <T v="title" numberOfLines={1}>{customer?.shopName ?? 'Your shop'}</T>
          <T v="small" numberOfLines={1}>{[customer?.city, customer?.gstin ? 'GST added' : null].filter(Boolean).join(' · ') || customer?.phone}</T>
        </View>
        <Pressable onPress={() => router.push('/profile')} hitSlop={8}><T v="smallB" tone="orangeDeep">Edit</T></Pressable>
      </View>
      <ScrollView contentContainerStyle={st.body}>
        <Card tone="dark" style={{ borderRadius: 22, gap: 10 }}>
          <T v="tiny" style={{ color: '#CFC8BA' }}>With B2B Store so far</T>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Stat label="Orders" value={String(customer?.ordersCount ?? list.length)} />
            <Stat label="Bought" value={rupees(customer?.amountSpent ?? 0)} />
            <Stat label="In progress" value={String(inProgress.length)} accent />
          </View>
        </Card>
        <View style={st.tiles}>
          {tiles.map(([Icon, label, go]) => (
            <Pressable key={label} onPress={go} style={st.tile} accessibilityRole="button" accessibilityLabel={label}>
              <Icon size={25} color={color.ink} />
              <T v="smallB" style={{ fontSize: 12.5 }}>{label}</T>
            </Pressable>
          ))}
        </View>
        {inProgress.length ? (
          <View style={{ gap: 8 }}>
            <T v="h2">On the way</T>
            {inProgress.slice(0, 3).map(o => (
              <Pressable key={o.id} onPress={() => router.push(`/order/${encodeURIComponent(o.id)}`)} style={st.row}>
                <View style={[st.rowIcon, { backgroundColor: color.navySoft }]}><Truck size={20} color={color.navy} /></View>
                <View style={{ flex: 1 }}>
                  <T v="bodyB">Order {o.name}</T>
                  <T v="small">{o.pieces} pieces · {rupees(o.total)}</T>
                </View>
                <Tag label={o.status[0].toUpperCase() + o.status.slice(1)} tone={o.status === 'shipped' ? 'navy' : 'orange'} />
              </Pressable>
            ))}
          </View>
        ) : null}
        <Settings />
        <Button title="Sign out" kind="ghost" icon={LogOut} onPress={() => signOut()} full />
      </ScrollView>
    </SafeAreaView>
  );
}

function Settings() {
  const items: [IconT, string, string, string][] = [
    [Store, 'Shop profile', 'Name, GST, address, transport', '/profile'],
    [Percent, 'Pricing and margin', 'How "you earn" is worked out', '/settings/pricing'],
    [Languages, 'Language', 'English · हिंदी', '/settings/pricing'],
    [HelpCircle, 'Help and support', 'WhatsApp, factory visit, returns', '/help'],
    [ShieldCheck, 'About and policies', 'Privacy, refunds, delete account', '/help?topic=about'],
  ];
  return (
    <View style={{ gap: 2 }}>
      <T v="label" style={{ textTransform: 'uppercase', letterSpacing: 1, color: color.ink3, marginBottom: 4 }}>Settings</T>
      {items.map(([Icon, title, sub, href]) => (
        <Pressable key={title} onPress={() => router.push(href as never)} style={st.row}>
          <View style={st.rowIcon}><Icon size={20} color={color.ink} /></View>
          <View style={{ flex: 1 }}><T v="bodyB">{title}</T><T v="small">{sub}</T></View>
          <ChevronRight size={19} color={color.ink3} />
        </Pressable>
      ))}
    </View>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <T v="tiny" style={{ color: '#CFC8BA' }}>{label}</T>
      <Text style={{ fontFamily: font.bold, fontSize: 20, color: accent ? color.sun : '#fff' }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: gutter, paddingTop: 8, paddingBottom: 12 },
  avatar: { width: 46, height: 46, borderRadius: 15, backgroundColor: color.sun, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: font.bold, fontSize: 17, color: color.ink },
  body: { paddingHorizontal: gutter, paddingBottom: 30, gap: 18 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  tile: { width: '31.5%', flexGrow: 1, backgroundColor: color.wash, borderRadius: 16, paddingVertical: 14, alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: color.line },
  rowIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: color.wash, alignItems: 'center', justifyContent: 'center' },
});

