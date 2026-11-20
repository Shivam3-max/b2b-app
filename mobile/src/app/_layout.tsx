import { InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold } from '@expo-google-fonts/instrument-sans';
import { InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif';
import { NotoSansDevanagari_500Medium } from '@expo-google-fonts/noto-sans-devanagari';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { type ErrorBoundaryProps, router, SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Button } from '../components/ui';
import { useAccount } from '../lib/account';
import { installCrashHandler, reportError, useCrash } from '../lib/crash';
import { useCart } from '../lib/shopify/cart';
import { color } from '../theme/tokens';

installCrashHandler();
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 2 * 60_000, retry: 1, refetchOnWindowFocus: false } },
});

/** Shown instead of closing the app when something unexpected breaks. */
function CrashScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: color.paper, padding: 24, paddingTop: 80, gap: 14 }}>
      <Text style={{ fontSize: 28, fontWeight: '700', color: color.ink }}>Something went wrong</Text>
      <Text style={{ fontSize: 15, color: color.ink2 }}>The problem has been reported to the B2B Store team. You can try again.</Text>
      <ScrollView style={{ maxHeight: 220, backgroundColor: color.wash, borderRadius: 12, padding: 12 }}>
        <Text selectable style={{ fontSize: 12, color: color.ink2 }}>{message}</Text>
      </ScrollView>
      <Button title="Try again" onPress={onRetry} />
    </View>
  );
}

/** Expo Router shows this when a screen fails to render. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => { reportError(error, 'render'); }, [error]);
  return <CrashScreen message={error.message} onRetry={retry} />;
}

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold,
    InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic, NotoSansDevanagari_500Medium,
  });
  const loadCart = useCart(s => s.load);
  const initAccount = useAccount(s => s.init);
  const crash = useCrash(s => s.error);
  const clearCrash = useCrash(s => s.clear);

  useEffect(() => { loadCart(); initAccount(); }, [loadCart, initAccount]);
  useEffect(() => { if (loaded || fontError) SplashScreen.hideAsync().catch(() => {}); }, [loaded, fontError]);

  if (!loaded && !fontError) return null;
  if (crash) return <CrashScreen message={crash.message} onRetry={() => { clearCrash(); router.replace('/'); }} />;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.paper } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="search" options={{ animation: 'fade' }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
