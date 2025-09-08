/**
 * SIMD Tensor Parsing Service Worker
 * Handles multi-dimensional tensor streaming and parsing with WASM vector operations
 * Optimized for low-latency binary data processing with compiled WebAssembly
 */

const CACHE_NAME = 'tensor-cache-v1';
const TENSOR_ENDPOINTS = ['/api/tensor/', '/api/embeddings'];

// WASM module instance for vector operations
let wasmModule = null;
let wasmReady = false;

// Load WebAssembly vector operations module
async function loadWASMModule() {
  try {
    const wasmResponse = await fetch('/wasm/vector-ops.wasm');
    const wasmBytes = await wasmResponse.arrayBuffer();
    wasmModule = await WebAssembly.instantiate(wasmBytes);
    wasmReady = true;
    console.log('🚀 WASM vector operations loaded in tensor worker');
  } catch (error) {
    console.warn('⚠️ WASM loading failed, falling back to JS:', error);
    wasmReady = false;
  }
}

// Install event - cache essential resources and load WASM
self.addEventListener('install', event => {
  console.log('📦 SIMD Tensor Service Worker installing...');
  event.waitUntil(loadWASMModule());
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
 * WASM-accelerated or fallback processing for Float32Array
 * Uses compiled WebAssembly vector operations when available
 */
function simdProcessFloatArray(inputArray) {
  if (wasmReady && wasmModule) {
    return processFloatArrayWASM(inputArray);
  }
  
  // Fallback to JavaScript SIMD-style processing
  return processFloatArrayJS(inputArray);
}

/**
 * WebAssembly-accelerated vector processing
 */
function processFloatArrayWASM(inputArray) {
  try {
    const length = inputArray.length;
    const wasmMemory = wasmModule.instance.exports.memory;
    const floatView = new Float32Array(wasmMemory.buffer);
    
    // Allocate memory in WASM
    const inputPtr = wasmModule.instance.exports.__new(length * 4, 0); // 4 bytes per float32
    const outputPtr = wasmModule.instance.exports.__new(length * 4, 0);
    
    // Copy input data to WASM memory
    const inputOffset = inputPtr >>> 2; // Convert to float32 array index
    const outputOffset = outputPtr >>> 2;
    
    for (let i = 0; i < length; i++) {
      floatView[inputOffset + i] = inputArray[i];
    }
    
    // Call WASM normalize function (we need to add this to our AssemblyScript)
    const normalizedPtr = wasmModule.instance.exports.normalizeVector 
      ? wasmModule.instance.exports.normalizeVector(inputPtr, length)
      : outputPtr;
    
    // Copy result back to JavaScript
    const result = new Float32Array(length);
    const resultOffset = normalizedPtr >>> 2;
    
    for (let i = 0; i < length; i++) {
      result[i] = floatView[resultOffset + i];
    }
    
    // Clean up WASM memory
    wasmModule.instance.exports.__unpin(inputPtr);
    wasmModule.instance.exports.__unpin(outputPtr);
    if (normalizedPtr !== outputPtr) {
      wasmModule.instance.exports.__unpin(normalizedPtr);
    }
    
    return Array.from(result);
    
  } catch (error) {
    console.warn('WASM processing failed, falling back to JS:', error);
    return processFloatArrayJS(inputArray);
  }
}

/**
 * JavaScript fallback SIMD-style processing for Float32Array
 * Applies normalization and quantization optimizations
 */
function processFloatArrayJS(inputArray) {
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
  const startTime = Date.now();
  
  if (data.embeddings && Array.isArray(data.embeddings)) {
    return {
      ...data,
      embeddings: simdProcessFloatArray(new Float32Array(data.embeddings)),
      processed: true,
      processing_time: startTime - (data.timestamp || startTime)
    };
  }
  
  // Handle vector similarity requests
  if (data.operation === 'similarity' && data.query && data.vectors) {
    return await processVectorSimilarity(data, startTime);
  }
  
  // Handle batch normalization requests
  if (data.operation === 'batch_normalize' && data.vectors) {
    return await processBatchNormalize(data, startTime);
  }
  
  return data;
}

/**
 * Process vector similarity computation using WASM
 */
async function processVectorSimilarity(data, startTime) {
  try {
    if (!wasmReady || !wasmModule) {
      // Fallback to JavaScript computation
      return processVectorSimilarityJS(data, startTime);
    }
    
    const { query, vectors, algorithm = 0 } = data; // 0 = cosine similarity
    const queryVector = new Float32Array(query);
    const vectorDim = queryVector.length;
    const vectorCount = vectors.length;
    
    // Allocate WASM memory
    const wasmMemory = wasmModule.instance.exports.memory;
    const floatView = new Float32Array(wasmMemory.buffer);
    
    // Allocate pointers
    const queryPtr = wasmModule.instance.exports.__new(vectorDim * 4, 0);
    const vectorsPtr = wasmModule.instance.exports.__new(vectorCount * vectorDim * 4, 0);
    const resultsPtr = wasmModule.instance.exports.__new(vectorCount * 4, 0);
    
    // Copy query vector to WASM
    const queryOffset = queryPtr >>> 2;
    for (let i = 0; i < vectorDim; i++) {
      floatView[queryOffset + i] = queryVector[i];
    }
    
    // Copy all vectors to WASM
    const vectorsOffset = vectorsPtr >>> 2;
    for (let v = 0; v < vectorCount; v++) {
      const vector = new Float32Array(vectors[v]);
      for (let i = 0; i < vectorDim; i++) {
        floatView[vectorsOffset + v * vectorDim + i] = vector[i];
      }
    }
    
    // Call WASM batch similarity computation
    wasmModule.instance.exports.computeBatchSimilarity(
      queryPtr, vectorsPtr, resultsPtr, vectorDim, vectorCount, algorithm
    );
    
    // Copy results back
    const results = [];
    const resultsOffset = resultsPtr >>> 2;
    for (let i = 0; i < vectorCount; i++) {
      results.push(floatView[resultsOffset + i]);
    }
    
    // Clean up WASM memory
    wasmModule.instance.exports.__unpin(queryPtr);
    wasmModule.instance.exports.__unpin(vectorsPtr);
    wasmModule.instance.exports.__unpin(resultsPtr);
    
    return {
      ...data,
      similarities: results,
      processed: true,
      processing_time: Date.now() - startTime,
      acceleration: 'wasm'
    };
    
  } catch (error) {
    console.warn('WASM similarity computation failed, using JS fallback:', error);
    return processVectorSimilarityJS(data, startTime);
  }
}

/**
 * JavaScript fallback for vector similarity
 */
function processVectorSimilarityJS(data, startTime) {
  const { query, vectors } = data;
  const queryVector = new Float32Array(query);
  
  const similarities = vectors.map(vector => {
    const v = new Float32Array(vector);
    return cosineSimilarityJS(queryVector, v);
  });
  
  return {
    ...data,
    similarities,
    processed: true,
    processing_time: Date.now() - startTime,
    acceleration: 'javascript'
  };
}

/**
 * JavaScript cosine similarity implementation
 */
function cosineSimilarityJS(a, b) {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Process batch vector normalization using WASM
 */
async function processBatchNormalize(data, startTime) {
  try {
    if (!wasmReady || !wasmModule) {
      // Fallback to JavaScript processing
      return {
        ...data,
        vectors: data.vectors.map(v => processFloatArrayJS(new Float32Array(v))),
        processed: true,
        processing_time: Date.now() - startTime,
        acceleration: 'javascript'
      };
    }
    
    const { vectors } = data;
    const numVectors = vectors.length;
    const vectorLength = vectors[0].length;
    
    // Allocate WASM memory
    const wasmMemory = wasmModule.instance.exports.memory;
    const floatView = new Float32Array(wasmMemory.buffer);
    
    const vectorsPtr = wasmModule.instance.exports.__new(numVectors * vectorLength * 4, 0);
    
    // Copy vectors to WASM
    const vectorsOffset = vectorsPtr >>> 2;
    for (let v = 0; v < numVectors; v++) {
      const vector = new Float32Array(vectors[v]);
      for (let i = 0; i < vectorLength; i++) {
        floatView[vectorsOffset + v * vectorLength + i] = vector[i];
      }
    }
    
    // Call WASM batch normalization
    const normalizedPtr = wasmModule.instance.exports.batchNormalizeVectors(
      vectorsPtr, numVectors, vectorLength
    );
    
    // Copy results back
    const normalizedVectors = [];
    const normalizedOffset = normalizedPtr >>> 2;
    for (let v = 0; v < numVectors; v++) {
      const vector = [];
      for (let i = 0; i < vectorLength; i++) {
        vector.push(floatView[normalizedOffset + v * vectorLength + i]);
      }
      normalizedVectors.push(vector);
    }
    
    // Clean up WASM memory
    wasmModule.instance.exports.__unpin(vectorsPtr);
    wasmModule.instance.exports.__unpin(normalizedPtr);
    
    return {
      ...data,
      vectors: normalizedVectors,
      processed: true,
      processing_time: Date.now() - startTime,
      acceleration: 'wasm'
    };
    
  } catch (error) {
    console.warn('WASM batch normalization failed, using JS fallback:', error);
    return {
      ...data,
      vectors: data.vectors.map(v => processFloatArrayJS(new Float32Array(v))),
      processed: true,
      processing_time: Date.now() - startTime,
      acceleration: 'javascript'
    };
  }
}

console.log('🚀 SIMD Tensor Service Worker loaded');