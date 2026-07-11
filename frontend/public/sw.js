const CACHE_NAME = 'edumentor-cache-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/pwa-launch.js',
  '/favicon.svg'
];

// ── Install Event ────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate Event ───────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch Event ──────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip caching for API, socket, and external requests
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
        // Stale-while-revalidate: serve cache, update in background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
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
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html').then((cachedIndex) => {
              if (cachedIndex) return cachedIndex;
              return new Response(
                `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline - EduMentor AI</title></head>
                <body style="background:#0a0b0f;color:#f0f2f8;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
                  <div style="text-align:center;padding:2rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:1.5rem;max-width:420px;width:90%;">
                    <div style="font-size:3rem;margin-bottom:1rem;">📡</div>
                    <h2 style="margin:0 0 0.5rem;font-size:1.25rem;">You are offline</h2>
                    <p style="color:rgba(240,242,248,0.5);font-size:0.875rem;margin:0 0 1.5rem;">Your queued actions will sync automatically when you reconnect.</p>
                    <button onclick="window.location.reload()" style="background:linear-gradient(135deg,#4f63ff,#7c3aed);color:white;border:none;padding:0.75rem 1.5rem;border-radius:0.75rem;cursor:pointer;font-weight:600;font-size:0.875rem;">Retry Connection</button>
                  </div>
                </body></html>`,
                { status: 503, headers: { 'Content-Type': 'text/html' } }
              );
            });
          }
          return Response.error();
        });
    })
  );
});

// ── Background Sync Event ─────────────────────────────────────────────────────
// Triggered by the browser when connectivity is restored and a sync tag is registered.
self.addEventListener('sync', (event) => {
  if (event.tag === 'edumentor-mutation-sync') {
    console.log('[SW] Background Sync: replaying offline mutations');
    event.waitUntil(
      // Notify all clients to trigger the queue replay
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_SYNC_TRIGGER' });
        });
      })
    );
  }
});

// ── Push Notification Event (stub for future) ────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const options = {
      body: payload.message || 'You have a new notification',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: payload.tag || 'edumentor-push',
      data: { link: payload.link },
      actions: payload.link
        ? [{ action: 'open', title: 'View' }]
        : [],
    };
    event.waitUntil(
      self.registration.showNotification(payload.title || 'EduMentor AI', options)
    );
  } catch {
    // Non-JSON push data — ignore gracefully
  }
});

// ── Notification Click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link;
  if (!link) return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', link });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(link);
      }
    })
  );
});
