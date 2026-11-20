import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import { color, font, gutter, radius } from '../theme/tokens';

/* ---------- Text ---------- */

type Variant = 'display' | 'title' | 'h2' | 'h3' | 'body' | 'bodyB' | 'small' | 'smallB' | 'tiny' | 'label';
const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: font.serif, fontSize: 34, lineHeight: 37, color: color.ink },
  title: { fontFamily: font.bold, fontSize: 20, lineHeight: 24, color: color.ink },
  h2: { fontFamily: font.bold, fontSize: 18, lineHeight: 22, color: color.ink },
  h3: { fontFamily: font.bold, fontSize: 15.5, lineHeight: 20, color: color.ink },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: color.ink },
  bodyB: { fontFamily: font.semibold, fontSize: 15, lineHeight: 21, color: color.ink },
  small: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.ink2 },
  smallB: { fontFamily: font.semibold, fontSize: 13, lineHeight: 18, color: color.ink },
  tiny: { fontFamily: font.medium, fontSize: 11.5, lineHeight: 15, color: color.ink3 },
  label: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, color: color.ink2, letterSpacing: 0.3 },
};

export function T({ v = 'body', style, tone, ...rest }: TextProps & { v?: Variant; tone?: keyof typeof color }) {
  return <Text {...rest} style={[variants[v], tone ? { color: color[tone] } : null, style]} />;
}

/* ---------- Buttons ---------- */

type BtnKind = 'dark' | 'orange' | 'outline' | 'ghost' | 'whatsapp' | 'danger';
const btnBg: Record<BtnKind, ViewStyle> = {
  dark: { backgroundColor: color.ink },
  orange: { backgroundColor: color.orange },
  outline: { backgroundColor: color.paper, borderWidth: 1.5, borderColor: color.ink },
  ghost: { backgroundColor: color.wash },
  whatsapp: { backgroundColor: color.whatsapp },
  danger: { backgroundColor: color.redSoft },
};
const btnFg: Record<BtnKind, string> = { dark: '#fff', orange: color.ink, outline: color.ink, ghost: color.ink, whatsapp: '#fff', danger: color.red };

export function Button({
  title, onPress, kind = 'dark', size = 'md', icon: Icon, disabled, loading, style, full,
}: {
  title: string; onPress?: () => void; kind?: BtnKind; size?: 'sm' | 'md' | 'xs'; icon?: React.ComponentType<{ size?: number; color?: string }>;
  disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; full?: boolean;
}) {
  const h = size === 'md' ? 52 : size === 'sm' ? 42 : 34;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={() => { if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); onPress?.(); }}
      style={({ pressed }) => [
        s.btn, btnBg[kind], { minHeight: h, borderRadius: size === 'md' ? 14 : 11, paddingHorizontal: size === 'md' ? 20 : 13 },
        full && { alignSelf: 'stretch' }, (disabled || loading) && { opacity: 0.4 }, pressed && { opacity: 0.85 }, style,
      ]}
    >
      {loading ? <ActivityIndicator color={btnFg[kind]} /> : Icon ? <Icon size={size === 'md' ? 18 : 16} color={btnFg[kind]} /> : null}
      <Text numberOfLines={1} style={{ color: btnFg[kind], fontFamily: font.bold, fontSize: size === 'md' ? 16 : size === 'sm' ? 14.5 : 13 }}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ icon: Icon, onPress, label, badge, dot, light }: { icon: React.ComponentType<{ size?: number; color?: string }>; onPress?: () => void; label: string; badge?: number; dot?: boolean; light?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={({ pressed }) => [s.iconBtn, light && { backgroundColor: '#fff' }, pressed && { opacity: 0.7 }]}>
      <Icon size={21} color={color.ink} />
      {badge ? <View style={s.badge}><Text style={s.badgeText}>{badge > 99 ? '99+' : badge}</Text></View> : null}
      {dot ? <View style={s.dot} /> : null}
    </Pressable>
  );
}

/* ---------- Chips, tags, stepper ---------- */

export function Chip({ label, on, onPress, icon: Icon, accent }: { label: string; on?: boolean; onPress?: () => void; icon?: React.ComponentType<{ size?: number; color?: string }>; accent?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={onPress} style={[s.chip, on && s.chipOn, accent && !on && s.chipAccent]}>
      {Icon ? <Icon size={15} color={on ? '#fff' : color.ink} /> : null}
      <Text style={[s.chipText, on && { color: '#fff' }, accent && !on && { color: color.orangeDeep, fontFamily: font.semibold }]}>{label}</Text>
    </Pressable>
  );
}

type TagTone = 'green' | 'orange' | 'sun' | 'ink' | 'navy' | 'red' | 'wash';
const tagTone: Record<TagTone, [string, string]> = {
  green: [color.greenSoft, color.green], orange: [color.orangeSoft, color.orangeDeep], sun: [color.sun, color.ink], ink: [color.ink, '#fff'],
  navy: [color.navySoft, color.navy], red: [color.redSoft, color.red], wash: [color.wash, color.ink2],
};
export function Tag({ label, tone = 'wash', style }: { label: string; tone?: TagTone; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.tag, { backgroundColor: tagTone[tone][0] }, style]}>
      <Text style={[s.tagText, { color: tagTone[tone][1] }]}>{label}</Text>
    </View>
  );
}

export function Stepper({ value, onChange, min = 0, max = 999, disabled, small }: { value: number; onChange: (n: number) => void; min?: number; max?: number; disabled?: boolean; small?: boolean }) {
  const size = small ? 32 : 40;
  const tap = (n: number) => { if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); onChange(Math.max(min, Math.min(max, n))); };
  return (
    <View style={[s.stepper, value > 0 && { borderColor: color.ink }, disabled && { opacity: 0.35 }]}>
      <Pressable accessibilityLabel="Fewer" disabled={disabled || value <= min} onPress={() => tap(value - 1)} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={s.stepSign}>−</Text>
      </Pressable>
      <Text style={[s.stepVal, small && { fontSize: 14, minWidth: 22 }]}>{value}</Text>
      <Pressable accessibilityLabel="More" disabled={disabled || value >= max} onPress={() => tap(value + 1)} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={s.stepSign}>+</Text>
      </Pressable>
    </View>
  );
}

/* ---------- Layout ---------- */

export function Header({ title, sub, back, left, right }: { title?: string; sub?: string; back?: boolean; left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={s.header}>
      {back ? <IconButton icon={ChevronLeft} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} /> : left}
      <View style={{ flex: 1, minWidth: 0 }}>
        {title ? <T v="title" numberOfLines={1}>{title}</T> : null}
        {sub ? <T v="small" numberOfLines={1} style={{ color: color.ink3, fontSize: 12.5 }}>{sub}</T> : null}
      </View>
      {right ? <View style={{ flexDirection: 'row', gap: 8 }}>{right}</View> : null}
    </View>
  );
}

export function Card({ children, style, tone }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; tone?: 'wash' | 'dark' | 'green' | 'sun' | 'navy' }) {
  const bg = tone === 'wash' ? { backgroundColor: color.wash, borderColor: 'transparent' } : tone === 'dark' ? { backgroundColor: color.ink, borderColor: color.ink } : tone === 'green' ? { backgroundColor: color.greenSoft, borderColor: 'transparent' } : tone === 'sun' ? { backgroundColor: color.sunSoft, borderColor: 'transparent' } : tone === 'navy' ? { backgroundColor: color.navySoft, borderColor: 'transparent' } : null;
  return <View style={[s.card, bg, style]}>{children}</View>;
}

export function Section({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children?: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={s.sec}>
        <T v="h2">{title}</T>
        {action ? <Pressable onPress={onAction} hitSlop={8}><Text style={s.secAction}>{action}</Text></Pressable> : null}
      </View>
      {children}
    </View>
  );
}

export function Note({ children, tone = 'wash', icon: Icon }: { children: React.ReactNode; tone?: 'wash' | 'sun' | 'green' | 'red' | 'navy'; icon?: React.ComponentType<{ size?: number; color?: string }> }) {
  const bg = { wash: color.wash, sun: color.sunSoft, green: color.greenSoft, red: color.redSoft, navy: color.navySoft }[tone];
  return (
    <View style={[s.note, { backgroundColor: bg }]}>
      {Icon ? <Icon size={16} color={tone === 'red' ? color.red : tone === 'green' ? color.green : color.ink} /> : null}
      <View style={{ flex: 1 }}>{typeof children === 'string' ? <T v="small" style={{ color: color.ink }}>{children}</T> : children}</View>
    </View>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={s.center}>
      <ActivityIndicator color={color.orange} />
      <T v="small">{label}</T>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={[s.center, { paddingHorizontal: 30 }]}>
      <T v="display" style={{ fontSize: 28, textAlign: 'center' }}>Something went wrong</T>
      <T v="small" style={{ textAlign: 'center' }}>{message}</T>
      {onRetry ? <Button title="Try again" onPress={onRetry} size="sm" /> : null}
    </View>
  );
}

export function Empty({ title, body, children, icon: Icon }: { title: string; body?: string; children?: React.ReactNode; icon?: React.ComponentType<{ size?: number; color?: string }> }) {
  return (
    <View style={[s.center, { paddingHorizontal: 30, gap: 12 }]}>
      {Icon ? <View style={s.emptyIcon}><Icon size={30} color={color.ink} /></View> : null}
      <T v="display" style={{ fontSize: 30, textAlign: 'center' }}>{title}</T>
      {body ? <T v="small" style={{ textAlign: 'center', maxWidth: 280 }}>{body}</T> : null}
      {children}
    </View>
  );
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: color.line }} />;
}

export const s = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.wash, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -3, right: -4, minWidth: 19, height: 19, paddingHorizontal: 5, borderRadius: 10, backgroundColor: color.orange, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: font.bold, fontSize: 11, color: color.ink },
  dot: { position: 'absolute', top: 7, right: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: color.orange, borderWidth: 2, borderColor: color.wash },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 13, borderRadius: radius.pill, borderWidth: 1, borderColor: color.line2, backgroundColor: color.paper },
  chipOn: { backgroundColor: color.ink, borderColor: color.ink },
  chipAccent: { backgroundColor: color.orangeSoft, borderColor: '#F6C9AB' },
  chipText: { fontFamily: font.medium, fontSize: 13.5, color: color.ink },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  tagText: { fontFamily: font.bold, fontSize: 11.5 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: color.line2, borderRadius: 12, backgroundColor: color.paper },
  stepSign: { fontFamily: font.semibold, fontSize: 20, color: color.ink },
  stepVal: { fontFamily: font.bold, fontSize: 16, color: color.ink, minWidth: 30, textAlign: 'center', fontVariant: ['tabular-nums'] },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: gutter, paddingTop: 6, paddingBottom: 12, minHeight: 58, backgroundColor: color.paper },
  card: { borderWidth: 1, borderColor: color.line, borderRadius: radius.xl, padding: 14, backgroundColor: color.paper },
  sec: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  secAction: { fontFamily: font.semibold, fontSize: 13.5, color: color.orangeDeep },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 40 },
  emptyIcon: { width: 92, height: 92, borderRadius: 30, backgroundColor: color.wash, alignItems: 'center', justifyContent: 'center' },
});
