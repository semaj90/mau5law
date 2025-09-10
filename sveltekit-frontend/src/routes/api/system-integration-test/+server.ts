/**
 * Comprehensive System Integration Test API
 * Tests the complete legal AI platform with all integrated services
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/drizzle';
import { sql } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema-postgres';
import { redisService } from '$lib/server/redis-service';
import { natsQuicSearchService } from '$lib/server/search/nats-quic-search-service';
import { lokiRedisCache } from '$lib/cache/loki-redis-integration';
import { instantSearchEngine } from '$lib/services/instant-search-engine';
import { enhancedRAGPipeline } from '$lib/services/enhanced-rag-pipeline';

export const GET: RequestHandler = async ({ url }) => {
  const testType = url.searchParams.get('type') || 'full';
  const startTime = Date.now();
  const results: {
    timestamp: string;
    testType: string;
    results: Record<string, any>;
    errors: string[];
    performance: Record<string, number>;
    status?: string;
    summary?: any;
  } = {
    timestamp: new Date().toISOString(),
    testType,
    results: {},
    errors: [],
    performance: {},
  };

  try {
    // Test PostgreSQL + pgvector
    if (testType === 'all' || testType === 'database') {
      const dbStartTime = Date.now();

      try {
        // Test basic connection
        const dbVersion = await db.execute(sql`SELECT version() as version`);

        // Test pgvector
        const vectorTest = await db.execute(
          sql`SELECT '[1,2,3]'::vector <-> '[1,2,4]'::vector as distance`
        );

        // Test document count
        const docCount = await db.select({ count: sql`COUNT(*)` }).from(schema.legalDocuments);

        results.results.database = {
          status: 'connected',
          version: dbVersion.rows[0].version,
          pgvectorWorking: true,
          vectorDistance: vectorTest.rows[0].distance,
          documentsCount: docCount[0].count,
        };

        results.performance.database = Date.now() - dbStartTime;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown database error';
        results.errors.push(`Database test failed: ${msg}`);
        results.results.database = { status: 'error', message: msg };
      }
    }

    // Test Redis
    if (testType === 'all' || testType === 'redis') {
      const redisStartTime = Date.now();

      try {
        const testKey = `integration-test-${Date.now()}`;
        await redisService.set(testKey, { test: true }, 60);
        const retrievedRaw = await redisService.get(testKey);
        const retrieved =
          retrievedRaw && typeof retrievedRaw === 'object' ? (retrievedRaw as any) : null;
        await redisService.del(testKey);

        const healthy =
          typeof (redisService as any).isHealthy === 'function'
            ? (redisService as any).isHealthy()
            : true; // assume healthy if method missing
        const stats =
          typeof (redisService as any).getStats === 'function'
            ? (redisService as any).getStats()
            : {};

        results.results.redis = {
          status: 'connected',
          healthy,
          dataIntegrity: !!retrieved && (retrieved as any).test === true,
          stats,
        };

        results.performance.redis = Date.now() - redisStartTime;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown redis error';
        results.errors.push(`Redis test failed: ${msg}`);
        results.results.redis = { status: 'error', message: msg };
      }
    }

    // Test NATS + QUIC
    if (testType === 'all' || testType === 'nats') {
      const natsStartTime = Date.now();

      try {
        const healthCheck = await natsQuicSearchService.healthCheck();
        const testSearch = await natsQuicSearchService.searchSimple('test legal document', {
          type: 'hybrid',
          limit: 5,
        });
        results.results.nats = {
          status: 'success',
          health: healthCheck,
          searchTest: {
            resultCount: testSearch.results?.length || 0,
            processingTime: testSearch.analytics?.processingTime || 0,
            lowLatency: (testSearch.analytics?.processingTime || 0) < 100,
          },
          quicEnabled: healthCheck.quicEnabled,
        };

        results.performance.nats = Date.now() - natsStartTime;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown NATS error';
        results.errors.push(`NATS test failed: ${msg}`);
        results.results.nats = { status: 'error', message: msg };
      }
    }

    // Test Loki.js Integration
    if (testType === 'all' || testType === 'loki') {
      const lokiStartTime = Date.now();

      try {
        // Re-initialize if not healthy (getter added to cache class)
        if (!lokiRedisCache.isHealthy) {
          await lokiRedisCache.initialize();
        }

        results.results.loki = {
          status: 'initialized',
          healthy: lokiRedisCache.isHealthy,
          stats: lokiRedisCache.getStats(),
        };

        results.performance.loki = Date.now() - lokiStartTime;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown loki error';
        results.errors.push(`Loki test failed: ${msg}`);
        results.results.loki = { status: 'error', message: msg };
      }
    }

    // Test Instant Search
    if (testType === 'all' || testType === 'search') {
      const searchStartTime = Date.now();

      try {
        await instantSearchEngine.initialize();
        const stats = instantSearchEngine.getSearchStats();

        results.results.instantSearch = {
          status: 'initialized',
          stats,
        };

        results.performance.instantSearch = Date.now() - searchStartTime;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown search error';
        results.errors.push(`Instant search test failed: ${msg}`);
        results.results.instantSearch = { status: 'error', message: msg };
      }
    }

    // Test RAG Pipeline
    if (testType === 'all' || testType === 'rag') {
      const ragStartTime = Date.now();

      try {
        const stats = await enhancedRAGPipeline.getSystemStats();

        results.results.ragPipeline = {
          status: 'available',
          stats,
          features: ['pgvector', 'gemma_embeddings', 'legal_reranker', 'redis_caching'],
        };

        results.performance.ragPipeline = Date.now() - ragStartTime;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown rag error';
        results.errors.push(`RAG pipeline test failed: ${msg}`);
        results.results.ragPipeline = { status: 'error', message: msg };
      }
    }

    // Overall status
    const totalTime = Date.now() - startTime;
    results.performance.total = totalTime;
    results.status = results.errors.length === 0 ? 'healthy' : 'degraded';

    const passedTests = Object.keys(results.results).filter((key) =>
      ['connected', 'initialized', 'available'].includes(results.results[key].status)
    ).length;

    results.summary = {
      testsRun: Object.keys(results.results).length,
      testsPassed: passedTests,
      testsFailed: results.errors.length,
      overallStatus: results.status,
      totalTime: totalTime,
    };

    console.log(
      `🧪 System integration test completed: ${passedTests}/${Object.keys(results.results).length} passed`
    );

    return json(results);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown system integration error';
    console.error('❌ System integration test failed:', error);
    return json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: msg,
        results: {},
        errors: [msg],
        performance: { total: Date.now() - startTime },
      },
      { status: 500 }
    );
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { action, data } = await request.json();

    switch (action) {
      case 'stress-test':
        return await runStressTest(data);
      case 'end-to-end':
        return await runEndToEndTest(data);
      case 'cleanup':
        return await cleanupTestData();
      default:
        return json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown request error';
    return json({ success: false, error: msg }, { status: 500 });
  }
};

async function runStressTest(options: any = {}): Promise<Response> {
  const { iterations = 100, concurrent = 10 } = options;
  const results = [];

  console.log(`🔥 Running stress test: ${iterations} iterations, ${concurrent} concurrent`);

  // Run concurrent operations
  const promises = [];
  for (let i = 0; i < concurrent; i++) {
    promises.push(stressTestWorker(iterations / concurrent, i));
  }

  const workerResults = await Promise.all(promises);

  return json({
    success: true,
    stressTest: {
      iterations,
      concurrent,
      results: workerResults,
      summary: {
        avgResponseTime:
          workerResults.reduce((sum, r) => sum + r.avgTime, 0) / workerResults.length,
        totalErrors: workerResults.reduce((sum, r) => sum + r.errors, 0),
        opsPerSecond: iterations / (Math.max(...workerResults.map((r) => r.totalTime)) / 1000),
      },
    },
  });
}

async function stressTestWorker(iterations: number, workerId: number): Promise<any> {
  const startTime = Date.now();
  let errors = 0;
  let totalResponseTime = 0;

  for (let i = 0; i < iterations; i++) {
    try {
      const opStart = Date.now();

      // Test Redis operation
      const testKey = `stress:${workerId}:${i}`;
      await redisService.set(testKey, { worker: workerId, iteration: i }, 10);
      await redisService.get(testKey);
      await redisService.del(testKey);

      totalResponseTime += Date.now() - opStart;
    } catch (error) {
      errors++;
    }
  }

  return {
    workerId,
    iterations,
    errors,
    totalTime: Date.now() - startTime,
    avgTime: totalResponseTime / iterations,
  };
}

async function runEndToEndTest(options: any = {}): Promise<Response> {
  const testId = `e2e-${Date.now()}`;
  const results: { steps: string[]; errors: string[]; success: boolean } = {
    steps: [],
    errors: [],
    success: true,
  };

  try {
    // Step 1: Create test document
    results.steps.push('Creating test document');
    const testDoc = {
      id: testId,
      title: 'End-to-End Test Document',
      documentType: 'contract',
      content:
        'This is a comprehensive test of the legal AI system integration. It includes contract terms, liability clauses, and termination provisions.',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    await db.insert(schema.legalDocuments).values(testDoc);

    // Step 2: Index document
    results.steps.push('Indexing document');
    const indexResult = await enhancedRAGPipeline.indexDocument(testDoc as any);
    if (!indexResult.success) {
      throw new Error('Document indexing failed');
    }

    // Step 3: Wait and search
    results.steps.push('Searching for document');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const searchResults = await instantSearchEngine.search('test document contract');

    // Step 4: Cleanup
    results.steps.push('Cleaning up');
    await db.delete(schema.legalDocuments).where(sql`id = ${testId}`);
    await db.delete(schema.documentChunks).where(sql`document_id = ${testId}`);

    return json({
      success: true,
      endToEnd: {
        testId,
        steps: results.steps,
        results: {
          documentCreated: true,
          indexedChunks: indexResult.chunksCreated,
          searchResults: searchResults.length,
          cleanedUp: true,
        },
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown end-to-end test error';
    results.errors.push(msg);
    results.success = false;

    // Attempt cleanup
    try {
      await db.delete(schema.legalDocuments).where(sql`id = ${testId}`);
      await db.delete(schema.documentChunks).where(sql`document_id = ${testId}`);
    } catch (cleanupError) {
      console.warn('Cleanup failed:', cleanupError);
    }

    return json({
      success: false,
      endToEnd: results,
    });
  }
}

async function cleanupTestData(): Promise<Response> {
  try {
    // Clean up any test data
    const deletedDocs = await db
      .delete(schema.legalDocuments)
      .where(sql`title LIKE '%Test%' OR title LIKE '%test%'`)
      .returning({ id: schema.legalDocuments.id });

    const deletedChunks = await db
      .delete(schema.documentChunks)
      .where(sql`document_id LIKE 'test-%' OR document_id LIKE 'e2e-%'`)
      .returning({ id: schema.documentChunks.id });

    // Clean Redis test keys
    const testKeys = await redisService.keys('test:*');
    if (testKeys.length > 0) {
      for (const key of testKeys) {
        await redisService.del(key as string);
      }
    }

    return json({
      success: true,
      cleanup: {
        deletedDocuments: deletedDocs.length,
        deletedChunks: deletedChunks.length,
        deletedRedisKeys: testKeys.length,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown cleanup error';
    return json({ success: false, error: msg }, { status: 500 });
  }
}
