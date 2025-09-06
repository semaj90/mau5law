import { minioService } from '$lib/server/storage/minio-service';
import type { RequestHandler } from './$types';


export const GET: RequestHandler = async () => {
  try {
    const health = await minioService.healthCheck();
    
    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(),
      ...health
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: health.status === 'healthy' ? 200 : 503
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { action } = await request.json();
    
    if (action === 'initialize') {
      const initialized = await minioService.initialize();
      
      return new Response(JSON.stringify({
        success: initialized,
        action: 'initialize',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      error: 'Invalid action',
      availableActions: ['initialize']
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};