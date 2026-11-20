import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, MessageCircle, Percent, Share2, ShoppingBag } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Linking, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { EarnLine } from '../../components/ProductCard';
import { Button, Card, ErrorView, IconButton, Loading, Note, Stepper, T, Tag } from '../../components/ui';
import { config } from '../../lib/config';
import { usePrefs } from '../../lib/prefs';
import { useSettings } from '../../lib/settings';
import { getProduct, getStyleColours } from '../../lib/shopify/api';
import { useCart } from '../../lib/shopify/cart';
import { displayName, earning, rupees } from '../../lib/shopify/model';
import { color, font, gutter } from '../../theme/tokens';

export default function ProductScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const galleryW = Math.min(width, 640);
  const q = useQuery({ queryKey: ['product', handle], queryFn: () => getProduct(handle) });
  const p = q.data;
  const colours = useQuery({ queryKey: ['colours', p?.code], queryFn: () => getStyleColours(p!.code!), enabled: !!p?.code });
  const { add, busy, cart } = useCart();
  const { markup, useMrp } = usePrefs();
  const settings = useSettings();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [photo, setPhoto] = useState(0);
  const [message, setMessage] = useState<{ tone: 'green' | 'red'; text: string } | null>(null);

  const totals = useMemo(() => {
    if (!p) return { pieces: 0, pay: 0, sale: 0, sets: 0 };
    return p.options.reduce((a, o) => {
      const n = qty[o.variantId] ?? 0;
      const e = earning(useMrp ? o : { ...o, mrpPerPiece: null }, markup);
      return { pieces: a.pieces + n * o.pieces, pay: a.pay + n * o.price, sale: a.sale + n * o.pieces * e.sellPerPiece, sets: a.sets + n };
    }, { pieces: 0, pay: 0, sale: 0, sets: 0 });
  }, [p, qty, markup, useMrp]);

  if (q.isLoading) return <SafeAreaView style={{ flex: 1 }}><Loading /></SafeAreaView>;
  if (q.isError) return <SafeAreaView style={{ flex: 1 }}><ErrorView message={(q.error as Error).message} onRetry={() => q.refetch()} /></SafeAreaView>;
  if (!p) return <SafeAreaView style={{ flex: 1 }}><ErrorView message="This design is no longer available." onRetry={() => router.back()} /></SafeAreaView>;

  const m = p.main;
  const e = m ? earning(useMrp ? m : { ...m, mrpPerPiece: null }, markup) : null;
  const images = p.images.length ? p.images : p.image ? [p.image] : [];
  const productUrl = `${config.website}/products/${p.handle}`;

  async function addToCart() {
    const lines = Object.entries(qty).filter(([, n]) => n > 0).map(([variantId, quantity]) => ({ variantId, quantity }));
    setMessage(null);
    try {
      await add(lines);
      const note = useCart.getState().cart?.note;
      if (note) setMessage({ tone: 'red', text: note });
      else { setMessage({ tone: 'green', text: `Added ${totals.pieces} pieces to your cart.` }); setQty({}); }
    } catch (err) {
      setMessage({ tone: 'red', text: err instanceof Error ? err.message : 'Could not add to cart.' });
    }
  }

  const onScroll = (ev: NativeSyntheticEvent<NativeScrollEvent>) => setPhoto(Math.round(ev.nativeEvent.contentOffset.x / galleryW));

  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={{ width: galleryW, height: galleryW * 1.18, alignSelf: 'center', backgroundColor: color.wash }}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} onScroll={onScroll} scrollEventThrottle={64}>
            {images.map(u => <Image key={u} source={{ uri: u }} style={{ width: galleryW, height: galleryW * 1.18 }} contentFit="cover" contentPosition="top" />)}
          </ScrollView>
          <View style={[st.overlay, { top: insets.top + 8 }]}>
            <IconButton light icon={ChevronLeft} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
            <View style={{ flex: 1 }} />
            <IconButton light icon={Share2} label="Share" onPress={() => Share.share({ message: `${displayName(p)}: ${p.name}\n${productUrl}` })} />
            <IconButton light icon={ShoppingBag} label="Cart" badge={cart?.lines.length} onPress={() => router.push('/cart')} />
          </View>
          {images.length > 1 ? <Tag label={`${photo + 1} / ${images.length}`} tone="ink" style={{ position: 'absolute', right: 14, bottom: 12 }} /> : null}
        </View>

        <View style={st.body}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {p.gsm ? <Tag label={`${p.gsm} GSM`} /> : null}
            {p.fabric ? <Tag label={p.fabric} /> : null}
            {p.category ? <Tag label={p.category} /> : null}
          </View>
          <View>
            {p.code ? <T v="smallB" tone="ink2">Style {p.code}{p.colour ? ` · ${p.colour}` : ''}</T> : null}
            <T v="title" style={{ fontSize: 23, lineHeight: 27 }}>{p.name}</T>
          </View>
          {m ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
              <Text style={st.bigPrice}>{rupees(m.pricePerPiece)}</Text>
              <T v="small">/piece</T>
              {m.mrpPerPiece ? <T v="small">MRP {rupees(m.mrpPerPiece)}</T> : null}
            </View>
          ) : null}
          {e && e.earnPerPiece > 0 ? (
            <Note tone="green" icon={Percent}>
              <T v="small" style={{ color: color.ink }}>
                <Text style={{ fontFamily: font.bold }}>You earn {rupees(e.earnPerPiece)} per piece</Text>
                {e.pctOfMrp != null ? ` (${Math.round(e.pctOfMrp)}% of MRP)` : ` at your ${markup}% markup`}
              </T>
            </Note>
          ) : null}

          {(colours.data?.length ?? 0) > 1 ? (
            <View style={{ gap: 8 }}>
              <T v="label">Colours in this style</T>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {colours.data!.map(c => (
                  <Pressable key={c.id} onPress={() => c.handle !== p.handle && router.replace(`/product/${c.handle}`)} style={{ width: 70, gap: 4 }}>
                    <Image source={{ uri: c.image ?? undefined }} style={[st.swatch, c.handle === p.handle && { borderColor: color.ink, borderWidth: 2 }]} contentFit="cover" contentPosition="top" />
                    <T v="tiny" numberOfLines={1} style={{ textAlign: 'center', color: c.handle === p.handle ? color.ink : color.ink2 }}>{c.colour ?? c.name}</T>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <T v="h2">{p.options.some(o => o.kind === 'set') ? 'Choose sets' : 'Choose quantity'}</T>
              {p.options.some(o => o.kind === 'set') ? <T v="tiny">Each set has 1 piece per size</T> : null}
            </View>
            {p.options.map(o => {
              const n = qty[o.variantId] ?? 0;
              return (
                <Card key={o.variantId} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, n > 0 && { borderColor: color.ink, borderWidth: 2, padding: 13 }, !o.available && { backgroundColor: color.wash, borderColor: 'transparent' }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <T v="h3">{o.label}</T>
                      {!o.available ? <Tag label="Sold out" tone="red" /> : null}
                      {o.stock != null && o.available && o.stock <= 5 ? <Tag label={`${o.stock} left`} tone="orange" /> : null}
                    </View>
                    <T v="small">{o.kind === 'sample' ? '1 piece to check quality' : o.kind === 'set' ? `Sizes ${o.sizes.join(' · ')}` : '1 piece'}</T>
                    <T v="smallB">{rupees(o.price)}{o.mrp ? <Text style={{ color: color.ink3, fontFamily: font.regular }}>  MRP {rupees(o.mrp)}</Text> : null}</T>
                  </View>
                  <Stepper value={n} disabled={!o.available} onChange={v => setQty(s => ({ ...s, [o.variantId]: v }))} />
                </Card>
              );
            })}
            {totals.pieces > 0 ? (
              <Card tone="wash" style={{ gap: 4 }}>
                <Row k="Pieces" v={String(totals.pieces)} />
                <Row k="You pay" v={rupees(totals.pay)} />
                <Row k={`If sold at ${useMrp && p.options.some(o => o.mrp) ? 'MRP' : `${markup}% markup`} (${rupees(totals.sale)})`} v={`+${rupees(totals.sale - totals.pay)} profit`} green />
              </Card>
            ) : null}
            {message ? <Note tone={message.tone}>{message.text}</Note> : null}
          </View>

          {settings.whatsappNumber ? (
            <Button title="Ask about this design on WhatsApp" kind="whatsapp" size="sm" icon={MessageCircle}
              onPress={() => Linking.openURL(`https://wa.me/${settings.whatsappNumber!.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I have a question about ${displayName(p)}: ${productUrl}`)}`)} />
          ) : null}

          {p.description ? (
            <View style={{ gap: 6 }}>
              <T v="h2">Details</T>
              <T v="small" style={{ color: color.ink2, lineHeight: 20 }}>{p.description}</T>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[st.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={{ flex: 1 }}>
          {totals.pieces > 0 ? (
            <>
              <Text style={st.barPrice}>{rupees(totals.pay)}</Text>
              <T v="tiny" style={{ color: color.ink2 }}>{totals.sets} {totals.sets === 1 ? 'item' : 'items'} · {totals.pieces} pieces</T>
            </>
          ) : m ? (
            <>
              <Text style={st.barPrice}>{rupees(m.price)}</Text>
              <T v="tiny" style={{ color: color.ink2 }}>{m.label}{m.kind === 'set' ? ' · 1 piece each size' : ''}</T>
            </>
          ) : null}
        </View>
        <Button title={totals.pieces > 0 ? 'Add to cart' : 'Choose above'} kind={totals.pieces > 0 ? 'orange' : 'dark'} disabled={totals.pieces === 0} loading={busy} onPress={addToCart} />
      </View>
    </View>
  );
}

function Row({ k, v, green }: { k: string; v: string; green?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
      <T v="small" style={{ color: green ? color.green : color.ink2, flex: 1 }}>{k}</T>
      <T v="smallB" style={{ color: green ? color.green : color.ink }}>{v}</T>
    </View>
  );
}

const st = StyleSheet.create({
  overlay: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 10 },
  body: { paddingHorizontal: gutter, paddingTop: 14, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  bigPrice: { fontFamily: font.bold, fontSize: 28, color: color.ink, fontVariant: ['tabular-nums'] },
  swatch: { width: 70, height: 84, borderRadius: 12, backgroundColor: color.wash, borderWidth: 1, borderColor: color.line },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: color.line, paddingHorizontal: gutter, paddingTop: 12, backgroundColor: color.paper },
  barPrice: { fontFamily: font.bold, fontSize: 20, color: color.ink, fontVariant: ['tabular-nums'] },
});
