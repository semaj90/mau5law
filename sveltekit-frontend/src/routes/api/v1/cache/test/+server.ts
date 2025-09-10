/**
 * SSR Cache Test API - Verify cache system functionality
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { ssrLegalAPICache } from '$lib/cache/ssr-legal-api-cache.js';
import { parallelCacheOrchestrator } from '$lib/cache/parallel-cache-orchestrator.js';

export const GET: RequestHandler = async ({ url, locals }) => {
  const testType = url.searchParams.get('test') || 'basic';
  const userId = locals?.user?.id || 'test-user';

  try {
    switch (testType) {
      case 'basic':
        return await testBasicCaching();
      
      case 'parallel':
        return await testParallelCaching();
      
      case 'rag':
        return await testRAGCaching();
      
      case 'quantized':
        return await testQuantizedCaching();
      
      case 'stats':
        return await getCacheStats();
      
      case 'legal-api':
        return await testLegalAPIIntegration(userId);
      
      default:
        return json({ error: 'Invalid test type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Cache test failed:', error);
    return json({ 
      success: false, 
      error: error?.message || 'Unknown error',
      test: testType 
    }, { status: 500 });
  }
};

async function testBasicCaching() {
  const testKey = `test:basic:${Date.now()}`;
  const testData = { 
    message: 'Hello from cache!', 
    timestamp: new Date().toISOString(),
    data: Array.from({ length: 100 }, (_, i) => ({ id: i, value: `item-${i}` }))
  };

  // Store in cache
  await parallelCacheOrchestrator.storeParallel(testKey, testData, {
    tier: 'all',
    ttl: 60000, // 1 minute
    priority: 'normal'
  });

  // Retrieve from cache
  const result = await parallelCacheOrchestrator.executeParallel({
    id: 'basic-test',
    type: 'hybrid',
    priority: 'normal',
    keys: [testKey]
  });

  return json({
    success: true,
    test: 'basic',
    cached: result.success && result.cacheResults.length > 0,
    hitRate: result.metrics.cacheHitRate,
    totalLatency: result.metrics.totalLatency,
    cacheSource: result.cacheResults[0]?.source,
    data: result.cacheResults[0]?.data
  });
}

async function testParallelCaching() {
  const keys = Array.from({ length: 10 }, (_, i) => `test:parallel:${i}:${Date.now()}`);
  const testData = keys.map((key, i) => ({
    key,
    data: { 
      id: i, 
      name: `Test Item ${i}`,
      legal_data: `Legal document content for item ${i}`,
      timestamp: new Date().toISOString()
    }
  }));

  // Store test data in parallel
  await Promise.all(testData.map(({ key, data }) =>
    parallelCacheOrchestrator.storeParallel(key, data, {
      tier: 'all',
      priority: 'high'
    })
  ));

  // Retrieve in parallel
  const startTime = performance.now();
  const result = await parallelCacheOrchestrator.executeParallel({
    id: 'parallel-test',
    type: 'hybrid',
    priority: 'high',
    keys
  });
  const parallelTime = performance.now() - startTime;

  // Compare with sequential retrieval
  const sequentialStart = performance.now();
  const sequentialResults = [];
  for (const key of keys) {
    const seqResult = await parallelCacheOrchestrator.executeParallel({
      id: `seq-${key}`,
      type: 'hybrid',
      priority: 'normal',
      keys: [key]
    });
    sequentialResults.push(seqResult);
  }
  const sequentialTime = performance.now() - sequentialStart;

  return json({
    success: true,
    test: 'parallel',
    results: {
      parallel: {
        time: parallelTime,
        hitRate: result.metrics.cacheHitRate,
        hits: result.cacheResults.length,
        totalLatency: result.metrics.totalLatency
      },
      sequential: {
        time: sequentialTime,
        avgLatency: sequentialResults.reduce((sum, r) => sum + r.metrics.totalLatency, 0) / sequentialResults.length
      },
      speedup: `${(sequentialTime / parallelTime).toFixed(2)}x faster`
    }
  });
}

async function testRAGCaching() {
  const ragData = {
    query: "Find legal precedents for Fourth Amendment violations",
    embeddings: new Array(768).fill(0).map(() => Math.random()),
    results: [
      {
        case: "State v. Johnson (2023)",
        relevance: 0.89,
        summary: "Fourth Amendment search and seizure violation"
      },
      {
        case: "People v. Davis (2022)", 
        relevance: 0.76,
        summary: "Unreasonable search of vehicle"
      }
    ],
    ragContext: [
      { type: 'precedent', title: 'Miranda v. Arizona', relevance: 0.95 },
      { type: 'statute', title: 'Fourth Amendment', relevance: 0.88 }
    ]
  };

  // Test RAG-specific caching
  const result = await ssrLegalAPICache.cacheSet(
    '/api/v1/rag/search',
    { query: ragData.query },
    { success: true, data: ragData },
    {
      ttl: 300000, // 5 minutes
      ragContext: ragData.ragContext,
      userId: 'rag-test-user'
    }
  );

  // Retrieve RAG data
  const cached = await ssrLegalAPICache.cacheGet(
    '/api/v1/rag/search',
    { query: ragData.query },
    { ragContext: true, userId: 'rag-test-user' }
  );

  return json({
    success: true,
    test: 'rag',
    cached: cached !== null,
    ragContextPresent: cached?.data?.ragContext ? true : false,
    embeddingsDimension: cached?.data?.embeddings?.length || 0,
    precedentsFound: cached?.data?.results?.length || 0
  });
}

async function testQuantizedCaching() {
  // Large response to test quantization
  const largeResponse = {
    success: true,
    data: {
      cases: Array.from({ length: 100 }, (_, i) => ({
        id: `case-${i}`,
        title: `Legal Case ${i} - This is a very long title that contains many words and details about the legal proceedings and various aspects of the case that need to be documented thoroughly`,
        description: `This is a comprehensive description of legal case number ${i} that includes extensive details about the circumstances, parties involved, legal arguments, evidence presented, and various other aspects that make this a complex legal matter requiring detailed analysis and consideration of multiple factors and legal precedents.`,
        metadata: {
          complexity: Math.random(),
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
          dateCreated: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          tags: ['litigation', 'contract', 'corporate', 'criminal', 'civil'].slice(0, Math.floor(Math.random() * 3) + 1)
        }
      }))
    },
    meta: {
      userId: 'quantize-test',
      timestamp: new Date().toISOString(),
      processingTime: 234.56,
      aiModel: 'gemma-3-legal'
    }
  };

  const originalSize = JSON.stringify(largeResponse).length;

  // Cache with quantization
  await ssrLegalAPICache.cacheSet(
    '/api/v1/cases/bulk',
    { page: 1, limit: 100 },
    largeResponse,
    {
      quantize: true,
      userId: 'quantize-test'
    }
  );

  // Retrieve quantized data
  const quantized = await ssrLegalAPICache.cacheGet(
    '/api/v1/cases/bulk',
    { page: 1, limit: 100 },
    { userId: 'quantize-test' }
  );

  const quantizedSize = JSON.stringify(quantized).length;
  const compressionRatio = originalSize / quantizedSize;

  return json({
    success: true,
    test: 'quantized',
    originalSize: originalSize,
    quantizedSize: quantizedSize,
    compressionRatio: `${compressionRatio.toFixed(2)}x smaller`,
    compressionPercent: `${((1 - quantizedSize / originalSize) * 100).toFixed(1)}% reduction`,
    dataIntact: quantized?.data?.cases?.length === 100
  });
}

async function getCacheStats() {
  const [ssrStats, parallelStats] = await Promise.all([
    ssrLegalAPICache.getCacheStats(),
    parallelCacheOrchestrator.getPerformanceStats()
  ]);

  return json({
    success: true,
    test: 'stats',
    ssr: ssrStats,
    parallel: {
      metrics: parallelStats.currentMetrics,
      cacheStats: parallelStats.cacheStats,
      systemResources: parallelStats.systemResources
    }
  });
}

async function testLegalAPIIntegration(userId: string) {
  const testEndpoints = [
    { endpoint: '/api/v1/cases', params: { page: 1, limit: 5 } },
    { endpoint: '/api/v1/evidence', params: { caseId: 'test-case-id', page: 1 } },
    { endpoint: '/api/v1/recommendations', params: { caseId: 'test-case-id', type: 'legal_strategy' } },
    { endpoint: '/api/v1/timeline', params: { caseId: 'test-case-id', limit: 10 } }
  ];

  const results = [];

  for (const { endpoint, params } of testEndpoints) {
    try {
      const startTime = performance.now();
      
      // Try cached call first
      const response = await ssrLegalAPICache.cachedApiCall(endpoint, {
        method: 'GET',
        params,
        userId,
        ragContext: endpoint.includes('recommendations'),
        quantize: true
      });

      const responseTime = performance.now() - startTime;

      results.push({
        endpoint,
        success: true,
        responseTime: Math.round(responseTime),
        cached: response?.meta?.cached || false,
        cacheLayer: response?.meta?.cacheLayer,
        dataPresent: !!response?.data
      });

    } catch (error: any) {
      results.push({
        endpoint,
        success: false,
        error: error?.message || 'Unknown error'
      });
    }
  }

  const successfulCalls = results.filter(r => r.success).length;
  const cachedCalls = results.filter(r => r.cached).length;
  const avgResponseTime = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + (r.responseTime || 0), 0) / (successfulCalls || 1);

  return json({
    success: true,
    test: 'legal-api',
    summary: {
      totalEndpoints: testEndpoints.length,
      successfulCalls,
      cachedCalls,
      cacheHitRate: `${((cachedCalls / successfulCalls) * 100).toFixed(1)}%`,
      avgResponseTime: `${avgResponseTime.toFixed(1)}ms`
    },
    results
  });
}

// Clear cache endpoint
export const DELETE: RequestHandler = async () => {
  try {
    await parallelCacheOrchestrator.clearAll();
    
    return json({
      success: true,
      message: 'All caches cleared successfully'
    });
  } catch (error: any) {
    return json({
      success: false,
      error: error?.message || 'Unknown error'
    }, { status: 500 });
  }
};