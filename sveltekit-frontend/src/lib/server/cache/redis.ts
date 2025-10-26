// Redis caching service for embeddings, shader modules, and search results
import { gzipSync, gunzipSync } from 'zlib';
import { Buffer } from 'buffer';

// In-memory L1 cache fallback (use unknown to avoid `any` while preserving generics)
const memoryCache = new Map<string, CacheItem<unknown>>();
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

  // Expose raw client for advanced usage
  get client() {
    return this.redisClient;
  }

  getClient() {
    return this.redisClient;
  }

  private async initializeRedis() {
    const password = process.env.REDIS_PASSWORD;
    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = process.env.REDIS_PORT || '6379';
    const url =
      process.env.REDIS_URL || (password ? `redis://:${password}@${host}:${port}` : `redis://${host}:${port}`);

    try {
      const mod = await import('ioredis');
      const Redis = (mod as any).default ?? mod;
      this.redisClient = new Redis(url, {
        // Improve connection reliability for HMR and SSR
        enableReadyCheck: false,
        enableOfflineQueue: true,
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      // Wire basic error handling
      this.redisClient.on?.('error', (err: any) => {
        console.warn('Redis connection error, falling back to memory cache:', err?.message || err);
        this.useRedis = false;
      });

      this.redisClient.on?.('ready', () => {
        console.log('📝 Redis cache connected and ready');
        this.useRedis = true;
      });

      // Some clients require explicit connect (lazy connection on first use)
      if (typeof this.redisClient.connect === 'function') {
        await this.redisClient.connect().catch((err: any) => {
          console.warn('Redis lazy connect failed:', err?.message || err);
          this.useRedis = false;
        });
      } else if (typeof this.redisClient.ping === 'function') {
        await this.redisClient.ping().catch((err: any) => {
          console.warn('Redis ping failed:', err?.message || err);
          this.useRedis = false;
        });
      }

      this.useRedis = true;
    } catch (error: any) {
      console.warn('Redis not available, using memory cache:', error?.message || error);
      this.useRedis = false;
      this.redisClient = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.useRedis && this.redisClient) {
        const rc = this.redisClient;
        // Check if client is closed due to HMR or connection issues
        if (typeof rc.status === 'string' && (rc.status === 'close' || rc.status === 'closing')) {
          console.warn('Redis client closed, falling back to memory');
          this.useRedis = false;
          return this.getFromMemory<T>(key);
        }
        // rc.get may return string | Buffer | Uint8Array depending on client/config
        const result: string | Buffer | Uint8Array | null = await rc.get(key);
        if (!result) return null;
        return this.decodeStoredValue<T>(result);
      }
      return this.getFromMemory<T>(key);
    } catch (e: any) {
      // Handle ClientClosedError and connection issues gracefully
      if (e?.message?.includes('ClientClosed') || e?.message?.includes('ECONNREFUSED')) {
        console.warn('Redis error, falling back to memory:', e?.message || e);
        this.useRedis = false;
        return this.getFromMemory<T>(key);
      }
      console.warn('Cache get error:', e?.message || e);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs: number = CACHE_TTL): Promise<void> {
    try {
      // Accept seconds for back-compat (<= 86400 treated as seconds)
      if (Number.isInteger(ttlMs) && ttlMs > 0 && ttlMs <= 86400) {
        ttlMs = ttlMs * 1000;
      }
      const payload = gzipSync(JSON.stringify(value)).toString('base64');
      if (this.useRedis && this.redisClient) {
        const rc = this.redisClient;
        const seconds = Math.max(1, Math.floor(ttlMs / 1000));
        try {
          if (typeof rc.setex === 'function') {
            await rc.setex(key, seconds, payload);
          } else if (typeof rc.setEx === 'function') {
            await rc.setEx(key, seconds, payload);
          } else if (typeof rc.set === 'function') {
            try {
              // newer redis client signature
              await rc.set(key, payload, { EX: seconds });
            } catch {
              await rc.set(key, payload, 'EX', seconds);
            }
          } else {
            // Fallback to memory if unknown API
            this.setInMemory(key, value, ttlMs);
          }
          return;
        } catch (e: any) {
          console.warn('Redis set failed, using memory cache:', e?.message || e);
        }
      }
      this.setInMemory(key, value, ttlMs);
    } catch (e: any) {
      console.warn('Cache set error:', e?.message || e);
      this.setInMemory(key, value, ttlMs);
    }
  }

  async setCompressed<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const ttl = Number.isFinite(ttlSeconds) ? Math.max(1, Math.floor(ttlSeconds)) : 3600;
    return this.set(key, value, ttl * 1000);
  }

  async del(key: string): Promise<void> {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.del(key);
      } else {
        memoryCache.delete(key);
      }
    } catch (e: any) {
      console.warn('Cache delete error:', e?.message || e);
    }
  }

  async incr(key: string): Promise<number> {
    try {
      if (this.useRedis && this.redisClient) {
        return await this.redisClient.incr(key);
      } else {
        const current = (this.getFromMemory<number>(key) as number) || 0;
        const newValue = current + 1;
        this.setInMemory(key, newValue, CACHE_TTL);
        return newValue;
      }
    } catch (e: any) {
      console.warn('Cache incr error:', e?.message || e);
      return 1;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.expire(key, seconds);
      }
      // memory fallback handled by TTL in set
    } catch (e: any) {
      console.warn('Cache expire error:', e?.message || e);
    }
  }

  async publish(channel: string, message: unknown): Promise<void> {
    try {
      if (this.useRedis && this.redisClient && typeof this.redisClient.publish === 'function') {
        const payload = typeof message === 'string' ? message : JSON.stringify(message);
        await this.redisClient.publish(channel, payload);
      }
    } catch (e: any) {
      console.warn('Cache publish error:', e?.message || e);
    }
  }

  async rpush(listKey: string, value: string): Promise<number> {
    try {
      if (this.useRedis && this.redisClient && typeof this.redisClient.rpush === 'function') {
        return await this.redisClient.rpush(listKey, value);
      }
    } catch (e: any) {
      console.warn('Redis rpush error:', e?.message || e);
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
    } catch (e: any) {
      console.warn('Redis blpop error:', e?.message || e);
    }
    return null;
  }

  async hget(key: string, field: string): Promise<string | null> {
    try {
      if (this.useRedis && this.redisClient && typeof this.redisClient.hget === 'function') {
        return await this.redisClient.hget(key, field);
      }
      const compoundKey = `${key}:${field}`;
      const item = this.getFromMemory<string>(compoundKey);
      return item;
    } catch (e: any) {
      console.warn('Cache hget error:', e?.message || e);
      return null;
    }
  }

  async hset(key: string, field: string, value: unknown): Promise<void> {
    try {
      if (this.useRedis && this.redisClient && typeof this.redisClient.hset === 'function') {
        const payload = typeof value === 'string' ? value : JSON.stringify(value);
        await this.redisClient.hset(key, field, payload);
      } else {
        const compoundKey = `${key}:${field}`;
        this.setInMemory(compoundKey, value, CACHE_TTL);
      }
    } catch (e: any) {
      console.warn('Cache hset error:', e?.message || e);
      const compoundKey = `${key}:${field}`;
      this.setInMemory(compoundKey, value, CACHE_TTL);
    }
  }

  async mget(keys: string[]): Promise<(any | null)[]> {
    try {
      if (this.useRedis && this.redisClient && typeof this.redisClient.mget === 'function') {
        const results = await this.redisClient.mget(keys);
        return results.map((r: string | Buffer | null) => {
          if (!r) return null;
          return this.decodeStoredValue<any>(r);
        });
      }
      return keys.map(k => this.getFromMemory<any>(k));
    } catch (e: any) {
      console.warn('Cache mget error:', e?.message || e);
      return keys.map(() => null);
    }
  }

  // Domain helpers
  async getEmbedding(text: string, model = 'openai'): Promise<number[] | null> {
    const key = `embedding:${model}:${this.hashString(text)}`;
    return this.get<number[]>(key);
  }
  async setEmbedding(text: string, embedding: number[], model = 'openai'): Promise<void> {
    const key = `embedding:${model}:${this.hashString(text)}`;
    await this.set(key, embedding, 24 * 60 * 60 * 1000);
  }

  async getSearchResults(query: string, searchType: string, filters: unknown = {}): Promise<any[] | null> {
    const key = `search:${searchType}:${this.hashString(query)}:${this.hashString(JSON.stringify(filters))}`;
    return this.get<any[]>(key);
  }
  async setSearchResults(query: string, searchType: string, results: any[], filters: unknown = {}): Promise<void> {
    const key = `search:${searchType}:${this.hashString(query)}:${this.hashString(JSON.stringify(filters))}`;
    await this.set(key, results, 5 * 60 * 1000);
  }

  async getShader(key: string): Promise<string | null> {
    const cacheKey = `shader:${this.hashString(key)}`;
    return this.get<string>(cacheKey);
  }
  async setShader(key: string, compiledWGSL: string, ttlMs = 6 * 60 * 60 * 1000): Promise<void> {
    const cacheKey = `shader:${this.hashString(key)}`;
    await this.set(cacheKey, compiledWGSL, ttlMs);
  }

  // Internals
  private getFromMemory<T>(key: string): T | null {
    const item = memoryCache.get(key);
    if (!item) return null;
    const now = Date.now();
    if (now > item.timestamp + item.ttl) {
      memoryCache.delete(key);
      return null;
    }
    return item.data as T;
  }

  private setInMemory<T>(key: string, value: T, ttlMs: number): void {
    if (memoryCache.size >= MEMORY_CACHE_MAX_SIZE) {
      const firstKey = memoryCache.keys().next().value;
      if (firstKey) memoryCache.delete(firstKey);
    }
    memoryCache.set(key, { data: value, timestamp: Date.now(), ttl: ttlMs });
  }

  // Alias for backward compatibility
  private setToMemory<T>(key: string, value: T, ttlMs: number): void {
    this.setInMemory(key, value, ttlMs);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return String(hash);
  }

  async close(): Promise<void> {
    try {
      if (this.redisClient && typeof this.redisClient.quit === 'function') {
        await this.redisClient.quit();
      }
    } catch {}
  }

  // Robust decoder for values stored in Redis:
  // - Accepts string | Buffer | Uint8Array
  // - If value is base64-encoded gzip, gunzip and parse JSON
  // - If value is raw gzip bytes, gunzip and parse JSON
  // - Else try JSON.parse on UTF-8 text
  // - Else return raw string
  private decodeStoredValue<T>(raw: unknown): T | string {
    if (raw == null) return raw as unknown as T;
    try {
      // Normalize any binary-like input to a Buffer
      let buf: Buffer | null = null;

      // ArrayBuffer -> Buffer
      if (raw instanceof ArrayBuffer) {
        buf = Buffer.from(new Uint8Array(raw));
      } else if (typeof Uint8Array !== 'undefined' && raw instanceof Uint8Array) {
        // Typed array directly
        buf = Buffer.from(raw);
      } else if (
        typeof ArrayBuffer !== 'undefined' &&
        typeof raw === 'object' &&
        raw !== null &&
        'buffer' in (raw as object) &&
        (raw as { buffer: unknown }).buffer instanceof ArrayBuffer
      ) {
        // Generic ArrayBufferView-like object (preserve offset/length when present)
        const view = raw as {
          buffer: ArrayBuffer;
          byteOffset?: number;
          byteLength?: number;
        };
        const byteOffset = typeof view.byteOffset === 'number' ? view.byteOffset : 0;
        const byteLength = typeof view.byteLength === 'number' ? view.byteLength : view.buffer.byteLength;
        buf = Buffer.from(new Uint8Array(view.buffer, byteOffset, byteLength));
      } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(raw)) {
        buf = raw as Buffer;
      } else if (typeof raw === 'string') {
        const str = raw;
        // Try base64 -> gzip detection first (this is how set stores compressed payloads)
        try {
          if (str.length > 0) {
            const maybeBuf = Buffer.from(str, 'base64');
            if (maybeBuf.length >= 2 && maybeBuf[0] === 0x1f && maybeBuf[1] === 0x8b) {
              const json = gunzipSync(maybeBuf).toString('utf8');
              return JSON.parse(json) as T;
            }
          }
        } catch {
          // not base64-gzip - fall through to JSON/string parse
        }
        // Not base64-gzip, attempt to parse as JSON text
        try {
          return JSON.parse(str) as T;
        } catch {
          return str as unknown as T;
        }
      }

      // If we have a Buffer (raw binary), check if it's gzip-compressed
      if (buf) {
        if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
          const json = gunzipSync(buf).toString('utf8');
          return JSON.parse(json) as T;
        }
        // Try UTF-8 string parse
        const text = buf.toString('utf8');
        try {
          return JSON.parse(text) as T;
        } catch {
          return text as unknown as T;
        }
      }

      // Fallback - return as-is
      return raw as unknown as T;
    } catch {
      // Last-resort: coerce to string
      try {
        if (typeof Buffer !== 'undefined' && Buffer.isBuffer(raw)) {
          return (raw as Buffer).toString('utf8') as unknown as T;
        }
        if (typeof Uint8Array !== 'undefined' && raw instanceof Uint8Array) {
          return Buffer.from(raw).toString('utf8') as unknown as T;
        }
        return String(raw) as unknown as T;
      } catch {
        return raw as unknown as T;
      }
    }
  }

  // --- Redis Operations for Search Analytics ---

  /**
   * Increment a sorted set member score (for top-k tracking)
   */
  async zincrby(key: string, increment: number, member: string): Promise<number | null> {
    try {
      if (this.useRedis && this.redisClient?.zincrby) {
        return await this.redisClient.zincrby(key, increment, member);
      }
      // Fallback: track in memory
      const memKey = `${key}:${member}`;
      const current = (this.getFromMemory<number>(memKey) as number) || 0;
      const updated = current + increment;
      this.setToMemory(memKey, updated, 3600);
      return updated;
    } catch (e) {
      console.warn('Cache zincrby error:', e?.message || e);
      return null;
    }
  }

  /**
   * Get range from sorted set in reverse order with scores
   */
  async zrevrange(key: string, start: number, stop: number, withScores?: string): Promise<string[]> {
    try {
      if (this.useRedis && this.redisClient?.zrevrange) {
        if (withScores === 'WITHSCORES') {
          return await this.redisClient.zrevrange(key, start, stop, 'WITHSCORES');
        }
        return await this.redisClient.zrevrange(key, start, stop);
      }
      // Fallback: return empty
      return [];
    } catch (e) {
      console.warn('Cache zrevrange error:', e?.message || e);
      return [];
    }
  }

  /**
   * Push item to list
   */
  async lpush(key: string, ...values: string[]): Promise<number | null> {
    try {
      if (this.useRedis && this.redisClient?.lpush) {
        return await this.redisClient.lpush(key, ...values);
      }
      return null;
    } catch (e) {
      console.warn('Cache lpush error:', e?.message || e);
      return null;
    }
  }

  /**
   * Trim list to range
   */
  async ltrim(key: string, start: number, stop: number): Promise<void> {
    try {
      if (this.useRedis && this.redisClient?.ltrim) {
        await this.redisClient.ltrim(key, start, stop);
      }
    } catch (e) {
      console.warn('Cache ltrim error:', e?.message || e);
    }
  }

  /**
   * Ping Redis to check connection
   */
  async ping(): Promise<boolean> {
    try {
      if (this.useRedis && this.redisClient?.ping) {
        const result = await this.redisClient.ping();
        return result === 'PONG' || result === true;
      }
      return false;
    } catch (e) {
      console.warn('Cache ping error:', e?.message || e);
      return false;
    }
  }
}

// Singleton
export const cache = new CacheService();
export const redis = cache; // compatibility alias

// Simple helpers
export const cacheEmbedding = (text: string, embedding: number[], model?: string) =>
  cache.setEmbedding(text, embedding, model);
export const getCachedEmbedding = (text: string, model?: string) => cache.getEmbedding(text, model);
export const cacheSearchResults = (query: string, searchType: string, results: any[], filters?: unknown) =>
  cache.setSearchResults(query, searchType, results, filters);
export const getCachedSearchResults = (query: string, searchType: string, filters?: unknown) =>
  cache.getSearchResults(query, searchType, filters);
export const cacheShader = (key: string, compiledWGSL: string, ttlMs?: number) =>
  cache.setShader(key, compiledWGSL, ttlMs);
export const getCachedShader = (key: string) => cache.getShader(key);
