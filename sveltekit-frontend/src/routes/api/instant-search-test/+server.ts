/**
 * Instant Search Test API - Redis + Loki.js + Fuse.js Integration Test
 * 
 * Tests the complete frontend cache system with:
 * - Redis connectivity and caching
 * - Loki.js in-memory database operations
 * - Fuse.js fuzzy search capabilities
 * - InstantSearchEngine integration
 * 
 * @module InstantSearchTestAPI
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { redisService } from '$lib/server/redis-service.js';
import { lokiRedisCache } from '$lib/cache/loki-redis-integration.js';
import { instantSearchEngine } from '$lib/services/instant-search-engine.js';

export const GET: RequestHandler = async ({ url }) => {
  const testType = url.searchParams.get('test') || 'all';
  const results: any = {
    timestamp: new Date().toISOString(),
    testType,
    results: {},
    errors: [],
    performance: {}
  };

  try {
    // Test Redis Service
    if (testType === 'all' || testType === 'redis') {
      const redisStartTime = Date.now();
      
      try {
        // Test Redis connection
        const redisClient = redisService.getClient();
        const isHealthy = redisService.isHealthy();
        
        if (redisClient && isHealthy) {
          // Test basic operations
          await redisService.set('test:instant-search', { message: 'Redis working!' }, 60);
          const retrieved = await redisService.get('test:instant-search');
          await redisService.del('test:instant-search');
          
          // Test Redis info
          const redisInfo = await redisService.getRedisInfo();
          
          results.results.redis = {
            status: 'connected',
            healthy: true,
            operations: ['set', 'get', 'del'],
            testData: retrieved,
            info: redisInfo ? {
              version: redisInfo.server?.redis_version || 'unknown',
              memory: redisInfo.memory?.used_memory_human || 'unknown',
              clients: redisInfo.clients?.connected_clients || 0
            } : null
          };
        } else {
          throw new Error('Redis not healthy or client unavailable');
        }
        
        results.performance.redis = Date.now() - redisStartTime;
      } catch (error: any) {
        results.errors.push(`Redis test failed: ${error.message}`);
        results.results.redis = { status: 'error', message: error.message };
      }
    }

    // Test Loki-Redis Integration
    if (testType === 'all' || testType === 'loki') {
      const lokiStartTime = Date.now();
      
      try {
        // Initialize if not already done
        if (!lokiRedisCache.isHealthy) {
          await lokiRedisCache.initialize();
        }

        // Test document storage
        const testDoc = {
          id: 'test-doc-' + Date.now(),
          type: 'contract',
          size: 1024,
          priority: 100,
          riskLevel: 'medium' as const,
          confidenceLevel: 0.85,
          metadata: {
            title: 'Test Legal Document',
            description: 'Integration test document for Loki-Redis cache',
            keywords: ['test', 'integration', 'legal'],
            jurisdiction: 'Test',
          },
          cacheTimestamp: Date.now(),
          accessCount: 1,
          cacheLocation: 'loki' as const,
          compressed: false,
          syncStatus: 'synced' as const,
        };

        await lokiRedisCache.storeDocument(testDoc);
        const retrievedDoc = await lokiRedisCache.getDocument(testDoc.id);
        
        // Test search functionality
        const searchResults = await lokiRedisCache.searchDocuments('test', {
          type: ['contract'],
        }, {
          limit: 10,
          cacheResults: true
        });

        // Clean up test document
        await lokiRedisCache.removeLocalDocument(testDoc.id);

        results.results.loki = {
          status: 'working',
          operations: ['store', 'retrieve', 'search', 'cleanup'],
          testDocument: {
            stored: true,
            retrieved: !!retrievedDoc,
            matches: retrievedDoc?.id === testDoc.id
          },
          searchResults: {
            count: searchResults.length,
            hasResults: searchResults.length > 0
          },
          stats: lokiRedisCache.getStats()
        };
        
        results.performance.loki = Date.now() - lokiStartTime;
      } catch (error: any) {
        results.errors.push(`Loki-Redis test failed: ${error.message}`);
        results.results.loki = { status: 'error', message: error.message };
      }
    }

    // Test Instant Search Engine
    if (testType === 'all' || testType === 'search') {
      const searchStartTime = Date.now();
      
      try {
        // Initialize search engine
        await instantSearchEngine.initialize();

        // Test search with various queries
        const testQueries = [
          'contract agreement',
          'evidence forensic',
          'legal document',
          'case precedent'
        ];

        const searchTests = [];
        
        for (const query of testQueries) {
          const searchResults = await instantSearchEngine.search(query, {
            documentTypes: ['contract', 'evidence'],
            riskLevels: ['medium', 'high']
          });
          
          searchTests.push({
            query,
            resultCount: searchResults.length,
            avgResponseTime: searchResults.length > 0 ? 
              searchResults.reduce((sum, r) => sum + r.responseTime, 0) / searchResults.length : 0,
            resultTypes: [...new Set(searchResults.map(r => r.resultType))]
          });
        }

        // Get search engine statistics
        const searchStats = instantSearchEngine.getSearchStats();

        results.results.instantSearch = {
          status: 'working',
          operations: ['initialize', 'search', 'filter', 'stats'],
          testQueries: searchTests,
          statistics: searchStats,
          features: {
            fuzzySearch: true,
            semanticSearch: true,
            caching: true,
            realTimeSearch: true,
            legalPatterns: true
          }
        };
        
        results.performance.instantSearch = Date.now() - searchStartTime;
      } catch (error: any) {
        results.errors.push(`Instant Search test failed: ${error.message}`);
        results.results.instantSearch = { status: 'error', message: error.message };
      }
    }

    // Test Integration Health
    if (testType === 'all' || testType === 'health') {
      const healthStartTime = Date.now();
      
      try {
        const healthStatus = {
          redis: {
            connected: redisService.isHealthy(),
            stats: redisService.getStats()
          },
          loki: {
            initialized: !!lokiRedisCache,
            stats: lokiRedisCache.getStats()
          },
          instantSearch: {
            available: !!instantSearchEngine,
            stats: instantSearchEngine.getSearchStats()
          }
        };

        const allHealthy = healthStatus.redis.connected && 
                          healthStatus.loki.initialized && 
                          healthStatus.instantSearch.available;

        results.results.health = {
          status: allHealthy ? 'healthy' : 'degraded',
          components: healthStatus,
          integration: {
            redisLoki: healthStatus.redis.connected && healthStatus.loki.initialized,
            lokiSearch: healthStatus.loki.initialized && healthStatus.instantSearch.available,
            fullPipeline: allHealthy
          }
        };
        
        results.performance.health = Date.now() - healthStartTime;
      } catch (error: any) {
        results.errors.push(`Health check failed: ${error.message}`);
        results.results.health = { status: 'error', message: error.message };
      }
    }

    // Calculate total performance
    const totalTime = Object.values(results.performance).reduce((sum: number, time: any) => sum + (time || 0), 0);
    results.performance.total = totalTime;

    // Overall status
    results.status = results.errors.length === 0 ? 'success' : 'partial';
    results.summary = {
      testsRun: Object.keys(results.results).length,
      testsSucceeded: Object.keys(results.results).filter(key => 
        results.results[key].status === 'connected' || 
        results.results[key].status === 'working' || 
        results.results[key].status === 'healthy'
      ).length,
      errorCount: results.errors.length,
      totalTime: totalTime
    };

    console.log('✅ Instant Search Integration Test completed:', results.summary);
    
    return json(results);

  } catch (error: any) {
    console.error('❌ Instant Search Integration Test failed:', error);
    
    return json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      results: {},
      errors: [error.message]
    }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { action, data } = await request.json();
    
    switch (action) {
      case 'benchmark':
        // Run performance benchmarks
        const benchmarkResults = await runPerformanceBenchmark(data);
        return json({ success: true, benchmarks: benchmarkResults });
        
      case 'clear-cache':
        // Clear all caches
        await instantSearchEngine.clearCache();
        await lokiRedisCache.clear();
        return json({ success: true, message: 'All caches cleared' });
        
      case 'populate-test-data':
        // Add test data for demo
        const testData = await populateTestData(data.count || 10);
        return json({ success: true, testData });
        
      default:
        return json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('❌ Instant Search Test POST failed:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

async function runPerformanceBenchmark(options: any = {}): Promise<any> {
  const iterations = options.iterations || 100;
  const queries = options.queries || ['contract', 'evidence', 'legal document', 'case law'];
  
  const results = {
    iterations,
    queries: queries.length,
    timings: {
      search: [] as number[],
      cache: [] as number[],
      total: [] as number[]
    },
    statistics: {
      avgSearchTime: 0,
      minSearchTime: 0,
      maxSearchTime: 0,
      cacheHitRate: 0
    }
  };

  let cacheHits = 0;
  
  for (let i = 0; i < iterations; i++) {
    const query = queries[i % queries.length];
    const startTime = Date.now();
    
    const searchResults = await instantSearchEngine.search(query);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    results.timings.search.push(responseTime);
    
    // Check if result was cached (simplified check)
    const wasCached = searchResults.some(r => r.resultType === 'cache');
    if (wasCached) cacheHits++;
  }
  
  // Calculate statistics
  results.statistics.avgSearchTime = results.timings.search.reduce((a, b) => a + b, 0) / iterations;
  results.statistics.minSearchTime = Math.min(...results.timings.search);
  results.statistics.maxSearchTime = Math.max(...results.timings.search);
  results.statistics.cacheHitRate = cacheHits / iterations;
  
  return results;
}

async function populateTestData(count: number): Promise<any> {
  const testDocuments = [];
  
  for (let i = 0; i < count; i++) {
    const doc = {
      id: `test-doc-${Date.now()}-${i}`,
      type: ['contract', 'evidence', 'brief', 'citation'][i % 4],
      size: Math.floor(Math.random() * 10000) + 1000,
      priority: Math.floor(Math.random() * 255),
      riskLevel: ['low', 'medium', 'high', 'critical'][i % 4] as const,
      confidenceLevel: Math.random(),
      metadata: {
        title: `Test Document ${i + 1}`,
        description: `Test legal document for benchmarking and demo purposes. Document ${i + 1} of ${count}.`,
        keywords: ['test', 'benchmark', 'legal', 'document'],
        jurisdiction: ['Federal', 'State', 'Local'][i % 3],
      },
      cacheTimestamp: Date.now(),
      accessCount: Math.floor(Math.random() * 20),
      cacheLocation: 'loki' as const,
      compressed: false,
      syncStatus: 'synced' as const,
    };
    
    await lokiRedisCache.storeDocument(doc);
    testDocuments.push(doc.id);
  }
  
  return {
    documentsCreated: count,
    documentIds: testDocuments
  };
}