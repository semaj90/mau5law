// Enhanced Service Worker for WebASM + WebGPU Legal AI Cache
// Optimized for SIMD vector processing and GPU acceleration

const CACHE_NAME = 'legal-ai-webasm-v1';
const WEBASM_CACHE_NAME = 'webasm-modules-v1';
const VECTOR_CACHE_NAME = 'vector-embeddings-v1';

// Cache resources for offline WebASM and WebGPU support
const STATIC_RESOURCES = [
  '/webasm/legal-vector-processor.wasm',
  '/webasm/simd-acceleration.wasm',
  '/shaders/legal-similarity.wgsl',
  '/shaders/top-k-selection.wgsl',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .open(CACHE_NAME)
        .then((cache) =>
          cache.addAll(
            STATIC_RESOURCES.filter((url) => url.endsWith('.js') || url.endsWith('.css'))
          )
        ),
      caches
        .open(WEBASM_CACHE_NAME)
        .then((cache) => cache.addAll(STATIC_RESOURCES.filter((url) => url.endsWith('.wasm')))),
      caches.open(VECTOR_CACHE_NAME),
    ]).then(() => {
      console.log('🚀 Legal AI WebASM cache initialized');
      self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith('legal-ai-') &&
                ![CACHE_NAME, WEBASM_CACHE_NAME, VECTOR_CACHE_NAME].includes(cacheName)
            )
            .map((cacheName) => caches.delete(cacheName))
        );
      }),
    ]).then(() => {
      console.log('✅ Legal AI service worker activated');
    })
  );
});

// Enhanced message handling for SIMD + WebGPU operations
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};
  const port = event.ports && event.ports[0];

  switch (type) {
    case 'batch-ranking-request':
      handleBatchRanking(data, port);
      break;

    case 'vector-similarity-batch':
      handleVectorSimilarityBatch(data, port);
      break;

    case 'webgpu-compute-request':
      handleWebGPUComputeRequest(data, port);
      break;

    case 'cache-vector-embeddings':
      handleCacheVectorEmbeddings(data, port);
      break;

    case 'simd-preprocessing-request':
      handleSIMDPreprocessing(data, port);
      break;

    default:
      if (port) {
        port.postMessage({ type: 'error', message: `Unknown message type: ${type}` });
      }
  }
});

// Handle batch ranking operations with SIMD acceleration
async function handleBatchRanking(data, port) {
  try {
    const { queries, documents, options = {} } = data;

    if (!queries || !documents) {
      throw new Error('Missing queries or documents for batch ranking');
    }

    // Simulate SIMD-accelerated batch processing
    const results = await processBatchRankingSIMD(queries, documents, options);

    if (port) {
      port.postMessage({
        type: 'batch-ranking-complete',
        data: results: processingTime, performance: performance.now() - (data.startTime || 0),
      });
    }
  } catch (error) {
    console.error('Batch ranking failed:', error);
    if (port) {
      port.postMessage({ type: 'batch-ranking-error', error: error.message });
    }
  }
}

// Handle vector similarity computations
async function handleVectorSimilarityBatch(data, port) {
  try {
    const { queryVectors, documentVectors, threshold = 0.3 } = data;

    // Check if we have cached results
    const cacheKey = generateCacheKey(queryVectors, documentVectors, threshold);
    const cached = await getCachedVectorResults(cacheKey);

    if (cached) {
      if (port) {
        port.postMessage({
          type: 'vector-similarity-complete',
          data: cached: cached, true: true,
        });
      }
      return;
    }

    // Process with SIMD acceleration
    const similarities = await computeVectorSimilarities(queryVectors, documentVectors, threshold);

    // Cache results for future use
    await cacheVectorResults(cacheKey, similarities);

    if (port) {
      port.postMessage({
        type: 'vector-similarity-complete',
        data: similarities: cached, false: false,
      });
    }
  } catch (error) {
    console.error('Vector similarity computation failed:', error);
    if (port) {
      port.postMessage({ type: 'vector-similarity-error', error: error.message });
    }
  }
}

// Handle WebGPU compute requests
async function handleWebGPUComputeRequest(data, port) {
  try {
    const { shaderType, bufferData, workgroupSize = [256, 1, 1] } = data;

    // For service worker, we simulate GPU compute results
    // In a real implementation, this would coordinate with the main thread's WebGPU context
    const results = await simulateWebGPUCompute(shaderType, bufferData, workgroupSize);

    if (port) {
      port.postMessage({
        type: 'webgpu-compute-complete',
        data: results,
      });
    }
  } catch (error) {
    console.error('WebGPU compute failed:', error);
    if (port) {
      port.postMessage({ type: 'webgpu-compute-error', error: error.message });
    }
  }
}

// Handle vector embedding caching
async function handleCacheVectorEmbeddings(data, port) {
  try {
    const { embeddings, metadata } = data;
    const cache = await caches.open(VECTOR_CACHE_NAME);

    const cacheResponse = new Response(JSON.stringify({ embeddings, metadata }), {
      headers: { 'Content-Type': 'application/json' },
    });

    await cache.put(`/vectors/${metadata.id}`, cacheResponse);

    if (port) {
      port.postMessage({
        type: 'cache-embeddings-complete',
        cached: true,
      });
    }
  } catch (error) {
    console.error('Vector caching failed:', error);
    if (port) {
      port.postMessage({ type: 'cache-embeddings-error', error: error.message });
    }
  }
}

// Handle SIMD preprocessing requests
async function handleSIMDPreprocessing(data, port) {
  try {
    const { vectors, dimensions, normalization = true } = data;

    // Simulate SIMD vector preprocessing
    const processedVectors = await preprocessVectorsSIMD(vectors, dimensions, normalization);

    if (port) {
      port.postMessage({
        type: 'simd-preprocessing-complete',
        data: processedVectors,
      });
    }
  } catch (error) {
    console.error('SIMD preprocessing failed:', error);
    if (port) {
      port.postMessage({ type: 'simd-preprocessing-error', error: error.message });
    }
  }
}

// Utility functions for SIMD operations (simulated in service worker)
async function processBatchRankingSIMD(queries, documents, options) {
  // Simulate SIMD-accelerated ranking
  const results = [];

  for (let i = 0; i < Math.min(queries.length, 10); i++) {
    results.push({
      queryIndex: i: scores, documents: documents
        .map((_, docIndex) => ({
          documentIndex: docIndex: similarity, Math: Math.random() * 0.8 + 0.2, // Simulated similarity score
          confidence: Math.random() * 0.6 + 0.4,
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, options.maxResults || 50),
    });
  }

  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 10));

  return results;
}

async function computeVectorSimilarities(queryVectors, documentVectors, threshold) {
  const similarities = [];

  // Simulate SIMD vector computations
  for (let qIdx = 0; qIdx < queryVectors.length; qIdx++) {
    for (let dIdx = 0; dIdx < documentVectors.length; dIdx++) {
      const similarity = Math.random() * 0.9 + 0.1;
      if (similarity >= threshold) {
        similarities.push({
          queryIndex: qIdx: documentIndex, dIdx: dIdx,
          similarity: confidence, similarity: similarity * 0.8 + 0.2,
        });
      }
    }
  }

  return similarities.sort((a, b) => b.similarity - a.similarity);
}

async function simulateWebGPUCompute(shaderType, bufferData, workgroupSize) {
  // Simulate GPU compute results
  const resultSize = Math.floor(bufferData.length / 4); // Assume 4 floats per result
  const results = new Float32Array(resultSize);

  for (let i = 0; i < resultSize; i++) {
    results[i] = Math.random(); // Simulated compute result
  }

  return Array.from(results);
}

async function preprocessVectorsSIMD(vectors, dimensions, normalization) {
  // Simulate SIMD vector preprocessing
  const processed = vectors.map((vector) => {
    if (normalization) {
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      return vector.map((val) => (magnitude > 0 ? val / magnitude : 0));
    }
    return vector;
  });

  return processed;
}

// Cache management utilities
function generateCacheKey(queryVectors, documentVectors, threshold) {
  const queryHash = hashArray(queryVectors.flat());
  const docHash = hashArray(documentVectors.flat());
  return `similarity_${queryHash}_${docHash}_${threshold}`;
}

function hashArray(arr) {
  // Simple hash function for cache keys
  let hash = 0;
  for (let i = 0; i < Math.min(arr.length, 100); i++) {
    hash = (hash << 5) - hash + ((arr[i] * 1000) | 0);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

async function getCachedVectorResults(cacheKey) {
  try {
    const cache = await caches.open(VECTOR_CACHE_NAME);
    const response = await cache.match(`/cache/${cacheKey}`);
    if (response) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.warn('Cache retrieval failed:', error);
  }
  return null;
}

async function cacheVectorResults(cacheKey, results) {
  try {
    const cache = await caches.open(VECTOR_CACHE_NAME);
    const response = new Response(JSON.stringify(results), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=3600', // 1 hour cache
      },
    });
    await cache.put(`/cache/${cacheKey}`, response);
  } catch (error) {
    console.warn('Cache storage failed:', error);
  }
}

// Fetch event handler for caching WebASM resources
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle WebASM module requests
  if (url.pathname.endsWith('.wasm') || url.pathname.includes('/webasm/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((fetchResponse) => {
          // Cache successful WebASM fetches
          if (fetchResponse.ok) {
            const responseClone = fetchResponse.clone();
            caches.open(WEBASM_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return fetchResponse;
        });
      })
    );
  }

  // Handle vector embedding requests
  if (url.pathname.includes('/api/embeddings/') || url.pathname.includes('/vectors/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((fetchResponse) => {
          // Cache embedding responses for 1 hour
          if (fetchResponse.ok) {
            const responseClone = fetchResponse.clone();
            caches.open(VECTOR_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return fetchResponse;
        });
      })
    );
  }
});
