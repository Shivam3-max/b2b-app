import { router } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Header, Note, T } from '../components/ui';
import { api, useAccount } from '../lib/account';
import { color, gutter } from '../theme/tokens';

/** In-app account deletion, required by Apple and Google. The server removes the login and profile data in Shopify. */
export default function DeleteAccount() {
  const signOut = useAccount(s => s.signOut);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true); setError(null);
    try {
      await api('/v1/me', { method: 'DELETE' });
      await signOut();
      router.replace('/');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.paper }}>
      <Header back title="Delete my account" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, gap: 14, paddingBottom: 30 }}>
        <T v="display">This can't be undone</T>
        <View style={{ gap: 6 }}>
          <T v="body">Deleting removes:</T>
          <T v="small">• your app sign-in{'\n'}• your shop profile and saved settings{'\n'}• alerts on this phone</T>
          <T v="body" style={{ marginTop: 6 }}>B2B Store keeps:</T>
          <T v="small">• order and GST invoice records the business must keep by law</T>
        </View>
        {error ? <Note tone="red">{error}</Note> : null}
        <Button title="Delete my account" kind="danger" icon={Trash2} loading={busy} onPress={confirm} full />
        <Button title="Keep my account" onPress={() => router.back()} full />
      </ScrollView>
    </SafeAreaView>
  );
}
