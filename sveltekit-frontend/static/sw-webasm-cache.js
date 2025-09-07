// Dev placeholder Service Worker for WebASM cache concurrency
self.addEventListener('install', (event) => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('message', (event) => {
  const { type } = event.data || {};
  if (type === 'batch-ranking-request') {
    // Simplified dev echo to avoid errors
    const port = event.ports && event.ports[0];
    if (port) {
      port.postMessage({ type: 'batch-ranking-complete', data: [] });
    }
  }
});
