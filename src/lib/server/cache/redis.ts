/**
 * Redis client setup and caching utilities.
 * Uses the REDIS_URL environment variable.
 */

import Redis, { type Redis as RedisType } from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://:redis@localhost:6379/0';

let redis: RedisType;

try {
  redis = new Redis(redisUrl); // Use the imported Redis class constructor

  redis.on('error', (err: Error) => { // Added type 'Error' for 'err'
    console.error('Redis Client Error:', err);
  });

  redis.on('connect', () => {
    console.log('Redis Client Connected');
  });

  redis.on('ready', () => {
    console.log('Redis Client Ready');
  });

} catch (error) {
  console.error('Failed to initialize Redis client:', error);
  // Provide a mock Redis client if initialization fails
  redis = {
    get: async () => null,
    set: async () => 'OK',
    setex: async () => 'OK',
    del: async () => 0,
    on: () => {},
    // Add other methods that might be called, returning safe defaults
  } as unknown as RedisType; // Use the imported Redis type for the mock object
}


/**
 * Retrieves a value from Redis cache.
 * @param key The cache key.
 * @returns The cached value, parsed from JSON, or null if not found.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    if (data) {
      return JSON.parse(data) as T;
    }
  } catch (error) {
    console.error(`Error getting cache key ${key}:`, formatError(error));
  }
  return null;
}

/**
 * Stores a value in Redis cache.
 * @param key The cache key.
 * @param value The value to cache.
 * @param ttlMs Time-to-live in milliseconds. Defaults to 1 hour.
 * @returns 'OK' if successful, or an error message.
 */
export async function cacheSet(key: string, value: unknown, ttlMs: number = 3600 * 1000): Promise<string> {
  try {
    const data = JSON.stringify(value);
    // Use SETEX for setting with expiry
    return await redis.setex(key, Math.floor(ttlMs / 1000), data); // TTL in seconds
  } catch (error) {
    console.error(`Error setting cache key ${key}:`, formatError(error));
    return `Error: ${formatError(error)}`;
  }
}

/**
 * Deletes a key from Redis cache.
 * @param key The cache key to delete.
 * @returns The number of keys deleted.
 */
export async function cacheDel(key: string): Promise<number> {
  try {
    return await redis.del(key);
  } catch (error) {
    console.error(`Error deleting cache key ${key}:`, formatError(error));
    return 0;
  }
}

/**
 * Formats an error object into a string.
 * @param error The error object.
 * @returns A string representation of the error.
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}
}
}
