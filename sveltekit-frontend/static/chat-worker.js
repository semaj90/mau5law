// Chat Service Worker for Concurrent Request Handling
// Handles multiple simultaneous chat requests efficiently

const CHAT_API_V2 = '/api/v2/chat';
const MAX_CONCURRENT_REQUESTS = 3;
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Track active requests to manage concurrency
const activeRequests = new Map();
const requestQueue = [];

// Cache for embedding lookups to reduce load
const embeddingCache = new Map();
const CACHE_MAX_SIZE = 100;

self.addEventListener('install', (event) => {
  console.log('Chat service worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Chat service worker activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', async (event) => {
  const { type, data, requestId } = event.data;
  
  switch (type) {
    case 'CHAT_REQUEST':
      await handleChatRequest(event, data, requestId);
      break;
    case 'ABORT_REQUEST':
      await abortRequest(requestId);
      break;
    case 'GET_QUEUE_STATUS':
      event.ports[0].postMessage({
        type: 'QUEUE_STATUS',
        activeCount: activeRequests.size,
        queuedCount: requestQueue.length,
        cacheSize: embeddingCache.size
      });
      break;
    default:
      console.warn('Unknown message type:', type);
  }
});

async function handleChatRequest(event, requestData, requestId) {
  // If we're at max concurrency, queue the request
  if (activeRequests.size >= MAX_CONCURRENT_REQUESTS) {
    requestQueue.push({ event, requestData, requestId });
    event.ports[0].postMessage({
      type: 'QUEUED',
      requestId,
      position: requestQueue.length
    });
    return;
  }
  
  await processChatRequest(event, requestData, requestId);
}

async function processChatRequest(event, requestData, requestId) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  activeRequests.set(requestId, { controller, timeoutId });
  
  try {
    event.ports[0].postMessage({
      type: 'STARTED',
      requestId,
      timestamp: new Date().toISOString()
    });
    
    // Check cache first for similar requests
    const cacheKey = generateCacheKey(requestData);
    if (embeddingCache.has(cacheKey)) {
      const cachedResponse = embeddingCache.get(cacheKey);
      event.ports[0].postMessage({
        type: 'CACHED_RESPONSE',
        requestId,
        data: cachedResponse,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Make the actual API request
    const response = await fetch(CHAT_API_V2, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData),
      signal: controller.signal
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Handle streaming responses
    if (requestData.stream && response.body) {
      await handleStreamingResponse(event, response, requestId);
    } else {
      // Handle regular JSON responses
      const data = await response.json();
      
      // Cache successful responses
      if (data.success) {
        cacheResponse(cacheKey, data);
      }
      
      event.ports[0].postMessage({
        type: 'RESPONSE',
        requestId,
        data,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('Chat request error:', error);
    event.ports[0].postMessage({
      type: 'ERROR',
      requestId,
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    });
  } finally {
    // Clean up
    const request = activeRequests.get(requestId);
    if (request) {
      clearTimeout(request.timeoutId);
      activeRequests.delete(requestId);
    }
    
    // Process next queued request
    if (requestQueue.length > 0) {
      const nextRequest = requestQueue.shift();
      setTimeout(() => {
        processChatRequest(nextRequest.event, nextRequest.requestData, nextRequest.requestId);
      }, 100); // Small delay to prevent overwhelming
    }
  }
}

async function handleStreamingResponse(event, response, requestId) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        event.ports[0].postMessage({
          type: 'STREAM_END',
          requestId,
          timestamp: new Date().toISOString()
        });
        break;
      }
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            event.ports[0].postMessage({
              type: 'STREAM_COMPLETE',
              requestId,
              timestamp: new Date().toISOString()
            });
          } else {
            try {
              const parsedData = JSON.parse(data);
              event.ports[0].postMessage({
                type: 'STREAM_DATA',
                requestId,
                data: parsedData,
                timestamp: new Date().toISOString()
              });
            } catch (parseError) {
              console.warn('Failed to parse stream data:', data);
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function abortRequest(requestId) {
  const request = activeRequests.get(requestId);
  if (request) {
    request.controller.abort();
    clearTimeout(request.timeoutId);
    activeRequests.delete(requestId);
  }
  
  // Remove from queue if present
  const queueIndex = requestQueue.findIndex(req => req.requestId === requestId);
  if (queueIndex !== -1) {
    requestQueue.splice(queueIndex, 1);
  }
}

function generateCacheKey(requestData) {
  // Generate a cache key based on message content and settings
  const key = `${requestData.message}_${requestData.model || 'default'}_${requestData.temperature || 0.1}`;
  return btoa(key).slice(0, 32); // Base64 encode and truncate
}

function cacheResponse(key, response) {
  // Implement LRU-style cache
  if (embeddingCache.size >= CACHE_MAX_SIZE) {
    const firstKey = embeddingCache.keys().next().value;
    embeddingCache.delete(firstKey);
  }
  
  embeddingCache.set(key, {
    ...response,
    cached: true,
    cachedAt: new Date().toISOString()
  });
}

// Clean up cache periodically
setInterval(() => {
  if (embeddingCache.size > 0) {
    console.log(`Service worker cache: ${embeddingCache.size} entries`);
  }
}, 60000); // Log every minute

// Handle background sync for failed requests (if supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'chat-retry') {
    event.waitUntil(retryFailedRequests());
  }
});

async function retryFailedRequests() {
  // Implementation for retrying failed chat requests
  console.log('Retrying failed chat requests...');
}