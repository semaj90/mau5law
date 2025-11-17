import type { gzipSync, gunzipSync  } from 'zlib';
import type { Buffer  } from 'buffer';
import crypto from 'crypto';
import type { createClient  } from 'redis';

// --- Custom Type to handle Redis client type inference issues ---
type AppRedisClient = ReturnType<typeof createClient>;

const IS_SERVER = typeof window === 'undefined';
const DEFAULT_TTL_MS = 10 * 60 * 1000;
const MEMORY_CACHE_LIMIT = 1000;

// --- Redis bootstrap (optional direct client) -------------------------------
let baseClient: AppRedisClient | null = null;

async function initializeRedisClient() {
  if (baseClient && baseClient.isReady) return baseClient;
  const REDIS_URL = process.env.REDIS_URL || 'redis://:redis@localhost:6379/0';
  try {
    const client = createClient({ url: REDIS_URL });
    client.on('error', (err) => console.error('[redis] Client Error:', err));
    client.on('connect', () => console.log('[redis] Connected'));
    await client.connect();
    baseClient = client;
    return baseClient;
  } catch (err) {
    console.warn('[redis] Initialization failed:', err);
    baseClient = null;
    return null;
  }
}

// Initialize once on server start (non-blocking)
if (IS_SERVER) initializeRedisClient().catch(() => {});

// --- Helper types ----------------------------------------------------------
type RedisClient = AppRedisClient | null;

interface MemoryEntry {
  value: unknown;
  expiresAt: number;
}
interface RedisConfig {
  url: string;
}
export interface LangCacheEntry<T> {
  embedding?: number[];
  result?: T;
  tokens?: number;
  ttl?: number;
}

// --- Local in-memory fallback ----------------------------------------------
class MemoryCache {
  private store = new Map<string, MemoryEntry>();
  get<T>(key: string): T | null {
    const e = this.store.get(key);
    if (!e) return null;
    if (Date.now() > e.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return e.value as T;
  }
  set(key: string, value: unknown, ttl: number) {
    if (this.store.size >= MEMORY_CACHE_LIMIT) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + Math.max(1, ttl) });
  }
  delete(key: string) {
    this.store.delete(key);
  }
}
const globalMemoryCache = new MemoryCache();

// --- Utility functions -----------------------------------------------------
function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
function resolveRedisConfig(): RedisConfig | null {
  const url = process.env.REDIS_URL?.trim();
  if (url) return { url };
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = process.env.REDIS_PORT || '6379';
  const password = process.env.REDIS_PASSWORD;
  return password
    ? { url: `redis://:${password}@${host}:${port}` }
    : { url: `redis://${host}:${port}` };
}
function tryCreateClient(config: RedisConfig | null): AppRedisClient | null {
  if (!config) return null;
  try {
    const c = createClient({ url: config.url });
    c.on('error', (e) => console.warn('[redis] client error', formatError(e)));
    return c;
  } catch (e) {
    console.warn('[redis] failed to init client', formatError(e));
    return null;
  }
}

// --- Main CacheService -----------------------------------------------------
export class CacheService {
  private client: RedisClient;
  constructor(private readonly config: RedisConfig | null) {
    this.client = IS_SERVER ? tryCreateClient(config) : null;
  }

  private encode(v: unknown): string {
    const json = JSON.stringify(v);
    return gzipSync(Buffer.from(json, 'utf8')).toString('base64');
  }
  private decode<T>(raw: string | Buffer | null): T | null {
    if (raw == null) return null;
    try {
      const buf = typeof raw === 'string' ? Buffer.from(raw, 'base64') : Buffer.from(raw);
      return JSON.parse(gunzipSync(buf).toString('utf8')) as T;
    } catch {
      try {
        return JSON.parse(raw.toString()) as T;
      } catch {
        return raw as unknown as T;
      }
    }
  }
  private async ensureClient(): Promise<AppRedisClient | null> {
    if (!IS_SERVER) return null;
    if (!this.client) this.client = tryCreateClient(this.config);
    const client = this.client;
    if (!client) return null;
    if (!client.isOpen) {
      try {
        await client.connect();
      } catch (e) {
        console.warn('[redis] connect failed', formatError(e));
        await this.safeShutdown(client);
        this.client = null;
        return null;
      }
    }
    return client;
  }
  private async safeShutdown(c: AppRedisClient) {
    try {
      await c.quit();
    } catch {
      // ignore error
    }
    try {
      await c.disconnect();
    } catch {
      // ignore error
    }
  }
  private hash(v: string) {
    return crypto.createHash('sha256').update(v).digest('hex');
  }

  // --- core cache ops ---
  async get<T>(key: string): Promise<T | null> {
    const c = await this.ensureClient();
    if (c) {
      try {
        const raw = await c.get(key);
        const val = this.decode<T>(raw);
        if (val != null) return val;
      } catch (e) {
        console.warn('[cache] get failed', formatError(e));
      }
    }
    return globalMemoryCache.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS) {
    const payload = this.encode(value);
    const c = await this.ensureClient();
    if (c) {
      try {
        await c.set(key, payload, { PX: Math.max(1, ttlMs) });
        globalMemoryCache.set(key, value, ttlMs);
        return;
      } catch (e) {
        console.warn('[cache] set failed', formatError(e));
      }
    }
    globalMemoryCache.set(key, value, ttlMs);
  }

  async del(key: string) {
    const c = await this.ensureClient();
    if (c) {
      try {
        await c.del(key);
      } catch (e) {
        console.warn('[cache] del failed', formatError(e));
      }
    }
    globalMemoryCache.delete(key);
  }

  async ping(): Promise<boolean> {
    const c = await this.ensureClient();
    if (!c) return false;
    try {
      const res = await c.ping();
      return res === 'PONG' || res === 'OK';
    } catch (e) {
      console.warn('[cache] ping failed', formatError(e));
      return false;
    }
  }

  // --- domain helpers ---
  async getEmbedding(text: string, model = 'default') {
    const key = `embedding_${this.hash(text)}_${model}`;
    return this.get<number[]>(key);
  }
  async setEmbedding(text: string, emb: number[], model = 'default') {
    const key = `embedding_${this.hash(text)}_${model}`;
    await this.set(key, emb, 24 * 60 * 60 * 1000);
  }
  async getShader(key: string) {
    return this.get<string>(`shader_${key}`);
  }
  async setShader(key: string, wgsl: string, ttl = 6 * 60 * 60 * 1000) {
    await this.set(`shader_${key}`, wgsl, ttl);
  }

  async close() {
    if (!this.client) return;
    const c = this.client;
    this.client = null;
    await this.safeShutdown(c);
  }
  async getClient() {
    return this.ensureClient();
  }
}

// --- exported singletons ---------------------------------------------------
const redisConfig = resolveRedisConfig();
export const cache = new CacheService(redisConfig);
export const redis = cache; // alias for convenience

export async function getRedisClient(): Promise<AppRedisClient | null> {
  return cache.getClient();
}
export async function closeRedisClient() {
  await cache.close();
}

// --- helper wrappers -------------------------------------------------------
export async function waitForRedis(timeoutMs = 5000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await cache.ping()) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

export async function setLangCache<T>(
  model: string,
  prompt: string,
  data: LangCacheEntry<T>,
  ttlSec = 3600
) {
  const key = `langcache_${model}_${crypto.createHash('sha256').update(prompt).digest('hex')}`;
  await cache.set(key, data, ttlSec * 1000);
}
export async function getLangCache<T>(
  model: string,
  prompt: string
): Promise<LangCacheEntry<T> | null> {
  const key = `langcache_${model}_${crypto.createHash('sha256').update(prompt).digest('hex')}`;
  return cache.get<LangCacheEntry<T>>(key);
}
export async function deleteLangCache(model: string, prompt: string) {
  const key = `langcache_${model}_${crypto.createHash('sha256').update(prompt).digest('hex')}`;
  await cache.del(key);
}

export default cache;
