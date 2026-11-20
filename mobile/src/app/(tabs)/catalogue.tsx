import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ChevronRight, Search } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, ErrorView, Header, IconButton, Loading, T } from '../../components/ui';
import { getCollections } from '../../lib/shopify/api';
import { color, gutter } from '../../theme/tokens';

const SEASONS = [
  { key: 'all', label: 'All' },
  { key: 'winter', label: 'Winter', test: /winter|fleece|sweat|jogger|lower|3 thread|cord/i },
  { key: 'summer', label: 'Summer', test: /summer|t.?shirt|capri|short|cotton suit/i },
] as const;

export default function Catalogue() {
  const q = useQuery({ queryKey: ['collections'], queryFn: getCollections });
  const [season, setSeason] = useState<(typeof SEASONS)[number]['key']>('all');
  const list = useMemo(() => {
    const s = SEASONS.find(x => x.key === season);
    const all = q.data ?? [];
    return s && 'test' in s ? all.filter(c => s.test.test(c.title)) : all;
  }, [q.data, season]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.paper }}>
      <Header title="Catalogue" sub="Live from the B2B Store website" right={<IconButton icon={Search} label="Search" onPress={() => router.push('/search')} />} />
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: gutter, paddingBottom: 10 }}>
        {SEASONS.map(s => <Chip key={s.key} label={s.label} on={season === s.key} onPress={() => setSeason(s.key)} />)}
      </View>
      {q.isLoading ? <Loading /> : q.isError ? <ErrorView message={(q.error as Error).message} onRetry={() => q.refetch()} /> : (
        <FlatList
          data={[{ id: 'all', handle: 'all', title: 'All designs', description: '', image: null, firstProductImage: list[0]?.firstProductImage ?? null }, ...list]}
          keyExtractor={c => c.id}
          contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 30 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: color.line }} />}
          onRefresh={() => q.refetch()}
          refreshing={q.isRefetching}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/collection/${item.handle}`)} style={st.row} accessibilityRole="button" accessibilityLabel={item.title}>
              <Image source={{ uri: item.image ?? item.firstProductImage ?? undefined }} style={st.thumb} contentFit="cover" contentPosition="top" />
              <View style={{ flex: 1 }}>
                <T v="bodyB">{item.title}</T>
                {item.description ? <T v="small" numberOfLines={1}>{item.description}</T> : null}
              </View>
              <ChevronRight size={20} color={color.ink3} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 10 },
  thumb: { width: 56, height: 56, borderRadius: 14, backgroundColor: color.wash },
});
