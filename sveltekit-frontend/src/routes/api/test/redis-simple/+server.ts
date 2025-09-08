/**
 * Simple Redis Connection Test
 * Direct test of Redis connectivity without complex caching logic
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { redisService } from '$lib/server/redis-service';

export const GET: RequestHandler = async () => {
  try {
    const start = performance.now();
    
    // Test Redis service health
    const isHealthy = redisService.isHealthy();
    const stats = redisService.getStats();
    
    // Test basic operations
    const testKey = 'test:simple-connection';
    const testValue = `test-${Date.now()}`;
    
    // Set value
    const setResult = await redisService.set(testKey, testValue, 60);
    
    // Get value
    const getValue = await redisService.get(testKey);
    
    // Delete value
    const deleteResult = await redisService.del(testKey);
    
    const end = performance.now();
    
    return json({
      success: true,
      redis: {
        healthy: isHealthy,
        connected: stats.connected,
        status: stats.status
      },
      test: {
        setResult,
        getValue,
        deleteResult,
        valueMatches: getValue === testValue
      },
      timing: {
        totalTime: `${(end - start).toFixed(2)}ms`
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    return json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};