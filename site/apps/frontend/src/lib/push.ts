import { API_BASE_URL } from '../utils/config';

export type AlertState = 'unsupported' | 'denied' | 'off' | 'on';

function isSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function getAlertState(): Promise<AlertState> {
  if (!isSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return (await currentSubscription()) ? 'on' : 'off';
}

async function send(path: string, method: 'POST' | 'DELETE', body: unknown): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/push/${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`push ${path}: HTTP ${response.status}`);
}

/** Must run from a user gesture: browsers refuse the permission prompt otherwise. */
export async function enableAlert(): Promise<AlertState> {
  if (!isSupported()) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';

  const keyResponse = await fetch(`${API_BASE_URL}/api/push/vapid-key`);
  if (!keyResponse.ok) throw new Error(`push vapid-key: HTTP ${keyResponse.status}`);
  const { key } = (await keyResponse.json()) as { key: string };

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  });
  const { endpoint, keys } = subscription.toJSON();
  await send('subscribe', 'POST', { endpoint, keys });
  return 'on';
}

export async function disableAlert(): Promise<AlertState> {
  const subscription = await currentSubscription();
  if (subscription) {
    await send('unsubscribe', 'DELETE', { endpoint: subscription.endpoint });
    await subscription.unsubscribe();
  }
  return 'off';
}
