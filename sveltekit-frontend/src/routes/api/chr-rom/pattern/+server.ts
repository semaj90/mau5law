/**
 * CHR-ROM Pattern API Endpoint
 * Ultra-fast access to pre-computed UI patterns
 * Target latency: <5ms for cache hits
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { chrROMCacheReader } from '$lib/services/chr-rom-cache-reader.js';
import { readBodyFastWithMetrics } from '$lib/simd/simd-json-integration.js';

// GET: Single pattern retrieval (for URL-based access)
export const GET: RequestHandler = async ({ url }) => {
  const startTime = performance.now();
  
  try {
    const docId = url.searchParams.get('docId');
    const patternType = url.searchParams.get('type');
    
    if (!docId || !patternType) {
      return json({
        success: false,
        error: 'docId and type parameters required'
      }, { status: 400 });
    }
    
    // Get pattern with zero-latency cache lookup
    const result = await chrROMCacheReader.getPattern(docId, patternType);
    
    const totalLatency = performance.now() - startTime;
    
    return json({
      success: true,
      docId,
      patternType,
      pattern: result.pattern,
      source: result.source,
      latency: {
        pattern: result.latency,
        total: totalLatency
      },
      cached: result.source === 'cache'
    }, {
      headers: {
        'Cache-Control': result.source === 'cache' ? 'public, max-age=300' : 'no-cache',
        'X-CHR-ROM-Source': result.source,
        'X-Response-Time': `${totalLatency.toFixed(2)}ms`
      }
    });
    
  } catch (error: any) {
    return json({
      success: false,
      error: error.message,
      latency: performance.now() - startTime
    }, { status: 500 });
  }
};

// POST: Batch pattern retrieval and advanced operations
export const POST: RequestHandler = async ({ request }) => {
  const startTime = performance.now();
  
  try {
    // Use SIMD JSON parsing for maximum speed
    const body = await readBodyFastWithMetrics(request);
    const { operation, data } = body;
    
    switch (operation) {
      case 'get_pattern':
        return await handleSinglePattern(data, startTime);
      
      case 'get_batch':
        return await handleBatchPatterns(data, startTime);
      
      case 'prefetch':
        return await handlePrefetch(data, startTime);
        
      case 'get_stats':
        return await handleGetStats(startTime);
        
      default:
        return json({
          success: false,
          error: `Unknown operation: ${operation}`,
          available_operations: ['get_pattern', 'get_batch', 'prefetch', 'get_stats']
        }, { status: 400 });
    }
    
  } catch (error: any) {
    return json({
      success: false,
      error: error.message,
      latency: performance.now() - startTime
    }, { status: 500 });
  }
};

/**
 * Handle single pattern retrieval
 */
async function handleSinglePattern(data: any, startTime: number) {
  const { docId, patternType, generateOnMiss = true } = data;
  
  if (!docId || !patternType) {
    return json({
      success: false,
      error: 'docId and patternType required'
    }, { status: 400 });
  }
  
  const result = await chrROMCacheReader.getPattern(docId, patternType, generateOnMiss);
  
  return json({
    success: true,
    operation: 'get_pattern',
    result: {
      docId,
      patternType,
      pattern: result.pattern,
      source: result.source,
      latency: result.latency
    },
    total_latency: performance.now() - startTime
  }, {
    headers: {
      'X-CHR-ROM-Source': result.source,
      'X-CHR-ROM-Latency': `${result.latency.toFixed(2)}ms`
    }
  });
}

/**
 * Handle batch pattern retrieval (optimized for lists/tables)
 */
async function handleBatchPatterns(data: any, startTime: number) {
  const { requests, maxConcurrency = 10 } = data;
  
  if (!Array.isArray(requests) || requests.length === 0) {
    return json({
      success: false,
      error: 'requests array required'
    }, { status: 400 });
  }
  
  // Validate request format
  const validRequests = requests.filter(req => 
    req && typeof req.docId === 'string' && typeof req.patternType === 'string'
  );
  
  if (validRequests.length === 0) {
    return json({
      success: false,
      error: 'No valid requests found. Each request needs docId and patternType.'
    }, { status: 400 });
  }
  
  // Execute batch retrieval with controlled concurrency
  const batchResults = await chrROMCacheReader.getBatchPatterns(validRequests);
  
  // Calculate batch statistics
  const cacheHits = batchResults.filter(r => r.source === 'cache').length;
  const avgLatency = batchResults.reduce((sum, r) => sum + r.latency, 0) / batchResults.length;
  
  return json({
    success: true,
    operation: 'get_batch',
    result: {
      patterns: batchResults,
      statistics: {
        total: batchResults.length,
        cacheHits,
        hitRate: cacheHits / batchResults.length,
        avgLatency: avgLatency,
        fastestResponse: Math.min(...batchResults.map(r => r.latency)),
        slowestResponse: Math.max(...batchResults.map(r => r.latency))
      }
    },
    total_latency: performance.now() - startTime
  }, {
    headers: {
      'X-CHR-ROM-Batch-Size': batchResults.length.toString(),
      'X-CHR-ROM-Hit-Rate': `${((cacheHits / batchResults.length) * 100).toFixed(1)}%`
    }
  });
}

/**
 * Handle prefetch operation
 */
async function handlePrefetch(data: any, startTime: number) {
  const { docIds, patternTypes = ['summary_icon', 'category_color', 'status_indicator'] } = data;
  
  if (!Array.isArray(docIds) || docIds.length === 0) {
    return json({
      success: false,
      error: 'docIds array required'
    }, { status: 400 });
  }
  
  // Execute prefetch (fire-and-forget style)
  chrROMCacheReader.prefetchPatterns(docIds, patternTypes);
  
  return json({
    success: true,
    operation: 'prefetch',
    result: {
      message: 'Prefetch initiated',
      docIds: docIds.length,
      patternTypes: patternTypes.length,
      totalPatterns: docIds.length * patternTypes.length
    },
    total_latency: performance.now() - startTime
  });
}

/**
 * Handle statistics request
 */
async function handleGetStats(startTime: number) {
  const stats = chrROMCacheReader.getStats();
  
  // Add some computed metrics
  const enhancedStats = {
    ...stats,
    efficiency: {
      overall: stats.performance,
      cacheEffectiveness: stats.hitRate > 0.8 ? 'excellent' : stats.hitRate > 0.6 ? 'good' : 'needs_improvement',
      latencyClass: stats.averageLatency < 5 ? 'sub_5ms' : stats.averageLatency < 20 ? 'sub_20ms' : 'needs_optimization'
    },
    recommendations: getPerformanceRecommendations(stats)
  };
  
  return json({
    success: true,
    operation: 'get_stats',
    result: enhancedStats,
    total_latency: performance.now() - startTime
  });
}

/**
 * Generate performance recommendations based on stats
 */
function getPerformanceRecommendations(stats: any): string[] {
  const recommendations = [];
  
  if (stats.hitRate < 0.7) {
    recommendations.push('Consider increasing cache warming frequency');
  }
  
  if (stats.averageLatency > 20) {
    recommendations.push('Check Redis connection performance');
  }
  
  if (stats.totalRequests > 1000 && stats.hitRate > 0.9) {
    recommendations.push('Excellent cache performance - system is optimally tuned');
  }
  
  if (stats.performance === 'poor') {
    recommendations.push('Enable CHR-ROM pre-computation service');
  }
  
  return recommendations.length > 0 ? recommendations : ['System performing well'];
}