// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { renderWithProviders } from '../test-utils';
import { NotificationBanner } from './NotificationBanner';

const DISMISS_KEY = 'aubesonore_push_dismiss';

beforeEach(() => {
  localStorage.clear();

  // isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
  vi.stubGlobal('Notification', {
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  });
  vi.stubGlobal('PushManager', class {});

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

  // Authenticated session so isAuthenticated becomes true
  server.use(
    http.get('http://localhost:3000/api/auth/get-session', () =>
      HttpResponse.json({ user: { id: 'u1', email: 'a@b.c', name: 'A' } })
    )
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('NotificationBanner', () => {
  it('renders banner when authenticated, supported, not subscribed, not dismissed', async () => {
    renderWithProviders(<NotificationBanner />);
    expect(
      await screen.findByText(/recevoir les notifications des sessions live/i)
    ).toBeInTheDocument();
  });

  it('does not render when already dismissed via localStorage', () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    renderWithProviders(<NotificationBanner />);
    expect(
      screen.queryByText(/recevoir les notifications des sessions live/i)
    ).not.toBeInTheDocument();
  });

  it('hides banner and persists dismissal after clicking dismiss button', async () => {
    renderWithProviders(<NotificationBanner />);
    await screen.findByText(/recevoir les notifications des sessions live/i);

    const dismissBtn = screen.getByRole('button', { name: /fermer/i });
    await userEvent.click(dismissBtn);

    await waitFor(() =>
      expect(
        screen.queryByText(/recevoir les notifications des sessions live/i)
      ).not.toBeInTheDocument()
    );
    expect(localStorage.getItem(DISMISS_KEY)).toBe('true');
  });
});
