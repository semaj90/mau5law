import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, testConnection } from '$lib/server/db/client';

export const GET: RequestHandler = async () => {
  try {
    // Test the database connection
    const isHealthy = await testConnection();
    
    if (!isHealthy) {
      return json(
        { error: 'Database connection failed', healthy: false },
        { status: 503 }
      );
    }

    // Try a simple query to verify schema access
    const result = await db.execute('SELECT current_database(), version(), current_timestamp');
    
    return json({
      healthy: true,
      database: result[0]?.current_database || 'unknown',
      version: result[0]?.version || 'unknown',
      timestamp: result[0]?.current_timestamp || new Date().toISOString(),
      message: 'PostgreSQL connection successful'
    });
    
  } catch (error) {
    console.error('Database health check error:', error);
    
    return json(
      { 
        error: 'Database health check failed', 
        healthy: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
};