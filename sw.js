// Poker Split — Service Worker
// Bump deze VERSION bij elke release
const VERSION = 'v6-2025-10-31';
const STATIC_CACHE  = `ps-static-${VERSION}`;
const RUNTIME_CACHE = `ps-runtime-${VERSION}`;

// Assets die zelden wijzigen (geen HTML!)
const STATIC_ASSETS = [
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/chart.min.js'
];

// Install: alleen statische assets cachen
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting(); // direct klaarzetten
});

// Activate: oude caches opruimen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => ![STATIC_CACHE, RUNTIME_CACHE].includes(k))
        .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: 
// - Navigaties/HTML => network-first (offline fallback uit cache)
// - Overig GET => cache-first met runtime-cache
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Alleen behandelen binnen eigen origin
  if (url.origin !== location.origin) return;

  // Navigaties (HTML)
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        // Bewaar/refresh offline fallback
        const copy = fresh.clone();
        const cache = await caches.open(RUNTIME_CACHE);
        const path = url.pathname;
        cache.put(path, copy.clone()).catch(()=>{});
        if (path === '/' || path.endsWith('/index.html')) {
          cache.put('/', copy.clone()).catch(()=>{});
          cache.put('/index.html', copy.clone()).catch(()=>{});
        }
        if (path.endsWith('/stats.html') || path.endsWith('/stats')) {
          cache.put('/stats', copy.clone()).catch(()=>{});
          cache.put('/stats.html', copy.clone()).catch(()=>{});
        }
        return fresh;
      } catch (err) {
        const cache = await caches.open(RUNTIME_CACHE);
        let cachedRes = await cache.match(url.pathname);
        if (!cachedRes && url.pathname.startsWith('/stats')) {
          cachedRes = await cache.match('/stats.html') || await cache.match('/stats');
        }
        if (!cachedRes) {
          cachedRes = await cache.match('/') || await cache.match('/index.html');
        }
        return cachedRes || new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })());
    return;
  }

  // Andere GET-requests: cache-first, vervolgens naar netwerk en runtime-cache
  if (req.method === 'GET') {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        // Alleen eenvoudige responses cachen
        if (res && res.ok) {
          const copy = res.clone();
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, copy).catch(()=>{});
        }
        return res;
      } catch (e) {
        return cached || new Response('', { status: 504, statusText: 'Gateway Timeout' });
      }
    })());
  }
});

// Optioneel: vanuit je app postMessage({type:'SKIP_WAITING'}) sturen
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
