import { Tabs } from 'expo-router/tabs';
import { ClipboardList, House, LayoutGrid, ShoppingBag, Store } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../../lib/shopify/cart';
import { color, font } from '../../theme/tokens';

const ITEMS = [
  { name: 'index', label: 'Home', icon: House },
  { name: 'catalogue', label: 'Catalogue', icon: LayoutGrid },
  { name: 'pad', label: 'Order pad', icon: ClipboardList },
  { name: 'cart', label: 'Cart', icon: ShoppingBag },
  { name: 'myshop', label: 'My Shop', icon: Store },
] as const;

type BarProps = { state: { index: number; routes: { key: string; name: string }[] }; navigation: { navigate: (name: string) => void; emit: (e: any) => any } };

function TabBar({ state, navigation }: BarProps) {
  const insets = useSafeAreaInsets();
  const count = useCart(s => s.cart?.lines.length ?? 0);
  return (
    <View style={[st.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, i) => {
        const item = ITEMS.find(x => x.name === route.name);
        if (!item) return null;
        const on = state.index === i;
        const Icon = item.icon;
        const onPress = () => {
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!on && !e.defaultPrevented) navigation.navigate(route.name);
        };
        if (item.name === 'pad') {
          return (
            <Pressable key={route.key} onPress={onPress} style={st.item} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={item.label}>
              <View style={[st.pad, on && { backgroundColor: color.orange }]}><Icon size={24} color={on ? color.ink : '#fff'} /></View>
              <Text style={[st.label, on && st.labelOn]}>{item.label}</Text>
            </Pressable>
          );
        }
        return (
          <Pressable key={route.key} onPress={onPress} style={st.item} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={item.label}>
            <View>
              <Icon size={25} color={on ? color.ink : color.ink3} strokeWidth={on ? 2.2 : 1.8} />
              {item.name === 'cart' && count > 0 ? <View style={st.badge}><Text style={st.badgeText}>{count}</Text></View> : null}
            </View>
            <Text style={[st.label, on && st.labelOn]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      // Keep tab screens attached: detaching native screen containers on tab switch is a known Android crash source.
      detachInactiveScreens={false}
      tabBar={props => <TabBar {...(props as unknown as BarProps)} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.paper } }}
    >
      {ITEMS.map(i => <Tabs.Screen key={i.name} name={i.name} options={{ title: i.label }} />)}
    </Tabs>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: color.line, backgroundColor: color.paper, paddingTop: 7, paddingHorizontal: 6 },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  label: { fontFamily: font.medium, fontSize: 11, color: color.ink3 },
  labelOn: { fontFamily: font.bold, color: color.ink },
  pad: { width: 52, height: 52, marginTop: -24, borderRadius: 18, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  badge: { position: 'absolute', top: -5, right: -10, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: color.orange, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: font.bold, fontSize: 10.5, color: color.ink },
});
