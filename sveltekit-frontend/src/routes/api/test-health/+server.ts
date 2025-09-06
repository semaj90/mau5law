import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

// Simple health check endpoint without database dependencies
export const GET: RequestHandler = async () => {
  try {
    // Test basic functionality without touching the database
    return json({
      success: true,
      timestamp: new Date().toISOString(),
      status: 'healthy',
      services: {
        frontend: true,
        api: true
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

export const POST: RequestHandler = GET;