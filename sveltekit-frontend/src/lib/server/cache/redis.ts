// Redis caching service for embeddings, shader modules, and search results
import { gzipSync, gunzipSync } from 'zlib';

// In-memory L1 cache fallback
const memoryCache = new Map<string, any>();
const MEMORY_CACHE_MAX_SIZE = 1000;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour default

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheService {
  private redisClient: any = null;
  private useRedis = false;

  constructor() {
    void this.initializeRedis();
  }

  // Expose raw client for advanced usage (enqueue, streams)
  get client() {
    return this.redisClient;
  }

  private async initializeRedis() {
    // Prefer explicit host/port; fall back to REDIS_URL parsing; default project port 4005
    let host = process.env.REDIS_HOST || 'localhost';
    let port = Number.parseInt(process.env.REDIS_PORT || '4005', 10);
    const url = process.env.REDIS_URL || process.env.PUBLIC_REDIS_URL;
    if (url) {
      try {
        const u = new URL(url);
        if (u.hostname) host = u.hostname;
        if (u.port) port = Number.parseInt(u.port, 10) || port;
      } catch {}
    }

    try {
      // Dynamic import so builds don’t fail if ioredis is missing in some environments
      const { default: Redis } = await import('ioredis');
      this.redisClient = new Redis({
        host,
        port,
        connectTimeout: 5000,
        retryStrategy: (times: number) => Math.min(times * 50, 500),
        lazyConnect: true,
      });
      this.redisClient.on('error', (err: any) => {
        console.warn('Redis connection error, falling back to memory cache:', err?.message || err);
        this.useRedis = false;
      });
      try {
        await this.redisClient.connect?.();
      } catch (e) {
        console.warn('Redis connect failed, using memory cache:', (e as Error).message || e);
        this.useRedis = false;
        return;
      }
      this.useRedis = true;
      console.log('📝 Redis cache connected');
    } catch (error: any) {
      console.warn('Redis not available, using memory cache:', error?.message || error);
      this.useRedis = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.useRedis && this.redisClient) {
        const result = await this.redisClient.get(key);
        if (!result) return null;
        // Try base64-gzipped JSON first
        try {
          const buf = Buffer.from(result, 'base64');
          const json = gunzipSync(buf).toString('utf8');
          return JSON.parse(json) as T;
        } catch {
          // Fallback to plain JSON
          try {
            return JSON.parse(result) as T;
          } catch {
            return null;
          }
        }
      }
      return this.getFromMemory<T>(key);
    } catch (e) {
      console.warn('Cache get error:', (e as Error).message || e);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs: number = CACHE_TTL): Promise<void> {
    try {
      // Accept small second TTLs for back-compat
      if (typeof ttlMs === 'number' && Number.isInteger(ttlMs) && ttlMs > 0 && ttlMs <= 86400) {
        ttlMs = ttlMs * 1000;
      }

      const payload = gzipSync(JSON.stringify(value)).toString('base64');
      if (this.useRedis && this.redisClient) {
        const seconds = Math.max(1, Math.floor(ttlMs / 1000));
        try {
          if (typeof this.redisClient.setex === 'function') {
            await this.redisClient.setex(key, seconds, payload);
          } else if (typeof this.redisClient.setEx === 'function') {
            await this.redisClient.setEx(key, seconds, payload);
          } else if (typeof this.redisClient.set === 'function') {
            try {
              await this.redisClient.set(key, payload, { EX: seconds });
            } catch {
              await this.redisClient.set(key, payload, 'EX', seconds);
            }
          } else {
            this.setInMemory(
              key,
              JSON.parse(Buffer.from(payload, 'base64').toString('utf8')),
              ttlMs
            );
          }
          return;
        } catch (e) {
          console.warn('Redis set failed, using memory cache:', (e as Error).message || e);
        }
      }
      this.setInMemory(key, value, ttlMs);
    } catch (e) {
      console.warn('Cache set error:', (e as Error).message || e);
      this.setInMemory(key, value, ttlMs);
    }
  }

  // Convenience: accept seconds TTL and rely on internal gzip/base64 storage
  async setCompressed<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const ttl = Number.isFinite(ttlSeconds) ? Math.max(1, Math.floor(ttlSeconds)) : 3600;
    return this.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.del(key);
      } else {
        memoryCache.delete(key);
      }
    } catch (e) {
      console.warn('Cache delete error:', (e as Error).message || e);
    }
  }

  async publish(channel: string, message: unknown): Promise<void> {
    try {
      if (this.useRedis && this.redisClient && typeof this.redisClient.publish === 'function') {
        const payload = typeof message === 'string' ? message : JSON.stringify(message);
        await this.redisClient.publish(channel, payload);
      }
    } catch (e) {
      console.warn('Cache publish error:', (e as Error).message || e);
    }
  }

  // Simple list queue helpers
  async rpush(listKey: string, value: string): Promise<number> {
    try {
      if (this.useRedis && this.redisClient && typeof this.redisClient.rpush === 'function') {
        return await this.redisClient.rpush(listKey, value);
      }
    } catch (e) {
      console.warn('Redis rpush error:', (e as Error).message || e);
    }
    return 0;
  }

  async blpop(listKey: string, timeoutSec = 0): Promise<[string, string] | null> {
    try {
      if (this.useRedis && this.redisClient && typeof this.redisClient.blpop === 'function') {
        const res = await this.redisClient.blpop(listKey, timeoutSec);
        if (!res) return null;
        return [res[0], res[1]] as [string, string];
      }
    } catch (e) {
      console.warn('Redis blpop error:', (e as Error).message || e);
    }
    return null;
  }

  async lpop(listKey: string): Promise<string | null> {
    try {
      if (this.useRedis && this.redisClient && typeof this.redisClient.lpop === 'function') {
        const res = await this.redisClient.lpop(listKey);
        return res ?? null;
      }
    } catch (e) {
      console.warn('Redis lpop error:', (e as Error).message || e);
    }
    return null;
  }

  // Hash operations for complex caching
  async hget(key: string, field: string): Promise<string | null> {
    try {
      if (this.useRedis && this.redisClient && typeof this.redisClient.hget === 'function') {
        return await this.redisClient.hget(key, field);
      }
      // Memory fallback: use compound key
      const compoundKey = `${key}:${field}`;
      const item = this.getFromMemory<string>(compoundKey);
      return item;
    } catch (e) {
      console.warn('Cache hget error:', (e as Error).message || e);
      return null;
    }
  }

  async hset(key: string, field: string, value: any): Promise<void> {
    try {
      if (this.useRedis && this.redisClient && typeof this.redisClient.hset === 'function') {
        const payload = typeof value === 'string' ? value : JSON.stringify(value);
        await this.redisClient.hset(key, field, payload);
      } else {
        // Memory fallback: use compound key
        const compoundKey = `${key}:${field}`;
        this.setInMemory(compoundKey, value, CACHE_TTL);
      }
    } catch (e) {
      console.warn('Cache hset error:', (e as Error).message || e);
      // Fallback to memory
      const compoundKey = `${key}:${field}`;
      this.setInMemory(compoundKey, value, CACHE_TTL);
    }
  }

  // Batch operations
  async mget(keys: string[]): Promise<(any | null)[]> {
    try {
      if (this.useRedis && this.redisClient && typeof this.redisClient.mget === 'function') {
        const results = await this.redisClient.mget(keys);
        return results.map((r: string | null) => {
          if (!r) return null;
          try {
            const buf = Buffer.from(r, 'base64');
            const json = gunzipSync(buf).toString('utf8');
            return JSON.parse(json);
          } catch {
            try {
              return JSON.parse(r);
            } catch {
              return r;
            }
          }
        });
      }
      // Memory fallback
      return keys.map((key) => this.getFromMemory(key));
    } catch (e) {
      console.warn('Cache mget error:', (e as Error).message || e);
      return keys.map(() => null);
    }
  }

  // Embeddings
  async getEmbedding(text: string, model: string = 'openai'): Promise<number[] | null> {
    const key = `embedding:${model}:${this.hashString(text)}`;
    return this.get<number[]>(key);
  }
  async setEmbedding(text: string, embedding: number[], model: string = 'openai'): Promise<void> {
    const key = `embedding:${model}:${this.hashString(text)}`;
    await this.set(key, embedding, 24 * 60 * 60 * 1000);
  }

  // Search results
  async getSearchResults(
    query: string,
    searchType: string,
    filters: any = {}
  ): Promise<any[] | null> {
    const key = `search:${searchType}:${this.hashString(query)}:${this.hashString(JSON.stringify(filters))}`;
    return this.get<any[]>(key);
  }
  async setSearchResults(
    query: string,
    searchType: string,
    results: any[],
    filters: any = {}
  ): Promise<void> {
    const key = `search:${searchType}:${this.hashString(query)}:${this.hashString(JSON.stringify(filters))}`;
    await this.set(key, results, 5 * 60 * 1000);
  }

  // Compute shader/modules
  async getShader(key: string): Promise<string | null> {
    const cacheKey = `shader:${this.hashString(key)}`;
    return this.get<string>(cacheKey);
  }
  async setShader(
    key: string,
    compiledWGSL: string,
    ttlMs: number = 6 * 60 * 60 * 1000
  ): Promise<void> {
    const cacheKey = `shader:${this.hashString(key)}`;
    await this.set(cacheKey, compiledWGSL, ttlMs);
  }

  // Internals
  private getFromMemory<T>(key: string): T | null {
    const item = memoryCache.get(key) as CacheItem<T> | undefined;
    if (!item) return null;
    const now = Date.now();
    if (now > item.timestamp + item.ttl) {
      memoryCache.delete(key);
      return null;
    }
    return item.data;
  }

  private setInMemory<T>(key: string, value: T, ttlMs: number): void {
    if (memoryCache.size >= MEMORY_CACHE_MAX_SIZE) {
      const firstKey = memoryCache.keys().next().value;
      if (firstKey) memoryCache.delete(firstKey);
    }
    memoryCache.set(key, { data: value, timestamp: Date.now(), ttl: ttlMs });
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // force 32-bit
    }
    return String(hash);
  }

  async close(): Promise<void> {
    try {
      if (this.redisClient) await this.redisClient.quit();
    } catch {}
  }
}

// Singleton instance
export const cache = new CacheService();
export const redis = cache; // compatibility alias

// Helper functions
export const cacheEmbedding = (text: string, embedding: number[], model?: string) =>
  cache.setEmbedding(text, embedding, model);
export const getCachedEmbedding = (text: string, model?: string) => cache.getEmbedding(text, model);
export const cacheSearchResults = (
  query: string,
  searchType: string,
  results: any[],
  filters?: unknown
) => cache.setSearchResults(query, searchType, results, filters as any);
export const getCachedSearchResults = (query: string, searchType: string, filters?: unknown) =>
  cache.getSearchResults(query, searchType, filters as any);
export const cacheShader = (key: string, compiledWGSL: string, ttlMs?: number) =>
  cache.setShader(key, compiledWGSL, ttlMs);
export const getCachedShader = (key: string) => cache.getShader(key);
