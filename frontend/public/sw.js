const CACHE_NAME = 'edumentor-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell and static assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip caching for API queries, socket connections, and external requests
  if (
    event.request.method !== 'GET' ||
    requestUrl.pathname.startsWith('/api') ||
    requestUrl.pathname.startsWith('/socket.io') ||
    requestUrl.origin !== self.location.origin
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch new version in the background (stale-while-revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => { /* Ignore background fetch failures */ });
        
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          // Cache newly loaded assets (JS, CSS, fonts, etc.)
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (requestUrl.pathname.endsWith('.js') ||
             requestUrl.pathname.endsWith('.css') ||
             requestUrl.pathname.endsWith('.svg') ||
             requestUrl.pathname.includes('/assets/'))
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If network fails and request is for page navigation, fallback to app shell
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});
