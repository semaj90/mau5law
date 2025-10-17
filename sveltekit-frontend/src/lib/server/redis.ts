/**
 * Centralized Redis Client for Legal AI Platform
 * Unified ioredis implementation (Docker-ready)
 */
import Redis from 'ioredis';

// --- Connection config -------------------------------------------------
// Safe environment variable access (works in both SvelteKit and standalone scripts)
// Use process.env directly - it works in both contexts
const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const password = process.env.REDIS_PASSWORD?.trim() || undefined;

// Create the Redis instance (ioredis accepts URL string directly)
const redis = new Redis(redisUrl, {
  password,
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

// --- Event listeners ---------------------------------------------------
// Safer EventEmitter 'on' signature to avoid `any`
type EventOnSignature = (event: string | symbol, listener: (...args: unknown[]) => void) => void;

// Cast to EventEmitter for typing so .on is available without changing runtime behavior
const redisEmitter = redis as unknown as NodeJS.EventEmitter & { on: EventOnSignature };
redisEmitter.on('connect', () => console.log('[redis] ✅ Connected successfully'));
redisEmitter.on('ready', () => console.log('[redis] 🚀 Client ready for operations'));
redisEmitter.on('error', (err: Error) => console.error('[redis] ❌ Error:', err.message));
redisEmitter.on('close', () => console.log('[redis] 🔌 Connection closed'));
redisEmitter.on('reconnecting', (delay: number) => console.log(`[redis] 🔄 Reconnecting in ${delay}ms...`));

// --- Convenience helpers -----------------------------------------------
export async function getFromCache(key: string): Promise<string | null> {
  try {
    return await redis.get(key);
  } catch (err) {
    console.warn('[redis] get error:', (err as Error).message);
    return null;
  }
}

export async function setCache(key: string, value: string, ttl?: number): Promise<boolean> {
  try {
    if (typeof ttl === 'number') {
      // use EX flag for expiration time in seconds
      await redis.set(key, value, 'EX', ttl);
    } else {
      await redis.set(key, value);
    }
    return true;
  } catch (err) {
    console.warn('[redis] set error:', (err as Error).message);
    return false;
  }
}

export async function deleteFromCache(key: string): Promise<boolean> {
  try {
    await redis.del(key);
    return true;
  } catch (err) {
    console.warn('[redis] del error:', (err as Error).message);
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  // support both ioredis versions: prefer quit() if available, otherwise disconnect()
  const clientWithLifecycle = redis as unknown as { quit?: () => Promise<void>; disconnect?: () => void };
  if (typeof clientWithLifecycle.quit === 'function') {
    await clientWithLifecycle.quit();
  } else {
    clientWithLifecycle.disconnect?.();
  }
}

export { redis };

// Optional — Multi-client Set (if you need Pub/Sub)
type RedisClientSet = {
  primary: typeof redis;
  subscriber: typeof redis;
  publisher: typeof redis;
  closeAll(): Promise<void>;
};

export function createRedisClientSet(): RedisClientSet {
  const connectionOptions = { password, lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false };
  const primary = new Redis(redisUrl, connectionOptions);
  const subscriber = new Redis(redisUrl, connectionOptions);
  const publisher = new Redis(redisUrl, connectionOptions);

  // use EventEmitter cast to access .on without changing runtime behavior
  [primary, subscriber, publisher].forEach((client, i) =>
    (client as unknown as NodeJS.EventEmitter & { on: EventOnSignature }).on('error', (err: Error) => {
      console.error(`[redis-set:${i}] ❌`, err);
      if (err.stack) {
        console.error(`[redis-set:${i}] ❌ Stack trace:`, err.stack);
      }
    })
  );

  return {
    primary,
    subscriber,
    publisher,
    async closeAll() {
      const quitOrDisconnect = (c: unknown) => {
        const lifecycled = c as { quit?: () => Promise<void>; disconnect?: () => void };
        return typeof lifecycled.quit === 'function' ? lifecycled.quit() : Promise.resolve(lifecycled.disconnect?.());
      };
      await Promise.all(
        [quitOrDisconnect(primary), quitOrDisconnect(subscriber), quitOrDisconnect(publisher)].map(
          (p: Promise<unknown>) => p.catch(() => {})
        )
      );
    },
  };
}

/**
 * Returns a singleton instance of the Redis client.
 * Ensures only one connection is established and reused across the application.
 */
export function getRedis(): Redis {
  // The 'redis' instance defined at the top of this module is already the singleton.
  // This function should simply return that instance, ensuring a single connection
  // and consistent configuration across the application.
  return redis;
}
