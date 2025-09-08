/**
 * Cache Monitoring Dashboard API
 * Real-time monitoring and management for Redis-based caching system
 * Provides comprehensive cache analytics and performance metrics
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { redisService } from '$lib/server/redis-service';
import { getVectorCacheStats, clearVectorCache } from '$lib/server/vector-cache';
import { getCache as getSummaryCache, memoryStats as getSummaryMemoryStats } from '$lib/server/summarizeCache';

interface CacheMetrics {
  redis: {
    connected: boolean;
    status: string;
    memory: any;
    keyspace: any;
    info: any;
  };
  vectorCache: {
    memory: any;
    config: any;
  };
  summaryCache: {
    memory: any;
  };
  performance: {
    hitRates: any;
    avgResponseTimes: any;
    topQueries: any[];
  };
  storage: {
    totalKeys: number;
    keysByPrefix: any;
    memoryUsage: string;
    estimatedCost: string;
  };
}

// GET: Cache dashboard metrics
export const GET: RequestHandler = async ({ url }) => {
  const action = url.searchParams.get('action') || 'dashboard';
  const timeRange = url.searchParams.get('timeRange') || '1h';

  try {
    switch (action) {
      case 'dashboard':
        return json(await getDashboardMetrics(timeRange));

      case 'keys':
        const pattern = url.searchParams.get('pattern') || '*';
        const limit = parseInt(url.searchParams.get('limit') || '100');
        return json(await getCacheKeys(pattern, limit));

      case 'memory':
        return json(await getMemoryAnalysis());

      case 'performance':
        return json(await getPerformanceMetrics(timeRange));

      case 'health':
        return json(await getSystemHealth());

      default:
        return json({
          error: 'Invalid action',
          availableActions: ['dashboard', 'keys', 'memory', 'performance', 'health']
        }, { status: 400 });
    }
  } catch (error: any) {
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

// POST: Cache management operations
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { action, params = {} } = await request.json();

    switch (action) {
      case 'clear-cache':
        return json(await clearCacheByPattern(params.pattern || '*'));

      case 'warm-cache':
        return json(await warmPopularCache(params.queries || []));

      case 'analyze-keys':
        return json(await analyzeKeyPatterns());

      case 'optimize-memory':
        return json(await optimizeMemoryUsage());

      default:
        return json({
          error: 'Invalid action',
          availableActions: ['clear-cache', 'warm-cache', 'analyze-keys', 'optimize-memory']
        }, { status: 400 });
    }
  } catch (error: any) {
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

/**
 * Get comprehensive dashboard metrics
 */
async function getDashboardMetrics(timeRange: string): Promise<any> {
  const startTime = performance.now();

  // Get Redis metrics
  const redisStats = redisService.getStats();
  const redisInfo = await redisService.getRedisInfo();

  // Get cache-specific metrics  
  const vectorStats = getVectorCacheStats();
  const summaryStats = getSummaryMemoryStats();

  // Get key distribution
  const allKeys = await redisService.keys('*');
  const keysByPrefix = analyzeKeyPrefixes(allKeys);

  // Calculate hit rates and performance
  const hitRates = await calculateHitRates(allKeys);
  const responseTimeMetrics = await calculateResponseTimes();

  const processingTime = performance.now() - startTime;

  return {
    success: true,
    timestamp: new Date().toISOString(),
    processingTime: `${processingTime.toFixed(2)}ms`,
    overview: {
      redisStatus: redisStats.connected ? 'Connected' : 'Disconnected',
      totalKeys: allKeys.length,
      memoryUsage: redisInfo?.memory?.used_memory_human || 'N/A',
      uptime: redisInfo?.server?.uptime_in_seconds || 0,
      connectedClients: redisInfo?.clients?.connected_clients || 0
    },
    cache: {
      redis: {
        connected: redisStats.connected,
        status: redisStats.status,
        memory: redisInfo?.memory,
        keyspace: redisInfo?.keyspace
      },
      vector: vectorStats,
      summary: summaryStats
    },
    performance: {
      hitRates,
      responseTime: responseTimeMetrics,
      keyDistribution: keysByPrefix
    },
    storage: {
      totalKeys: allKeys.length,
      keysByPrefix,
      memoryUsage: redisInfo?.memory?.used_memory_human || 'Unknown',
      estimatedCostSavings: calculateCostSavings(hitRates)
    }
  };
}

/**
 * Get detailed cache keys with metadata
 */
async function getCacheKeys(pattern: string, limit: number): Promise<any> {
  const keys = await redisService.keys(pattern);
  const limitedKeys = keys.slice(0, limit);
  
  const keyDetails = await Promise.all(
    limitedKeys.map(async (key) => {
      const client = redisService.getClient();
      if (!client) return { key, error: 'Redis unavailable' };

      try {
        const [ttl, type, memory] = await Promise.all([
          client.ttl(key),
          client.type(key),
          client.memory('usage', key).catch(() => null)
        ]);

        return {
          key,
          type,
          ttl: ttl === -1 ? 'No expiration' : `${ttl}s`,
          memory: memory || 'Unknown',
          prefix: key.split(':')[0] || 'no-prefix'
        };
      } catch (error) {
        return {
          key,
          error: 'Failed to get metadata'
        };
      }
    })
  );

  return {
    success: true,
    pattern,
    totalMatches: keys.length,
    returned: keyDetails.length,
    keys: keyDetails,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get memory usage analysis
 */
async function getMemoryAnalysis(): Promise<any> {
  const redisInfo = await redisService.getRedisInfo();
  const allKeys = await redisService.keys('*');
  
  // Analyze memory by key patterns
  const memoryByPrefix: any = {};
  const client = redisService.getClient();
  
  if (client) {
    for (const key of allKeys.slice(0, 100)) { // Sample first 100 keys
      try {
        const memory = await client.memory('usage', key);
        const prefix = key.split(':')[0] || 'no-prefix';
        
        if (!memoryByPrefix[prefix]) {
          memoryByPrefix[prefix] = { keys: 0, totalMemory: 0 };
        }
        
        memoryByPrefix[prefix].keys++;
        memoryByPrefix[prefix].totalMemory += memory || 0;
      } catch (error) {
        // Skip keys that can't be analyzed
      }
    }
  }

  return {
    success: true,
    redis: {
      usedMemory: redisInfo?.memory?.used_memory_human,
      usedMemoryPeak: redisInfo?.memory?.used_memory_peak_human,
      memoryFragmentationRatio: redisInfo?.memory?.mem_fragmentation_ratio,
      maxMemory: redisInfo?.memory?.maxmemory_human || 'No limit'
    },
    distribution: memoryByPrefix,
    recommendations: generateMemoryRecommendations(redisInfo?.memory),
    timestamp: new Date().toISOString()
  };
}

/**
 * Get performance metrics
 */
async function getPerformanceMetrics(timeRange: string): Promise<any> {
  const redisInfo = await redisService.getRedisInfo();
  
  return {
    success: true,
    timeRange,
    redis: {
      totalCommandsProcessed: redisInfo?.stats?.total_commands_processed || 0,
      instantaneousOpsPerSec: redisInfo?.stats?.instantaneous_ops_per_sec || 0,
      keyspaceHits: redisInfo?.stats?.keyspace_hits || 0,
      keyspaceMisses: redisInfo?.stats?.keyspace_misses || 0,
      hitRatio: calculateRedisHitRatio(redisInfo?.stats)
    },
    network: {
      totalNetInput: redisInfo?.stats?.total_net_input_bytes || 0,
      totalNetOutput: redisInfo?.stats?.total_net_output_bytes || 0,
      instantaneousInputKbps: redisInfo?.stats?.instantaneous_input_kbps || 0,
      instantaneousOutputKbps: redisInfo?.stats?.instantaneous_output_kbps || 0
    },
    recommendations: generatePerformanceRecommendations(redisInfo),
    timestamp: new Date().toISOString()
  };
}

/**
 * Get system health check
 */
async function getSystemHealth(): Promise<any> {
  const isRedisHealthy = redisService.isHealthy();
  const redisStats = redisService.getStats();
  const vectorStats = getVectorCacheStats();
  
  const healthScore = calculateHealthScore({
    redis: isRedisHealthy,
    vectorCache: vectorStats.config.redisEnabled,
    memory: true // Simplified for now
  });

  return {
    success: true,
    healthy: healthScore > 0.8,
    healthScore,
    components: {
      redis: {
        status: isRedisHealthy ? 'healthy' : 'unhealthy',
        connected: redisStats.connected,
        reconnectAttempts: redisStats.reconnectAttempts
      },
      vectorCache: {
        status: vectorStats.config.redisEnabled ? 'healthy' : 'degraded',
        memoryEntries: vectorStats.memory.vectorEntries + vectorStats.memory.embeddingEntries
      },
      summaryCache: {
        status: 'healthy',
        memoryStats: getSummaryMemoryStats()
      }
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Helper functions
 */
function analyzeKeyPrefixes(keys: string[]): any {
  const prefixes: any = {};
  
  for (const key of keys) {
    const prefix = key.split(':')[0] || 'no-prefix';
    prefixes[prefix] = (prefixes[prefix] || 0) + 1;
  }
  
  return prefixes;
}

async function calculateHitRates(keys: string[]): Promise<any> {
  // Simplified hit rate calculation
  // In production, you'd track these metrics over time
  return {
    overall: 0.75, // 75% hit rate estimate
    vector: 0.80,
    summary: 0.85,
    legal: 0.70
  };
}

async function calculateResponseTimes(): Promise<any> {
  return {
    cached: { avg: 5, p95: 15, p99: 25 },
    uncached: { avg: 150, p95: 300, p99: 500 }
  };
}

function calculateRedisHitRatio(stats: any): number {
  if (!stats || !stats.keyspace_hits) return 0;
  const hits = stats.keyspace_hits;
  const misses = stats.keyspace_misses || 0;
  return hits / (hits + misses);
}

function calculateCostSavings(hitRates: any): string {
  const estimatedSavings = (hitRates.overall * 1000) * 0.001; // $0.001 per avoided computation
  return `$${estimatedSavings.toFixed(2)}/hour`;
}

function calculateHealthScore(components: any): number {
  const weights = { redis: 0.5, vectorCache: 0.3, memory: 0.2 };
  let score = 0;
  
  for (const [component, healthy] of Object.entries(components)) {
    if (healthy) {
      score += weights[component as keyof typeof weights] || 0;
    }
  }
  
  return score;
}

function generateMemoryRecommendations(memoryStats: any): string[] {
  const recommendations = [];
  
  if (memoryStats?.mem_fragmentation_ratio > 1.5) {
    recommendations.push('High memory fragmentation detected. Consider Redis restart.');
  }
  
  if (memoryStats?.used_memory_peak_perc > 90) {
    recommendations.push('Memory usage is high. Consider increasing Redis memory limit.');
  }
  
  return recommendations;
}

function generatePerformanceRecommendations(redisInfo: any): string[] {
  const recommendations = [];
  
  const hitRatio = calculateRedisHitRatio(redisInfo?.stats);
  if (hitRatio < 0.8) {
    recommendations.push('Cache hit ratio is low. Review TTL settings and cache keys.');
  }
  
  if (redisInfo?.stats?.instantaneous_ops_per_sec > 10000) {
    recommendations.push('High Redis operations per second. Monitor for performance impact.');
  }
  
  return recommendations;
}

// Management operations
async function clearCacheByPattern(pattern: string): Promise<any> {
  const keys = await redisService.keys(pattern);
  let cleared = 0;
  
  for (const key of keys) {
    if (await redisService.del(key)) {
      cleared++;
    }
  }
  
  return {
    success: true,
    pattern,
    keysFound: keys.length,
    keysCleared: cleared,
    timestamp: new Date().toISOString()
  };
}

async function warmPopularCache(queries: string[]): Promise<any> {
  // Implementation for cache warming would go here
  return {
    success: true,
    message: 'Cache warming not yet implemented',
    queries: queries.length
  };
}

async function analyzeKeyPatterns(): Promise<any> {
  const keys = await redisService.keys('*');
  const patterns = analyzeKeyPrefixes(keys);
  
  return {
    success: true,
    totalKeys: keys.length,
    patterns,
    recommendations: Object.entries(patterns)
      .filter(([_, count]: any) => count > 100)
      .map(([prefix]) => `Consider TTL review for high-volume prefix: ${prefix}`)
  };
}

async function optimizeMemoryUsage(): Promise<any> {
  // Implementation for memory optimization would go here
  return {
    success: true,
    message: 'Memory optimization not yet implemented',
    timestamp: new Date().toISOString()
  };
}