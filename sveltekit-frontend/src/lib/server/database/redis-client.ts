/**
 * Redis Client Configuration
 * Provides connection management for Redis caching and orchestration
 */
import Redis from 'ioredis';
import { env } from '$env/dynamic/private';
import dotenv from 'dotenv';
import { createRedisInstance } from '$lib/server/redis';
dotenv.config();

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
}
// Use REDIS_URL if provided, otherwise fallback to individual config
const redisUrl = env.REDIS_URL || 'redis://localhost:6379';
// Default Redis configuration
const defaultConfig: RedisConfig = {
  host: env.REDIS_HOST || 'localhost',
  port: parseInt(env.REDIS_PORT || '6379'),
  password: env.REDIS_PASSWORD,
  db: 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

// Replace strict dependency on package types with a minimal local interface
// that declares only the members we use. This prevents TS errors if installed
// Redis lib's types differ from runtime.
interface MinimalRedisClient {
  on(event: string, listener: (...args: unknown[]) => void): this;
  addListener?(event: string, listener: (...args: unknown[]) => void): this;
  removeListener?(event: string, listener: (...args: unknown[]) => void): this;
  ping(): Promise<string>;
  quit(): Promise<void>;
  disconnect(): void;
  // allow additional members as optional to avoid tight coupling
  [key: string]: unknown;
}

// Use the minimal interface for runtime instances
type IORedisClient = MinimalRedisClient;

let redis: IORedisClient | null = null;
let isConnected = false;

/**
 * Get Redis client instance
 */
export async function getRedisClient(): Promise<IORedisClient | null> {
  if (redis && isConnected) return redis;
  try {
    // Delegate creation to centralized helper which manages URL/password and options
    const instance = createRedisInstance();
    // attach minimal-typed event handlers
    instance.on('connect', () => {
      isConnected = true;
      console.log('🎮 Redis connected successfully');
    });
    instance.on('error', (error: Error) => {
      isConnected = false;
      console.warn('🔴 Redis connection error:', (error && (error as Error).message) || String(error));
    });
    instance.on('close', () => {
      isConnected = false;
      console.log('🔴 Redis connection closed');
    });

    // test ping - returns 'PONG' on success
    await (instance as unknown as { ping?: () => Promise<string> }).ping?.();
    redis = instance as unknown as IORedisClient;
    return redis;
  } catch (error) {
    console.warn('🔴 Failed to connect to Redis via createRedisInstance():', error);
    redis = null;
    isConnected = false;
    return null;
  }
}

/**
 * Check Redis connection status
 */
export function isRedisConnected(): boolean {
  return isConnected && redis !== null;
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
    } catch (e) {
      // attempt force disconnect if quit fails
      try {
        // log the first error, then attempt disconnect
        console.warn('⚠️ Redis quit failed, forcing disconnect:', e instanceof Error ? e.message : String(e));
        redis.disconnect();
      } catch (inner) {
        console.error('⚠️ Redis forced disconnect failed:', inner);
      }
    }
    redis = null;
    isConnected = false;
    console.log('🎮 Redis connection closed gracefully');
  }
}

/**
 * Create Redis client for specific use case
 */
export function createRedisClient(customConfig: Partial<RedisConfig> = {}): IORedisClient {
  // For custom clients we can still construct a new ioredis instance, but
  // prefer delegating to createRedisInstance when no custom config is needed.
  if (Object.keys(customConfig).length === 0) {
    return createRedisInstance() as unknown as IORedisClient;
  }
  const config = { ...defaultConfig, ...customConfig };
  const client = new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => Math.min(times * 100, 2000),
  }) as unknown as IORedisClient;
  client.on('error', (error: Error) => {
    console.warn('🔴 Redis client error:', error?.message ?? String(error));
  });
  return client;
}

/**
 * Redis health check
 */
export async function checkRedisHealth(): Promise<{
  status: 'healthy' | 'disconnected' | 'error';
  latency?: number;
  error?: string;
}> {
  try {
    const start = Date.now();
    const client = await getRedisClient();
    if (!client) {
      return { status: 'disconnected', error: 'No Redis client available' };
    }
    await client.ping();
    const latency = Date.now() - start;
    return {
      status: 'healthy',
      latency,
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Export a single redisClient reference and the helper functions
export { redis as redisClient };
export { getRedisClient, createRedisClient, checkRedisHealth, isRedisConnected, closeRedisConnection };
