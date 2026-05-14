// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { usePushNotifications } from './usePushNotifications';

beforeEach(() => {
  vi.stubGlobal('Notification', {
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(null),
          subscribe: vi.fn().mockResolvedValue({
            endpoint: 'https://fcm.googleapis.com/abc',
            toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/abc' }),
          }),
        },
      }),
    },
  });
  vi.stubGlobal('PushManager', class {});
});

describe('usePushNotifications.subscribe', () => {
  it('returns { success: true } on happy path', async () => {
    const { result } = renderHook(() => usePushNotifications());
    let res: Awaited<ReturnType<typeof result.current.subscribe>> | undefined;
    await act(async () => {
      res = await result.current.subscribe();
    });
    expect(res).toEqual({ success: true });
  });

  it('returns reason "permission-denied" when user denies', async () => {
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('denied'),
    });
    const { result } = renderHook(() => usePushNotifications());
    let res: Awaited<ReturnType<typeof result.current.subscribe>> | undefined;
    await act(async () => {
      res = await result.current.subscribe();
    });
    expect(res).toEqual({ success: false, reason: 'permission-denied' });
  });

  it('returns reason "vapid-missing" when server has no VAPID key', async () => {
    server.use(http.get('http://localhost:3000/api/push/vapid-key', () => HttpResponse.json({})));
    const { result } = renderHook(() => usePushNotifications());
    let res: Awaited<ReturnType<typeof result.current.subscribe>> | undefined;
    await act(async () => {
      res = await result.current.subscribe();
    });
    expect(res).toEqual({ success: false, reason: 'vapid-missing' });
  });

  it('returns reason "server-error" when /api/push/subscribe returns 500', async () => {
    server.use(
      http.post(
        'http://localhost:3000/api/push/subscribe',
        () => new HttpResponse(null, { status: 500 })
      )
    );
    const { result } = renderHook(() => usePushNotifications());
    let res: Awaited<ReturnType<typeof result.current.subscribe>> | undefined;
    await act(async () => {
      res = await result.current.subscribe();
    });
    expect(res?.success).toBe(false);
    if (res && !res.success) expect(res.reason).toBe('server-error');
  });
});
