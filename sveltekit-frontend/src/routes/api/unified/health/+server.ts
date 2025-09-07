import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { legalAI } from '$lib/server/unified/legal-ai-service';

export const GET: RequestHandler = async () => {
  try {
    const health = await legalAI.healthCheck();
    
    const overall = Object.values(health).every(status => status === true);
    
    return json({
      status: overall ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: health,
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }, {
      status: overall ? 200 : 503
    });

  } catch (error) {
    console.error('Health check error:', error);
    return json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        postgresql: false,
        redis: false,
        minio: false,
        qdrant: false,
        neo4j: false
      }
    }, { status: 503 });
  }
};