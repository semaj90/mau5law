import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { dbPool } from '$lib/server/database-pool-service';
import { embeddingCache } from '$lib/server/embedding-cache-service';
import { redisService } from '$lib/server/redis-service';

export const GET: RequestHandler = async () => {
  try {
    // Get comprehensive cache and connection statistics
    const [
      cacheStats,
      dbStats,
      dbHealthCheck,
      redisConnected
    ] = await Promise.all([
      embeddingCache.getStats(),
      dbPool.getStats(),
      dbPool.healthCheck(),
      Promise.resolve(redisService.isHealthy())
    ]);

    // Calculate cache efficiency
    const embeddingHitRate = cacheStats.embeddings.hits + cacheStats.embeddings.misses > 0 ?
      (cacheStats.embeddings.hits / (cacheStats.embeddings.hits + cacheStats.embeddings.misses) * 100).toFixed(2) :
      '0.00';

    const queryHitRate = cacheStats.queries.hits + cacheStats.queries.misses > 0 ?
      (cacheStats.queries.hits / (cacheStats.queries.hits + cacheStats.queries.misses) * 100).toFixed(2) :
      '0.00';

    const response = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      services: {
        redis: {
          connected: redisConnected,
          status: redisConnected ? 'connected' : 'disconnected'
        },
        database: {
          pools: dbStats.totalPools,
          drizzleInstances: dbStats.totalDrizzleInstances,
          health: dbHealthCheck,
          allHealthy: Object.values(dbHealthCheck).every(h => h)
        }
      },
      cache: {
        embeddings: {
          ...cacheStats.embeddings,
          hitRate: `${embeddingHitRate}%`,
          efficiency: embeddingHitRate > 70 ? 'excellent' : 
                     embeddingHitRate > 50 ? 'good' : 
                     embeddingHitRate > 30 ? 'fair' : 'poor'
        },
        queries: {
          ...cacheStats.queries,
          hitRate: `${queryHitRate}%`,
          efficiency: queryHitRate > 70 ? 'excellent' : 
                     queryHitRate > 50 ? 'good' : 
                     queryHitRate > 30 ? 'fair' : 'poor'
        },
        sessions: cacheStats.sessions
      },
      performance: {
        embedding_cache_efficiency: embeddingHitRate,
        query_cache_efficiency: queryHitRate,
        total_requests: cacheStats.embeddings.hits + cacheStats.embeddings.misses + 
                       cacheStats.queries.hits + cacheStats.queries.misses,
        cache_size_total: cacheStats.embeddings.size + cacheStats.queries.size
      },
      recommendations: generateRecommendations(cacheStats, dbStats, redisConnected)
    };

    return json(response);
  } catch (error) {
    console.error('Cache stats error:', error);
    return json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: 'Failed to retrieve cache statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

function generateRecommendations(cacheStats: any, dbStats: any, redisConnected: boolean): string[] {
  const recommendations: string[] = [];

  if (!redisConnected) {
    recommendations.push('🔴 Redis is not connected - caching is disabled');
  }

  const embeddingHitRate = cacheStats.embeddings.hits + cacheStats.embeddings.misses > 0 ?
    (cacheStats.embeddings.hits / (cacheStats.embeddings.hits + cacheStats.embeddings.misses) * 100) : 0;

  const queryHitRate = cacheStats.queries.hits + cacheStats.queries.misses > 0 ?
    (cacheStats.queries.hits / (cacheStats.queries.hits + cacheStats.queries.misses) * 100) : 0;

  if (embeddingHitRate < 30) {
    recommendations.push('⚠️ Low embedding cache hit rate - consider increasing TTL or checking cache keys');
  } else if (embeddingHitRate > 80) {
    recommendations.push('✅ Excellent embedding cache performance');
  }

  if (queryHitRate < 30) {
    recommendations.push('⚠️ Low query cache hit rate - review query patterns and TTL settings');
  } else if (queryHitRate > 80) {
    recommendations.push('✅ Excellent query cache performance');
  }

  if (cacheStats.embeddings.size > 1000) {
    recommendations.push('📊 Large embedding cache - monitor memory usage');
  }

  if (dbStats.totalPools > 5) {
    recommendations.push('🔧 Many database pools active - consider connection consolidation');
  } else if (dbStats.totalPools === 0) {
    recommendations.push('⚠️ No active database pools');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All systems performing optimally');
  }

  return recommendations;
}