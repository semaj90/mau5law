import Redis from 'ioredis';
import { getRedisConfig, createServiceConfig, KEY_PATTERNS, LUA_SCRIPTS } from '$lib/config/redis-config';

export interface RedisRateLimitOptions {
  limit: number;           // max requests per window
  windowSec: number;       // window size seconds
  key: string;             // unique key (user id scoped)
  redis?: Redis;           // optional external client
}

const singleton = { client: null as Redis | null };

function getClient(): Redis {
  if (singleton.client) return singleton.client;

  // Use centralized Redis configuration for rate limiting
  const config = createServiceConfig('RATE_LIMIT');
  singleton.client = new Redis(config);

  singleton.client.on('error', (e: any) => {
    console.error('[redisRateLimit] Redis error:', e.message);
    if (e.message.includes('ECONNREFUSED')) {
      console.error('[redisRateLimit] 💡 Tip: Start Redis with npm run redis:start');
    }
  });

  singleton.client.on('connect', () => {
    console.log('[redisRateLimit] ✅ Connected to Redis for rate limiting');
  });

  return singleton.client;
}

/**
 * Enhanced Lua script for rate limiting with better performance
 * Uses optimized script from centralized config
 */
let sha: string | null = null;

// Preload the Lua script for better performance
async function ensureScriptLoaded(client: Redis): Promise<string> {
  if (!sha) {
    try {
      sha = (await (client as any).script('LOAD', LUA_SCRIPTS.RATE_LIMIT)) as string;
      console.log('[redisRateLimit] ✅ Lua script loaded with SHA:', sha.substring(0, 8) + '...');
    } catch (error) {
      console.error('[redisRateLimit] ❌ Failed to load Lua script:', error);
      throw error;
    }
  }
  return sha;
}

export async function redisRateLimit(opts: RedisRateLimitOptions): Promise<{
  allowed: boolean;
  count: number;
  retryAfter: number;
  remaining: number;
  resetTime: number;
}> {
  const client = opts.redis || getClient();

  try {
    // Ensure Lua script is loaded
    const scriptSha = await ensureScriptLoaded(client);

    const now = Date.now();
    const key = KEY_PATTERNS.RATE_LIMIT(opts.key);

    const res: any = await (client as any).evalsha(
      scriptSha,
      1,
      key,
      now,
      opts.windowSec * 1000,
      opts.limit
    );

    const allowed = res[0] === 1;
    const count = res[1];
    const retryAfter = res[2];
    const remaining = Math.max(0, opts.limit - Number(count || 0));
    // resetTime semantics: seconds until window reset; use retryAfter when limited, otherwise approximate remaining window based on configured window length
    const resetTime = Number(retryAfter || 0);

    // Log rate limit activity (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[redisRateLimit] ${opts.key}: ${count}/${opts.limit} requests in ${opts.windowSec}s window, allowed: ${allowed}`
      );
    }

    return { allowed, count, retryAfter, remaining, resetTime };
  } catch (e: any) {
    console.error('[redisRateLimit] ❌ Rate limit check failed:', e.message);

    // Graceful degradation - allow request but log error
    if (e.message.includes('NOSCRIPT')) {
      console.log('[redisRateLimit] 🔄 Script not found, reloading...');
      sha = null; // Reset SHA to force reload
      return redisRateLimit(opts); // Retry once
    }

    console.warn('[redisRateLimit] ⚠️ Falling back to allowing request due to Redis error');
    return {
      allowed: true,
      count: 1,
      retryAfter: 0,
      remaining: Math.max(0, (opts?.limit ?? 1) - 1),
      resetTime: 0,
    };
  }
}

export async function closeRedisRateLimit(): Promise<any> {
  if (singleton.client) {
    await (singleton.client as any).quit?.();
    singleton.client = null;
  }
}

/**
 * Create a simple rate limit policy based on role/policy name.
 * Common policies used across API routes.
 */
export type RateLimitPolicy = 'admin' | 'api' | 'public' | 'auth' | 'search';

export function createRateLimitConfig(
  policy: RateLimitPolicy = 'api'
): Pick<RedisRateLimitOptions, 'limit' | 'windowSec'> {
  switch (policy) {
    case 'admin':
      return { limit: 600, windowSec: 60 };
    case 'auth':
      return { limit: 30, windowSec: 60 };
    case 'search':
      return { limit: 120, windowSec: 60 };
    case 'public':
      return { limit: 60, windowSec: 60 };
    case 'api':
    default:
      return { limit: 120, windowSec: 60 };
  }
}

/**
 * Lightweight health check for rate limiting subsystem.
 * Verifies Redis connectivity and Lua script availability.
 */
export async function rateLimitHealthCheck(): Promise<{
  redis: boolean;
  latencyMs: number;
  scriptLoaded: boolean;
  timestamp: string;
}> {
  const client = getClient();
  const start = Date.now();
  try {
    const pong = await client.ping();
    const latencyMs = Date.now() - start;
    // try loading script if not already loaded
    let scriptLoaded = true;
    try {
      await ensureScriptLoaded(client);
    } catch {
      scriptLoaded = false;
    }
    return { redis: pong === 'PONG', latencyMs, scriptLoaded, timestamp: new Date().toISOString() };
  } catch {
    return {
      redis: false,
      latencyMs: Date.now() - start,
      scriptLoaded: false,
      timestamp: new Date().toISOString(),
    };
  }
}
