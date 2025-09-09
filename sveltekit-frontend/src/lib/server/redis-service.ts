/**
 * Production Redis Service for Legal AI Platform
 * Handles connection pooling, reconnection, and distributed caching
 * Integrates Redis Stack with JSON, Search, and TimeSeries modules
 */

import Redis from 'ioredis';
import type { RedisOptions } from 'ioredis';

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  maxRetriesPerRequest: number;
  retryDelayOnFailover: number;
  enableReadyCheck: boolean;
  lazyConnect: boolean;
  keepAlive: number;
  family: number;
  keyPrefix?: string;
}

interface RedisConnectionPool {
  primary: Redis;
  subscriber: Redis;
  publisher: Redis;
}

class RedisService {
  private pool: RedisConnectionPool | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private initialized = false;

  private config: RedisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'legal-ai:',
  };

  /**
   * Initialize Redis connection pool
   */
  async initialize(): Promise<boolean> {
    try {
      // Prevent multiple initialization attempts
      if (
        this.initialized ||
        this.pool?.primary?.status === 'connecting' ||
        this.pool?.primary?.status === 'connected'
      ) {
        console.log('[RedisService] Already initialized or connecting');
        return this.initialized;
      }

      console.log('[RedisService] Initializing Redis connection pool...');

      // Create primary connection for read/write operations
      this.pool = {
        primary: new Redis({
          ...this.config,
          lazyConnect: false,
          connectionName: 'legal-ai-primary',
        }),

        // Separate connection for pub/sub operations
        subscriber: new Redis({
          ...this.config,
          lazyConnect: false,
          connectionName: 'legal-ai-subscriber',
        }),

        publisher: new Redis({
          ...this.config,
          lazyConnect: false,
          connectionName: 'legal-ai-publisher',
        }),
      };

      // Set up event handlers
      this.setupEventHandlers(this.pool.primary, 'primary');
      this.setupEventHandlers(this.pool.subscriber, 'subscriber');
      this.setupEventHandlers(this.pool.publisher, 'publisher');

      // Wait for primary connection
      await this.pool.primary.connect();

      // Test Redis Stack modules
      await this.testRedisStackModules();

      this.isConnected = true;
      this.initialized = true;
      this.reconnectAttempts = 0;

      console.log('✅ [RedisService] Connection pool initialized successfully');

      // Global Redis client for backward compatibility
      (globalThis as any).__REDIS = this.pool.primary;

      return true;
    } catch (error) {
      console.error('❌ [RedisService] Failed to initialize:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Set up Redis connection event handlers
   */
  private setupEventHandlers(redis: Redis, name: string): void {
    redis.on('connect', () => {
      console.log(`✅ [RedisService] ${name} connected`);
    });

    redis.on('ready', () => {
      console.log(`🚀 [RedisService] ${name} ready`);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    redis.on('error', (error) => {
      console.error(`❌ [RedisService] ${name} error:`, error);
      this.isConnected = false;
    });

    redis.on('close', () => {
      console.warn(`⚠️ [RedisService] ${name} connection closed`);
      this.isConnected = false;
      this.handleReconnection();
    });

    redis.on('reconnecting', (delay) => {
      console.log(`🔄 [RedisService] ${name} reconnecting in ${delay}ms...`);
      this.reconnectAttempts++;
    });
  }

  /**
   * Handle automatic reconnection with exponential backoff
   */
  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `❌ [RedisService] Max reconnection attempts (${this.maxReconnectAttempts}) reached`
      );
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`🔄 [RedisService] Attempting reconnection in ${delay}ms...`);

    setTimeout(async () => {
      try {
        await this.initialize();
      } catch (error) {
        console.error('❌ [RedisService] Reconnection failed:', error);
      }
    }, delay);
  }

  /**
   * Test Redis Stack modules (JSON, Search, TimeSeries)
   */
  private async testRedisStackModules(): Promise<void> {
    if (!this.pool?.primary) return;

    try {
      // Test JSON module
      await (this.pool.primary as any).sendCommand([
        'JSON.SET',
        'test:json',
        '$',
        '{"legal-ai": "ready"}',
      ]);
      await (this.pool.primary as any).sendCommand(['JSON.GET', 'test:json']);
      await this.pool.primary.del('test:json');
      console.log('✅ [RedisService] JSON module available');

      // Test basic operations
      await this.pool.primary.setex('test:basic', 60, 'redis-stack-ready');
      const testValue = await this.pool.primary.get('test:basic');
      await this.pool.primary.del('test:basic');

      if (testValue === 'redis-stack-ready') {
        console.log('✅ [RedisService] Basic operations working');
      }
    } catch (error) {
      console.warn('⚠️ [RedisService] Some Redis Stack modules may not be available:', error);
    }
  }

  /**
   * Get Redis client for operations
   */
  getClient(): Redis | null {
    return this.pool?.primary || null;
  }

  /**
   * Get publisher for pub/sub
   */
  getPublisher(): Redis | null {
    return this.pool?.publisher || null;
  }

  /**
   * Get subscriber for pub/sub
   */
  getSubscriber(): Redis | null {
    return this.pool?.subscriber || null;
  }

  /**
   * Check if Redis is connected and healthy
   */
  isHealthy(): boolean {
    return this.isConnected && this.pool?.primary !== null;
  }

  /**
   * Get Redis connection statistics
   */
  getStats(): {
    connected: boolean;
    status: string;
    reconnectAttempts: number;
    config: RedisConfig;
    memory?: any;
    keyspace?: any;
  } {
    const client = this.pool?.primary;

    return {
      connected: this.isConnected,
      status: this.isConnected ? 'connected' : 'disconnected',
      reconnectAttempts: this.reconnectAttempts,
      config: {
        ...this.config,
        password: this.config.password ? '[REDACTED]' : undefined,
      },
    };
  }

  /**
   * Get Redis memory and keyspace info
   */
  async getRedisInfo(): Promise<any> {
    if (!this.pool?.primary || !this.isHealthy()) {
      return null;
    }

    try {
      const info = await (this.pool.primary as any).info();
      const lines = info.split('\r\n');
      const result: any = {};

      let section = 'general';
      for (const line of lines) {
        if (line.startsWith('#')) {
          section = line.substring(2).toLowerCase();
          result[section] = {};
        } else if (line.includes(':')) {
          const [key, value] = line.split(':', 2);
          result[section][key] = isNaN(Number(value)) ? value : Number(value);
        }
      }

      return result;
    } catch (error) {
      console.error('[RedisService] Failed to get Redis info:', error);
      return null;
    }
  }

  /**
   * Cache operations with automatic serialization
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);

      if (ttlSeconds) {
        await client.setex(key, ttlSeconds, serialized);
      } else {
        await client.set(key, serialized);
      }

      return true;
    } catch (error) {
      console.error(`[RedisService] Failed to set ${key}:`, error);
      return false;
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const value = await client.get(key);
      if (!value) return null;

      try {
        return JSON.parse(value);
      } catch {
        return value as T;
      }
    } catch (error) {
      console.error(`[RedisService] Failed to get ${key}:`, error);
      return null;
    }
  }

  async del(key: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      await client.del(key);
      return true;
    } catch (error) {
      console.error(`[RedisService] Failed to delete ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const result = await (client as any).exists(key);
      return result === 1;
    } catch (error) {
      console.error(`[RedisService] Failed to check existence of ${key}:`, error);
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    const client = this.getClient();
    if (!client) return [];

    try {
      return await (client as any).keys(pattern);
    } catch (error) {
      console.error(`[RedisService] Failed to get keys for pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Hash operations
   */
  async hget(key: string, field: string): Promise<string | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      return await (client as any).hget(key, field);
    } catch (error) {
      console.error(`[RedisService] Failed to hget ${key} ${field}:`, error);
      return null;
    }
  }

  async hset(key: string, field: string, value: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      await (client as any).hset(key, field, value);
      return true;
    } catch (error) {
      console.error(`[RedisService] Failed to hset ${key} ${field}:`, error);
      return false;
    }
  }

  async hgetall(key: string): Promise<{[field: string]: string}> {
    const client = this.getClient();
    if (!client) return {};

    try {
      return await (client as any).hgetall(key) || {};
    } catch (error) {
      console.error(`[RedisService] Failed to hgetall ${key}:`, error);
      return {};
    }
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    const client = this.getClient();
    if (!client) return 0;

    try {
      return await (client as any).hincrby(key, field, increment);
    } catch (error) {
      console.error(`[RedisService] Failed to hincrby ${key} ${field}:`, error);
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      await (client as any).expire(key, seconds);
      return true;
    } catch (error) {
      console.error(`[RedisService] Failed to expire ${key}:`, error);
      return false;
    }
  }

  async pipeline(): any {
    const client = this.getClient();
    if (!client) return null;

    try {
      return (client as any).pipeline();
    } catch (error) {
      console.error(`[RedisService] Failed to create pipeline:`, error);
      return null;
    }
  }

  /**
   * Cleanup and close connections
   */
  async shutdown(): Promise<void> {
    console.log('[RedisService] Shutting down Redis connections...');

    if (this.pool) {
      await Promise.all([
        this.pool.primary.quit(),
        this.pool.subscriber.quit(),
        this.pool.publisher.quit(),
      ]);

      this.pool = null;
    }

    this.isConnected = false;
    console.log('✅ [RedisService] Shutdown complete');
  }
}

// Singleton instance
export const redisService = new RedisService();

// Auto-initialize Redis service
if (typeof window === 'undefined') {
  console.log('🔧 [RedisService] Starting auto-initialization...');

  // Server-side initialization
  redisService.initialize().catch((error) => {
    console.error('❌ [RedisService] Auto-initialization failed:', error);
  });
}

export default redisService;