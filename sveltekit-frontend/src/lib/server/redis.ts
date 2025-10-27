import type { Redis as RedisInstance } from 'ioredis';
import {
  createRedisClient,
  ensureRedisReady,
  redis as sharedRedis,
  resolveRedisConfig,
  type RedisClientOptions,
} from '$lib/server/redis-client';

interface RedisWithStatus extends RedisInstance {
  status?: string;
}

type RedisShutdown = () => Promise<void>;

type RedisErrorLike = { message?: string } | Error | unknown;

function extractErrorMessage(err: RedisErrorLike): string {
  if (!err) return String(err);
  if (typeof err === 'string') return err;
  if (err instanceof Error && typeof err.message === 'string') return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
    return (err as { message?: string }).message ?? 'Unknown error';
  }
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

function attachRedisLogging(client: RedisInstance): void {
  client.on('error', (error: Error) => {
    const message = extractErrorMessage(error);
    if (message.includes('NOAUTH')) {
      console.warn('[redis] authentication required. Provide REDIS_URL or REDIS_PASSWORD.');
      return;
    }
    console.error('[redis] error', message);
  });

  client.on('connect', () => {
    const host = client.options?.host ?? client.options?.path ?? 'redis';
    console.log(`[redis] connected (${host})`);
  });
}

async function connectIfNeeded(client: RedisWithStatus): Promise<void> {
  if (client.status === 'ready') return;
  try {
    if (typeof client.connect === 'function') {
      await client.connect();
    }
  } catch (err) {
    console.warn('[redis] connect failed (will retry on use)', extractErrorMessage(err));
  }
}

function primeClient(options?: RedisClientOptions): RedisInstance {
  const instance = createRedisClient(options);
  attachRedisLogging(instance);
  void connectIfNeeded(instance as RedisWithStatus);
  return instance;
}

export const redis = sharedRedis;

export async function getFromCache(key: string): Promise<string | null> {
  try {
    await ensureRedisReady();
    return await redis.get(key);
  } catch (err) {
    console.warn('[redis] get error', extractErrorMessage(err));
    return null;
  }
}

export async function setCache(key: string, value: string, ttl?: number): Promise<boolean> {
  try {
    await ensureRedisReady();
    if (typeof ttl === 'number') {
      await redis.set(key, value, 'EX', ttl);
    } else {
      await redis.set(key, value);
    }
    return true;
  } catch (err) {
    console.warn('[redis] set error', extractErrorMessage(err));
    return false;
  }
}

export type RedisBasicCommands = RedisInstance;

export function createRedisClientSet() {
  const base = resolveRedisConfig();
  const primary = primeClient({ url: base.url, password: base.password });
  const subscriber = primeClient({ url: base.url, password: base.password });
  const publisher = primeClient({ url: base.url, password: base.password });

  const shutdown: RedisShutdown = async () => {
    const clients = [primary, subscriber, publisher];
    await Promise.all(
      clients.map(async (client) => {
        try {
          await client.quit();
        } catch (err) {
          client.disconnect();
          console.warn('[redis] quit failed during closeAll', extractErrorMessage(err));
        }
      })
    );
  };

  return { primary, subscriber, publisher, closeAll: shutdown };
}

export default redis;

export function createRedisConnection(options?: RedisClientOptions): RedisInstance {
  const base = resolveRedisConfig();
  const finalOptions = options ?? { url: base.url, password: base.password };
  return primeClient(finalOptions);
}
