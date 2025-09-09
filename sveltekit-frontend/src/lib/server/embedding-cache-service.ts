/**
 * Enhanced Embedding Cache Service
 * Redis-based caching for embeddings and frequently accessed data
 */

import { redisService } from './redis-service';
import { dbPool } from './database-pool-service';

interface EmbeddingCacheEntry {
  text: string;
  embedding: number[];
  model: string;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

interface QueryCacheEntry {
  query: string;
  results: any[];
  metadata: any;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  embeddings: {
    hits: number;
    misses: number;
    size: number;
  };
  queries: {
    hits: number;
    misses: number;
    size: number;
  };
  sessions: {
    active: number;
    total: number;
  };
}

class EmbeddingCacheService {
  // Cache prefixes
  private readonly EMBEDDING_PREFIX = 'emb:';
  private readonly QUERY_PREFIX = 'query:';
  private readonly SESSION_PREFIX = 'session:';
  private readonly STATS_PREFIX = 'stats:cache:';
  private readonly HOT_CACHE_PREFIX = 'hot:';

  // Cache settings
  private readonly EMBEDDING_TTL = 7 * 24 * 60 * 60; // 7 days
  private readonly QUERY_TTL = 30 * 60; // 30 minutes
  private readonly SESSION_TTL = 24 * 60 * 60; // 24 hours
  private readonly HOT_CACHE_TTL = 5 * 60; // 5 minutes for frequently accessed items

  // Performance thresholds
  private readonly HOT_ACCESS_THRESHOLD = 5; // Access count to mark as hot
  private readonly BATCH_SIZE = 100;

  /**
   * Cache embedding with automatic hot-cache promotion
   */
  async cacheEmbedding(
    text: string,
    embedding: number[],
    model: string = 'nomic-embed-text'
  ): Promise<void> {
    if (!redisService.isHealthy() || !text || !embedding.length) return;

    try {
      const key = this.generateEmbeddingKey(text, model);
      const entry: EmbeddingCacheEntry = {
        text,
        embedding,
        model,
        timestamp: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now()
      };

      // Store with compression for large embeddings
      const compressed = this.compressEmbedding(embedding);
      const cacheData = {
        ...entry,
        embedding: compressed,
        compressed: true
      };

      await redisService.set(
        `${this.EMBEDDING_PREFIX}${key}`,
        JSON.stringify(cacheData),
        this.EMBEDDING_TTL
      );

      await this.updateStats('embeddings', 'store');
      console.log(`🔗 Cached embedding for text (${text.length} chars, ${embedding.length} dims)`);
    } catch (error) {
      console.warn('Embedding cache error:', error);
    }
  }

  /**
   * Retrieve cached embedding with hot-cache optimization
   */
  async getEmbedding(text: string, model: string = 'nomic-embed-text'): Promise<number[] | null> {
    if (!redisService.isHealthy() || !text) return null;

    try {
      const key = this.generateEmbeddingKey(text, model);

      // Check hot cache first
      let cached = await redisService.get(`${this.HOT_CACHE_PREFIX}${key}`);
      if (cached) {
        await this.updateStats('embeddings', 'hot_hit');
        const entry = JSON.parse(cached);
        return entry.compressed ? this.decompressEmbedding(entry.embedding) : entry.embedding;
      }

      // Check regular cache
      cached = await redisService.get(`${this.EMBEDDING_PREFIX}${key}`);
      if (cached) {
        const entry: EmbeddingCacheEntry = JSON.parse(cached);

        // Update access count and promote to hot cache if threshold met
        entry.accessCount++;
        entry.lastAccessed = Date.now();

        if (entry.accessCount >= this.HOT_ACCESS_THRESHOLD) {
          await this.promoteToHotCache(`${this.EMBEDDING_PREFIX}${key}`, entry);
        } else {
          // Update access stats in regular cache
          await redisService.set(
            `${this.EMBEDDING_PREFIX}${key}`,
            JSON.stringify(entry),
            this.EMBEDDING_TTL
          );
        }

        await this.updateStats('embeddings', 'hit');
        const embedding = (entry as any).compressed ?
          this.decompressEmbedding((entry as any).embedding) :
          entry.embedding;

        return embedding;
      }

      await this.updateStats('embeddings', 'miss');
      return null;
    } catch (error) {
      console.warn('Embedding retrieval error:', error);
      await this.updateStats('embeddings', 'error');
      return null;
    }
  }

  /**
   * Cache query results with intelligent TTL
   */
  async cacheQuery(query: string, results: any[], metadata: any = {}, customTTL?: number): Promise<void> {
    if (!redisService.isHealthy()) return;

    try {
      const key = this.generateQueryKey(query, metadata);
      const ttl = customTTL || this.calculateQueryTTL(results.length, metadata);

      const entry: QueryCacheEntry = {
        query,
        results,
        metadata: {
          ...metadata,
          resultCount: results.length,
          queryComplexity: this.calculateQueryComplexity(query)
        },
        timestamp: Date.now(),
        ttl
      };

      await redisService.set(
        `${this.QUERY_PREFIX}${key}`,
        JSON.stringify(entry),
        ttl
      );

      await this.updateStats('queries', 'store');
      console.log(`📊 Cached query results (${results.length} items, TTL: ${ttl}s)`);
    } catch (error) {
      console.warn('Query cache error:', error);
    }
  }

  /**
   * Retrieve cached query results
   */
  async getQueryResults(query: string, metadata: any = {}): Promise<any[] | null> {
    if (!redisService.isHealthy()) return null;

    try {
      const key = this.generateQueryKey(query, metadata);
      const cached = await redisService.get(`${this.QUERY_PREFIX}${key}`);

      if (cached) {
        const entry: QueryCacheEntry = JSON.parse(cached);
        await this.updateStats('queries', 'hit');
        console.log(`📋 Query cache hit (${entry.results.length} results)`);
        return entry.results;
      }

      await this.updateStats('queries', 'miss');
      return null;
    } catch (error) {
      console.warn('Query retrieval error:', error);
      await this.updateStats('queries', 'error');
      return null;
    }
  }

  /**
   * Cache chat session data
   */
  async cacheSession(sessionId: string, data: any): Promise<void> {
    if (!redisService.isHealthy()) return;

    try {
      await redisService.set(
        `${this.SESSION_PREFIX}${sessionId}`,
        JSON.stringify({
          ...data,
          lastUpdated: Date.now()
        }),
        this.SESSION_TTL
      );

      await this.updateStats('sessions', 'store');
    } catch (error) {
      console.warn('Session cache error:', error);
    }
  }

  /**
   * Batch cache multiple embeddings efficiently
   */
  async batchCacheEmbeddings(items: Array<{ text: string; embedding: number[]; model?: string }>): Promise<void> {
    if (!redisService.isHealthy() || !items.length) return;

    try {
      const pipeline = redisService.pipeline();
      let cached = 0;

      for (const item of items) {
        const key = this.generateEmbeddingKey(item.text, item.model || 'nomic-embed-text');
        const entry: EmbeddingCacheEntry = {
          text: item.text,
          embedding: this.compressEmbedding(item.embedding),
          model: item.model || 'nomic-embed-text',
          timestamp: Date.now(),
          accessCount: 0,
          lastAccessed: Date.now()
        };

        pipeline.set(
          `${this.EMBEDDING_PREFIX}${key}`,
          JSON.stringify({ ...entry, compressed: true }),
          'EX',
          this.EMBEDDING_TTL
        );
        cached++;
      }

      await pipeline.exec();
      console.log(`📦 Batch cached ${cached} embeddings`);
      await this.updateStats('embeddings', 'batch_store', cached);
    } catch (error) {
      console.warn('Batch cache error:', error);
    }
  }

  /**
   * Invalidate cache patterns
   */
  async invalidate(pattern: string, type: 'embeddings' | 'queries' | 'sessions' | 'all' = 'all'): Promise<void> {
    if (!redisService.isHealthy()) return;

    try {
      const prefixes = type === 'all' ?
        [this.EMBEDDING_PREFIX, this.QUERY_PREFIX, this.SESSION_PREFIX, this.HOT_CACHE_PREFIX] :
        type === 'embeddings' ? [this.EMBEDDING_PREFIX, this.HOT_CACHE_PREFIX] :
        type === 'queries' ? [this.QUERY_PREFIX] :
        [this.SESSION_PREFIX];

      let totalDeleted = 0;
      for (const prefix of prefixes) {
        const keys = await redisService.keys(`${prefix}${pattern}*`);
        if (keys.length > 0) {
          await redisService.del(...keys);
          totalDeleted += keys.length;
        }
      }

      console.log(`🗑️ Invalidated ${totalDeleted} cache entries`);
    } catch (error) {
      console.warn('Cache invalidation error:', error);
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const defaultStats: CacheStats = {
      embeddings: { hits: 0, misses: 0, size: 0 },
      queries: { hits: 0, misses: 0, size: 0 },
      sessions: { active: 0, total: 0 }
    };

    if (!redisService.isHealthy()) return defaultStats;

    try {
      const stats = await redisService.hgetall(`${this.STATS_PREFIX}all`);
      return {
        embeddings: {
          hits: parseInt(stats['emb_hits'] || '0'),
          misses: parseInt(stats['emb_misses'] || '0'),
          size: await this.getCacheSize('embeddings')
        },
        queries: {
          hits: parseInt(stats['query_hits'] || '0'),
          misses: parseInt(stats['query_misses'] || '0'),
          size: await this.getCacheSize('queries')
        },
        sessions: {
          active: parseInt(stats['session_active'] || '0'),
          total: parseInt(stats['session_total'] || '0')
        }
      };
    } catch (error) {
      console.warn('Stats retrieval error:', error);
      return defaultStats;
    }
  }

  /**
   * Generate cache key for embedding
   */
  private generateEmbeddingKey(text: string, model: string): string {
    const content = `${model}:${text}`;
    return Buffer.from(content).toString('base64').substring(0, 40);
  }

  /**
   * Generate cache key for query
   */
  private generateQueryKey(query: string, metadata: any): string {
    const content = `${query}:${JSON.stringify(metadata)}`;
    return Buffer.from(content).toString('base64').substring(0, 40);
  }

  /**
   * Compress embedding array for storage efficiency
   */
  private compressEmbedding(embedding: number[]): string {
    // Simple compression by rounding to 4 decimal places and packing
    const rounded = embedding.map(n => Math.round(n * 10000) / 10000);
    return Buffer.from(JSON.stringify(rounded)).toString('base64');
  }

  /**
   * Decompress embedding array
   */
  private decompressEmbedding(compressed: string): number[] {
    try {
      const data = Buffer.from(compressed, 'base64').toString();
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * Promote frequently accessed items to hot cache
   */
  private async promoteToHotCache(originalKey: string, entry: EmbeddingCacheEntry): Promise<void> {
    try {
      const hotKey = originalKey.replace(this.EMBEDDING_PREFIX, this.HOT_CACHE_PREFIX);
      await redisService.set(hotKey, JSON.stringify(entry), this.HOT_CACHE_TTL);
      console.log(`🔥 Promoted to hot cache: ${entry.text.substring(0, 50)}...`);
    } catch (error) {
      console.warn('Hot cache promotion error:', error);
    }
  }

  /**
   * Calculate intelligent TTL for queries
   */
  private calculateQueryTTL(resultCount: number, metadata: any): number {
    let baseTTL = this.QUERY_TTL;

    // Longer TTL for smaller result sets (more stable)
    if (resultCount < 10) baseTTL *= 2;
    else if (resultCount > 100) baseTTL *= 0.5;

    // Adjust based on query complexity
    const complexity = metadata.complexity || 1;
    baseTTL = Math.floor(baseTTL * (2 - complexity)); // Higher complexity = shorter TTL

    return Math.max(baseTTL, 60); // Minimum 1 minute
  }

  /**
   * Calculate query complexity score
   */
  private calculateQueryComplexity(query: string): number {
    const lowerQuery = query.toLowerCase();
    let complexity = 0.5; // Base complexity

    // Add complexity for JOINs
    complexity += (lowerQuery.match(/join/g) || []).length * 0.2;

    // Add complexity for subqueries
    complexity += (lowerQuery.match(/\(/g) || []).length * 0.1;

    // Add complexity for aggregations
    if (lowerQuery.includes('group by')) complexity += 0.3;
    if (lowerQuery.includes('order by')) complexity += 0.2;

    return Math.min(complexity, 2.0); // Cap at 2.0
  }

  /**
   * Get cache size for a specific type
   */
  private async getCacheSize(type: 'embeddings' | 'queries' | 'sessions'): Promise<number> {
    try {
      const prefix = type === 'embeddings' ? this.EMBEDDING_PREFIX :
                    type === 'queries' ? this.QUERY_PREFIX :
                    this.SESSION_PREFIX;
      const keys = await redisService.keys(`${prefix}*`);
      return keys.length;
    } catch {
      return 0;
    }
  }

  /**
   * Update cache statistics
   */
  private async updateStats(type: string, operation: string, count: number = 1): Promise<void> {
    if (!redisService.isHealthy()) return;

    try {
      const field = `${type.substring(0, type.length - 1)}_${operation}`; // Remove 's' from type
      await redisService.hincrby(`${this.STATS_PREFIX}all`, field, count);
    } catch (error) {
      console.warn('Stats update error:', error);
    }
  }
}

// Export singleton instance
export const embeddingCache = new EmbeddingCacheService();