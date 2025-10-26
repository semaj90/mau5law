/**
 * Redis Cache Layer for pgvector Search Results
 * Caches search results (NOT embeddings) for fast retrieval
 *
 * Architecture:
 * - Redis: Caches search results + metadata (TTL: 1 hour)
 * - PostgreSQL: Primary vector storage with HNSW index
 * - Ollama: Embedding generation
 */

import { createClient } from 'redis';
import { REDIS_URL } from '$env/static/private';
import crypto from 'crypto';

const redisClient = createClient({
  url: REDIS_URL,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Cache configuration
const SEARCH_CACHE_PREFIX = 'search:pgvector:';
const EMBEDDING_CACHE_PREFIX = 'embedding:';
const STATS_KEY = 'search:cache:stats';
const DEFAULT_TTL = 3600; // 1 hour

/**
 * Search result interface for caching
 */
export interface CachedSearchResult {
  query: string;
  results: Array<{
    id: string;
    title: string;
    content?: string;
    similarity: number;
  }>;
  stats: {
    totalResults: number;
    processingTimeMs: number;
  };
  timestamp: number;
  ttl: number;
}

export async function connectRedis(): Promise<void> {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('Connected to Redis');
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient.isOpen) {
    await redisClient.disconnect();
    console.log('Disconnected from Redis');
  }
}

/**
 * Generate cache key from search parameters
 * Uses SHA256 hash of all parameters for consistency
 */
export function generateSearchCacheKey(
  query: string,
  options?: {
    limit?: number;
    threshold?: number;
    filters?: Record<string, unknown>;
  }
): string {
  const hashInput = JSON.stringify({
    query,
    limit: options?.limit ?? 10,
    threshold: options?.threshold ?? 0.5,
    filters: options?.filters ?? {},
  });

  const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
  return `${SEARCH_CACHE_PREFIX}${hash}`;
}

/**
 * Generate cache key for embeddings
 */
export function generateEmbeddingCacheKey(text: string): string {
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  return `${EMBEDDING_CACHE_PREFIX}${hash}`;
}

/**
 * Sets a value in Redis cache.
 * @param {string} key The cache key.
 * @param {string} value The value to store.
 * @param {number} [ttl] Time to live in seconds.
 * @returns {Promise<void>}
 */
export async function setCache(key: string, value: string, ttl?: number): Promise<void> {
  try {
    await connectRedis();
    if (ttl) {
      await redisClient.setEx(key, ttl, value);
    } else {
      await redisClient.set(key, value);
    }
  } catch (error) {
    console.error('Redis setCache error:', error);
  }
}

/**
 * Gets a value from Redis cache.
 * @param {string} key The cache key.
 * @returns {Promise<string | null>} The cached value or null if not found.
 */
export async function getCache(key: string): Promise<string | null> {
  try {
    await connectRedis();
    return await redisClient.get(key);
  } catch (error) {
    console.error('Redis getCache error:', error);
    return null;
  }
}

/**
 * Deletes a value from Redis cache.
 * @param {string} key The cache key.
 * @returns {Promise<number>} The number of keys deleted.
 */
export async function deleteCache(key: string): Promise<number> {
  try {
    await connectRedis();
    return await redisClient.del(key);
  } catch (error) {
    console.error('Redis deleteCache error:', error);
    return 0;
  }
}

/**
 * Cache search results (not embeddings)
 * Results contain: id, title, similarity score only
 */
export async function cacheSearchResults(
  query: string,
  results: CachedSearchResult,
  ttl: number = DEFAULT_TTL
): Promise<boolean> {
  try {
    const key = generateSearchCacheKey(query, {
      limit: results.stats.totalResults,
      threshold: 0.5, // Default
    });
    await setCache(key, JSON.stringify(results), ttl);
    return true;
  } catch (error) {
    console.error('Error caching search results:', error);
    return false;
  }
}

/**
 * Get cached search results
 */
export async function getCachedSearchResults(
  query: string,
  options?: {
    limit?: number;
    threshold?: number;
    filters?: Record<string, unknown>;
  }
): Promise<CachedSearchResult | null> {
  try {
    const key = generateSearchCacheKey(query, options);
    const cached = await getCache(key);
    if (cached) {
      await recordCacheHit(true);
      return JSON.parse(cached) as CachedSearchResult;
    }
    await recordCacheHit(false);
    return null;
  } catch (error) {
    console.error('Error getting cached search results:', error);
    return null;
  }
}

/**
 * Cache an embedding result
 * Store only when repeatedly accessed
 */
export async function cacheEmbedding(
  text: string,
  embedding: number[],
  ttl: number = DEFAULT_TTL
): Promise<boolean> {
  try {
    const key = generateEmbeddingCacheKey(text);
    await setCache(key, JSON.stringify(embedding), ttl);
    return true;
  } catch (error) {
    console.error('Error caching embedding:', error);
    return false;
  }
}

/**
 * Get cached embedding
 */
export async function getCachedEmbedding(text: string): Promise<number[] | null> {
  try {
    const key = generateEmbeddingCacheKey(text);
    const cached = await getCache(key);
    return cached ? (JSON.parse(cached) as number[]) : null;
  } catch (error) {
    console.error('Error getting cached embedding:', error);
    return null;
  }
}

/**
 * Record cache statistics (hits/misses)
 */
async function recordCacheHit(hit: boolean): Promise<void> {
  try {
    await connectRedis();
    const key = hit ? `${STATS_KEY}:hits` : `${STATS_KEY}:misses`;
    await redisClient.incr(key);
  } catch (error) {
    console.error('Error recording cache stat:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  hits: number;
  misses: number;
  hitRate: number;
}> {
  try {
    await connectRedis();
    const hits = parseInt((await redisClient.get(`${STATS_KEY}:hits`)) ?? '0');
    const misses = parseInt((await redisClient.get(`${STATS_KEY}:misses`)) ?? '0');
    const total = hits + misses;

    return {
      hits,
      misses,
      hitRate: total > 0 ? hits / total : 0,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { hits: 0, misses: 0, hitRate: 0 };
  }
}

/**
 * Clear all search cache
 */
export async function clearSearchCache(): Promise<number> {
  try {
    await connectRedis();
    const keys = await redisClient.keys(`${SEARCH_CACHE_PREFIX}*`);
    if (keys.length === 0) return 0;
    return await redisClient.del(keys);
  } catch (error) {
    console.error('Error clearing search cache:', error);
    return 0;
  }
}

/**
 * Clear all embedding cache
 */
export async function clearEmbeddingCache(): Promise<number> {
  try {
    await connectRedis();
    const keys = await redisClient.keys(`${EMBEDDING_CACHE_PREFIX}*`);
    if (keys.length === 0) return 0;
    return await redisClient.del(keys);
  } catch (error) {
    console.error('Error clearing embedding cache:', error);
    return 0;
  }
}

/**
 * Get Redis health and memory info
 */
export async function getRedisHealth(): Promise<{
  healthy: boolean;
  ping?: number;
  memory?: { used: string; total: string };
}> {
  try {
    await connectRedis();
    const start = Date.now();
    await redisClient.ping();
    const ping = Date.now() - start;

    const info = await redisClient.info('memory');
    const usedMatch = info.match(/used_memory_human:(\S+)/);
    const totalMatch = info.match(/maxmemory_human:(\S+)/);

    return {
      healthy: true,
      ping,
      memory: {
        used: usedMatch ? usedMatch[1] : 'unknown',
        total: totalMatch ? totalMatch[1] : 'unknown',
      },
    };
  } catch (error) {
    console.error('Error checking Redis health:', error);
    return { healthy: false };
  }
}