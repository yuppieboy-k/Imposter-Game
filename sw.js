/* =========================================================
   Imposter — Service Worker
   Cache-first strategy so the app works offline after first visit.
   Bump CACHE_VERSION when shipping new assets.
   ========================================================= */

const CACHE_VERSION = 'imposter-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './words.js',
  './manifest.json',
  './icon.svg',
];

// Install: pre-cache all assets so the app works offline.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS))
  );
  // Activate the new SW immediately, no waiting for old tabs to close.
  self.skipWaiting();
});

// Activate: clean up any old caches from previous versions.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache, fall back to network, fall back to cached index.html
// (so deep links like /anything still work offline).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Cache successful same-origin responses for next time.
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
