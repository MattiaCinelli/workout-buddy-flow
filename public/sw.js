// Minimal offline shell for the web build (the installed Android app has
// its own WebView asset handling and ignores this). Network-first so a
// connected visit always gets fresh code; whatever succeeds is cached, so
// a later offline visit still opens. All app data lives in IndexedDB and
// is untouched by this.
const CACHE = 'workout-buddy-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => undefined);
        return response;
      })
      .catch(() => caches.match(request).then(hit =>
        hit || (request.mode === 'navigate' ? caches.match('/') : Response.error()))),
  );
});
