import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, Header, Note, Stepper, T } from '../../components/ui';
import { usePrefs } from '../../lib/prefs';
import { rupees } from '../../lib/shopify/model';
import { color, gutter } from '../../theme/tokens';

export default function PricingSettings() {
  const p = usePrefs();
  const example = 375;
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.paper }}>
      <Header back title="Pricing and language" />
      <ScrollView contentContainerStyle={st.body}>
        <Row title="Use MRP when available" sub='"You earn" = MRP minus your price' value={p.useMrp} onChange={p.setUseMrp} />
        <View style={st.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}><T v="bodyB">Markup when there is no MRP</T><T v="small">Used for designs without an MRP</T></View>
            <Stepper value={p.markup} min={5} max={150} onChange={p.setMarkup} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[25, 30, 40, 50, 60].map(n => <Chip key={n} label={`${n}%`} on={p.markup === n} onPress={() => p.setMarkup(n)} />)}
          </View>
          <T v="small">Example: a {rupees(example)} piece sells for {rupees(Math.round(example * (1 + p.markup / 100)))}, so you earn {rupees(Math.round(example * p.markup / 100))}.</T>
        </View>
        <Row title='Show "you earn" on products' sub="Turn off before showing the phone to a customer" value={p.showEarnings} onChange={p.setShowEarnings} />
        <View style={{ gap: 8 }}>
          <T v="label">Language</T>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="English" on={p.language === 'en'} onPress={() => p.setLanguage('en')} />
            <Chip label="हिंदी" on={p.language === 'hi'} onPress={() => p.setLanguage('hi')} />
          </View>
          {p.language === 'hi' ? <Note tone="sun">Hindi screens are being translated and arrive in the next update. Product names and codes stay the same.</Note> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ title, sub, value, onChange }: { title: string; sub: string; value: boolean; onChange: (b: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={st.row} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <View style={{ flex: 1 }}><T v="bodyB">{title}</T><T v="small">{sub}</T></View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: color.green, false: color.line2 }} thumbColor="#fff" />
    </Pressable>
  );
}

const st = StyleSheet.create({
  body: { paddingHorizontal: gutter, paddingBottom: 30, gap: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  card: { backgroundColor: color.wash, borderRadius: 18, padding: 14, gap: 12 },
});
