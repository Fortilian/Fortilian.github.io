// Offline cache for Poker Split
const CACHE = 'poker-split-v2';
const ASSETS = ['./','./index.html','./manifest.webmanifest'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      try {
        const copy = res.clone();
        if (req.method === 'GET' && new URL(req.url).origin === location.origin) {
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
      } catch (e) {}
      return res;
    }).catch(() => cached))
  );
});
