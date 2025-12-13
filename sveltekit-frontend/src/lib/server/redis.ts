import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

// Single shared client for SSR
export const redis = new Redis(REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
  enableReadyCheck: true,
});

export async function ensureRedis() {
  if (redis.status === 'ready') return;
  if (redis.status === 'connecting') return;
  await redis.connect();
}