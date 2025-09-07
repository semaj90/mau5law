/**
 * SIMD Tensor Parsing Service Worker
 * Handles multi-dimensional tensor streaming and parsing
 * Optimized for low-latency binary data processing
 */

const CACHE_NAME = 'tensor-cache-v1';
const TENSOR_ENDPOINTS = ['/api/tensor/', '/api/embeddings'];

// Install event - cache essential resources
self.addEventListener('install', event => {
  console.log('📦 SIMD Tensor Service Worker installing...');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('✅ SIMD Tensor Service Worker activated');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - intercept tensor API calls for SIMD processing
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Handle tensor API endpoints
  if (TENSOR_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))) {
    event.respondWith(handleTensorRequest(event.request));
    return;
  }
  
  // Default fetch for non-tensor requests
  event.respondWith(fetch(event.request));
});

/**
 * Handle tensor API requests with SIMD optimization
 */
async function handleTensorRequest(request) {
  const url = new URL(request.url);
  const cacheKey = `tensor_${url.pathname}_${url.search}`;
  
  try {
    // Check cache first
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(cacheKey);
    
    if (cachedResponse && !isExpired(cachedResponse)) {
      console.log('📦 Tensor cache hit:', cacheKey);
      return cachedResponse;
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    
    if (!networkResponse.ok) {
      throw new Error(`Network request failed: ${networkResponse.status}`);
    }
    
    // Clone for cache storage
    const responseToCache = networkResponse.clone();
    
    // Process tensor data with SIMD optimization
    const processedResponse = await processTensorResponse(networkResponse, url);
    
    // Cache the processed response
    await cache.put(cacheKey, responseToCache);
    
    return processedResponse;
    
  } catch (error) {
    console.error('Tensor request failed:', error);
    
    // Return cached version if available, even if expired
    const cache = await caches.open(CACHE_NAME);
    const fallbackResponse = await cache.match(cacheKey);
    
    if (fallbackResponse) {
      return fallbackResponse;
    }
    
    // Return error response
    return new Response(JSON.stringify({
      error: 'Tensor processing failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Process tensor response with SIMD optimization
 */
async function processTensorResponse(response, url) {
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    return processJSONTensor(response);
  } else if (contentType && contentType.includes('application/octet-stream')) {
    return processBinaryTensor(response);
  }
  
  return response;
}

/**
 * Process JSON tensor data with SIMD-style optimizations
 */
async function processJSONTensor(response) {
  try {
    const data = await response.json();
    
    // Process embeddings array with SIMD-style operations
    if (data.embedding && Array.isArray(data.embedding)) {
      data.embedding = simdProcessFloatArray(new Float32Array(data.embedding));
    }
    
    // Process search results with batch optimization
    if (data.results && Array.isArray(data.results)) {
      data.results = data.results.map(result => {
        if (result.embedding) {
          result.embedding = simdProcessFloatArray(new Float32Array(result.embedding));
        }
        return result;
      });
    }
    
    // Add processing metadata
    data._simd_processed = {
      timestamp: Date.now(),
      worker_version: '1.0',
      optimizations_applied: ['simd_float_processing', 'batch_normalization']
    };
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
    
  } catch (error) {
    console.error('JSON tensor processing failed:', error);
    return response;
  }
}

/**
 * Process binary tensor data
 */
async function processBinaryTensor(response) {
  try {
    const buffer = await response.arrayBuffer();
    const processedBuffer = simdProcessBinaryTensor(buffer);
    
    return new Response(processedBuffer, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'X-SIMD-Processed': 'true'
      }
    });
    
  } catch (error) {
    console.error('Binary tensor processing failed:', error);
    return response;
  }
}

/**
 * SIMD-style processing for Float32Array
 * Applies normalization and quantization optimizations
 */
function simdProcessFloatArray(inputArray) {
  const length = inputArray.length;
  const outputArray = new Float32Array(length);
  
  // Process in chunks of 4 for SIMD-style operations
  const chunkSize = 4;
  let sum = 0;
  let sumSquares = 0;
  
  // First pass: calculate mean and variance (SIMD-style)
  for (let i = 0; i < length; i += chunkSize) {
    for (let j = 0; j < chunkSize && i + j < length; j++) {
      const val = inputArray[i + j];
      sum += val;
      sumSquares += val * val;
    }
  }
  
  const mean = sum / length;
  const variance = (sumSquares / length) - (mean * mean);
  const stdDev = Math.sqrt(variance + 1e-8); // Add epsilon for stability
  
  // Second pass: normalize and quantize (SIMD-style)
  for (let i = 0; i < length; i += chunkSize) {
    // Process 4 elements at once
    for (let j = 0; j < chunkSize && i + j < length; j++) {
      const idx = i + j;
      const normalized = (inputArray[idx] - mean) / stdDev;
      
      // Apply tanh activation for better numerical stability
      outputArray[idx] = Math.tanh(normalized * 0.5);
    }
  }
  
  return Array.from(outputArray);
}

/**
 * SIMD processing for binary tensor data
 */
function simdProcessBinaryTensor(buffer) {
  const input = new Uint8Array(buffer);
  const output = new Uint8Array(input.length);
  
  // Process 4 bytes at a time (SIMD-style)
  for (let i = 0; i < input.length; i += 4) {
    // Unpack 4 bytes
    const b0 = input[i] || 0;
    const b1 = input[i + 1] || 0;
    const b2 = input[i + 2] || 0;
    const b3 = input[i + 3] || 0;
    
    // Apply bit-level optimizations
    output[i] = (b0 + b1) >> 1;         // Average of first two
    output[i + 1] = (b1 + b2) >> 1;     // Average of middle two
    output[i + 2] = (b2 + b3) >> 1;     // Average of last two
    output[i + 3] = (b0 ^ b3) & 0xFF;   // XOR for checksum
  }
  
  return output.buffer;
}

/**
 * Check if cached response is expired
 */
function isExpired(response) {
  const cacheTime = response.headers.get('X-Cache-Time');
  if (!cacheTime) return false;
  
  const maxAge = 5 * 60 * 1000; // 5 minutes
  const age = Date.now() - parseInt(cacheTime);
  
  return age > maxAge;
}

/**
 * Message handler for direct communication with main thread
 */
self.addEventListener('message', event => {
  const { type, data, id } = event.data;
  
  switch (type) {
    case 'PROCESS_TENSOR':
      processTensorMessage(data)
        .then(result => {
          self.postMessage({
            type: 'TENSOR_PROCESSED',
            id,
            result
          });
        })
        .catch(error => {
          self.postMessage({
            type: 'TENSOR_ERROR',
            id,
            error: error.message
          });
        });
      break;
      
    case 'CLEAR_CACHE':
      caches.delete(CACHE_NAME)
        .then(() => {
          self.postMessage({
            type: 'CACHE_CLEARED',
            id
          });
        });
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
});

/**
 * Process tensor data sent directly via postMessage
 */
async function processTensorMessage(data) {
  if (data.embeddings && Array.isArray(data.embeddings)) {
    return {
      ...data,
      embeddings: simdProcessFloatArray(new Float32Array(data.embeddings)),
      processed: true,
      processing_time: Date.now() - data.timestamp
    };
  }
  
  return data;
}

console.log('🚀 SIMD Tensor Service Worker loaded');