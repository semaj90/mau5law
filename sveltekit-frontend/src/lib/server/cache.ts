import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

export const MEMORY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes default
export const memoryCache = new Map<string, { value: unknown; expires: number }>();

const REDIS_URL = process.env.REDIS_URL ?? process.env.VITE_REDIS_URL ?? 'redis://localhost:6379';
let redisClient: RedisClientType | null = null;
let redisConnected = false;

// Simple configuration for retries and timeouts
const REDIS_OP_MAX_RETRIES = Number(process.env.REDIS_OP_MAX_RETRIES ?? 3);
const REDIS_OP_BASE_DELAY_MS = Number(process.env.REDIS_OP_BASE_DELAY_MS ?? 200);
const REDIS_OP_TIMEOUT_MS = Number(process.env.REDIS_OP_TIMEOUT_MS ?? 5000);

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withBackoff<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  let lastErr: unknown;
  while (attempt < REDIS_OP_MAX_RETRIES) {
    try {
      // timeout wrapper
      const res = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Redis op timeout')), REDIS_OP_TIMEOUT_MS)),
      ]);
      return res as T;
    } catch (err) {
      lastErr = err;
      attempt++;
      const delay = REDIS_OP_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
  throw lastErr;
}

/**
 * Lazily return a connected Redis client or null when Redis is disabled/unavailable.
 * Enable Redis explicitly with USE_REDIS=true or by setting REDIS_URL in the environment.
 */
export async function getRedisClient(): Promise<RedisClientType | null> {
  if (redisConnected && redisClient) return redisClient;
  try {
    const useRedis = process.env.CACHE_BACKEND === 'redis' || process.env.USE_REDIS === 'true' || Boolean(process.env.REDIS_URL);
    if (!useRedis) return null;

    if (!redisClient) {
      redisClient = createClient({ url: REDIS_URL, socket: { reconnectStrategy: () => 1000 } });
      redisClient.on('error', (err: unknown) => console.error('Redis client error:', err));
    }
    if (!redisConnected) {
      await withBackoff(() => redisClient!.connect());
      redisConnected = true;
    }
    return redisClient;
  } catch (err) {
    console.error('Failed to connect to Redis, falling back to memory cache:', err);
    redisClient = null;
    redisConnected = false;
    return null;
  }
}

/**
 * Set a key in Redis (if available) and in the module-scoped memory cache.
 * ttlMs is optional and defaults to MEMORY_CACHE_TTL_MS.
 */
export async function setCache(key: string, value: unknown, ttlMs?: number): Promise<void> {
  const ttl = typeof ttlMs === 'number' && ttlMs > 0 ? ttlMs : MEMORY_CACHE_TTL_MS;
  // Write to memory cache
  try {
    memoryCache.set(key, { value, expires: Date.now() + ttl });
  } catch (e) {
    console.warn('Failed to write memory cache:', e);
  }

  // Attempt Redis write (best-effort)
  try {
    const client = await getRedisClient();
    if (!client) return;
    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    // EX expects seconds
    const exSeconds = Math.max(1, Math.ceil(ttl / 1000));
    await withBackoff(() => client.set(key, payload, { EX: exSeconds }));
  } catch (err) {
    console.warn('Redis SET failed (best-effort):', err);
  }
}

export function getFromMemoryCache(key: string): { found: boolean; value?: unknown } {
  const cur = memoryCache.get(key);
  if (!cur) return { found: false };
  if (cur.expires < Date.now()) {
    memoryCache.delete(key);
    return { found: false };
  }
  return { found: true, value: cur.value };
}

// Simple API key auth helper for routes. If CACHE_API_KEY is set, requests must include
// header x-api-key: <key>. Returns true when ok.
export function checkApiKey(headers: Headers): { ok: boolean; message?: string } {
  const configured = process.env.CACHE_API_KEY;
  if (!configured) return { ok: true };
  const provided = headers.get('x-api-key') ?? headers.get('X-API-KEY');
  if (!provided) return { ok: false, message: 'Missing x-api-key header' };
  if (provided !== configured) return { ok: false, message: 'Invalid API key' };
  return { ok: true };
}

// Very small in-memory rate limiter (token bucket) keyed by client key or IP.
const RATE_LIMIT_TOKENS = Number(process.env.CACHE_RATE_LIMIT_TOKENS ?? 10);
const RATE_LIMIT_REFILL_MS = Number(process.env.CACHE_RATE_LIMIT_REFILL_MS ?? 60_000);
const buckets = new Map<string, { tokens: number; lastRefill: number }>();

export function checkRateLimit(key = 'global'): { ok: boolean; remaining?: number } {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: RATE_LIMIT_TOKENS, lastRefill: now };
  const elapsed = now - bucket.lastRefill;
  if (elapsed > 0) {
    const refill = Math.floor(elapsed / RATE_LIMIT_REFILL_MS) * RATE_LIMIT_TOKENS;
    if (refill > 0) {
      bucket.tokens = Math.min(RATE_LIMIT_TOKENS, bucket.tokens + refill);
      bucket.lastRefill = now;
    }
  }
  if (bucket.tokens <= 0) {
    buckets.set(key, bucket);
    return { ok: false, remaining: 0 };
  }
  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return { ok: true, remaining: bucket.tokens };
}
