const CACHE_VERSION = 'budo-v' + Date.now();
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png'
];

// Install: pre-cache essential static metadata & immediately activate
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Precache partial fail:', err);
      });
    })
  );
});

// Activate: clean up all old cache versions & claim control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (!key.startsWith(CACHE_VERSION)) {
            console.log('[SW] Deleting stale cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// 1. Navigation / HTML -> ALWAYS Network-First (never serve stale index.html unless completely offline)
// 2. Hashed Assets (/assets/*) -> Cache-First / Stale-While-Revalidate (immutable content hashes)
// 3. API & Sockets -> Direct Network (bypassed)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET, API, uploads, and socket requests
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/uploads') ||
    url.pathname.startsWith('/socket.io')
  ) {
    return;
  }

  // 1. Navigation / HTML requests: Network-First (ensures new index.html with new chunk hashes is always received)
  if (request.mode === 'navigate' || request.destination === 'document' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return caches.match(request).then((cached) => cached || caches.match('/index.html'));
        })
    );
    return;
  }

  // 2. Hashed assets: Cache-first (since hash changes on every build)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Other static requests: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
