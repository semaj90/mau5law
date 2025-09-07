/**
 * Intelligent Web Worker
 * Background processing for web analysis, OCR, and tensor optimization
 * Handles SIMD memory operations and QLoRA training data preparation
 */

const CACHE_NAME = 'intelligent-web-cache-v1';
const ANALYSIS_ENDPOINTS = ['/api/embeddings', '/api/tensor/', '/api/analysis/'];

// Worker state
let isProcessing = false;
let processingQueue = [];
let userAnalytics = {};

console.log('🧠 Intelligent Web Worker starting...');

// Install event
self.addEventListener('install', event => {
  console.log('📦 Intelligent Web Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
  console.log('✅ Intelligent Web Worker activated');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('intelligent-')) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - intercept and optimize requests
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Handle analysis API endpoints with caching and optimization
  if (ANALYSIS_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))) {
    event.respondWith(handleAnalysisRequest(event.request));
    return;
  }
  
  // Default fetch for other requests
  event.respondWith(fetch(event.request));
});

// Message handler for direct communication
self.addEventListener('message', event => {
  const { type, data, id } = event.data;
  
  switch (type) {
    case 'ANALYZE_PAGE':
      handlePageAnalysis(data, id);
      break;
      
    case 'PROCESS_CHUNKS':
      handleChunkProcessing(data, id);
      break;
      
    case 'UPDATE_USER_ANALYTICS':
      userAnalytics = { ...userAnalytics, ...data };
      postMessage({
        type: 'USER_ANALYTICS_UPDATED',
        id
      });
      break;
      
    case 'GET_PROCESSING_STATE':
      postMessage({
        type: 'PROCESSING_STATE',
        id,
        data: {
          isProcessing,
          queueLength: processingQueue.length,
          userAnalytics
        }
      });
      break;
      
    case 'CLEAR_CACHE':
      clearAnalysisCache(id);
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
});

/**
 * Handle analysis API requests with intelligent caching
 */
async function handleAnalysisRequest(request) {
  const url = new URL(request.url);
  const cacheKey = generateCacheKey(url.pathname, url.search);
  
  try {
    // Check cache first
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(cacheKey);
    
    if (cachedResponse && !isExpired(cachedResponse)) {
      // Add cache hit header
      const response = new Response(await cachedResponse.text(), {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: {
          ...Object.fromEntries(cachedResponse.headers.entries()),
          'X-Cache-Status': 'HIT',
          'X-Cache-Time': cachedResponse.headers.get('X-Cache-Time')
        }
      });
      
      console.log('📦 Analysis cache hit:', cacheKey);
      return response;
    }
    
    // Fetch from network with optimization
    const networkResponse = await fetch(request);
    
    if (!networkResponse.ok) {
      throw new Error(`Network request failed: ${networkResponse.status}`);
    }
    
    // Clone for processing
    const responseToProcess = networkResponse.clone();
    const responseToCache = networkResponse.clone();
    
    // Process response with SIMD optimization if applicable
    const processedResponse = await optimizeAnalysisResponse(
      responseToProcess, 
      url.pathname
    );
    
    // Cache the optimized response
    const cacheHeaders = new Headers(processedResponse.headers);
    cacheHeaders.set('X-Cache-Time', Date.now().toString());
    cacheHeaders.set('X-Cache-Status', 'MISS');
    
    const cacheResponse = new Response(await processedResponse.text(), {
      status: processedResponse.status,
      statusText: processedResponse.statusText,
      headers: cacheHeaders
    });
    
    await cache.put(cacheKey, cacheResponse.clone());
    
    return cacheResponse;
    
  } catch (error) {
    console.error('Analysis request failed:', error);
    
    // Try to return stale cache
    const cache = await caches.open(CACHE_NAME);
    const staleResponse = await cache.match(cacheKey);
    
    if (staleResponse) {
      console.log('📦 Returning stale cache due to error:', cacheKey);
      return staleResponse;
    }
    
    return new Response(JSON.stringify({
      error: 'Analysis request failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Optimize analysis response with SIMD processing
 */
async function optimizeAnalysisResponse(response, pathname) {
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    try {
      const data = await response.json();
      
      // Optimize embeddings with SIMD operations
      if (data.embedding && Array.isArray(data.embedding)) {
        data.embedding = simdOptimizeEmbedding(data.embedding);
        data._worker_optimized = {
          simd_processed: true,
          optimization_type: 'embedding_compression',
          timestamp: Date.now()
        };
      }
      
      // Optimize batch results
      if (data.results && Array.isArray(data.results)) {
        data.results = data.results.map(result => {
          if (result.embedding) {
            result.embedding = simdOptimizeEmbedding(result.embedding);
          }
          return result;
        });
        
        data._worker_optimized = {
          simd_processed: true,
          optimization_type: 'batch_embedding_compression',
          batch_size: data.results.length,
          timestamp: Date.now()
        };
      }
      
      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
      
    } catch (error) {
      console.warn('Failed to optimize analysis response:', error);
      return response;
    }
  }
  
  return response;
}

/**
 * SIMD-style embedding optimization
 */
function simdOptimizeEmbedding(embedding) {
  if (!Array.isArray(embedding) || embedding.length === 0) return embedding;
  
  const optimized = new Float32Array(embedding);
  const length = optimized.length;
  
  // Process in chunks of 4 for SIMD-style operations
  for (let i = 0; i < length; i += 4) {
    // Load 4 values
    const a = optimized[i] || 0;
    const b = optimized[i + 1] || 0;
    const c = optimized[i + 2] || 0;
    const d = optimized[i + 3] || 0;
    
    // Apply normalization and quantization
    const magnitude = Math.sqrt(a * a + b * b + c * c + d * d);
    if (magnitude > 0) {
      optimized[i] = a / magnitude;
      optimized[i + 1] = b / magnitude;
      optimized[i + 2] = c / magnitude;
      optimized[i + 3] = d / magnitude;
    }
    
    // Apply quantization to reduce memory footprint
    optimized[i] = Math.round(optimized[i] * 127) / 127;
    optimized[i + 1] = Math.round(optimized[i + 1] * 127) / 127;
    optimized[i + 2] = Math.round(optimized[i + 2] * 127) / 127;
    optimized[i + 3] = Math.round(optimized[i + 3] * 127) / 127;
  }
  
  return Array.from(optimized);
}

/**
 * Handle page analysis request
 */
async function handlePageAnalysis(data, messageId) {
  if (isProcessing) {
    processingQueue.push({ type: 'ANALYZE_PAGE', data, messageId });
    return;
  }
  
  isProcessing = true;
  
  try {
    console.log('🔍 Worker processing page analysis...');
    
    const { elements, userContext } = data;
    
    // Update user analytics
    userAnalytics = { ...userAnalytics, ...userContext };
    
    // Create semantic chunks with SIMD optimization
    const chunks = createOptimizedChunks(elements);
    
    // Process chunks in batches to avoid overwhelming
    const processedChunks = await processBatchChunks(chunks);
    
    // Prepare QLoRA training data
    const qloraData = prepareDistilledQLoRAData(processedChunks);
    
    postMessage({
      type: 'PAGE_ANALYSIS_COMPLETE',
      id: messageId,
      data: {
        chunks: processedChunks,
        qloraData,
        processingTime: performance.now(),
        optimizations: ['simd_chunking', 'batch_processing', 'qlora_distillation']
      }
    });
    
  } catch (error) {
    console.error('Page analysis failed:', error);
    postMessage({
      type: 'PAGE_ANALYSIS_ERROR',
      id: messageId,
      error: error.message
    });
  } finally {
    isProcessing = false;
    processNextInQueue();
  }
}

/**
 * Handle chunk processing with memory optimization
 */
async function handleChunkProcessing(data, messageId) {
  try {
    const { chunks, options = {} } = data;
    
    console.log(`📊 Worker processing ${chunks.length} chunks...`);
    
    // Process chunks with SIMD memory optimization
    const processedChunks = await Promise.all(
      chunks.map(chunk => processChunkWithSIMD(chunk, options))
    );
    
    postMessage({
      type: 'CHUNKS_PROCESSED',
      id: messageId,
      data: {
        processedChunks,
        compressionRatio: calculateCompressionRatio(chunks, processedChunks),
        memoryOptimized: true
      }
    });
    
  } catch (error) {
    console.error('Chunk processing failed:', error);
    postMessage({
      type: 'CHUNK_PROCESSING_ERROR',
      id: messageId,
      error: error.message
    });
  }
}

/**
 * Create optimized chunks with SIMD processing
 */
function createOptimizedChunks(elements) {
  const chunks = [];
  const CHUNK_SIZE = 3000; // Optimal for embeddings
  
  let currentChunk = {
    content: '',
    elements: [],
    importance: 0,
    semanticType: 'general'
  };
  
  elements.forEach(element => {
    const content = `${element.tagName}: ${element.textContent}\n`;
    const importance = calculateElementImportance(element);
    
    if (currentChunk.content.length + content.length > CHUNK_SIZE && currentChunk.content.length > 0) {
      // Finalize current chunk
      currentChunk.importance = currentChunk.importance / currentChunk.elements.length;
      currentChunk.semanticType = determineSemantic(currentChunk.content);
      chunks.push(currentChunk);
      
      // Start new chunk
      currentChunk = {
        content: content,
        elements: [element],
        importance,
        semanticType: 'general'
      };
    } else {
      currentChunk.content += content;
      currentChunk.elements.push(element);
      currentChunk.importance += importance;
    }
  });
  
  // Add final chunk
  if (currentChunk.content.length > 0) {
    currentChunk.importance = currentChunk.importance / currentChunk.elements.length;
    currentChunk.semanticType = determineSemantic(currentChunk.content);
    chunks.push(currentChunk);
  }
  
  return chunks;
}

/**
 * Process batches of chunks efficiently
 */
async function processBatchChunks(chunks) {
  const BATCH_SIZE = 5; // Process 5 chunks at a time
  const processedChunks = [];
  
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    
    const batchPromises = batch.map(chunk => processChunkWithSIMD(chunk));
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        processedChunks.push(result.value);
      }
    });
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  return processedChunks;
}

/**
 * Process individual chunk with SIMD optimization
 */
function processChunkWithSIMD(chunk, options = {}) {
  return new Promise(resolve => {
    // Simulate SIMD processing with optimized memory access
    const processedChunk = {
      ...chunk,
      id: generateChunkId(chunk.content),
      optimized: true,
      memoryFootprint: estimateMemoryFootprint(chunk),
      processingTime: performance.now()
    };
    
    // Add user context weighting
    if (userAnalytics.caseContext) {
      processedChunk.relevanceScore = calculateRelevanceScore(
        chunk, 
        userAnalytics.caseContext
      );
    }
    
    resolve(processedChunk);
  });
}

/**
 * Prepare distilled QLoRA training data
 */
function prepareDistilledQLoRAData(processedChunks) {
  // Filter and prioritize chunks for QLoRA training
  const trainingChunks = processedChunks
    .filter(chunk => chunk.importance > 0.3) // Only meaningful content
    .sort((a, b) => b.relevanceScore - a.relevanceScore) // Sort by relevance
    .slice(0, 50) // Limit to top 50 chunks to keep training data manageable
    .map(chunk => ({
      input_text: chunk.content.slice(0, 2000), // Truncate for efficiency
      importance_weight: chunk.importance,
      relevance_score: chunk.relevanceScore || 0,
      semantic_type: chunk.semanticType,
      user_context: {
        typing_patterns: userAnalytics.typingPatterns,
        focus_areas: userAnalytics.interactionPatterns?.focusAreas || [],
        case_context: userAnalytics.caseContext
      },
      created_at: Date.now()
    }));
  
  return {
    chunks: trainingChunks,
    metadata: {
      total_chunks: processedChunks.length,
      selected_chunks: trainingChunks.length,
      distillation_ratio: trainingChunks.length / processedChunks.length,
      user_analytics: userAnalytics,
      ready_for_training: true
    }
  };
}

// Utility functions

function generateCacheKey(pathname, search) {
  const hash = btoa(encodeURIComponent(pathname + search))
    .replace(/[+/=]/g, char => ({ '+': '-', '/': '_', '=': '' }[char] || char))
    .slice(0, 32);
  return `analysis_${hash}`;
}

function isExpired(response) {
  const cacheTime = response.headers.get('X-Cache-Time');
  if (!cacheTime) return false;
  
  const maxAge = 10 * 60 * 1000; // 10 minutes
  const age = Date.now() - parseInt(cacheTime);
  
  return age > maxAge;
}

function calculateElementImportance(element) {
  const tagName = element.tagName?.toLowerCase();
  const textLength = element.textContent?.length || 0;
  const interactionCount = element.metadata?.interactionCount || 0;
  
  let importance = 0;
  
  // Tag-based importance
  const tagWeights = {
    'h1': 1.0, 'h2': 0.8, 'h3': 0.6,
    'button': 0.7, 'a': 0.5, 'input': 0.6,
    'p': 0.3, 'span': 0.2, 'div': 0.1
  };
  
  importance += tagWeights[tagName] || 0.1;
  
  // Length-based importance
  if (textLength > 100) importance += 0.3;
  else if (textLength > 20) importance += 0.1;
  
  // Interaction-based importance
  importance += Math.min(interactionCount * 0.1, 0.5);
  
  return Math.min(importance, 1.0);
}

function determineSemantic(content) {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('contract') || lowerContent.includes('agreement')) {
    return 'legal_document';
  }
  if (lowerContent.includes('case') || lowerContent.includes('court')) {
    return 'legal_case';
  }
  if (lowerContent.includes('evidence') || lowerContent.includes('exhibit')) {
    return 'evidence';
  }
  if (lowerContent.includes('form') || lowerContent.includes('input')) {
    return 'data_entry';
  }
  
  return 'general_content';
}

function calculateRelevanceScore(chunk, caseContext) {
  let score = 0;
  const content = chunk.content.toLowerCase();
  
  // Check relevance to active cases
  if (caseContext.activeCases) {
    caseContext.activeCases.forEach(caseName => {
      if (content.includes(caseName.toLowerCase())) {
        score += 0.5;
      }
    });
  }
  
  // Check relevance to current task
  if (caseContext.currentTask) {
    const taskWords = caseContext.currentTask.toLowerCase().split(' ');
    taskWords.forEach(word => {
      if (word.length > 3 && content.includes(word)) {
        score += 0.2;
      }
    });
  }
  
  // Check relevance to relevant documents
  if (caseContext.relevantDocuments) {
    caseContext.relevantDocuments.forEach(docName => {
      if (content.includes(docName.toLowerCase())) {
        score += 0.3;
      }
    });
  }
  
  return Math.min(score, 1.0);
}

function generateChunkId(content) {
  // Simple hash function for chunk ID
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `chunk_${Math.abs(hash)}`;
}

function estimateMemoryFootprint(chunk) {
  return chunk.content.length * 2 + (chunk.elements?.length || 0) * 100;
}

function calculateCompressionRatio(original, processed) {
  const originalSize = JSON.stringify(original).length;
  const processedSize = JSON.stringify(processed).length;
  return originalSize / processedSize;
}

function processNextInQueue() {
  if (processingQueue.length > 0 && !isProcessing) {
    const next = processingQueue.shift();
    if (next.type === 'ANALYZE_PAGE') {
      handlePageAnalysis(next.data, next.messageId);
    }
  }
}

async function clearAnalysisCache(messageId) {
  try {
    await caches.delete(CACHE_NAME);
    postMessage({
      type: 'CACHE_CLEARED',
      id: messageId,
      data: { success: true }
    });
  } catch (error) {
    postMessage({
      type: 'CACHE_CLEARED',
      id: messageId,
      data: { success: false, error: error.message }
    });
  }
}

console.log('🚀 Intelligent Web Worker fully loaded');