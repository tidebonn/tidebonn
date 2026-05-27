/// <reference lib="webworker" />
/* global self */

// Custom service worker for Tidebønn.
// - workbox-bygging via vite-plugin-pwa (injectManifest)
// - push-handler for tidebønn-varsler
// - notification-click åpner /Prayers?time=...&open=1

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// vite-plugin-pwa injiserer manifest-listen i denne placeholderen
precacheAndRoute(self.__WB_MANIFEST || []);

// Supabase data (bønner, serier, content) — StaleWhileRevalidate
registerRoute(
  ({ url }) =>
    url.origin.includes('supabase.co') &&
    /\/rest\/v1\/(prayers|prayer_series|content_pages)/.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: 'tidebonn-data',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Google Fonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-css' }),
);
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// ---------------------------------------------------------------------
// Push-varsler
// ---------------------------------------------------------------------

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Tidebønn', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Tidebønn';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'tidebonn',
    renotify: true,
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Hvis appen allerede er åpen, fokuser den og naviger
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(targetUrl);
          return;
        }
      }
      // Ellers åpne ny
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});

// Skip waiting på "SKIP_WAITING"-melding (når brukeren godkjenner ny versjon)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
