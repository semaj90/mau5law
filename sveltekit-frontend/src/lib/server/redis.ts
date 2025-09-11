/**
 * Centralized Redis Client for Legal AI Platform
 * Follows the integration guide pattern with enhanced error handling
 */

import Redis from 'ioredis';
import { getRedisConfig } from '$lib/config/redis-config';

// Get optimized Redis configuration
const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:4005';
const baseConfig = getRedisConfig();

function buildRedisOptions() {
  const password = process.env.REDIS_PASSWORD || baseConfig.password;
  return {
    ...baseConfig,
    password: password || undefined,
    maxRetriesPerRequest: null as any,
    lazyConnect: false,
    // If URL was provided separately, include it in options form
    ...(url ? { host: undefined } : {}),
  } as any;
}

// ioredis supports (url) or (options). We pass url via options for consistency.
const redisOptions = buildRedisOptions();
(redisOptions as any).url = url; // modern ioredis supports url in options
export const redis = new Redis(redisOptions as any);

export const REDIS_CONNECTION = redis;

redis.on('connect', () => {
  console.log('[redis] ✅ Connected successfully');
});
redis.on('ready', () => {
  const masked = redisOptions.password
    ? redisOptions.password.replace(/.(?=.{2})/g, '*')
    : '(none)';
  console.log('[redis] 🚀 Client ready for operations');
  console.log(
    `[redis] config host=${baseConfig.host || 'in-url'} port=${baseConfig.port} db=${baseConfig.db ?? 0} password=${masked}`
  );
});
redis.on('error', (error) => {
  console.error('[redis] ❌ Connection error:', error.message);
  if (error.message.includes('ECONNREFUSED')) {
    console.error('[redis] 💡 Tip: Start Redis server with: npm run redis:start');
  } else if (error.message.includes('NOAUTH')) {
    console.error('[redis] 💡 Tip: Check REDIS_PASSWORD environment variable');
  }
});
redis.on('reconnecting', (delay) => {
  console.log(`[redis] 🔄 Reconnecting in ${delay}ms...`);
});
redis.on('close', () => {
  console.log('[redis] 🔌 Connection closed');
});

export const createRedisInstance = () => {
  const opts = buildRedisOptions();
  (opts as any).url = url;
  return new Redis(opts as any);
};

// Thin interface describing only commands we actually use broadly
export interface RedisBasicCommands {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<'OK' | null>;
  del(key: string | string[]): Promise<number>;
  setex?(key: string, seconds: number, value: string): Promise<'OK'>;
  expire?(key: string, seconds: number): Promise<number>;
  ping?(): Promise<string>;
  publish?(channel: string, message: string): Promise<number>;
  psubscribe?(...patterns: string[]): Promise<number>;
  subscribe?(...channels: string[]): Promise<number>;
  on(event: string, listener: (...args: any[]) => void): any;
  quit(): Promise<'OK'>;
}

// Multi-client factory for pub/sub correctness
export interface RedisClientSet {
  primary: RedisBasicCommands & any;
  subscriber: RedisBasicCommands & any;
  publisher: RedisBasicCommands & any;
  closeAll(): Promise<void>;
}

export function createRedisClientSet(): RedisClientSet {
  const primary = createRedisInstance();
  const subscriber = createRedisInstance();
  const publisher = createRedisInstance();

  // Basic wiring of error logging
  [primary, subscriber, publisher].forEach((client, idx) => {
    client.on('error', (err: any) => {
      console.error(`[redis-set] client${idx} error:`, err?.message || err);
    });
  });

  return {
    primary,
    subscriber,
    publisher,
    async closeAll() {
      await Promise.all(
        [primary.quit(), subscriber.quit(), publisher.quit()].map((p) => p.catch(() => {}))
      );
    },
  };
}

let legacyClient: Redis | null = null;
export async function createRedisClient(): Promise<Redis> {
  if (legacyClient) return legacyClient;
  legacyClient = redis;
  return legacyClient;
}
export async function getFromCache(key: string): Promise<string | null> {
  try {
    const client = await createRedisClient();
    return await client.get(key);
  } catch (error: any) {
    console.warn('Redis get error:', error);
    return null;
  }
}
export async function setCache(
  key: string,
  value: string,
  expireInSeconds?: number
): Promise<boolean> {
  try {
    const client = await createRedisClient();
    if (expireInSeconds) {
      // Use classic setex for compatibility with current type definitions
      await (client as any).setex(key, expireInSeconds, value);
    } else {
      await client.set(key, value);
    }
    return true;
  } catch (error: any) {
    console.warn('Redis set error:', error);
    return false;
  }
}
export async function deleteFromCache(key: string): Promise<boolean> {
  try {
    const client = await createRedisClient();
    await client.del(key);
    return true;
  } catch (error: any) {
    console.warn('Redis delete error:', error);
    return false;
  }
}
export async function closeRedisConnection(): Promise<any> {
  if (legacyClient) {
    await legacyClient.quit();
    legacyClient = null;
  }
}
