import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Download, RefreshCw, Truck } from 'lucide-react-native';
import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, ErrorView, Header, Loading, Note, T } from '../../components/ui';
import { getOrder } from '../../lib/account';
import { useCart } from '../../lib/shopify/cart';
import { rupees } from '../../lib/shopify/model';
import { color, gutter } from '../../theme/tokens';

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['order', id], queryFn: () => getOrder(decodeURIComponent(id)) });
  const add = useCart(s => s.add);
  const [msg, setMsg] = useState<string | null>(null);
  const o = q.data;

  async function reorder() {
    if (!o) return;
    const lines = o.lines.filter(l => l.variantId).map(l => ({ variantId: l.variantId!, quantity: l.quantity }));
    try {
      await add(lines);
      const note = useCart.getState().cart?.note;
      if (note) setMsg(note); else router.push('/cart');
    } catch (e) { setMsg((e as Error).message); }
  }

  if (q.isLoading) return <SafeAreaView style={{ flex: 1 }}><Loading /></SafeAreaView>;
  if (q.isError || !o) return <SafeAreaView style={{ flex: 1 }}><ErrorView message={(q.error as Error)?.message ?? 'Order not found.'} onRetry={() => q.refetch()} /></SafeAreaView>;

  const track = o.tracking[0];
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.paper }}>
      <Header back title={`Order ${o.name}`} sub={new Date(o.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 30, gap: 16 }}>
        {track ? (
          <Card tone="navy" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Truck size={26} color={color.navy} />
            <View style={{ flex: 1 }}>
              <T v="bodyB">{track.company ?? 'Courier'}</T>
              <T v="small">Tracking no. {track.number ?? 'not added yet'}</T>
            </View>
            {track.url ? <Button title="Track" size="xs" onPress={() => Linking.openURL(track.url!)} /> : null}
          </Card>
        ) : null}
        <View>
          {o.timeline.map((t, i) => (
            <View key={t.label} style={st.tlRow}>
              <View style={{ alignItems: 'center' }}>
                <View style={[st.dot, t.done && st.dotDone]}>{t.done ? <Check size={13} color={color.ink} /> : null}</View>
                {i < o.timeline.length - 1 ? <View style={[st.bar, t.done && { backgroundColor: color.orange }]} /> : null}
              </View>
              <View style={{ paddingBottom: 14 }}>
                <T v="bodyB" style={!t.done ? { color: color.ink3 } : undefined}>{t.label}</T>
                {t.at ? <T v="small">{new Date(t.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</T> : null}
              </View>
            </View>
          ))}
        </View>
        <Card style={{ gap: 10 }}>
          {o.lines.map((l, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Image source={{ uri: l.image ?? undefined }} style={st.thumb} contentFit="cover" contentPosition="top" />
              <View style={{ flex: 1 }}>
                <T v="smallB" numberOfLines={1}>{l.title}</T>
                <T v="small" numberOfLines={1}>{l.variant} × {l.quantity}</T>
              </View>
              <T v="smallB">{rupees(l.total)}</T>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: color.line }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T v="h3">Total</T><T v="h3">{rupees(o.total)}</T></View>
          <T v="small">{o.financialStatus}{o.paymentMethod ? ` · ${o.paymentMethod}` : ''}</T>
        </Card>
        {msg ? <Note tone="red">{msg}</Note> : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Reorder" icon={RefreshCw} kind="orange" onPress={reorder} style={{ flex: 1 }} />
          <Button title="GST bill" icon={Download} kind="outline" disabled={!o.invoiceUrl} onPress={() => o.invoiceUrl && Linking.openURL(o.invoiceUrl)} style={{ flex: 1 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  tlRow: { flexDirection: 'row', gap: 12 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.line2, backgroundColor: color.paper, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: color.orange, borderColor: color.orange },
  bar: { width: 2, flex: 1, backgroundColor: color.line2 },
  thumb: { width: 40, height: 50, borderRadius: 8, backgroundColor: color.wash },
});
