import { Platform } from 'react-native';
import { create } from 'zustand';
import { config, hasServer } from './config';

/**
 * Crash capture. Instead of the app closing on an unexpected JavaScript error, we keep it open,
 * show what went wrong, and send the details to the B2B Store server log so it can be fixed.
 */

type CrashState = { error: { message: string; stack?: string } | null; clear: () => void };
export const useCrash = create<CrashState>(set => ({ error: null, clear: () => set({ error: null }) }));

let lastSent = 0;
export function reportError(error: unknown, context: string) {
  const e = error instanceof Error ? error : new Error(String(error));
  const now = Date.now();
  if (!hasServer() || now - lastSent < 3000) return; // avoid flooding on repeated errors
  lastSent = now;
  fetch(`${config.apiUrl}/v1/client-log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, message: e.message, stack: (e.stack ?? '').slice(0, 3000), platform: Platform.OS, version: Platform.Version }),
  }).catch(() => {});
}

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;
const EU = (globalThis as unknown as { ErrorUtils?: { getGlobalHandler: () => GlobalHandler; setGlobalHandler: (h: GlobalHandler) => void } }).ErrorUtils;

let installed = false;
export function installCrashHandler() {
  if (installed || !EU) return;
  installed = true;
  const previous = EU.getGlobalHandler();
  EU.setGlobalHandler((error, isFatal) => {
    reportError(error, isFatal ? 'fatal' : 'error');
    if (isFatal) {
      // Keep the app open and show the error screen instead of crashing to the home screen.
      const e = error instanceof Error ? error : new Error(String(error));
      useCrash.setState({ error: { message: e.message, stack: e.stack } });
      return;
    }
    previous(error, isFatal);
  });
}
