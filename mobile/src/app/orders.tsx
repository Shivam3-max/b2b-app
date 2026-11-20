import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Chip, Empty, ErrorView, Header, Loading, T, Tag } from '../components/ui';
import { getOrders, OrderSummary, useAccount } from '../lib/account';
import { rupees } from '../lib/shopify/model';
import { color, gutter } from '../theme/tokens';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'In progress' },
  { key: 'delivered', label: 'Delivered' },
] as const;

const statusTone = (s: OrderSummary['status']) => (s === 'delivered' ? 'green' : s === 'shipped' ? 'navy' : s === 'cancelled' ? 'red' : 'orange');
export const statusLabel = (s: OrderSummary['status']) => ({ placed: 'Placed', confirmed: 'Confirmed', packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' })[s];

export default function Orders() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  const token = useAccount(s => s.token);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');
  const q = useQuery({ queryKey: ['orders'], queryFn: getOrders, enabled: !!token });
  const title = view === 'bills' ? 'Bills' : view === 'payments' ? 'Payments' : 'Orders';

  if (!token) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.paper }}>
      <Header back title={title} />
      <Empty title="Sign in to see your orders" body="Every order from the app and the website appears here."><Button title="Sign in" onPress={() => router.push('/login')} /></Empty>
    </SafeAreaView>
  );

  const list = (q.data ?? []).filter(o => filter === 'all' ? true : filter === 'delivered' ? o.status === 'delivered' : !['delivered', 'cancelled'].includes(o.status));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.paper }}>
      <Header back title={title} sub={view === 'payments' ? 'All orders are paid in advance' : undefined} />
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: gutter, paddingBottom: 10 }}>
        {FILTERS.map(f => <Chip key={f.key} label={f.label} on={filter === f.key} onPress={() => setFilter(f.key)} />)}
      </View>
      {q.isLoading ? <Loading /> : q.isError ? <ErrorView message={(q.error as Error).message} onRetry={() => q.refetch()} /> : (
        <FlatList
          data={list}
          keyExtractor={o => o.id}
          contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 30, gap: 12 }}
          refreshing={q.isRefetching}
          onRefresh={() => q.refetch()}
          ListEmptyComponent={<Empty title="No orders yet" body="Your first order will show up here." />}
          renderItem={({ item: o }) => (
            <Pressable onPress={() => router.push(`/order/${encodeURIComponent(o.id)}`)}>
              <Card style={{ gap: 10 }}>
                <View style={st.rowBetween}>
                  <T v="bodyB">Order {o.name} <T v="small">· {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</T></T>
                  <Tag label={statusLabel(o.status)} tone={statusTone(o.status)} />
                </View>
                <View style={st.rowBetween}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>{o.images.slice(0, 4).map(u => <Image key={u} source={{ uri: u }} style={st.thumb} contentFit="cover" contentPosition="top" />)}</View>
                  <T v="bodyB">{o.pieces} pcs · {rupees(o.total)}</T>
                </View>
                {view === 'payments' ? <T v="small">{o.financialStatus}</T> : null}
              </Card>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  thumb: { width: 40, height: 50, borderRadius: 8, backgroundColor: color.wash },
});
