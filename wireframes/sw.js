const CACHE_NAME = 'ctet-prep-v1';
const ASSETS = [
  '/',
  '/wireframes/index.html',
  '/wireframes/dashboard.html',
  '/wireframes/styles.css',
  '/wireframes/favicon.svg',
  '/wireframes/manifest.webmanifest'
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (ev) => {
  // Only handle same-origin GET requests (navigation and resources)
  if (ev.request.method !== 'GET') return;

  ev.respondWith((async () => {
    const isDocument = ev.request.destination === 'document' || ev.request.mode === 'navigate' || ev.request.destination === '';

    if (isDocument) {
      // Network-first for navigation/documents so HTML updates are received quickly during dev and deploys
      try {
        const networkResponse = await fetch(ev.request);
        try {
          const respToCache = networkResponse.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put(ev.request, respToCache);
        } catch (cacheErr) {
          console.warn('SW: caching document failed', cacheErr);
        }
        return networkResponse;
      } catch (err) {
        const cached = await caches.match(ev.request);
        return cached || caches.match('/wireframes/index.html');
      }
    }

    // For other GET requests use cache-first for performance
    const cached = await caches.match(ev.request);
    if (cached) return cached;
    try {
      const networkResponse = await fetch(ev.request);
      try {
        const respToCache = networkResponse.clone();
        const cache = await caches.open(CACHE_NAME);
        await cache.put(ev.request, respToCache);
      } catch (cacheErr) {
        console.warn('SW: runtime cache failed', cacheErr);
      }
      return networkResponse;
    } catch (err) {
      return caches.match('/wireframes/index.html');
    }
  })());
});
