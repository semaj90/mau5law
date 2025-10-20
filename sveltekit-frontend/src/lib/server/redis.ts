/**
 * Centralized Redis Client for Legal AI Platform
 * Unified ioredis implementation (Docker-ready)
 */
import Redis from 'ioredis';
import { REDIS_URL } from '$env/static/private'; // Assuming REDIS_URL is defined in .env.development or similar

// --- Connection config -------------------------------------------------
// Safe environment variable access (works in both SvelteKit and standalone scripts)
// Use process.env directly - it works in both contexts
const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const password = process.env.REDIS_PASSWORD?.trim() || undefined;

// Declare redisInstance here to resolve "Cannot find name 'redisInstance'."
let redisInstance: Redis | null = null;

// Create the Redis instance (ioredis accepts URL string directly)
const redis = new Redis({
  url: redisUrl,
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
  const connectionOptions = {
    url: redisUrl,
    password,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  };
  const primary = new Redis(connectionOptions);
  const subscriber = new Redis(connectionOptions);
  const publisher = new Redis(connectionOptions);

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

/**
 * Creates or returns a singleton Redis client instance.
 * Configured to use REDIS_URL from environment variables, with a fallback.
 * Includes robust retry strategy and error logging.
 * @returns {Redis} The ioredis client instance.
 */
export function createRedisInstance(): Redis {
  if (!redisInstance) {
    // Use REDIS_URL from environment variables if available, otherwise default to project instructions
    const connectionString = REDIS_URL || 'redis://:redis@localhost:6379/0';

    redisInstance = new Redis({
      url: connectionString,
      maxRetriesPerRequest: null, // Allow ioredis to handle retries indefinitely
      enableOfflineQueue: true, // Queue commands when disconnected
      connectTimeout: 10000, // 10 seconds connection timeout
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000); // Exponential backoff, max 2 seconds
        console.log(`Redis: Retrying connection in ${delay}ms (attempt ${times})`);
        return delay;
      },
    });

    // Cast to EventEmitter for typing so .on is available without changing runtime behavior
    // EventOnSignature is defined at the top of this file.
    const instanceEmitter = redisInstance as unknown as NodeJS.EventEmitter & { on: EventOnSignature };

    instanceEmitter.on('error', (err: Error) => {
      console.error('Redis Client Error:', err);
      // In a production environment, you might want to integrate with a monitoring system
    });

    instanceEmitter.on('connect', () => {
      console.log('Redis Client Connected');
    });

    instanceEmitter.on('ready', () => {
      console.log('Redis Client Ready');
    });

    instanceEmitter.on('end', () => {
      console.warn('Redis Client Connection Ended');
      redisInstance = null; // Clear instance on disconnect to allow re-creation if needed
    });
  }
  return redisInstance;
}
