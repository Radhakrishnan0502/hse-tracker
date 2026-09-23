// Minimal service worker — enables "Add to Home Screen" / installable app behavior.
// It caches only the app shell (this page + icons) so the app opens instantly,
// while all data (Firestore, Storage, sign-in) always goes over the network live.
//
// Network-first: every load tries the network first so you always get the
// latest version after an update, and only falls back to the cached copy if
// you're offline. (Previous versions were cache-first, which is why updates
// only ever showed up in Incognito — this fixes that for good.)
const CACHE_NAME = 'hse-tracker-shell-v3';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Only handle same-origin GET requests for the shell files; everything else
  // (Firebase, Firestore, Storage, CDN scripts) always goes straight to the network.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
