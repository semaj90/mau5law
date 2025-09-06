/**
 * Redis Configuration Service for Legal AI Platform
 * Centralized configuration management for all Redis connections
 * Integrates with: redis-service.ts, loki-redis-integration.ts, redis-helper.ts
 */

import type { RedisOptions } from 'ioredis';

// Environment-based configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Base Redis configuration
export const REDIS_BASE_CONFIG: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '4005'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  
  // Connection settings optimized for legal AI workloads
  connectTimeout: 10000,
  commandTimeout: 5000,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  
  // Performance optimization
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  
  // Connection pooling for high concurrency
  maxLoadingTimeout: 5000,
};

// Development-specific optimizations
export const REDIS_DEV_CONFIG: RedisOptions = {
  ...REDIS_BASE_CONFIG,
  maxRetriesPerRequest: 1,
  connectTimeout: 5000,
  retryStrategy: (times: number) => {
    if (times > 2) {
      console.log('Redis: Max reconnection attempts reached in dev mode');
      return null;
    }
    return Math.min(times * 500, 1500);
  },
};

// Production-specific optimizations
export const REDIS_PROD_CONFIG: RedisOptions = {
  ...REDIS_BASE_CONFIG,
  maxRetriesPerRequest: 5,
  connectTimeout: 15000,
  commandTimeout: 10000,
  
  // Production retry strategy with exponential backoff
  retryStrategy: (times: number) => {
    if (times > 10) {
      console.error('Redis: Max reconnection attempts reached in production');
      return null;
    }
    const delay = Math.min(times * 100, 3000);
    console.log(`Redis: Retrying connection in ${delay}ms (attempt ${times})`);
    return delay;
  },
  
  // Production connection pooling
  lazyConnect: false,
  enableAutoPipelining: true,
};

// Database assignments for different services
export const REDIS_DATABASES = {
  CACHE: 0,           // General caching (redis-service.ts)
  SESSIONS: 1,        // User sessions
  RATE_LIMITING: 2,   // Rate limiting (redisRateLimit.ts)
  LOKI_CACHE: 3,      // Loki.js integration cache
  GPU_CACHE: 4,       // GPU cache orchestration
  NATS_CACHE: 5,      // NATS messaging cache
  WORKER_QUEUE: 6,    // Background worker queues
  ANALYTICS: 7,       // User analytics and metrics
  TEMP_STORAGE: 8,    // Temporary storage
  VECTOR_CACHE: 9,    // Vector embedding cache
} as const;

// Service-specific configurations
export const SERVICE_CONFIGS = {
  // Main cache service (redis-service.ts)
  MAIN_CACHE: {
    ...REDIS_BASE_CONFIG,
    db: REDIS_DATABASES.CACHE,
    keyPrefix: 'legal_ai:',
  },
  
  // Rate limiting service (redisRateLimit.ts)
  RATE_LIMIT: {
    ...REDIS_BASE_CONFIG,
    db: REDIS_DATABASES.RATE_LIMITING,
    keyPrefix: 'rate:',
    maxRetriesPerRequest: 1, // Fast fail for rate limiting
  },
  
  // Loki.js integration (loki-redis-integration.ts)
  LOKI_INTEGRATION: {
    ...REDIS_BASE_CONFIG,
    db: REDIS_DATABASES.LOKI_CACHE,
    keyPrefix: 'loki:',
    enableAutoPipelining: true,
  },
  
  // GPU cache orchestration
  GPU_ORCHESTRATOR: {
    ...REDIS_BASE_CONFIG,
    db: REDIS_DATABASES.GPU_CACHE,
    keyPrefix: 'gpu:',
    commandTimeout: 15000, // Longer timeout for GPU operations
  },
  
  // Worker queues
  WORKER_QUEUE: {
    ...REDIS_BASE_CONFIG,
    db: REDIS_DATABASES.WORKER_QUEUE,
    keyPrefix: 'worker:',
    enableReadyCheck: true,
    maxLoadingTimeout: 10000,
  },
  
  // Pub/Sub for real-time features
  PUBSUB: {
    ...REDIS_BASE_CONFIG,
    db: 0, // Pub/Sub uses db 0
    lazyConnect: false, // Immediate connection for pub/sub
    enableOfflineQueue: false,
  },
} as const;

// Environment-specific configuration selection
export function getRedisConfig(service?: keyof typeof SERVICE_CONFIGS): RedisOptions {
  const baseConfig = isProduction ? REDIS_PROD_CONFIG : 
                     isDevelopment ? REDIS_DEV_CONFIG : 
                     REDIS_BASE_CONFIG;
                     
  if (service && SERVICE_CONFIGS[service]) {
    return {
      ...baseConfig,
      ...SERVICE_CONFIGS[service],
    };
  }
  
  return baseConfig;
}

// Connection URL builder for external tools
export function getRedisUrl(database?: number): string {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = process.env.REDIS_PORT || '4005';
  const password = process.env.REDIS_PASSWORD;
  const db = database ?? 0;
  
  const auth = password ? `:${password}@` : '';
  return `redis://${auth}${host}:${port}/${db}`;
}

// Health check configuration
export const HEALTH_CHECK_CONFIG = {
  timeout: 5000,
  retries: 3,
  interval: 30000, // Check every 30 seconds
};

// Cache TTL configurations by data type
export const CACHE_TTL = {
  // Session management
  SESSION: 24 * 60 * 60,        // 24 hours
  USER_PROFILE: 60 * 60,        // 1 hour
  
  // Legal AI specific
  SEARCH_RESULTS: 15 * 60,      // 15 minutes
  RAG_RESPONSES: 30 * 60,       // 30 minutes
  VECTOR_EMBEDDINGS: 60 * 60,   // 1 hour
  DOCUMENT_ANALYSIS: 2 * 60 * 60, // 2 hours
  
  // API and rate limiting
  RATE_LIMIT_WINDOW: 60 * 60,   // 1 hour
  API_CACHE: 5 * 60,            // 5 minutes
  TEMP_DATA: 5 * 60,            // 5 minutes
  
  // GPU cache orchestration
  GPU_CACHE_ENTRY: 12 * 60 * 60, // 12 hours
  GPU_METRICS: 10 * 60,         // 10 minutes
  
  // Analytics
  USER_ANALYTICS: 24 * 60 * 60, // 24 hours
  SYSTEM_METRICS: 60 * 60,      // 1 hour
} as const;

// Key patterns for consistent naming
export const KEY_PATTERNS = {
  // User-related keys
  USER_SESSION: (sessionId: string) => `session:${sessionId}`,
  USER_PROFILE: (userId: string) => `user:${userId}:profile`,
  USER_SESSIONS: (userId: number) => `user:${userId}:sessions`,
  
  // Legal AI keys
  SEARCH_CACHE: (query: string) => `search:${Buffer.from(query).toString('base64')}`,
  RAG_CACHE: (query: string) => `rag:${Buffer.from(query).toString('base64')}`,
  VECTOR_CACHE: (text: string) => `vector:${Buffer.from(text).toString('base64')}`,
  DOCUMENT_CACHE: (docId: string) => `doc:${docId}`,
  
  // Rate limiting keys
  RATE_LIMIT: (identifier: string) => `rate:${identifier}`,
  
  // Worker queues
  WORKER_QUEUE: (type: string) => `worker:queue:${type}`,
  WORKER_STATUS: (workerId: string) => `worker:status:${workerId}`,
  
  // GPU cache orchestration
  GPU_CACHE: (key: string) => `gpu:cache:${key}`,
  GPU_METRICS: (nodeId: string) => `gpu:metrics:${nodeId}`,
  
  // Analytics
  USER_BEHAVIOR: (userId: string) => `analytics:user:${userId}`,
  SYSTEM_METRICS: (component: string) => `metrics:${component}`,
} as const;

// Lua scripts for atomic operations
export const LUA_SCRIPTS = {
  // Rate limiting script (from redisRateLimit.ts)
  RATE_LIMIT: `
    local key       = KEYS[1]
    local now       = tonumber(ARGV[1])
    local window    = tonumber(ARGV[2])
    local limit     = tonumber(ARGV[3])
    
    redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
    redis.call('ZADD', key, now, now)
    local count = redis.call('ZCARD', key)
    redis.call('PEXPIRE', key, window)
    
    local allowed = count <= limit
    local retryAfter = 0
    if not allowed then
      local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')[2]
      if oldest then
        local diff = (oldest + window) - now
        if diff > 0 then retryAfter = math.floor(diff / 1000) end
      end
    end
    
    return { allowed and 1 or 0, count, retryAfter }
  `,
  
  // Cache with TTL and LRU
  CACHE_SET_WITH_LRU: `
    local key = KEYS[1]
    local value = ARGV[1]
    local ttl = tonumber(ARGV[2])
    local maxSize = tonumber(ARGV[3])
    
    -- Set the value with TTL
    redis.call('SET', key, value, 'EX', ttl)
    
    -- Track for LRU
    redis.call('ZADD', 'cache:lru', os.time(), key)
    
    -- Cleanup if over max size
    local count = redis.call('ZCARD', 'cache:lru')
    if count > maxSize then
      local toRemove = redis.call('ZRANGE', 'cache:lru', 0, count - maxSize - 1)
      for i, k in ipairs(toRemove) do
        redis.call('DEL', k)
        redis.call('ZREM', 'cache:lru', k)
      end
    end
    
    return 'OK'
  `,
} as const;

// Connection pool configuration
export const POOL_CONFIG = {
  // Development pool (smaller)
  development: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    createRetryIntervalMillis: 200,
    maxRetries: 3,
  },
  
  // Production pool (larger)
  production: {
    min: 5,
    max: 50,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 60000,
    createRetryIntervalMillis: 500,
    maxRetries: 5,
  },
} as const;

// Export the configuration based on environment
export const REDIS_CONFIG = getRedisConfig();

// Utility function to create service-specific clients
export function createServiceConfig(service: keyof typeof SERVICE_CONFIGS) {
  return getRedisConfig(service);
}

// Health monitoring configuration
export const MONITORING_CONFIG = {
  healthCheckInterval: 30000,     // 30 seconds
  metricsCollectionInterval: 5000, // 5 seconds
  slowLogThreshold: 10000,        // 10ms
  enableLatencyMonitoring: true,
  enableMemoryMonitoring: true,
  alertThresholds: {
    memoryUsage: 0.85,            // 85% memory usage alert
    connectionCount: 0.9,         // 90% max connections alert
    slowQueries: 100,             // Alert if > 100 slow queries/min
    responseTime: 1000,           // Alert if > 1000ms average response time
  },
};

// Export everything for easy importing
export default {
  REDIS_CONFIG,
  SERVICE_CONFIGS,
  REDIS_DATABASES,
  CACHE_TTL,
  KEY_PATTERNS,
  LUA_SCRIPTS,
  MONITORING_CONFIG,
  getRedisConfig,
  createServiceConfig,
  getRedisUrl,
};