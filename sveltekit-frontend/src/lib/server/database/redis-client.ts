/**
 * Redis Client Configuration
 * Provides connection management for Redis caching and orchestration
 */

import { Redis } from 'ioredis';
import { env } from '$env/dynamic/private';

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
const redisUrl = env.REDIS_URL || 'redis://:redis@localhost:6379';

// Default Redis configuration
const defaultConfig: RedisConfig = {
  host: env.REDIS_HOST || 'localhost',
  port: parseInt(env.REDIS_PORT || '6379'),
  password: env.REDIS_PASSWORD || 'redis',
  db: 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
};

let redis: Redis | null = null;
let isConnected = false;

/**
 * Get Redis client instance
 */
export async function getRedisClient(): Promise<Redis | null> {
  if (redis && isConnected) {
    return redis;
  }

  try {
    // Use Redis URL if available, otherwise use config object
    if (redisUrl.includes('redis://')) {
      redis = new Redis(redisUrl, {
        retryAttempts: 3,
        retryDelayOnConnect: 1000,
        maxRetriesPerRequest: 3,
        onRetry: (times) => {
          console.log(`🔄 Redis connection retry attempt ${times}`);
        }
      });
    } else {
      redis = new Redis({
        ...defaultConfig,
        retryAttempts: 3,
        retryDelayOnConnect: 1000,
        onRetry: (times) => {
          console.log(`🔄 Redis connection retry attempt ${times}`);
        }
      });
    }

    redis.on('connect', () => {
      isConnected = true;
      console.log('🎮 Redis connected successfully');
    });

    redis.on('error', (error) => {
      isConnected = false;
      console.warn('🔴 Redis connection error:', error.message);
    });

    redis.on('close', () => {
      isConnected = false;
      console.log('🔴 Redis connection closed');
    });

    // Test connection
    await redis.ping();
    return redis;

  } catch (error) {
    console.warn('🔴 Failed to connect to Redis:', error);
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
    await redis.quit();
    redis = null;
    isConnected = false;
    console.log('🎮 Redis connection closed gracefully');
  }
}

/**
 * Create Redis client for specific use case
 */
export function createRedisClient(customConfig: Partial<RedisConfig> = {}): Redis {
  const config = { ...defaultConfig, ...customConfig };
  
  const client = new Redis({
    ...config,
    retryAttempts: 3,
    retryDelayOnConnect: 1000
  });

  client.on('error', (error) => {
    console.warn('🔴 Redis client error:', error.message);
  });

  return client;
}

/**
 * Redis health check
 */
export async function checkRedisHealth(): Promise<{ status: string; latency?: number; error?: string }> {
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
      latency 
    };

  } catch (error) {
    return { 
      status: 'error', 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Export singleton client for convenience
export { redis as redisClient };