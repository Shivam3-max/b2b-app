import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ClipboardList, ShoppingBag, Trash2 } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Button, Card, Empty, Header, Note, Stepper, T, Tag } from '../../components/ui';
import { openCheckout } from '../../lib/checkout';
import { usePrefs } from '../../lib/prefs';
import { useSettings } from '../../lib/settings';
import { useCart } from '../../lib/shopify/cart';
import { rupees } from '../../lib/shopify/model';
import { color, font, gutter } from '../../theme/tokens';

export default function CartScreen() {
  const { cart, busy, error, load, setQuantity, remove } = useCart();
  const { markup, useMrp } = usePrefs();
  const settings = useSettings();
  const [refreshing, setRefreshing] = useState(false);

  // Prices and stock can change on Shopify at any time, so refresh whenever the cart opens.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sale = (cart?.lines ?? []).reduce((a, l) => {
    const per = useMrp && l.unitMrp ? l.unitMrp : Math.round((l.unitPrice / l.pieces) * (1 + markup / 100)) * l.pieces;
    return a + per * l.quantity;
  }, 0);

  const minPieces = settings.minimumOrderPieces ?? 0;
  const belowMinimum = !!cart && minPieces > 0 && cart.pieces < minPieces;

  if (!cart || cart.lines.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.paper }}>
        <Header title="Cart" />
        <Empty icon={ShoppingBag} title="Your cart is empty" body="Add designs from the catalogue, or order by code from the order pad.">
          <Button title="Open order pad" icon={ClipboardList} onPress={() => router.push('/pad')} full />
          <Button title="Browse catalogue" kind="outline" onPress={() => router.push('/catalogue')} full />
        </Empty>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.paper }}>
      <Header title="Cart" sub={`${cart.lines.length} items · ${cart.pieces} pieces`} />
      <FlatList
        data={cart.lines}
        keyExtractor={l => l.id}
        contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={color.orange} />}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: color.line }} />}
        renderItem={({ item: l }) => (
          <View style={st.line}>
            <Pressable onPress={() => router.push(`/product/${l.productHandle}`)}>
              <Image source={{ uri: l.image ?? undefined }} style={st.thumb} contentFit="cover" contentPosition="top" />
            </Pressable>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="bodyB" numberOfLines={1}>{l.code ? `${l.code} · ${l.colour ?? l.name}` : l.name}</T>
              <T v="small" numberOfLines={1}>{l.label}{l.sizes.length > 1 ? ` · ${l.sizes.join(' · ')}` : ''}</T>
              <Text style={st.lineTotal}>{rupees(l.lineTotal)}</Text>
              {!l.available ? <Tag label="Sold out: remove to continue" tone="red" /> : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <Stepper small value={l.quantity} min={0} disabled={busy} onChange={n => setQuantity(l.id, n).catch(() => {})} />
              <Pressable onPress={() => remove(l.id).catch(() => {})} hitSlop={8} accessibilityLabel="Remove"><Trash2 size={17} color={color.ink3} /></Pressable>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={{ gap: 12, marginTop: 8 }}>
            {cart.note ? <Note tone="red">{cart.note}</Note> : null}
            {error ? <Note tone="red">{error}</Note> : null}
            <Card tone="wash" style={{ gap: 6 }}>
              <Row k={`Items (${cart.pieces} pieces)`} v={rupees(cart.subtotal)} />
              <Row k="Shipping and discounts" v="At checkout" />
              <View style={{ height: 1, backgroundColor: color.line2, marginVertical: 4 }} />
              <Row k="Total so far" v={rupees(cart.total)} bold />
            </Card>
            {belowMinimum ? <Note tone="red">{`Minimum order is ${minPieces} pieces. Add ${minPieces - cart.pieces} more to check out.`}</Note> : null}
            {settings.offerBanner ? <Note tone="sun">{settings.offerBanner}</Note> : null}
            {sale > cart.total ? (
              <Card tone="green" style={{ gap: 2 }}>
                <T v="small">Your profit if sold at {useMrp ? 'MRP or your markup' : `your ${markup}% markup`}</T>
                <Text style={st.profit}>{rupees(sale - cart.total)}</Text>
              </Card>
            ) : null}
          </View>
        }
      />
      <View style={st.bar}>
        <View style={{ flex: 1 }}>
          <Text style={st.barPrice}>{rupees(cart.total)}</Text>
          <T v="tiny" style={{ color: belowMinimum ? color.red : color.ink2 }}>{cart.pieces} pieces{belowMinimum ? ` · minimum ${minPieces}` : ''}</T>
        </View>
        <Button title="Checkout" loading={busy} disabled={belowMinimum || cart.lines.some(l => !l.available)} onPress={() => openCheckout(cart.checkoutUrl)} />
      </View>
    </SafeAreaView>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <T v={bold ? 'h3' : 'small'} style={{ color: bold ? color.ink : color.ink2, fontSize: bold ? 17 : 14 }}>{k}</T>
      <T v={bold ? 'h3' : 'smallB'} style={{ fontSize: bold ? 17 : 14 }}>{v}</T>
    </View>
  );
}

const st = StyleSheet.create({
  line: { flexDirection: 'row', gap: 12, paddingVertical: 12, alignItems: 'flex-start' },
  thumb: { width: 54, height: 66, borderRadius: 10, backgroundColor: color.wash },
  lineTotal: { fontFamily: font.bold, fontSize: 15.5, color: color.ink, marginTop: 2 },
  profit: { fontFamily: font.bold, fontSize: 26, color: color.green },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: color.line, paddingHorizontal: gutter, paddingVertical: 12, backgroundColor: color.paper },
  barPrice: { fontFamily: font.bold, fontSize: 20, color: color.ink },
});
