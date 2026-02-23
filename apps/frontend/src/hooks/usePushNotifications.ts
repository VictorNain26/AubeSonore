import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../utils/config';

interface PushState {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
}

async function fetchVapidKey(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/push/vapid-key`);
    if (!res.ok) return null;
    const data = await res.json();
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

    navigator.serviceWorker.ready.then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription();
      setState((s) => ({ ...s, isSubscribed: !!subscription }));
    });
  }, [state.isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      setState((s) => ({ ...s, permission }));

      if (permission !== 'granted') return false;

      const vapidKey = await fetchVapidKey();
      if (!vapidKey) return false;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Send subscription to backend
      const res = await fetch(`${API_BASE_URL}/api/push/subscribe`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (res.ok) {
        setState((s) => ({ ...s, isSubscribed: true }));
        return true;
      }
      return false;
    } catch (err) {
      console.error('[PushNotifications] Subscribe error:', err);
      return false;
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
