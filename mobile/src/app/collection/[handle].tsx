import { useInfiniteQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowUpDown, Search } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CardSkeleton, ProductCard } from '../../components/ProductCard';
import { Chip, Empty, ErrorView, Header, IconButton } from '../../components/ui';
import { getCollectionProducts, getProducts, SortKey } from '../../lib/shopify/api';
import { color, gutter } from '../../theme/tokens';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'NEWEST', label: 'Newest' },
  { key: 'BEST_SELLING', label: 'Best selling' },
  { key: 'PRICE_ASC', label: 'Price: low to high' },
  { key: 'PRICE_DESC', label: 'Price: high to low' },
];

export default function Collection() {
  const { handle, sort: sortParam } = useLocalSearchParams<{ handle: string; sort?: SortKey }>();
  const [sort, setSort] = useState<SortKey>(sortParam && SORTS.some(s => s.key === sortParam) ? sortParam : 'NEWEST');
  const isAll = handle === 'all';

  const q = useInfiniteQuery({
    queryKey: ['collection', handle, sort],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      isAll ? { title: 'All designs', description: '', ...(await getProducts({ sort, after: pageParam })) } : getCollectionProducts(handle, sort, pageParam),
    getNextPageParam: last => (last.hasNextPage ? last.endCursor : undefined),
  });
  const products = q.data?.pages.flatMap(p => p.products) ?? [];
  const title = q.data?.pages[0]?.title ?? (isAll ? 'All designs' : '');

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.paper }}>
      <Header back title={title} sub={q.data ? `${products.length}${q.hasNextPage ? '+' : ''} designs` : undefined} right={<IconButton icon={Search} label="Search" onPress={() => router.push('/search')} />} />
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: gutter, paddingBottom: 12 }}>
          {SORTS.map(s => <Chip key={s.key} label={s.label} icon={sort === s.key ? ArrowUpDown : undefined} on={sort === s.key} onPress={() => setSort(s.key)} />)}
        </ScrollView>
      </View>
      {q.isError ? <ErrorView message={(q.error as Error).message} onRetry={() => q.refetch()} /> : (
        <FlatList
          data={q.isLoading ? [] : products}
          keyExtractor={p => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 30, gap: 18 }}
          renderItem={({ item }) => <View style={{ flex: 1, maxWidth: '50%' }}><ProductCard product={item} /></View>}
          onEndReachedThreshold={0.6}
          onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage(); }}
          refreshing={q.isRefetching && !q.isFetchingNextPage}
          onRefresh={() => q.refetch()}
          ListEmptyComponent={q.isLoading ? (
            <View style={{ flexDirection: 'row', gap: 12 }}><CardSkeleton /><CardSkeleton /></View>
          ) : <Empty title="No designs here yet" body="New designs appear here as soon as they are added on Shopify." />}
          ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator color={color.orange} style={{ marginTop: 10 }} /> : undefined}
        />
      )}
    </SafeAreaView>
  );
}
