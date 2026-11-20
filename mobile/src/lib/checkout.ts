import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

/**
 * Opens the Shopify checkout for a cart.
 *
 * Phones: Shopify Checkout Kit (native sheet) is added with the first device build; until then
 * the checkout opens in an in-app browser sheet, which uses the same Shopify checkout page.
 * Web preview: opens in a new tab.
 */
export async function openCheckout(checkoutUrl: string): Promise<'closed' | 'opened'> {
  if (Platform.OS === 'web') {
    window.open(checkoutUrl, '_blank', 'noopener');
    return 'opened';
  }
  await WebBrowser.openBrowserAsync(checkoutUrl, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    controlsColor: '#F26A1B',
    toolbarColor: '#FFFFFF',
  });
  return 'closed';
}
