/**
 * Cached RAG API Endpoint
 * Provides cached RAG functionality with embeddinggemma and gemma3:legal-latest
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { enhancedRAGQueryWithCache } from '$lib/services/enhanced-rag-semantic-analyzer';
import { cachedRAGService } from '$lib/services/cached-rag-service';
import { enhancedCachingService } from '$lib/services/enhanced-caching-service';
import { cachingTester } from '$lib/services/test-caching-integration';
import type { RAGQuery } from '$lib/services/enhanced-rag-semantic-analyzer';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, query, documents, ...options } = body;

    switch (action) {
      case 'query':
        return await handleRAGQuery(query, options);
      
      case 'ingest':
        return await handleDocumentIngestion(documents, options);
      
      case 'test':
        return await handleCacheTest(options);
      
      case 'metrics':
        return await handleCacheMetrics();
      
      case 'warmup':
        return await handleCacheWarmup();
      
      default:
        return json({ error: 'Invalid action. Supported: query, ingest, test, metrics, warmup' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Cached RAG API error:', error);
    return json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
};

/**
 * Handle RAG query with caching
 */
async function handleRAGQuery(queryData: any, options: any) {
  try {
    if (!queryData?.query) {
      return json({ error: 'Query is required' }, { status: 400 });
    }

    console.log(`🔍 Processing cached RAG query: "${queryData.query.substring(0, 50)}..."`);

    const ragQuery: RAGQuery = {
      query: queryData.query,
      context: queryData.context,
      filters: queryData.filters || {
        confidenceThreshold: 0.7,
        legalCategories: ['CONTRACT', 'TORT', 'CONSTITUTIONAL', 'CORPORATE']
      },
      semantic: {
        useEmbeddings: queryData.semantic?.useEmbeddings ?? true,
        expandConcepts: queryData.semantic?.expandConcepts ?? true,
        includeRelated: queryData.semantic?.includeRelated ?? true
      }
    };

    const result = await enhancedRAGQueryWithCache(ragQuery);

    return json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('RAG query failed:', error);
    return json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * Handle document ingestion with caching
 */
async function handleDocumentIngestion(documents: any[], options: any) {
  try {
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return json({ error: 'Documents array is required' }, { status: 400 });
    }

    console.log(`📚 Ingesting ${documents.length} documents with caching...`);

    const results = await cachedRAGService.ingestDocuments(documents);

    const summary = {
      totalDocuments: documents.length,
      successful: results.filter(r => r.storedInPgVector).length,
      failed: results.filter(r => !r.storedInPgVector).length,
      totalChunks: results.reduce((sum, r) => sum + r.chunksProcessed, 0),
      totalEmbeddingsGenerated: results.reduce((sum, r) => sum + r.embeddingsGenerated, 0),
      totalEmbeddingsCached: results.reduce((sum, r) => sum + r.embeddingsCached, 0),
      totalProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0)
    };

    return json({
      success: true,
      data: {
        results,
        summary
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Document ingestion failed:', error);
    return json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * Handle cache testing
 */
async function handleCacheTest(options: any) {
  try {
    const testType = options.type || 'full';

    let results;
    if (testType === 'smoke') {
      const success = await cachingTester.runSmokeTest();
      results = { success, type: 'smoke' };
    } else {
      results = await cachingTester.runAllTests();
    }

    return json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Cache testing failed:', error);
    return json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * Handle cache metrics
 */
async function handleCacheMetrics() {
  try {
    const metrics = enhancedCachingService.getCacheMetrics();

    return json({
      success: true,
      data: {
        metrics,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Cache metrics failed:', error);
    return json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * Handle cache warmup
 */
async function handleCacheWarmup() {
  try {
    await cachedRAGService.warmupCacheWithLegalQueries();

    return json({
      success: true,
      data: {
        message: 'Cache warmup completed successfully',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Cache warmup failed:', error);
    return json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export const GET: RequestHandler = async ({ url }) => {
  const action = url.searchParams.get('action') || 'status';

  try {
    switch (action) {
      case 'status':
        return json({
          success: true,
          data: {
            service: 'Cached RAG API',
            status: 'active',
            features: [
              'Embedding caching with embeddinggemma',
              'Query result caching',
              'Response caching with gemma3:legal-latest',
              'Batch document ingestion',
              'Cache metrics and testing',
              'PostgreSQL pgvector integration'
            ],
            timestamp: new Date().toISOString()
          }
        });

      case 'metrics':
        return await handleCacheMetrics();

      case 'test':
        const testType = url.searchParams.get('type') || 'smoke';
        return await handleCacheTest({ type: testType });

      default:
        return json({ error: 'Invalid action for GET request' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Cached RAG API GET error:', error);
    return json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
};