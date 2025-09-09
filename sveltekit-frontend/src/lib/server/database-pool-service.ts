/**
 * Enhanced Database Pool Service with Redis Coordination
 * Implements Redis-based connection pooling and distributed caching
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { redisService } from './redis-service';

interface DatabasePoolConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  max: number;
  idle_timeout: number;
  connect_timeout: number;
  prepare: boolean;
  ssl: boolean | 'require' | 'allow' | 'prefer';
}

interface CachedQuery {
  sql: string;
  params: any[];
  timestamp: number;
  result: any;
  ttl: number; // seconds
}

class DatabasePoolService {
  private pools: Map<string, postgres.Sql> = new Map();
  private drizzleInstances: Map<string, PostgresJsDatabase<Record<string, never>>> = new Map();
  private connectionString: string;
  private config: DatabasePoolConfig;
  private queryCache: Map<string, CachedQuery> = new Map();

  // Cache settings
  private readonly DEFAULT_CACHE_TTL = 300; // 5 minutes
  private readonly QUERY_CACHE_PREFIX = 'db:query:';
  private readonly CONNECTION_STATS_PREFIX = 'db:stats:';

  constructor() {
    this.connectionString = process.env.DATABASE_URL ||
      'postgresql://legal_admin:123456@localhost:5433/legal_ai_db';

    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433'),
      database: process.env.DB_NAME || 'legal_ai_db',
      username: process.env.DB_USER || 'legal_admin',
      password: process.env.DB_PASS || '123456',
      max: parseInt(process.env.DB_POOL_SIZE || '10'),
      idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30'),
      connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10'),
      prepare: process.env.NODE_ENV === 'production',
      ssl: process.env.DB_SSL === 'true' ? 'require' : false
    };
  }

  /**
   * Get or create a connection pool for a specific context
   */
  async getPool(context: string = 'default'): Promise<postgres.Sql> {
    const poolKey = `${context}:${this.config.database}`;

    if (this.pools.has(poolKey)) {
      const pool = this.pools.get(poolKey)!;
      await this.recordConnectionStats(context, 'reused');
      return pool;
    }

    // Create new pool with Redis-coordinated settings
    const redisStats = await this.getRedisConnectionStats(context);
    const dynamicConfig = await this.adjustPoolSize(redisStats);

    const pool = postgres(this.connectionString, {
      ...this.config,
      ...dynamicConfig,
      onnotice: () => {}, // Suppress notices
      debug: process.env.NODE_ENV === 'development'
    });

    this.pools.set(poolKey, pool);
    await this.recordConnectionStats(context, 'created');

    console.log(`🔗 Database pool created for context: ${context} (size: ${dynamicConfig.max})`);
    return pool;
  }

  /**
   * Get Drizzle instance with connection pooling
   */
  async getDrizzle(context: string = 'default'): Promise<PostgresJsDatabase<Record<string, never>>> {
    const poolKey = `drizzle:${context}`;

    if (this.drizzleInstances.has(poolKey)) {
      return this.drizzleInstances.get(poolKey)!;
    }

    const pool = await this.getPool(context);
    const db = drizzle(pool);

    this.drizzleInstances.set(poolKey, db);
    return db;
  }

  /**
   * Execute cached query with Redis integration
   */
  async queryCached<T = any>(
    sql: string,
    params: any[] = [],
    context: string = 'default',
    ttl: number = this.DEFAULT_CACHE_TTL
  ): Promise<T> {
    const cacheKey = this.generateCacheKey(sql, params);

    // Check Redis cache first
    if (redisService.isHealthy()) {
      try {
        const cached = await redisService.get(`${this.QUERY_CACHE_PREFIX}${cacheKey}`);
        if (cached) {
          const cachedQuery: CachedQuery = JSON.parse(cached);
          if (Date.now() - cachedQuery.timestamp < cachedQuery.ttl * 1000) {
            console.log(`📋 Cache hit for query: ${sql.substring(0, 50)}...`);
            return cachedQuery.result;
          }
        }
      } catch (error) {
        console.warn('Cache read error:', error);
      }
    }

    // Execute query
    const pool = await this.getPool(context);
    const result = await pool.unsafe(sql, params);

    // Cache result in Redis
    if (redisService.isHealthy()) {
      try {
        const cacheData: CachedQuery = {
          sql,
          params,
          timestamp: Date.now(),
          result,
          ttl
        };

        await redisService.set(
          `${this.QUERY_CACHE_PREFIX}${cacheKey}`,
          JSON.stringify(cacheData),
          ttl
        );

        console.log(`💾 Cached query result (TTL: ${ttl}s)`);
      } catch (error) {
        console.warn('Cache write error:', error);
      }
    }

    return result;
  }

  /**
   * Invalidate cache for specific patterns
   */
  async invalidateCache(pattern: string): Promise<void> {
    if (!redisService.isHealthy()) return;

    try {
      const keys = await redisService.keys(`${this.QUERY_CACHE_PREFIX}${pattern}*`);
      if (keys.length > 0) {
        await redisService.del(...keys);
        console.log(`🗑️ Invalidated ${keys.length} cached queries`);
      }
    } catch (error) {
      console.warn('Cache invalidation error:', error);
    }
  }

  /**
   * Get connection statistics from Redis
   */
  private async getRedisConnectionStats(context: string): Promise<any> {
    if (!redisService.isHealthy()) return {};

    try {
      const stats = await redisService.hgetall(`${this.CONNECTION_STATS_PREFIX}${context}`);
      return {
        totalConnections: parseInt(stats.total || '0'),
        activeConnections: parseInt(stats.active || '0'),
        avgResponseTime: parseFloat(stats.avgResponse || '0'),
        lastUpdate: parseInt(stats.lastUpdate || '0')
      };
    } catch (error) {
      console.warn('Failed to get connection stats:', error);
      return {};
    }
  }

  /**
   * Dynamically adjust pool size based on Redis stats
   */
  private async adjustPoolSize(stats: any): Promise<Partial<DatabasePoolConfig>> {
    const baseSize = this.config.max;
    let adjustedSize = baseSize;

    // Adjust based on current load
    if (stats.activeConnections > baseSize * 0.8) {
      adjustedSize = Math.min(baseSize * 1.5, 20); // Scale up but cap at 20
    } else if (stats.activeConnections < baseSize * 0.3) {
      adjustedSize = Math.max(baseSize * 0.7, 3); // Scale down but keep minimum 3
    }

    return {
      max: Math.floor(adjustedSize),
      idle_timeout: stats.avgResponseTime > 1000 ? 60 : this.config.idle_timeout
    };
  }

  /**
   * Record connection statistics to Redis
   */
  private async recordConnectionStats(context: string, operation: string): Promise<void> {
    if (!redisService.isHealthy()) return;

    try {
      const key = `${this.CONNECTION_STATS_PREFIX}${context}`;
      const timestamp = Date.now();

      await redisService.hincrby(key, 'total', operation === 'created' ? 1 : 0);
      await redisService.hincrby(key, operation === 'reused' ? 'reuses' : 'creates', 1);
      await redisService.hset(key, 'lastUpdate', timestamp.toString());
      await redisService.expire(key, 3600); // Stats expire after 1 hour
    } catch (error) {
      console.warn('Failed to record connection stats:', error);
    }
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(sql: string, params: any[]): string {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    const paramsStr = JSON.stringify(params);
    return Buffer.from(`${normalized}:${paramsStr}`).toString('base64').substring(0, 32);
  }

  /**
   * Close all connections and clean up
   */
  async close(): Promise<void> {
    console.log('🔌 Closing database pools...');

    for (const [key, pool] of this.pools) {
      try {
        await pool.end();
        console.log(`✅ Closed pool: ${key}`);
      } catch (error) {
        console.error(`❌ Error closing pool ${key}:`, error);
      }
    }

    this.pools.clear();
    this.drizzleInstances.clear();
    this.queryCache.clear();
  }

  /**
   * Health check for all pools
   */
  async healthCheck(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};

    for (const [key, pool] of this.pools) {
      try {
        await pool`SELECT 1`;
        results[key] = true;
      } catch (error) {
        results[key] = false;
        console.error(`❌ Health check failed for pool ${key}:`, error);
      }
    }

    return results;
  }

  /**
   * Get pool statistics
   */
  getStats(): any {
    const stats = {
      totalPools: this.pools.size,
      totalDrizzleInstances: this.drizzleInstances.size,
      cacheSize: this.queryCache.size,
      pools: {}
    };

    for (const [key, pool] of this.pools) {
      (stats.pools as any)[key] = {
        // Add any available pool stats
        status: 'active' // postgres-js doesn't expose detailed stats
      };
    }

    return stats;
  }
}

// Export singleton instance
export const dbPool = new DatabasePoolService();

// Graceful shutdown
process.on('SIGTERM', () => dbPool.close());
process.on('SIGINT', () => dbPool.close());