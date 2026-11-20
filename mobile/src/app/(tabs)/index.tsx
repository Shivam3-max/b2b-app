import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Bell, Factory, Mic, Percent, Search, Tag as TagIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CardSkeleton, ProductCard } from '../../components/ProductCard';
import { Card, ErrorView, Header, IconButton, Section, T } from '../../components/ui';
import { getCollections, getProducts } from '../../lib/shopify/api';
import { useSettings } from '../../lib/settings';
import { color, font, gutter } from '../../theme/tokens';

const LOGO = require('../../../assets/logo.png');

export default function Home() {
  const settings = useSettings();
  const collections = useQuery({ queryKey: ['collections'], queryFn: getCollections });
  const fresh = useQuery({ queryKey: ['products', 'NEWEST'], queryFn: () => getProducts({ sort: 'NEWEST', first: 10 }) });
  const best = useQuery({ queryKey: ['products', 'BEST_SELLING'], queryFn: () => getProducts({ sort: 'BEST_SELLING', first: 6 }) });
  const refreshing = fresh.isRefetching || best.isRefetching || collections.isRefetching;
  const refresh = () => { fresh.refetch(); best.refetch(); collections.refetch(); };

  if (fresh.isError && best.isError) return <SafeAreaView style={{ flex: 1 }}><ErrorView message={(fresh.error as Error).message} onRetry={refresh} /></SafeAreaView>;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.paper }}>
      <Header
        left={<Image source={LOGO} style={{ width: 42, height: 42 }} contentFit="contain" />}
        title="B2B Store"
        sub="Kidswear wholesale, direct from the factory"
        right={<IconButton icon={Bell} label="Notifications" onPress={() => router.push('/notifications')} />}
      />
      <ScrollView contentContainerStyle={st.body} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.orange} />}>
        <Pressable onPress={() => router.push('/search')} style={st.search} accessibilityRole="search" accessibilityLabel="Search designs">
          <Search size={20} color={color.ink2} />
          <T v="body" style={{ flex: 1, color: color.ink3 }}>Search code or style, e.g. 2603</T>
          <Mic size={19} color={color.ink2} />
        </Pressable>

        {settings.offerBanner ? (
          <View style={st.offer}><Percent size={16} color={color.ink} /><T v="smallB" style={{ fontSize: 14 }}>{settings.offerBanner}</T></View>
        ) : null}

        <Section title="Shop by category" action="All" onAction={() => router.push('/catalogue')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingRight: gutter }} style={{ marginRight: -gutter }}>
            {(collections.data ?? []).slice(0, 10).map(c => (
              <Pressable key={c.id} onPress={() => router.push(`/collection/${c.handle}`)} style={{ width: 72, alignItems: 'center', gap: 6 }}>
                <Image source={{ uri: c.image ?? c.firstProductImage ?? undefined }} style={st.circle} contentFit="cover" contentPosition="top" />
                <T v="tiny" numberOfLines={2} style={{ textAlign: 'center', color: color.ink, fontFamily: font.semibold, fontSize: 12 }}>{c.title}</T>
              </Pressable>
            ))}
            {collections.isLoading ? [0, 1, 2, 3].map(i => <View key={i} style={[st.circle, { backgroundColor: color.wash }]} />) : null}
          </ScrollView>
        </Section>

        <Section title="New this week" action="See all" onAction={() => router.push('/collection/all?sort=NEWEST')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: gutter }} style={{ marginRight: -gutter }}>
            {fresh.isLoading ? [0, 1, 2].map(i => <CardSkeleton key={i} width={152} />) : (fresh.data?.products ?? []).map(p => <ProductCard key={p.id} product={p} width={152} badge={{ label: 'New', tone: 'sun' }} />)}
          </ScrollView>
        </Section>

        <Pressable onPress={() => router.push('/help')}>
          <Card tone="dark" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20 }}>
            <Factory size={30} color={color.sun} />
            <View style={{ flex: 1 }}>
              <T v="h3" style={{ color: '#fff' }}>{settings.factoryVisitText}</T>
              <T v="small" style={{ color: '#CFC8BA' }}>Book a slot and see the full range</T>
            </View>
          </Card>
        </Pressable>

        <Section title="Best sellers" action="See all" onAction={() => router.push('/collection/all?sort=BEST_SELLING')}>
          <View style={st.grid}>
            {best.isLoading ? [0, 1, 2, 3].map(i => <View key={i} style={st.cell}><CardSkeleton /></View>) : (best.data?.products ?? []).map(p => <View key={p.id} style={st.cell}><ProductCard product={p} /></View>)}
          </View>
        </Section>

        {settings.privateLabelText ? (
          <Pressable onPress={() => router.push('/help')}>
            <Card tone="wash" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TagIcon size={24} color={color.ink} />
              <T v="bodyB" style={{ flex: 1 }}>{settings.privateLabelText}</T>
            </Card>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  body: { paddingHorizontal: gutter, paddingBottom: 30, gap: 20 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 16, borderRadius: 14, backgroundColor: color.wash },
  offer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: color.sun, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  circle: { width: 66, height: 66, borderRadius: 33, backgroundColor: color.wash },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, rowGap: 18 },
  cell: { width: '47.5%', flexGrow: 1 },
});
