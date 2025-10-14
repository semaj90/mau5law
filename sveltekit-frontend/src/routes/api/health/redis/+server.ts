import type { RequestHandler } from './$types.js';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  try {
    // Attempt to load Redis client with fallback
    let redis: any = null;
    let isAvailable = false;

    try {
      const redisModule = await import('$lib/server/redis');
      redis = redisModule.redis || redisModule.default;

      // Ensure connection before ping
      if (redis && typeof redis.connect === 'function') {
        const status = redis.status;
        if (status === 'end' || status === 'close') {
          console.log('[Redis Health] Reconnecting closed Redis client...');
          await redis.connect();
        }
      }

      // Simple ping test
      if (redis && typeof redis.ping === 'function') {
        await redis.ping();
        isAvailable = true;
      }
    } catch (redisError) {
      console.warn('[Redis Health] Redis unavailable:', redisError);
      isAvailable = false;
    }

    if (isAvailable) {
      return json({
        status: 'healthy',
        service: 'redis',
        port: 6379,
        host: 'localhost',
        timestamp: new Date().toISOString(),
      });
    } else {
      return json(
        {
          status: 'unavailable',
          service: 'redis',
          message: 'Redis not configured or unreachable',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }
  } catch (error: any) {
    return json(
      {
        status: 'error',
        service: 'redis',
        error: error.message || 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
};
