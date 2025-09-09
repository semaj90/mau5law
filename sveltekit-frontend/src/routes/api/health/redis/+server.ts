import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  try {
    // Check if Redis is accessible via the main health endpoint
    const healthResponse = await fetch('http://localhost:5174/api/health');
    const healthData = await healthResponse.json();
    
    const redisStatus = healthData.services?.databases?.redis || healthData.redis;
    
    if (redisStatus) {
      return json({
        status: 'healthy',
        redis: redisStatus,
        port: 6379,
        host: 'localhost',
        timestamp: new Date().toISOString(),
        note: 'Redis connection verified via main health check'
      });
    } else {
      return json({
        status: 'unknown',
        error: 'Redis status not found in health check',
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }
  } catch (error: any) {
    return json({
      status: 'error',
      error: error.message || 'Failed to check Redis status',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};