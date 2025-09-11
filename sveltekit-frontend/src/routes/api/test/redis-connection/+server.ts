/**
 * Redis Connection Test Endpoint
 * Simple endpoint to test and debug Redis connectivity
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  let redis: any = null;

  try {
    // Test basic Redis connection
    const { createRedisInstance } = await import('$lib/server/redis');
    try {
      redis = createRedisInstance();
    } catch {
      const RedisCtor = (await import('ioredis')).default;
      redis = new RedisCtor({
        host: 'localhost',
        port: 6379,
        connectTimeout: 5000,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: false,
      });
    }

    // Wait for connection to be ready
    await new Promise((resolve, reject) => {
      redis.on('ready', resolve);
      redis.on('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    // Test basic operations
    await redis.set('test:connection', 'working');
    const testValue = await redis.get('test:connection');
    await redis.del('test:connection');

    // Test Redis Stack JSON operations
    let jsonSupported = false;
    try {
      await redis.call('JSON.SET', 'test:json', '$', '{"status": "working"}');
      await redis.call('JSON.GET', 'test:json');
      await redis.del('test:json');
      jsonSupported = true;
    } catch (error) {
      console.warn('Redis JSON module not available:', error);
    }

    // Get Redis info
    const info = await redis.info('server');

    if (redis) {
      await redis.quit();
    }

    return json({
      success: true,
      message: 'Redis connection successful',
      testValue,
      redisInfo: {
        server: info.includes('redis_version'),
        jsonSupported,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    if (redis) {
      try {
        await redis.quit();
      } catch (quitError) {
        // Ignore quit errors during cleanup
      }
    }
    return json(
      {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          errno: error.errno,
          syscall: error.syscall,
          address: error.address,
          port: error.port,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
};