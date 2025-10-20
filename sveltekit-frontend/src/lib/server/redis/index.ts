import Redis from 'ioredis';
import type { RedisClient, RedisConnectionOptions } from '$lib/types/redis';
// Assuming these environment variables are defined in your .env file
// and loaded by SvelteKit's $env/static/private module.
import { REDIS_URL, REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } from '$env/static/private';

let redisInstance: RedisClient | null = null;

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

  // Attach event listeners for logging and monitoring
  redisInstance.on('error', (err) => {
    console.error('Redis connection error:', err);
    // Implement more sophisticated error handling here, e.g., Sentry, health checks
  });

  redisInstance.on('connect', () => {
    console.log('Redis client connected successfully.');
  });

  redisInstance.on('ready', () => {
    console.log('Redis client is ready and accepting commands.');
  });

  return redisInstance;
}
