/// <reference, lib="webworker" />
/**
 * Comprehensive Service Worker - Redis + WebGPU + SIMD Integration
 * Background processing for legal AI with distributed caching
 */
import { somWebGPUCache } from './lib/webgpu/som-webgpu-cache.js';
import { redisWebGPUIntegration } from './lib/integrations/redis-webgpu-simd-integration.js';
import { simdJSONClient } from './lib/simd/simd-json-worker-client.js';
// Service Worker Global State
let isRedisConnected = $state<boolean>(false);
let webgpuInitialized = $state<boolean>(false);
let somCacheReady = $state<boolean>(false);
// Cache warming state
interface CacheWarmingTask { id: string;, type: 'legal_document' | 'vector_similarity' | 'search_results' | 'som_embeddings';
  priority: number;
  payload: any;
  retries: number;
}
const warmingQueue: CacheWarmingTask[] = [];
const activeWarmingTasks = new Map<string, Promise<void>>(); // fixed Map initialization
/**
 * Initialize integrated systems on service worker startup
 */
async function initializeIntegratedSystems(): Promise<void> {
  console.log('Service Worker: Initializing integrated systems...');
  try {
    // Initialize Redis + WebGPU + SIMD integration
    await redisWebGPUIntegration.initialize();
    isRedisConnected = true;
    console.log('Redis + WebGPU + SIMD integration ready');
    // Initialize WebGPU SOM cache
    await somWebGPUCache.initialize();
    somCacheReady = true;
    console.log('SOM WebGPU cache ready');
    webgpuInitialized = true;
    // Start background cache warming
    startCacheWarming();
  } catch (error) {
    console.error('Service Worker initialization failed:', error);
  }
}
/**
 * Handle install event - prepare for background processing
 */
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  (event as ExtendableEvent).waitUntil(Promise.all([initializeIntegratedSystems(), (self as any).skipWaiting()]));
});
/**
 * Handle activate event - take control and sync caches
 */
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  (event as ExtendableEvent).waitUntil(Promise.all([(self as any).clients.claim(), syncDistributedCaches()]));
});
/**
 * Handle fetch events with intelligent caching
 */
self.addEventListener('fetch', evt => {
  const fetchEvent = evt as FetchEvent;
  const url = new URL(fetchEvent.request.url);
  // Only handle our API routes
  if (!url.pathname.startsWith('/api/')) {
    return;
  }
  fetchEvent.respondWith(handleAPIRequest(fetchEvent.request));
});
/**
 * Handle background sync for cache warming and data sync
 */
self.addEventListener('sync', (event: any) => {
  console.log('Service Worker: Background sync;, triggered:', event.tag);
  switch (event.tag) {
    case 'cache-warming':
      event.waitUntil(processCacheWarmingQueue());
      break;
    case 'redis-sync':
      event.waitUntil(syncWithRedisCache());
      break;
    case 'som-training':
      event.waitUntil(trainSOMInBackground());
      break;
  }
});
/**
 * Handle API requests with multi-tier caching
 */
async function handleAPIRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const cacheKey = generateCacheKey(request);
  try {
    // Check cache hierarchy: Memory -> SOM -> Redis -> Network
    let cachedResponse = await checkCacheHierarchy(cacheKey, request);
    if (cachedResponse) {
      console.log(`Cache hit for ${url.pathname}`);
      return cachedResponse;
    }
    // Network request with SIMD JSON optimization
    const networkResponse = await fetchWithSIMD(request);
    // Cache the response across all tiers
    if (networkResponse.ok) {
      await cacheResponse(cacheKey, networkResponse.clone(), request);
    }
    return networkResponse;
  } catch (error) {
    console.error('Service Worker fetch error:', error);'
    return new Response('Service Worker Error', { status: 500 });
  }
}
/**
 * Check cache hierarchy for cached responses
 */
async function checkCacheHierarchy(cacheKey: string, request: Request): Promise<Response | null> {
  // 1. Check SOM WebGPU cache first (fastest)
  if (somCacheReady) {
    try {
      const somResult = await safeSomGet(cacheKey);
      if (somResult) {
        return new Response(JSON.stringify(somResult), {
          headers: {
            'Content-Type': 'application/json',
            'X-Cache-Source': 'som-webgpu` }'`
        });
      }
    } catch (error) {
      console.warn('SOM cache miss:', error);
    }
  }
  // 2. Check Redis distributed cache
  if (isRedisConnected) {
    try {
      const redisResult = await redisWebGPUIntegration.getCachedResult(cacheKey);
      if (redisResult) {
        return new Response(JSON.stringify(redisResult), {
          headers: {
            'Content-Type': 'application/json',
            'X-Cache-Source': `redis-distributed` }
        });
      }
    } catch (error) {
      console.warn('Redis cache miss:', error);
    }
  }
  // 3. Check browser cache
  const cache = await caches.open('legal-ai-v1');
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  return null;
}
/**
 * Fetch with SIMD JSON optimization
 */
async function fetchWithSIMD(request: Request): Promise<Response> {
  // Perform the network fetch first
  const response = await fetch(request);
  // Only optimize JSON responses
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return response;
  }
  try {
    // Get response text
    const responseText = await response.text();
    // Use SIMD JSON parsing if available
    const parsedData = await simdJSONClient.parseJSON(responseText);
    // Return optimized response (preserve status and headers)
    return new Response(JSON.stringify(parsedData), {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'X-SIMD-Optimized': `true` }
    });
  } catch (error) {
    console.warn('SIMD JSON optimization failed, using original response:', error);
    return response;
  }
}
/**
 * Cache response across all tiers
 */
async function cacheResponse(cacheKey: string, response: Response, request: Request): Promise<void> {
  try {
    const responseData = await response.clone().json();
    // Determine cache strategy based on request type
    const cacheStrategy = determineCacheStrategy(request);
    // Store in appropriate caches
    const cachePromises: Promise<any>[] = [];
    // 1. Browser cache
    const cache = await caches.open('legal-ai-v1');
    cachePromises.push(cache.put(request, response.clone()));
    // 2. Redis distributed cache
    if (isRedisConnected && cacheStrategy.useRedis) {
      cachePromises.push(
        redisWebGPUIntegration.cacheResult(cacheKey, responseData, {
          ttl: cacheStrategy.ttl,
          priority: cacheStrategy.priority
        })
      );
    }
    // 3. SOM WebGPU cache (for intelligent data)
    if (somCacheReady && cacheStrategy.useSOM) {
      cachePromises.push(safeSomStore(cacheKey, responseData));
    }
    await Promise.allSettled(cachePromises);
  } catch (error) {
    console.error('Cache storage failed:', error);
  }
}
/**
 * Determine caching strategy based on request
 */
function determineCacheStrategy(request: Request): { useRedis: boolean;, useSOM: boolean;
  ttl: number;
  priority: number;
} {
  const url = new URL(request.url);
  // Legal document processing - high value, long TTL
  if (url.pathname.includes('/api/legal/')) {
    return {
      useRedis: true,
      useSOM: true,
      ttl: 24 * 60 * 60, // 24 hours
      priority: 10
    };
  }
  // Vector operations - medium value, medium TTL
  if (url.pathname.includes('/api/vectors/') || url.pathname.includes('/api/similarity/')) {
    return {
      useRedis: true,
      useSOM: false,
      ttl: 60 * 60, // 1 hour
      priority: 5
    };
  }
  // Search results - high frequency, short TTL
  if (url.pathname.includes('/api/search/')) {
    return {
      useRedis: true,
      useSOM: true,
      ttl: 15 * 60, // 15 minutes
      priority: 8
    };
  }
  // Chat/conversation - session-bound
  if (url.pathname.includes('/api/chat/')) {
    return {
      useRedis: false,
      useSOM: false,
      ttl: 5 * 60, // 5 minutes
      priority: 3
    };
  }
  // Default strategy
  return {
    useRedis: true,
    useSOM: false,
    ttl: 30 * 60, // 30 minutes
    priority: 5
  };
}
/**
 * Generate cache key for requests
 */
function generateCacheKey(request: Request): string {
  const url = new URL(request.url);
  const method = request.method;
  let key = `${method}:${url.pathname}`;
  // Add query parameters for GET requests
  if (method === 'GET' && url.search) {
    key += `?${url.search}`;
  }
  // Add body hash for POST requests
  if (method === 'POST') {
    // This would need to be implemented based on request body
    key += ':' + Date.now().toString(36); // Temporary solution
  }
  return key;
}
/**
 * Sync distributed caches on activation
 */
async function syncDistributedCaches(): Promise<void> {
  console.log('Syncing distributed caches...');
  try {
    if (isRedisConnected && somCacheReady) {
      // Get Redis cache keys and sync with SOM cache
      const redisCacheKeys = await redisWebGPUIntegration.getCacheKeys();
      for (const key of redisCacheKeys.slice(0, 100)) {
        // Limit sync batch
        try {
          const redisData = await redisWebGPUIntegration.getCachedResult(key);
          if (redisData && shouldSyncToSOM(key)) {
            await safeSomStore(key, redisData);
          }
        } catch (error) {
          console.warn(`Failed to sync key ${key}: ', error);'`
        }
      }
      console.log('Distributed cache sync complete');
    }
  } catch (error) {
    console.error('Distributed cache sync failed:', error);
  }
}
/**
 * Determine if data should be synced to SOM cache
 */
function shouldSyncToSOM(cacheKey: string): boolean {
  return (
    cacheKey.includes('legal') ||
    cacheKey.includes('search') ||
    cacheKey.includes('similarity') ||
    cacheKey.includes('analysis')
  );
}
/**
 * Start background cache warming
 */
function startCacheWarming(): void {
  console.log('Starting background cache warming...');
  // Schedule periodic cache warming
  setInterval(() => {
    if (warmingQueue.length > 0) {
      processCacheWarmingQueue();
    }
  }, 30000); // Every 30 seconds
  // Initial warming with common patterns
  queueCommonCacheWarming();
}
/**
 * Queue common cache warming tasks
 */
function queueCommonCacheWarming(): void {
  const commonTasks: CacheWarmingTask[] = [
    {
      id: 'legal-templates',
      type: 'legal_document',
      priority: 10,
      payload: { type: 'template_analysis` },'`
      retries: 0
    },
    {
      id: 'common-vectors',
      type: 'vector_similarity',
      priority: 8,
      payload: { precompute: `common_embeddings` },
      retries: 0
    },
    {
      id: 'search-patterns',
      type: 'search_results',
      priority: 7,
      payload: { warm: `popular_queries` },
      retries: 0
    },
  ];
  warmingQueue.push(...commonTasks);
}
/**
 * Process cache warming queue
 */
async function processCacheWarmingQueue(): Promise<void> {
  const maxConcurrent = 3;
  const currentRunning = activeWarmingTasks.size;
  if (currentRunning >= maxConcurrent) {
    return;
  }
  // Get highest priority tasks
  const tasksToProcess = warmingQueue.sort((a, b) => b.priority - a.priority).slice(0, maxConcurrent - currentRunning);
  for (const task of tasksToProcess) {
    const warmingPromise = processWarmingTask(task);
    activeWarmingTasks.set(task.id, warmingPromise);
    warmingPromise
      .then(() => {
        console.log(`Cache warming completed: ${task.id}`);
        // Remove from queue
        const index = warmingQueue.findIndex(t => t.id === task.id);
        if (index >= 0) {
          warmingQueue.splice(index, 1);
        }
      })
      .catch(error => {
        console.warn(`Cache warming failed: ${task.id}`, error);
        task.retries++;
        if (task.retries < 3) {
          task.priority = Math.max(1, task.priority - 1);
        } else {
          // Remove failed task
          const index = warmingQueue.findIndex(t => t.id === task.id);
          if (index >= 0) {
            warmingQueue.splice(index, 1);
          }
        }
      })
      .finally(() => {
        activeWarmingTasks.delete(task.id);
      });
  }
}
/**
 * Process individual warming task
 */
async function processWarmingTask(task: CacheWarmingTask): Promise<void> {
  try {
    switch (task.type) {
      case 'legal_document':
        if (isRedisConnected) {
          await redisWebGPUIntegration.warmLegalDocumentCache(task.payload);
        }
        break;
      case 'vector_similarity':
        if (isRedisConnected) {
          await redisWebGPUIntegration.warmVectorSimilarityCache(task.payload);
        }
        break;
      case 'search_results':
        if (isRedisConnected) {
          await redisWebGPUIntegration.warmSearchResultsCache(task.payload);
        }
        break;
      case 'som_embeddings':
        if (somCacheReady) {
          // Call SOM precompute defensively if available, otherwise fall back to safeSomStore
          if (typeof (somWebGPUCache as any).precomputeEmbeddings === 'function') {
            await (somWebGPUCache as any).precomputeEmbeddings(task.payload);
          } else {
            // use safeSomStore fallback
            await safeSomStore(task.id, task.payload);
          }
        }
        break;
    }
  } catch (error) {
    console.error('Warming task failed:', task.id, error);
    throw error;
  }
}
/**
 * Sync with Redis cache
 */
async function syncWithRedisCache(): Promise<void> {
  console.log('Syncing with Redis cache...');
  try {
    if (isRedisConnected) {
      await redisWebGPUIntegration.syncWithDistributedCache();
      console.log('Redis cache sync complete');
    }
  } catch (error) {
    console.error('Redis cache sync failed:', error);
  }
}
/**
 * Train SOM in background
 */
async function trainSOMInBackground(): Promise<void> {
  console.log('Training SOM in background...');
  try {
    if (somCacheReady) {
      if (typeof (somWebGPUCache as any).trainInBackground === 'function') {
        await (somWebGPUCache as any).trainInBackground();
      } else {
        // No-op fallback if method not present
        console.warn('trainInBackground not implemented on somWebGPUCache');
      }
      console.log('SOM background training complete');
    }
  } catch (error) {
    console.error('SOM background training failed:', error);
  }
}
/**
 * Handle message events from main thread
 */
self.addEventListener('message', (event: MessageEvent) => {
  const { type, payload } = event.data || {};
  switch (type) {
    case 'QUEUE_CACHE_WARMING':
      warmingQueue.push(payload);
      break;
    case 'SYNC_CACHES':
      syncDistributedCaches();
      break;
    case 'TRAIN_SOM':
      trainSOMInBackground();
      break;
    case 'GET_CACHE_STATUS':
      event.ports?.[0]?.postMessage({
        redis: isRedisConnected,
        webgpu: webgpuInitialized,
        som: somCacheReady,
        warmingQueue: warmingQueue.length,
        activeWarming: activeWarmingTasks.size
      });
      break;
  }
});
console.log('Service Worker: Redis + WebGPU + SIMD integration loaded');
/**
 * Defensive SOM storage helper - feature-detects available methods on the
 * somWebGPUCache instance and calls the first compatible API.
 */
async function safeSomStore(key: string, data: any): Promise<void> {
  // Short-circuit if SOM not ready
  if (!somCacheReady) return;
  const s = somWebGPUCache as any;
  try {
    if (typeof s.storeResult === 'function') {
      await s.storeResult(key, data);
      return;
    }
    if (typeof s.cacheResult === 'function') {
      await s.cacheResult(key, data);
      return;
    }
    if (typeof s.set === 'function') {
      await s.set(key, data);
      return;
    }
    if (typeof s.put === 'function') {
      await s.put(key, data);
      return;
    }
    if (typeof s.upsert === 'function') {
      await s.upsert(key, data);
      return;
    }
    // Some implementations may expose a precompute API that accepts payloads
    if (typeof s.precomputeEmbeddings === 'function') {
      // try best-effort call (signature may differ)
      await s.precomputeEmbeddings(key, data).catch(() => s.precomputeEmbeddings(data));
      return;
    }
    console.warn('safeSomStore: no compatible store method found on somWebGPUCache');
  } catch (err) {
    console.error('safeSomStore failed:', err);
  }
}
/**
 * Defensive SOM getter helper - feature-detect available read methods on the
 * somWebGPUCache instance and call the first compatible API. Returns null on miss.
 */
async function safeSomGet(key: string): Promise<any | null> {
  if (!somCacheReady) return null;
  const s = somWebGPUCache as any;
  try {
    if (typeof s.get === 'function') {
      return await s.get(key);
    }
    if (typeof s.getResult === 'function') {
      return await s.getResult(key);
    }
    if (typeof s.getCachedResult === 'function') {
      return await s.getCachedResult(key);
    }
    if (typeof s.retrieve === 'function') {
      return await s.retrieve(key);
    }
    if (typeof s.fetch === 'function') {
      return await s.fetch(key);
    }
    if (typeof s.lookup === 'function') {
      return await s.lookup(key);
    }
    if (typeof s.getItem === 'function') {
      return await s.getItem(key);
    }
    // Some implementations may expose a read API with different params
    if (typeof s.read === 'function') {
      try {
        return await s.read(key);
      } catch {
        return await s.read(key, { raw: true }).catch(() => null);
      }
    }
    // No compatible method
    console.warn('safeSomGet: no compatible get method found on somWebGPUCache');
    return null;
  } catch (err) {
    console.warn('safeSomGet failed:', err);
    return null;
  }
}
