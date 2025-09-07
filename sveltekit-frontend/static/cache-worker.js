/**
 * Cache Service Worker for WebGPU Redis Optimizer
 * Handles parallel cache operations and background processing
 */

const CACHE_NAME = 'webgpu-redis-cache-v1';
const CACHE_ENDPOINTS = ['/api/v1/webgpu/cache-demo'];

// Service Worker installation
self.addEventListener('install', (event) => {
  console.log('🚀 Cache Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Cache Service Worker installed');
      return cache.addAll([]);
    })
  );
  
  self.skipWaiting();
});

// Service Worker activation
self.addEventListener('activate', (event) => {
  console.log('⚡ Cache Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  
  self.clients.claim();
});

// Message handling for cache operations
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'cache_set':
      handleCacheSet(event);
      break;
      
    case 'cache_get':
      handleCacheGet(event);
      break;
      
    case 'cache_batch':
      handleCacheBatch(event);
      break;
      
    case 'cache_clear':
      handleCacheClear(event);
      break;
      
    default:
      console.warn('Unknown cache operation:', type);
  }
});

// Handle cache set operations in background
async function handleCacheSet(event) {
  try {
    const { key, value, options = {} } = event.data;
    
    // Process in background thread
    const processedValue = await processValueForCache(value, options);
    
    // Store in browser cache
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(JSON.stringify(processedValue), {
      headers: {
        'Content-Type': 'application/json',
        'X-Cache-Key': key,
        'X-Timestamp': Date.now().toString(),
        'X-TTL': (options.ttl || 3600).toString()
      }
    });
    
    await cache.put(new Request(`/cache/${key}`), response);
    
    // Notify client of completion
    event.ports[0]?.postMessage({
      type: 'cache_set_complete',
      key,
      success: true
    });
    
  } catch (error) {
    console.error('Cache set failed:', error);
    event.ports[0]?.postMessage({
      type: 'cache_set_complete',
      key: event.data.key,
      success: false,
      error: error.message
    });
  }
}

// Handle cache get operations
async function handleCacheGet(event) {
  try {
    const { key } = event.data;
    
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(new Request(`/cache/${key}`));
    
    if (response) {
      const ttl = parseInt(response.headers.get('X-TTL') || '3600');
      const timestamp = parseInt(response.headers.get('X-Timestamp') || '0');
      
      // Check if cache entry has expired
      if (Date.now() - timestamp > ttl * 1000) {
        await cache.delete(new Request(`/cache/${key}`));
        event.ports[0]?.postMessage({
          type: 'cache_get_complete',
          key,
          value: null,
          expired: true
        });
        return;
      }
      
      const value = await response.json();
      const processedValue = await processValueFromCache(value);
      
      event.ports[0]?.postMessage({
        type: 'cache_get_complete',
        key,
        value: processedValue,
        hit: true
      });
    } else {
      event.ports[0]?.postMessage({
        type: 'cache_get_complete',
        key,
        value: null,
        hit: false
      });
    }
    
  } catch (error) {
    console.error('Cache get failed:', error);
    event.ports[0]?.postMessage({
      type: 'cache_get_complete',
      key: event.data.key,
      value: null,
      error: error.message
    });
  }
}

// Handle batch cache operations
async function handleCacheBatch(event) {
  try {
    const { operations } = event.data;
    const results = [];
    
    // Process operations in parallel batches
    const batchSize = 16;
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (op) => {
          try {
            if (op.type === 'set') {
              await processCacheSetOperation(op);
              return { success: true, key: op.key };
            } else if (op.type === 'get') {
              const value = await processCacheGetOperation(op);
              return { success: true, key: op.key, value };
            }
          } catch (error) {
            return { success: false, key: op.key, error: error.message };
          }
        })
      );
      
      results.push(...batchResults);
    }
    
    event.ports[0]?.postMessage({
      type: 'cache_batch_complete',
      results,
      totalOperations: operations.length
    });
    
  } catch (error) {
    console.error('Batch cache operation failed:', error);
    event.ports[0]?.postMessage({
      type: 'cache_batch_complete',
      results: [],
      error: error.message
    });
  }
}

// Handle cache clear operations
async function handleCacheClear(event) {
  try {
    const { pattern } = event.data;
    
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    
    let deletedCount = 0;
    
    for (const request of requests) {
      if (!pattern || request.url.includes(pattern)) {
        await cache.delete(request);
        deletedCount++;
      }
    }
    
    event.ports[0]?.postMessage({
      type: 'cache_clear_complete',
      deletedCount,
      success: true
    });
    
  } catch (error) {
    console.error('Cache clear failed:', error);
    event.ports[0]?.postMessage({
      type: 'cache_clear_complete',
      deletedCount: 0,
      error: error.message
    });
  }
}

// Process individual cache set operation
async function processCacheSetOperation(operation) {
  const { key, value, options = {} } = operation;
  
  const processedValue = await processValueForCache(value, options);
  const cache = await caches.open(CACHE_NAME);
  
  const response = new Response(JSON.stringify(processedValue), {
    headers: {
      'Content-Type': 'application/json',
      'X-Cache-Key': key,
      'X-Timestamp': Date.now().toString(),
      'X-TTL': (options.ttl || 3600).toString()
    }
  });
  
  await cache.put(new Request(`/cache/${key}`), response);
}

// Process individual cache get operation
async function processCacheGetOperation(operation) {
  const { key } = operation;
  
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(new Request(`/cache/${key}`));
  
  if (response) {
    const ttl = parseInt(response.headers.get('X-TTL') || '3600');
    const timestamp = parseInt(response.headers.get('X-Timestamp') || '0');
    
    if (Date.now() - timestamp > ttl * 1000) {
      await cache.delete(new Request(`/cache/${key}`));
      return null;
    }
    
    const value = await response.json();
    return await processValueFromCache(value);
  }
  
  return null;
}

// Process value for cache storage (compression, serialization)
async function processValueForCache(value, options = {}) {
  if (value instanceof Float32Array || (value && value.__type === 'Float32Array')) {
    // Handle tensor data
    const tensorData = value instanceof Float32Array ? Array.from(value) : value.__data;
    
    if (options.compress) {
      // Simple compression for demo (in production, use proper compression)
      const compressed = compressFloatArray(tensorData);
      return {
        __type: 'CompressedFloat32Array',
        __data: compressed,
        __originalLength: tensorData.length,
        __compressed: true
      };
    }
    
    return {
      __type: 'Float32Array',
      __data: tensorData,
      __compressed: false
    };
  }
  
  return value;
}

// Process value from cache storage (decompression, deserialization)
async function processValueFromCache(value) {
  if (value && typeof value === 'object' && value.__type) {
    switch (value.__type) {
      case 'Float32Array':
        return new Float32Array(value.__data);
        
      case 'CompressedFloat32Array':
        if (value.__compressed) {
          const decompressed = decompressFloatArray(value.__data, value.__originalLength);
          return new Float32Array(decompressed);
        }
        return new Float32Array(value.__data);
        
      default:
        return value;
    }
  }
  
  return value;
}

// Simple float array compression (quantization)
function compressFloatArray(floats) {
  // Find max absolute value for scaling
  let maxAbs = 0;
  for (const f of floats) {
    const abs = Math.abs(f);
    if (abs > maxAbs) maxAbs = abs;
  }
  
  const scale = maxAbs > 0 ? 127 / maxAbs : 1;
  
  // Quantize to int8
  return {
    scale,
    quantized: floats.map(f => Math.round(f * scale))
  };
}

// Simple float array decompression
function decompressFloatArray(compressed, originalLength) {
  const { scale, quantized } = compressed;
  const invScale = 1 / scale;
  
  return quantized.map(q => q * invScale);
}

// Fetch event handling for cached responses
self.addEventListener('fetch', (event) => {
  // Only handle cache-related requests
  if (event.request.url.includes('/cache/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});

console.log('🚀 WebGPU Cache Service Worker loaded');