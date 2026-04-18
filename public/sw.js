// Service worker for static assets only. Do not precache `/` or `/index.html`:
// CRA used to inject `/static/js/bundle.js` into those documents; caching them breaks Remix
// (Remix serves different HTML/scripts and has no `/static/js/bundle.js`).
const CACHE_NAME = 'poster-cache-v2';

const urlsToCache = [
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/sample-slide-deck.json',
  '/sample-song.xml',
  '/sample-song-2.xml',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) return caches.delete(key);
            return undefined;
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  // Always hit the network for documents so HTML stays in sync with the active dev server (CRA vs Remix).
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request)),
  );
});
