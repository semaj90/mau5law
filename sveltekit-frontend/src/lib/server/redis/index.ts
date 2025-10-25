import Redis from 'ioredis';
import type { RedisClient, RedisConnectionOptions } from '$lib/types/redis';
// Assuming these environment variables are defined in your .env file
// and loaded by SvelteKit's $env/static/private module.
import { REDIS_URL, REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } from '$env/static/private';

let redisInstance: RedisClient | null = null;

// Module-level helper to centralize NOAUTH handling and message extraction
interface RedisGlobalFlag {
  __redisNoAuthWarned?: boolean;
}

const getMessage = (err: unknown): string => {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
    return (err as any).message as string;
  }
  return String(err);
};

/**
 * Creates and returns a singleton Redis client instance.
 * It prioritizes a full REDIS_URL environment variable,
 * otherwise falls back to host, port, and password.
 *
 * @param options Optional Redis connection options to override defaults.
 * @returns A RedisClient instance.
 */
export function createRedisInstance(options?: RedisConnectionOptions): RedisClient {
  if (redisInstance) {
    return redisInstance; // Return existing instance if already created
  }

  const defaultOptions: RedisConnectionOptions = {
    host: REDIS_HOST || 'localhost',
    port: parseInt(REDIS_PORT || '6379', 10),
    password: REDIS_PASSWORD || 'redis', // Default password as per Docker setup
    connectTimeout: 5000,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  };

  // Merge provided options, allowing them to override defaults.
  // Note: If REDIS_URL is used, host/port/password from options might be ignored by ioredis.
  const finalOptions = { ...defaultOptions, ...options };

  if (REDIS_URL) {
    // Connect using the full URL if provided
    redisInstance = new Redis(REDIS_URL, finalOptions);
  } else {
    // Connect using individual host, port, password
    redisInstance = new Redis(finalOptions);
  }

  // Attach event listeners for logging and monitoring using a non-null local reference.
  const inst = redisInstance as RedisClient;

  const handleRedisError = (err: unknown) => {
    const msg = getMessage(err);
    if (msg.includes('NOAUTH')) {
      const g = globalThis as unknown as RedisGlobalFlag;
      if (!g.__redisNoAuthWarned) {
        console.warn(
          '[redis] NOAUTH Authentication required — continuing with limited capabilities.\n' +
            'Set REDIS_URL to include credentials (redis://:password@host:port) or set REDIS_PASSWORD in your environment.'
        );
        g.__redisNoAuthWarned = true;
      }
      return;
    }
    console.error('Redis connection error:', err);
  };

  // attach handlers defensively (some client shims may not implement `on` the same way)
  (inst as unknown as { on?: (...a: any[]) => void }).on?.('error', handleRedisError);
  (inst as unknown as { on?: (...a: any[]) => void }).on?.('connect', () => {
    console.log('Redis client connected successfully.');
  });
  (inst as unknown as { on?: (...a: any[]) => void }).on?.('ready', () => {
    console.log('Redis client is ready and accepting commands.');
  });

  return inst;
}

// Provide a default export for modules that import the helper as default
export default createRedisInstance;

/**
 * Create a fresh, non-singleton Redis connection. Useful for pub/sub subscribers
 * which must use a dedicated connection.
 */
export function createRedisConnection(options?: Partial<RedisConnectionOptions>): RedisClient {
  // Merge with defaults from environment
  const finalOptions: RedisConnectionOptions = {
    ...{
      host: REDIS_HOST || 'localhost',
      port: parseInt(REDIS_PORT || '6379', 10),
      password: REDIS_PASSWORD || 'redis',
      connectTimeout: 5000,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    },
    ...(options || {}),
  } as RedisConnectionOptions;

  const conn = REDIS_URL ? new Redis(REDIS_URL, finalOptions) : new Redis(finalOptions);
  // Attach the same NOAUTH-aware handler for non-singleton connections (pub/sub, dedicated clients)
  const c = conn as unknown as { on?: (...args: any[]) => void };
  c.on?.('error', (err: unknown) => {
    const msg = getMessage(err);
    if (msg.includes('NOAUTH')) {
      const g = globalThis as unknown as RedisGlobalFlag;
      if (!g.__redisNoAuthWarned) {
        console.warn(
          '[redis] NOAUTH Authentication required on new connection — set REDIS_URL or REDIS_PASSWORD to enable auth.'
        );
        g.__redisNoAuthWarned = true;
      }
      return;
    }
    console.error('Redis connection error:', err);
  });

  return conn as unknown as RedisClient;
}
