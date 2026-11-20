import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCart } from '../lib/shopify/cart';
import { BuyOption, displayName, earning, Product, rupees } from '../lib/shopify/model';
import { usePrefs } from '../lib/prefs';
import { color, font, radius } from '../theme/tokens';
import { Tag, T } from './ui';

/** Price per piece, MRP and what the shop earns, for one buying option. */
export function EarnLine({ option, compact }: { option: BuyOption; compact?: boolean }) {
  const { markup, useMrp, showEarnings } = usePrefs();
  if (!showEarnings) return null;
  const o = useMrp ? option : { ...option, mrpPerPiece: null };
  const e = earning(o, markup);
  if (e.earnPerPiece <= 0) return null;
  return (
    <Text style={[st.earn, compact && { fontSize: 11.5 }]} numberOfLines={1}>
      You earn {rupees(e.earnPerPiece)}/pc{e.pctOfMrp != null ? ` · ${Math.round(e.pctOfMrp)}%` : ''}
    </Text>
  );
}

export function ProductCard({ product, width, badge }: { product: Product; width?: number; badge?: { label: string; tone: 'sun' | 'ink' | 'green' } }) {
  const add = useCart(s => s.add);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const m = product.main;
  const soldOut = !product.available;

  async function quickAdd() {
    if (!m || !m.available) return router.push(`/product/${product.handle}`);
    setAdding(true);
    try {
      await add([{ variantId: m.variantId, quantity: 1 }]);
      setAdded(true);
      setTimeout(() => setAdded(false), 1600);
    } catch {
      /* the cart shows the reason */
    } finally {
      setAdding(false);
    }
  }

  return (
    <Pressable onPress={() => router.push(`/product/${product.handle}`)} style={[{ gap: 5 }, width ? { width } : { flex: 1 }]} accessibilityRole="button" accessibilityLabel={displayName(product)}>
      <View style={st.imgWrap}>
        {product.image ? <Image source={{ uri: product.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} recyclingKey={product.id} /> : null}
        {soldOut ? <Tag label="Sold out" tone="ink" style={st.tag} /> : badge ? <Tag label={badge.label} tone={badge.tone} style={st.tag} /> : null}
        {!soldOut ? (
          <Pressable onPress={quickAdd} accessibilityLabel={`Add ${m?.label ?? ''} to cart`} hitSlop={6} style={[st.add, added && { backgroundColor: color.green }]}>
            {adding ? <ActivityIndicator size="small" color={color.ink} /> : <Plus size={20} color={added ? '#fff' : color.ink} />}
          </Pressable>
        ) : null}
      </View>
      <T v="h3" numberOfLines={1} style={{ fontSize: 14.5 }}>{displayName(product)}</T>
      {m ? (
        <>
          <T v="tiny" numberOfLines={1} style={{ color: color.ink2, fontSize: 12 }}>
            {m.kind === 'size' ? `${product.options.filter(o => o.kind === 'size').length} sizes` : `${m.label} · ${rupees(m.price)}`}{product.gsm ? ` · ${product.gsm} GSM` : ''}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' }}>
            <Text style={st.price}>{rupees(m.pricePerPiece)}</Text>
            <Text style={st.meta}>/pc{m.mrpPerPiece ? ` · MRP ${rupees(m.mrpPerPiece)}` : ''}</Text>
          </View>
          <EarnLine option={m} compact />
        </>
      ) : null}
    </Pressable>
  );
}

const st = StyleSheet.create({
  imgWrap: { aspectRatio: 4 / 5, borderRadius: radius.lg + 2, overflow: 'hidden', backgroundColor: color.wash },
  tag: { position: 'absolute', left: 8, top: 8 },
  add: { position: 'absolute', right: 8, bottom: 8, width: 36, height: 36, borderRadius: 12, backgroundColor: color.paper, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  price: { fontFamily: font.bold, fontSize: 16, color: color.ink, fontVariant: ['tabular-nums'] },
  meta: { fontFamily: font.regular, fontSize: 12, color: color.ink3 },
  earn: { fontFamily: font.bold, fontSize: 12, color: color.green },
});

export function CardSkeleton({ width }: { width?: number }) {
  return (
    <View style={[{ gap: 7 }, width ? { width } : { flex: 1 }]}>
      <View style={[st.imgWrap]} />
      <View style={{ height: 13, width: '75%', borderRadius: 6, backgroundColor: color.wash }} />
      <View style={{ height: 11, width: '55%', borderRadius: 6, backgroundColor: color.wash }} />
      <View style={{ height: 15, width: '40%', borderRadius: 6, backgroundColor: color.wash }} />
    </View>
  );
}
