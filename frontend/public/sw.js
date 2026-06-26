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
        .catch((error) => {
          // If network fails and request is for page navigation, fallback to app shell
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html').then((cachedIndex) => {
              if (cachedIndex) return cachedIndex;
              // If index.html is not in cache, return an elegant offline HTML fallback
              return new Response(
                '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline - EduMentor AI</title></head><body style="background:#0f172a;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;padding:2rem;background:#1e293b;border-radius:1rem;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);max-width:400px;width:90%;"><h2>You are offline</h2><p style="color:#94a3b8;">Please check your connection and try again.</p><button onclick="window.location.reload()" style="background:#4f63ff;color:white;border:none;padding:0.75rem 1.5rem;border-radius:0.5rem;cursor:pointer;font-weight:600;margin-top:1rem;">Retry</button></div></body></html>',
                {
                  status: 503,
                  headers: { 'Content-Type': 'text/html' }
                }
              );
            });
          }
          // For non-navigation requests, return standard Response.error() to prevent console TypeErrors
          return Response.error();
        });
    })
  );
});
