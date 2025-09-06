/**
 * Service Worker for Legal AI Platform
 * Handles caching, offline functionality, and background sync
 */

const CACHE_NAME = 'legal-ai-v1';
const STATIC_ASSETS = [
  '/',
  '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', function(event) {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(function(error) {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
  
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  self.clients.claim();
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', function(event) {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Handle API requests differently
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(function() {
          return new Response(
            JSON.stringify({ error: 'Network unavailable', offline: true }), 
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }
  
  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then(function(response) {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Don't cache POST requests or form submissions
            if (event.request.method !== 'GET') {
              return response;
            }
            
            // Clone the response for caching
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          });
      })
      .catch(function() {
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
      })
  );
});

// Background sync for legal document processing
self.addEventListener('sync', function(event) {
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
self.addEventListener('push', function(event) {
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
        title: 'View Case'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Legal AI Platform', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('Service Worker: Loaded');