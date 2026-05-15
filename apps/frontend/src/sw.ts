/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import type { WorkboxPlugin } from 'workbox-core/types';

declare const self: ServiceWorkerGlobalScope;

// Workbox precaching (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST);

// Runtime cache for AzuraCast album artwork. Without this the same image is
// re-fetched on every visit / track repeat. CacheFirst is correct because the
// art URL is content-addressed (path includes the media id) so the content
// never changes for a given URL.
registerRoute(
  ({ url }) =>
    url.hostname === 'radio.aubesonore.fr' && /\/api\/station\/\d+\/art\//.test(url.pathname),
  new CacheFirst({
    cacheName: 'aubesonore-artwork',
    // Cast through unknown: workbox plugin interfaces declare every hook as
    // non-optional even though plugins only implement a subset. The repo's
    // tsconfig has exactOptionalPropertyTypes which makes the structural
    // mismatch fatal. The cast is the canonical workaround used in Workbox docs.
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        purgeOnQuotaError: true,
      }),
    ] as unknown as WorkboxPlugin[],
  })
);

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json() as { title?: string; body?: string; url?: string };
    const { title, body, url } = data;

    event.waitUntil(
      self.registration.showNotification(title || 'AubeSonore', {
        body: body || '',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data: { url: url || '/' },
      })
    );
  } catch (err) {
    // Log but don't fail the SW — push payload format is owned by the backend
    // and a corrupt one shouldn't kill the worker. Visible in DevTools > SW.
    console.warn('[SW] malformed push payload', err);
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlStr =
    ((event.notification.data as Record<string, unknown> | null | undefined)?.url as string) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if open
      for (const client of clients) {
        if (client.url && client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      return self.clients.openWindow(urlStr);
    })
  );
});
