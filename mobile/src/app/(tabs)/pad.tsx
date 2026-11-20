import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Check, ClipboardPaste, Search, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Empty, Header, IconButton, Note, T, Tag } from '../../components/ui';
import { MatchResult, matchOrderList, usePad } from '../../lib/pad';
import { searchProducts } from '../../lib/shopify/api';
import { useCart } from '../../lib/shopify/cart';
import { displayName, rupees } from '../../lib/shopify/model';
import { color, font, gutter } from '../../theme/tokens';

export default function OrderPad() {
  const insets = useSafeAreaInsets();
  const { rows, addProduct, setQty, removeRow, clear } = usePad();
  const { add, busy } = useCart();
  const [code, setCode] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [message, setMessage] = useState<{ tone: 'green' | 'red'; text: string } | null>(null);
  const term = code.trim();
  const sugg = useQuery({ queryKey: ['search', term], queryFn: () => searchProducts(term), enabled: /^\d{2,5}$/.test(term) });

  const totals = useMemo(() => rows.reduce((a, r) => {
    r.product.options.forEach(o => { const n = r.qty[o.variantId] ?? 0; a.pay += n * o.price; a.pieces += n * o.pieces; });
    return a;
  }, { pay: 0, pieces: 0 }), [rows]);

  async function addAll() {
    const lines = rows.flatMap(r => Object.entries(r.qty).filter(([, n]) => n > 0).map(([variantId, quantity]) => ({ variantId, quantity })));
    setMessage(null);
    try {
      await add(lines);
      const note = useCart.getState().cart?.note;
      if (note) setMessage({ tone: 'red', text: note });
      else { clear(); router.push('/cart'); }
    } catch (e) {
      setMessage({ tone: 'red', text: e instanceof Error ? e.message : 'Could not add to cart.' });
    }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.paper }}>
      <Header title="Order pad" sub="Type codes, fill sets, done" right={rows.length ? <IconButton icon={X} label="Clear the pad" onPress={clear} /> : undefined} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 24, gap: 12 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={st.field}>
              <Search size={18} color={color.ink2} />
              <TextInput value={code} onChangeText={setCode} placeholder="Style code, e.g. 2603" placeholderTextColor={color.ink3} keyboardType="number-pad" style={st.input} accessibilityLabel="Style code" />
            </View>
            <Button title="Paste" kind="outline" size="sm" icon={ClipboardPaste} onPress={() => setPasteOpen(true)} style={{ minHeight: 50 }} />
          </View>

          {term && sugg.data ? (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {sugg.data.slice(0, 6).map(p => (
                <Pressable key={p.id} onPress={() => { addProduct(p); setCode(''); }} style={st.sugg}>
                  <Image source={{ uri: p.image ?? undefined }} style={st.thumb} contentFit="cover" contentPosition="top" />
                  <View style={{ flex: 1 }}>
                    <T v="bodyB" numberOfLines={1}>{displayName(p)}</T>
                    <T v="small">{p.main ? `${rupees(p.main.pricePerPiece)}/pc` : ''}{p.gsm ? ` · ${p.gsm} GSM` : ''}</T>
                  </View>
                  {!p.available ? <Tag label="Sold out" tone="red" /> : <Tag label="Add" tone="ink" />}
                </Pressable>
              ))}
              {!sugg.data.length ? <View style={{ padding: 14 }}><T v="small">No design with code {term}.</T></View> : null}
            </Card>
          ) : null}

          {rows.length === 0 && !term ? (
            <Empty title="Order by code" body="Type a style code above, or paste the list a shop sent you on WhatsApp. Rows stay saved even if the app closes." />
          ) : null}

          {rows.map(r => (
            <Card key={r.product.id} style={{ padding: 11, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Image source={{ uri: r.product.image ?? undefined }} style={st.thumb} contentFit="cover" contentPosition="top" />
                <View style={{ flex: 1 }}>
                  <T v="bodyB" numberOfLines={1}>{displayName(r.product)}</T>
                  <T v="small">{r.product.main ? `${rupees(r.product.main.pricePerPiece)}/pc` : ''}{r.product.gsm ? ` · ${r.product.gsm} GSM` : ''}</T>
                </View>
                <IconButton icon={X} label={`Remove ${displayName(r.product)}`} onPress={() => removeRow(r.product.id)} />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {r.product.options.map(o => {
                  const n = r.qty[o.variantId] ?? 0;
                  return (
                    <View key={o.variantId} style={[st.cell, n > 0 && st.cellOn, !o.available && { opacity: 0.4 }]}>
                      <Text numberOfLines={1} style={[st.cellLabel, n > 0 && { color: '#fff' }]}>{o.kind === 'set' ? o.sizes.join(',') || o.label : o.label}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Pressable disabled={!o.available || n === 0} onPress={() => setQty(r.product.id, o.variantId, n - 1)} hitSlop={6} style={st.cellBtn}><Text style={[st.cellSign, n > 0 && { color: '#fff' }]}>−</Text></Pressable>
                        <Text style={[st.cellVal, n > 0 && { color: '#fff' }]}>{n}</Text>
                        <Pressable disabled={!o.available} onPress={() => setQty(r.product.id, o.variantId, n + 1)} hitSlop={6} style={st.cellBtn}><Text style={[st.cellSign, n > 0 && { color: '#fff' }]}>+</Text></Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          ))}
          {message ? <Note tone={message.tone}>{message.text}</Note> : null}
        </ScrollView>
      </KeyboardAvoidingView>
      {rows.length ? (
        <View style={st.bar}>
          <View style={{ flex: 1 }}>
            <Text style={st.barPrice}>{rupees(totals.pay)}</Text>
            <T v="tiny" style={{ color: color.ink2 }}>{totals.pieces} pieces · {rows.length} designs</T>
          </View>
          <Button title="Add to cart" disabled={totals.pieces === 0} loading={busy} onPress={addAll} />
        </View>
      ) : null}
      <PasteSheet open={pasteOpen} onClose={() => setPasteOpen(false)} bottom={insets.bottom} />
    </SafeAreaView>
  );
}

function PasteSheet({ open, onClose, bottom }: { open: boolean; onClose: () => void; bottom: number }) {
  const addProduct = usePad(s => s.addProduct);
  const [text, setText] = useState('');
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [reading, setReading] = useState(false);
  const usable = (results ?? []).filter(r => r.product && r.option && r.option.available);

  async function read() {
    setReading(true);
    try { setResults(await matchOrderList(text)); } finally { setReading(false); }
  }
  function useResults() {
    usable.forEach(r => addProduct(r.product!, { [r.option!.variantId]: r.count }));
    setResults(null); setText(''); onClose();
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={[st.sheet, { paddingBottom: Math.max(bottom, 18) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <T v="title" style={{ flex: 1 }}>Paste from WhatsApp</T>
          <IconButton icon={X} label="Close" onPress={onClose} />
        </View>
        <TextInput
          multiline value={text} onChangeText={t => { setText(t); setResults(null); }}
          placeholder={'One design per line, e.g.\n2603 pink 2 set\n616 - 3\n1750 26-30 4 set'}
          placeholderTextColor={color.ink3} style={st.area} accessibilityLabel="Order list"
        />
        {results ? (
          <ScrollView style={{ maxHeight: 260 }}>
            {results.map((r, i) => (
              <View key={i} style={st.resRow}>
                <View style={[st.resIcon, { backgroundColor: r.problem ? color.redSoft : color.greenSoft }]}>
                  {r.problem ? <X size={15} color={color.red} /> : <Check size={15} color={color.green} />}
                </View>
                <View style={{ flex: 1 }}>
                  <T v="bodyB" numberOfLines={1}>{r.product ? displayName(r.product) : r.raw}</T>
                  <T v="small" style={r.problem ? { color: color.red } : undefined}>{r.problem ?? `${r.count} × ${r.option?.label}${r.option?.sizes.length ? ` (${r.option.sizes.join(',')})` : ''}`}</T>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : null}
        {results ? (
          <Button title={usable.length ? `Add ${usable.length} to the pad` : 'Nothing to add'} disabled={!usable.length} onPress={useResults} full />
        ) : (
          <Button title="Read list" disabled={!text.trim()} loading={reading} onPress={read} full />
        )}
        <T v="tiny" style={{ textAlign: 'center' }}>Codes that don't match a design are flagged, never guessed.</T>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 50, borderRadius: 14, borderWidth: 1.5, borderColor: color.ink, paddingHorizontal: 14 },
  input: { flex: 1, fontFamily: font.semibold, fontSize: 16, color: color.ink, paddingVertical: 10 },
  sugg: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: 1, borderBottomColor: color.line },
  thumb: { width: 40, height: 50, borderRadius: 8, backgroundColor: color.wash },
  cell: { flexGrow: 1, minWidth: 96, borderRadius: 11, paddingTop: 6, paddingBottom: 4, alignItems: 'center', backgroundColor: color.wash },
  cellOn: { backgroundColor: color.ink },
  cellLabel: { fontFamily: font.semibold, fontSize: 11, color: color.ink2, paddingHorizontal: 4 },
  cellBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  cellSign: { fontFamily: font.semibold, fontSize: 18, color: color.ink },
  cellVal: { fontFamily: font.bold, fontSize: 18, color: color.ink, minWidth: 22, textAlign: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: color.line, paddingHorizontal: gutter, paddingVertical: 12, backgroundColor: color.paper },
  barPrice: { fontFamily: font.bold, fontSize: 20, color: color.ink },
  scrim: { flex: 1, backgroundColor: 'rgba(22,19,14,0.48)' },
  sheet: { backgroundColor: color.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: gutter, paddingTop: 16, gap: 12 },
  area: { minHeight: 130, borderWidth: 1.5, borderColor: color.ink, borderRadius: 14, padding: 12, fontFamily: font.regular, fontSize: 15, color: color.ink, textAlignVertical: 'top', backgroundColor: color.wash },
  resRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: color.line },
  resIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
