import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../utils/config';

interface PushState {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
}

export type SubscribeResult =
  | { success: true }
  | {
      success: false;
      reason: 'permission-denied' | 'vapid-missing' | 'server-error' | 'unknown';
      cause?: Error;
    };

async function fetchVapidKey(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/push/vapid-key`);
    if (!res.ok) return null;
    const data = (await res.json()) as { key?: string };
    return data.key || null;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>({
    isSupported:
      'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window,
    permission: 'Notification' in window ? Notification.permission : 'unsupported',
    isSubscribed: false,
  });

  // Check if already subscribed
  useEffect(() => {
    if (!state.isSupported) return;

    let cancelled = false;
    void (async (): Promise<void> => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (cancelled) return;
      setState((s) => ({ ...s, isSubscribed: !!subscription }));
    })();

    return () => {
      cancelled = true;
    };
  }, [state.isSupported]);

  const subscribe = useCallback(async (): Promise<SubscribeResult> => {
    if (!state.isSupported) return { success: false, reason: 'unknown' };

    try {
      const permission = await Notification.requestPermission();
      setState((s) => ({ ...s, permission }));
      if (permission !== 'granted') {
        return { success: false, reason: 'permission-denied' };
      }

      const vapidKey = await fetchVapidKey();
      if (!vapidKey) {
        return { success: false, reason: 'vapid-missing' };
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const res = await fetch(`${API_BASE_URL}/api/push/subscribe`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!res.ok) {
        return { success: false, reason: 'server-error' };
      }

      setState((s) => ({ ...s, isSubscribed: true }));
      return { success: true };
    } catch (err) {
      console.error('[PushNotifications] Subscribe error:', err);
      return {
        success: false,
        reason: 'unknown',
        cause: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }, [state.isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return true;

      await subscription.unsubscribe();

      await fetch(`${API_BASE_URL}/api/push/unsubscribe`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      setState((s) => ({ ...s, isSubscribed: false }));
      return true;
    } catch (err) {
      console.error('[PushNotifications] Unsubscribe error:', err);
      return false;
    }
  }, []);

  return { ...state, subscribe, unsubscribe };
}
