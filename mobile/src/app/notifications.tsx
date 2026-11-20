import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Empty, Header } from '../components/ui';
import { useAccount } from '../lib/account';
import { color } from '../theme/tokens';

/** Alerts inbox. Order alerts are sent by the server from Shopify order webhooks. */
export default function Notifications() {
  const token = useAccount(s => s.token);
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.paper }}>
      <Header back title="Notifications" />
      <Empty icon={Bell} title="No alerts yet" body={token ? 'You will get an alert when an order is confirmed, shipped and delivered.' : 'Sign in to get alerts when your orders are confirmed, shipped and delivered.'}>
        {!token ? <Button title="Sign in" onPress={() => router.push('/login')} /> : null}
      </Empty>
    </SafeAreaView>
  );
}
