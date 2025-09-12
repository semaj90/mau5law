/**
 * 🎮 REDIS-OPTIMIZED ENDPOINT - Mass Optimization Applied
 * 
 * Endpoint: vector-search-cached
 * Category: aggressive
 * Memory Bank: CHR_ROM
 * Priority: 170
 * Redis Type: aiSearch
 * 
 * Performance Impact:
 * - Cache Strategy: aggressive
 * - Memory Bank: CHR_ROM (Nintendo-style)
 * - Cache hits: ~2ms response time
 * - Fresh queries: Background processing for complex requests
 * 
 * Applied by Redis Mass Optimizer - Nintendo-Level AI Performance
 */

/**
 * Cached Vector Search API Endpoint
 * High-performance vector similarity search with Redis+Memory caching
 * Optimizes pgvector queries for legal document search
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pgVectorService } from '$lib/server/db/pgvector-service';
import { 
import { redisOptimized } from '$lib/middleware/redis-orchestrator-middleware';
  getVectorCache, 
  setVectorCache, 
  getEmbeddingCache, 
  setEmbeddingCache,
  getVectorCacheStats 
} from '$lib/server/vector-cache';

// POST: Cached vector similarity search
const originalPOSTHandler: RequestHandler = async ({ request }) => {
  const startTime = performance.now();
  
  try {
    const body = await request.json();
    const { 
      query, 
      queryEmbedding, 
      options = {},
      useCache = true 
    } = body;

    if (!query && !queryEmbedding) {
      return json({
        success: false,
        error: 'Either query string or queryEmbedding array is required'
      }, { status: 400 });
    }

    let embedding: number[];
    let embeddingFromCache = false;

    // Handle embedding generation/retrieval
    if (queryEmbedding && Array.isArray(queryEmbedding)) {
      embedding = queryEmbedding;
    } else if (query) {
      // Check embedding cache first
      if (useCache) {
        const cachedEmbedding = await getEmbeddingCache(query, 'nomic-embed-text');
        if (cachedEmbedding.entry) {
          embedding = cachedEmbedding.entry.embedding;
          embeddingFromCache = true;
          console.log(`[VectorSearch] Embedding cache hit (${cachedEmbedding.source})`);
        }
      }
      
      // Generate embedding if not cached
      if (!embedding!) {
        const embeddingResponse = await fetch('http://localhost:11434/api/embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'nomic-embed-text',
            prompt: query
          })
        });

        if (!embeddingResponse.ok) {
          throw new Error('Failed to generate embedding');
        }

        const embeddingData = await embeddingResponse.json();
        embedding = embeddingData.embedding;

        // Cache the embedding
        if (useCache) {
          await setEmbeddingCache(query, embedding, 'nomic-embed-text');
        }
      }
    } else {
      throw new Error('No valid query or embedding provided');
    }

    // Check vector search cache
    let searchResults;
    let searchFromCache = false;
    let cacheSource = null;

    if (useCache && query) {
      const cachedSearch = await getVectorCache(query, options);
      if (cachedSearch.entry) {
        searchResults = {
          success: true,
          results: cachedSearch.entry.results,
          metadata: {
            ...cachedSearch.entry.metadata,
            fromCache: true,
            cacheSource: cachedSearch.source
          }
        };
        searchFromCache = true;
        cacheSource = cachedSearch.source;
        console.log(`[VectorSearch] Search cache hit (${cachedSearch.source})`);
      }
    }

    // Perform vector search if not cached
    if (!searchFromCache) {
      searchResults = await pgVectorService.vectorSimilaritySearch(embedding, {
        limit: options.limit || 10,
        threshold: options.threshold || 1,
        documentType: options.documentType,
        includeContent: options.includeContent || false,
        metric: options.metric || 'cosine'
      });

      // Cache the search results
      if (useCache && searchResults.success && query) {
        await setVectorCache(
          query, 
          searchResults.results, 
          searchResults.metadata,
          options
        );
      }
    }

    const totalTime = performance.now() - startTime;

    // Enhanced response with caching metadata
    return json({
      success: searchResults.success,
      results: searchResults.results,
      metadata: {
        ...searchResults.metadata,
        query: query || '[embedding provided]',
        embeddingDimensions: embedding.length,
        totalResponseTime: `${totalTime.toFixed(2)}ms`,
        caching: {
          enabled: useCache,
          embeddingFromCache,
          searchFromCache,
          cacheSource: searchFromCache ? cacheSource : null
        }
      },
      error: searchResults.error,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    const totalTime = performance.now() - startTime;
    
    return json({
      success: false,
      error: error.message,
      responseTime: `${totalTime.toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

// GET: Cache statistics and health check
const originalGETHandler: RequestHandler = async ({ url }) => {
  const action = url.searchParams.get('action') || 'stats';

  switch (action) {
    case 'stats':
      const stats = getVectorCacheStats();
      return json({
        success: true,
        cacheStats: stats,
        timestamp: new Date().toISOString()
      });

    case 'health':
      // Test embedding generation and vector search
      try {
        const testQuery = "contract employment terms";
        const testStart = performance.now();
        
        // Test embedding cache
        const cachedEmbedding = await getEmbeddingCache(testQuery);
        
        // Test basic pgvector connection
        const connectionTest = await pgVectorService.testConnection();
        
        const testTime = performance.now() - testStart;
        
        return json({
          success: true,
          health: {
            pgvector: connectionTest.success,
            embeddingCache: !!cachedEmbedding.entry,
            redis: getVectorCacheStats().config.redisEnabled,
            responseTime: `${testTime.toFixed(2)}ms`
          },
          timestamp: new Date().toISOString()
        });
        
      } catch (error: any) {
        return json({
          success: false,
          health: {
            pgvector: false,
            error: error.message
          },
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }

    default:
      return json({
        error: 'Invalid action',
        availableActions: ['stats', 'health'],
        endpoints: {
          search: 'POST /api/ai/vector-search-cached',
          stats: 'GET /api/ai/vector-search-cached?action=stats',
          health: 'GET /api/ai/vector-search-cached?action=health'
        }
      }, { status: 400 });
  }
};

// DELETE: Clear vector cache
const originalDELETEHandler: RequestHandler = async () => {
  try {
    const { clearVectorCache } = await import('$lib/server/vector-cache');
    await clearVectorCache();
    
    return json({
      success: true,
      message: 'Vector cache cleared',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

export const POST = redisOptimized.aiSearch(originalPOSTHandler);
export const GET = redisOptimized.aiSearch(originalGETHandler);
export const DELETE = redisOptimized.aiSearch(originalDELETEHandler);