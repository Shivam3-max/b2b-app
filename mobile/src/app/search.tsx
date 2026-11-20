import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, Clock, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, Empty, IconButton, Loading, T } from '../components/ui';
import { usePrefs } from '../lib/prefs';
import { searchProducts } from '../lib/shopify/api';
import { displayName, rupees } from '../lib/shopify/model';
import { color, font, gutter } from '../theme/tokens';

const POPULAR = ['cord set', 'sweatshirt', 'jogger', 'infant', 'cotton terry'];

export default function SearchScreen() {
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');
  const { recentSearches, addRecent } = usePrefs();

  useEffect(() => {
    const t = setTimeout(() => setTerm(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);

  const q = useQuery({ queryKey: ['search', term], queryFn: () => searchProducts(term), enabled: term.length > 0 });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.paper }}>
      <View style={st.top}>
        <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
        <View style={st.field}>
          <TextInput
            autoFocus
            value={text}
            onChangeText={setText}
            placeholder="Style code or name, e.g. 2603"
            placeholderTextColor={color.ink3}
            returnKeyType="search"
            onSubmitEditing={() => addRecent(text)}
            style={st.input}
            accessibilityLabel="Search designs"
          />
          {text ? <Pressable onPress={() => setText('')} hitSlop={8} accessibilityLabel="Clear"><X size={18} color={color.ink2} /></Pressable> : null}
        </View>
      </View>

      {!term ? (
        <View style={{ paddingHorizontal: gutter, gap: 18 }}>
          {recentSearches.length ? (
            <View style={{ gap: 8 }}>
              <T v="label">Recent</T>
              <View style={st.wrap}>{recentSearches.map(r => <Chip key={r} label={r} icon={Clock} onPress={() => setText(r)} />)}</View>
            </View>
          ) : null}
          <View style={{ gap: 8 }}>
            <T v="label">Popular with shops</T>
            <View style={st.wrap}>{POPULAR.map(r => <Chip key={r} label={r} onPress={() => setText(r)} />)}</View>
          </View>
          <T v="small">Tip: type the first digits of a style code. "26" finds 2603, 2604 and more.</T>
        </View>
      ) : q.isLoading ? <Loading label="Searching…" /> : (
        <FlatList
          data={q.data ?? []}
          keyExtractor={p => p.id}
          contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 30 }}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: color.line }} />}
          ListEmptyComponent={<Empty title="No match" body={`Nothing found for "${term}". Check the code, or try a word like "cord set".`} />}
          renderItem={({ item }) => (
            <Pressable style={st.row} onPress={() => { addRecent(term); router.push(`/product/${item.handle}`); }}>
              <Image source={{ uri: item.image ?? undefined }} style={st.thumb} contentFit="cover" contentPosition="top" />
              <View style={{ flex: 1 }}>
                <T v="bodyB" numberOfLines={1}>{displayName(item)}</T>
                <T v="small" numberOfLines={1}>{item.main ? `${rupees(item.main.pricePerPiece)}/pc · ${item.main.label}` : item.name}{item.gsm ? ` · ${item.gsm} GSM` : ''}</T>
              </View>
              {!item.available ? <T v="tiny" tone="red">Sold out</T> : null}
              <ChevronRight size={19} color={color.ink3} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: gutter, paddingVertical: 10 },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, borderRadius: 14, borderWidth: 1.5, borderColor: color.ink, paddingHorizontal: 14 },
  input: { flex: 1, fontFamily: font.semibold, fontSize: 16, color: color.ink, paddingVertical: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  thumb: { width: 46, height: 56, borderRadius: 9, backgroundColor: color.wash },
});
