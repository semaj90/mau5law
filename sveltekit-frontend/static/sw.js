// Lightweight Service Worker for YoRHa Legal AI
// - Keeps a small offline shell
// - Provides a message channel for simple health pings
// - Pass-through fetch by default (no aggressive caching to avoid dev confusion)

const SHELL_CACHE = 'yorha-shell-v1';
const STATIC_CACHE = 'legal-ai-v1';
const SHELL = ['/', '/evidence', '/cases', '/evidenceboard', '/chat'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .open(SHELL_CACHE)
        .then((cache) => cache.addAll(SHELL))
        .catch(() => void 0),
      caches
        .open(STATIC_CACHE)
        .then((cache) => cache.addAll(['/', '/offline.html']).catch(() => void 0)),
    ])
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== SHELL_CACHE && k !== STATIC_CACHE).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  const { type } = event.data;
  if (type === 'ping') {
    event.source?.postMessage?.({ type: 'pong', ts: Date.now() });
  } else if (type === 'chat-health') {
    // Query /api/ai/chat health and post result back
    (async () => {
      try {
        const res = await fetch('/api/ai/chat');
        const data = await res.json().catch(() => ({}));
        const payload = { type: 'chat-health', ok: res.ok, data };
        if (event.source?.postMessage) {
          event.source.postMessage(payload);
        } else {
          const clientsList = await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true,
          });
          clientsList.forEach((c) => c.postMessage(payload));
        }
      } catch (err) {
        const payload = { type: 'chat-health', ok: false, error: String(err) };
        if (event.source?.postMessage) {
          event.source.postMessage(payload);
        }
      }
    })();
  }
});

// Default: pass-through fetch with graceful fallback to cache
self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Skip cross-origin
  if (!req.url.startsWith(self.location.origin)) return;

  // API: network-first
  if (req.url.includes('/api/')) {
    event.respondWith(
      fetch(req).catch((error) => {
        console.warn('SW: API fetch failed for', req.url, error.message || error);
        return new Response(
          JSON.stringify({
            error: 'Network unavailable',
            offline: true,
            url: req.url,
            method: req.method,
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // Static + shell: cache-first, then network
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          if (!res || res.status !== 200 || req.method !== 'GET') return res;
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(async () => {
          // Offline fallback
          if (req.mode === 'navigate') {
            const shell = await caches.open(SHELL_CACHE);
            return (
              (await shell.match('/', { ignoreSearch: true })) ||
              new Response('Offline', { status: 504 })
            );
          }
          return new Response('Offline', { status: 504 });
        });
    })
  );
});

// Background sync for legal document processing
self.addEventListener('sync', function (event) {
  if (event.tag === 'legal-document-sync') {
    event.waitUntil(syncLegalDocuments());
  }
});

async function syncLegalDocuments() {
  try {
    console.log('Service Worker: Syncing legal documents...');
    // Implementation would sync pending documents when online
  } catch (error) {
    console.error('Service Worker: Document sync failed', error);
  }
}

// Push notifications for case updates
self.addEventListener('push', function (event) {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'Legal AI Platform notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'legal-ai-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Case',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Legal AI Platform', options));
});

// Notification click handling
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(clients.openWindow('/'));
  }
});

console.log('Service Worker: Loaded');

// SIMD tensor parse handler (append)
self.addEventListener('message', function (event) {
  const data = event && event.data ? event.data : {};
  if (data && data.type === 'SIMD_PARSE_TENSOR') {
    // Expect an ArrayBuffer for zero-copy; fall back to typed array if provided
    try {
      const port = event.ports && event.ports[0];
      const payload = data.payload;
      const buffer = payload instanceof ArrayBuffer ? payload : payload && payload.buffer;
      const f32 = buffer ? new Float32Array(buffer) : new Float32Array(0);

      // Simple SIMD-friendly aggregation (placeholder): length, sum, min, max
      let sum = 0.0;
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      for (let i = 0; i < f32.length; i++) {
        const v = f32[i];
        sum += v;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const meta = { type: 'SIMD_PARSED', length: f32.length, sum, min, max };
      if (port) {
        port.postMessage(meta);
      } else {
        // Fallback: broadcast (less precise for matching request)
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
          clients.forEach((client) => client.postMessage(meta));
        });
      }
    } catch (err) {
      const errMsg = { type: 'SIMD_ERROR', error: String(err) };
      const port = event.ports && event.ports[0];
      if (port) {
        port.postMessage(errMsg);
      } else {
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
          clients.forEach((client) => client.postMessage(errMsg));
        });
      }
    }
  }
});
