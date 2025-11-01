/**
 * Unified Redis Cache Service
 * - Works with EmbeddingGemma + Ollama + Qdrant vector services
 * - Supports gzip+base64 compression, in-memory fallback, and async ping
 * - Fully ESM-safe for SvelteKit 2 + Node 22
 */
import { gzipSync, gunzipSync } from 'zlib';
import { Buffer } from 'buffer';
import crypto from 'crypto';
import { createClient, type RedisClientType } from 'redis';
import { env } from '$env/dynamic/private';
/* -------------------------------------------------------------------------- */
/*  Error Formatting Utility                                                  */
/* -------------------------------------------------------------------------- */
export function formatError(e: any): string {
  if (!e) return String(e);
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
/* -------------------------------------------------------------------------- */
/*  Types + Env Setup                                                         */
/* -------------------------------------------------------------------------- */
// Use the official RedisClientType from the redis package for clarity and compatibility.
// Declare a single local alias to avoid merged declaration conflicts.
type RedisClient = RedisClientType | null;
const IS_SERVER = typeof window === 'undefined';
// Redis connection configuration - handle both authenticated and non-authenticated Redis
function getRedisConfig() {
  // Check if REDIS_URL is provided
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    // Parse URL to check if it has auth
    try {
      const url = new URL(redisUrl);
      // If URL has auth but Redis server doesn't require it, remove it
      if (url.password) {
        console.log('⚠️ REDIS_URL contains password, but Redis may not require auth. Trying both methods...');
      }
      return { url: redisUrl };
    } catch {
      // Invalid URL, fall back to default
    }
  }
  // Build connection without password for local development
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = process.env.REDIS_PORT || '6379';
  const password = process.env.REDIS_PASSWORD;
  // Only include password if explicitly set and not empty
  if (password && password !== 'redis' && password !== '') {
    return { url: `redis://:${password}@${host}:${port}` };
  } else {
    // Connect without authentication for local development
    return { url: `redis://${host}:${port}` };
  }
}
const redisConfig = getRedisConfig();
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour
const MEMORY_CACHE_MAX_SIZE = 1000;
interface MemoryEntry {
  data: any;
  timestamp: number;
  ttl: number;
}
const memoryCache = new Map<string, MemoryEntry>();
/* -------------------------------------------------------------------------- */
/*  Lazy Redis Client Init (server-only)                                      */
/* -------------------------------------------------------------------------- */
let rawRedisClient: RedisClient = null;
if (IS_SERVER) {
  try {
    // guard createClient to avoid "possibly 'undefined'" errors
    if (typeof createClient === 'function') {
      // createClient is the node-redis v4 factory; use socket.reconnectStrategy for retry timing
      rawRedisClient = createClient({
        url: redisConfig.url,
        socket: {
          // simple reconnect strategy: linear-backoff capped at 2s
          reconnectStrategy: (attempts: number) => Math.min(attempts * 100, 2000),
        },
      });
      // handle runtime errors (suppress auth errors for local dev)
      rawRedisClient.on('error', (err: any) => {
        const errMsg = formatError(err);
        // Suppress password auth errors for local development
        if (!errMsg.includes('AUTH') && !errMsg.includes('password')) {
          console.warn('Redis error:', errMsg);
        }
      });
      // attempt connection, but don't crash if it fails — fall back to in-memory cache
      void rawRedisClient.connect().catch((err) => {
        const errMsg = formatError(err);
        if (errMsg.includes('AUTH') || errMsg.includes('password')) {
          console.warn('⚠️ Redis auth mismatch detected — trying without password...');
          // Try reconnecting without auth
          rawRedisClient = createClient({
            url: `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || '6379'}`,
            socket: {
              reconnectStrategy: (attempts: number) => Math.min(attempts * 100, 2000),
            },
          });
          rawRedisClient.on('error', () => {}); // Suppress further errors
          void rawRedisClient.connect().catch(() => {
            console.warn('⚠️ Redis connect failed — using in-memory fallback.');
            rawRedisClient = null;
          });
        } else {
          console.warn('⚠️ Redis connect failed — using in-memory fallback.');
          rawRedisClient = null;
        }
      });
    } else {
      console.warn('⚠️ redis.createClient is not available — using in-memory fallback.');
      rawRedisClient = null;
    }
  } catch (e: any) {
    console.warn('⚠️ Redis client creation failed — using in-memory fallback.', formatError(e));
    rawRedisClient = null;
  }
}
/* -------------------------------------------------------------------------- */
/*  Redis-like Interface                                                      */
/* -------------------------------------------------------------------------- */
type RedisLike = Partial<{
  get(key: string): Promise<string | Buffer | null>;
  set(key: string, value: string, ...args: any[]): Promise<unknown>;
  del(key: string): Promise<unknown>;
  ping(): Promise<unknown>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<unknown>;
  mget(keys: string[]): Promise<(string | null)[] | null>;
  quit(): Promise<void>;
}>;
/* -------------------------------------------------------------------------- */
/*  Cache Service                                                             */
/* -------------------------------------------------------------------------- */
export class CacheService {
  public client: RedisClient | null = rawRedisClient;
  private isRedisReady(): boolean {
    // node-redis exposes `isOpen` boolean when connected
    try {
      return !!(this.client && (this.client as RedisClient).isOpen);
    } catch {
      return false;
    }
  }
  private encode<T>(val: T): string {
    const json = JSON.stringify(val);
    return gzipSync(Buffer.from(json, 'utf8')).toString('base64');
  }
  private decode<T>(raw: any): T {
    try {
      if (raw == null) return raw as T;
      const buf =
        typeof raw === 'string'
          ? Buffer.from(raw, 'base64')
          : Buffer.isBuffer(raw)
            ? raw
            : raw instanceof Uint8Array
              ? Buffer.from(raw)
              : null;
      if (buf && buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b)
        return JSON.parse(gunzipSync(buf).toString('utf8')) as T;
      if (buf) return JSON.parse(buf.toString('utf8')) as T;
      if (typeof raw === 'string') return JSON.parse(raw) as T;
      return raw as T;
    } catch {
      return raw as T;
    }
  }
  /* ---------------------------- Memory fallback ---------------------------- */
  private getFromMemory<T>(key: string): T | null {
    const item = memoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.timestamp + item.ttl) {
      memoryCache.delete(key);
      return null;
    }
    return item.data as T;
  }
  private setInMemory<T>(key: string, val: T, ttlMs: number): void {
    if (memoryCache.size >= MEMORY_CACHE_MAX_SIZE) {
      const oldest = memoryCache.keys().next().value;
      if (oldest) memoryCache.delete(oldest);
    }
    memoryCache.set(key, { data: val, timestamp: Date.now(), ttl: ttlMs });
  }
  /* ----------------------------- Core commands ----------------------------- */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isRedisReady()) {
        const rc = this.client as unknown as RedisLike;
        const res = await rc.get?.(key);
        if (res == null) return null;
        return this.decode<T>(res);
      }
    } catch (err: any) {
      console.warn('Cache.get failed:', formatError(err));
    }
    return this.getFromMemory<T>(key);
  }
  async set<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): Promise<void> {
    const seconds = Math.max(1, Math.floor(ttlMs / 1000));
    const payload = this.encode(value);
    try {
      if (this.isRedisReady()) {
        const rc = this.client as unknown as RedisLike;
        try {
          // node-redis v4 accepts EX option object form
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await rc.set?.(key, payload, { EX: seconds });
        } catch {
          // fallback to argument form if available
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await rc.set?.(key, payload, 'EX', seconds);
        }
        return;
      }
    } catch (err: any) {
      console.warn('Cache.set error:', formatError(err));
    }
    this.setInMemory(key, value, ttlMs);
  }
  async del(key: string): Promise<void> {
    try {
      if (this.isRedisReady()) await (this.client as RedisLike).del?.(key);
    } catch (err) {
      console.warn('Cache.del error:', formatError(err));
    } finally {
      memoryCache.delete(key);
    }
  }
  async ping(): Promise<boolean> {
    try {
      const res = await (this.client as RedisLike)?.ping?.();
      return res === 'PONG' || res === 'OK' || res === true;
    } catch {
      return false;
    }
  }
  /* ----------------------------- Hash / Multi ------------------------------ */
  async hget(key: string, field: string): Promise<string | null> {
    try {
      if (this.isRedisReady()) return (this.client as RedisLike).hget?.(key, field) ?? null;
      return this.getFromMemory<string>(`${key}:${field}`);
    } catch (err) {
      console.warn('Cache.hget error:', formatError(err));
      return null;
    }
  }
  async hset(key: string, field: string, value: any): Promise<void> {
    try {
      if (this.isRedisReady()) {
        const payload = typeof value === 'string' ? value : JSON.stringify(value);
        await (this.client as RedisLike).hset?.(key, field, payload);
        return;
      }
    } catch (err) {
      console.warn('Cache.hset error:', formatError(err));
    }
    this.setInMemory(`${key}:${field}`, value, DEFAULT_TTL_MS);
  }
  async mget(keys: string[]): Promise<(unknown | null)[]> {
    try {
      if (this.isRedisReady()) {
        const res = await (this.client as RedisLike).mget?.(keys);
        return (res ?? []).map(r => (r == null ? null : this.decode(r)));
      }
    } catch (err) {
      console.warn('Cache.mget error:', formatError(err));
    }
    return keys.map(k => this.getFromMemory(k));
  }
  /* ------------------------------ Domain APIs ------------------------------ */
  private hashString(str: string): string {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
    return String(h | 0);
  }
  async getEmbedding(text: string, model = 'openai') {
    return this.get<number[]>(`embedding:${model}:${this.hashString(text)}`);
  }
  async setEmbedding(text: string, emb: number[], model = 'openai') {
    return this.set(`embedding:${model}:${this.hashString(text)}`, emb, 24 * 60 * 60 * 1000);
  }
  async getSearchResults(query: string, type: string, filters: any = {}) {
    return this.get<unknown[]>(`search:${type}:${this.hashString(query)}:${this.hashString(JSON.stringify(filters))}`);
  }
  async setSearchResults(query: string, type: string, results: any[], filters: any = {}) {
    return this.set(
      `search:${type}:${this.hashString(query)}:${this.hashString(JSON.stringify(filters))}`,
      results,
      5 * 60 * 1000
    );
  }
  async getShader(key: string) {
    return this.get<string>(`shader:${this.hashString(key)}`);
  }
  async setShader(key: string, wgsl: string, ttlMs = 6 * 60 * 60 * 1000) {
    return this.set(`shader:${this.hashString(key)}`, wgsl, ttlMs);
  }
  async close() {
    try {
      const maybeQuit = this.client as unknown as { quit?: () => Promise<void>; disconnect?: () => Promise<void> };
      // node-redis v4 uses quit() and disconnect()
      await maybeQuit.quit?.();
      await maybeQuit.disconnect?.();
    } catch {
      /* ignore */
    }
  }
}
/* -------------------------------------------------------------------------- */
/*  Singleton + Helper Exports                                                */
/* -------------------------------------------------------------------------- */
export const cache = new CacheService();
export const redisClient = (): RedisClient | null => cache.client;
export const redis = cache;
export async function waitForRedis(timeout = 5000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await cache.ping()) return true;
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}
/* -------------------------------------------------------------------------- */
/*  Shortcut APIs (for semantic clarity)                                      */
/* -------------------------------------------------------------------------- */
export const cacheEmbedding = (text: string, embedding: number[], model = 'openai') =>
  cache.setEmbedding(text, embedding, model);
export const getCachedEmbedding = (text: string, model = 'openai') => cache.getEmbedding(text, model);
export const cacheSearchResults = (query: string, type: string, results: any[], filters?: any) =>
  cache.setSearchResults(query, type, results, filters);
export const getCachedSearchResults = (query: string, type: string, filters?: any) =>
  cache.getSearchResults(query, type, filters);
export const cacheShader = (key: string, compiledWGSL: string, ttlMs?: number) =>
  cache.setShader(key, compiledWGSL, ttlMs ?? undefined);
export const getCachedShader = (key: string) => cache.getShader(key);
export default cache;
// --- Langcache specific functions ---
/**
 * Generates a SHA256 hash for a given prompt.
 * @param prompt The input string to hash.
 * @returns The SHA256 hash as a hexadecimal string.
 */
function generateSha256(prompt: string): string {
  return crypto.createHash('sha256').update(prompt).digest('hex');
}
interface LangCacheEntry<T> {
  embedding?: number[];
  result?: T;
  tokens?: number;
  ttl?: number; // Time to live in seconds
}
/**
 * Stores an item in the langcache.
 * Key pattern: `langcache:{model}:{shaPrompt}`
 * @param model The AI model identifier.
 * @param prompt The original prompt.
 * @param data The data to store (embedding, result, tokens).
 * @param ttl Time to live in seconds (default: 3600).
 */
export async function setLangCache<T>(
  model: string,
  prompt: string,
  data: LangCacheEntry<T>,
  ttl: number = 3600
): Promise<void> {
  const shaPrompt = generateSha256(prompt);
  const key = `langcache:${model}:${shaPrompt}`;
  await cache.set(key, data, ttl * 1000); // ttl is in seconds, cache.set expects ms
}
/**
 * Retrieves an item from the langcache.
 * @param model The AI model identifier.
 * @param prompt The original prompt.
 * @returns The cached data or null if not found.
 */
export async function getLangCache<T>(model: string, prompt: string): Promise<LangCacheEntry<T> | null> {
  const shaPrompt = generateSha256(prompt);
  const key = `langcache:${model}:${shaPrompt}`;
  return cache.get<LangCacheEntry<T>>(key);
}
/**
 * Deletes an item from the langcache.
 * @param model The AI model identifier.
 * @param prompt The original prompt.
 */
export async function deleteLangCache(model: string, prompt: string): Promise<void> {
  const shaPrompt = generateSha256(prompt);
  const key = `langcache:${model}:${shaPrompt}`;
  await cache.del(key);
}
/* -------------------------------------------------------------------------- */
/*  Public Client Access                                                      */
/* -------------------------------------------------------------------------- */
/**
 * Get the Redis client instance (or in-memory fallback)
 */
export async function getRedisClient(): Promise<CacheService> {
  return cache;
}
/**
 * Close Redis connection gracefully
 */
export async function closeRedisClient(): Promise<void> {
  if (cache.client && typeof (cache.client as RedisLike).quit === 'function') {
    await (cache.client as RedisLike).quit?.();
    console.log('🔌 Redis connection closed');
  }
}
