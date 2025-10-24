// sveltekit-frontend/src/lib/server/redis-cache.ts
import { createClient } from 'redis';
import { REDIS_URL } from '$env/static/private';

const redisClient = createClient({
  url: REDIS_URL,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

export async function connectRedis(): Promise<void> {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('Connected to Redis');
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient.isOpen) {
    await redisClient.disconnect();
    console.log('Disconnected from Redis');
  }
}

/**
 * Sets a value in Redis cache.
 * @param {string} key The cache key.
 * @param {string} value The value to store.
 * @param {number} [ttl] Time to live in seconds.
 * @returns {Promise<void>}
 */
export async function setCache(key: string, value: string, ttl?: number): Promise<void> {
  await connectRedis();
  if (ttl) {
    await redisClient.setEx(key, ttl, value);
  } else {
    await redisClient.set(key, value);
  }
}

/**
 * Gets a value from Redis cache.
 * @param {string} key The cache key.
 * @returns {Promise<string | null>} The cached value or null if not found.
 */
export async function getCache(key: string): Promise<string | null> {
  await connectRedis();
  return redisClient.get(key);
}

/**
 * Deletes a value from Redis cache.
 * @param {string} key The cache key.
 * @returns {Promise<number>} The number of keys deleted.
 */
export async function deleteCache(key: string): Promise<number> {
  await connectRedis();
  return redisClient.del(key);
}