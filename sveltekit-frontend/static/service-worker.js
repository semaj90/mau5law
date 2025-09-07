self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Optional: intercept uploads for chunk routing or telemetry hooks
self.addEventListener('message', (event) => {
  const { type } = event.data || {};
  if (type === 'PING') {
    event.ports?.[0]?.postMessage({ ok: true });
  }
});
