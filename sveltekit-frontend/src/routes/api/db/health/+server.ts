import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

/*
 * Database Health Check API Endpoint
 * GET /api/db/health - Check database connectivity and pgvector extension
 */

import postgres from 'postgres';
import { dev } from '$app/environment';

// Database connection for health check
const connectionString = import.meta.env.DATABASE_URL || 
  `postgresql://${import.meta.env.DATABASE_USER || 'postgres'}:${import.meta.env.DATABASE_PASSWORD || '123456'}@${import.meta.env.DATABASE_HOST || 'localhost'}:${import.meta.env.DATABASE_PORT || '5432'}/${import.meta.env.DATABASE_NAME || 'legal_ai_db'}`;

export const GET: RequestHandler = async () => {
  let sql: postgres.Sql | null = null;
  
  try {
    // Create database connection
    sql = postgres(connectionString, {
      max: 1, // Single connection for health check
      idle_timeout: 5, // 5 seconds idle timeout
      connect_timeout: 10, // 10 seconds connect timeout
    });

    // Check basic database connectivity
    const basicCheck = await sql`SELECT version() as version, current_database() as database, now() as timestamp`;
    
    // Check pgvector extension
    const pgvectorCheck = await sql`
      SELECT 
        extname,
        extversion,
        extrelocatable
      FROM pg_extension 
      WHERE extname = 'vector'
    `;
    
    // Check if our user management tables exist
    const tablesCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'sessions', 'user_profiles', 'user_activities')
      ORDER BY table_name
    `;

    // Check vector operations capability (if tables exist)
    let vectorTest = null;
    if (tablesCheck.length > 0) {
      try {
        vectorTest = await sql`
          SELECT '[1,0,1]'::vector <-> '[1,0,0]'::vector as cosine_distance
        `;
      } catch (err: any) {
        console.warn('Vector test failed:', err.message);
        vectorTest = { error: err.message };
      }
    }

    // Collect health metrics
    const health = {
      database: {
        connected: true,
        version: basicCheck[0]?.version?.split(' ').slice(0, 2).join(' ') || 'Unknown',
        database_name: basicCheck[0]?.database || 'Unknown',
        timestamp: basicCheck[0]?.timestamp || new Date(),
      },
      extensions: {
        pgvector: {
          installed: pgvectorCheck.length > 0,
          version: pgvectorCheck[0]?.extversion || null,
          relocatable: pgvectorCheck[0]?.extrelocatable || false,
        }
      },
      tables: {
        user_management: {
          expected: ['users', 'sessions', 'user_profiles', 'user_activities'],
          found: tablesCheck.map(t => t.table_name),
          ready: tablesCheck.length === 4,
        }
      },
      vector_operations: {
        tested: vectorTest !== null,
        working: vectorTest && !vectorTest.error,
        sample_distance: vectorTest?.cosine_distance || null,
        error: vectorTest?.error || null,
      }
    };

    // Determine overall health status
    const isHealthy = 
      health.database.connected && 
      health.extensions.pgvector.installed && 
      health.tables.user_management.ready && 
      health.vector_operations.working;

    return json({
      success: true,
      message: isHealthy ? 'Database is healthy' : 'Database has issues',
      data: {
        healthy: isHealthy,
        status: isHealthy ? 'healthy' : 'degraded',
        checks: health,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: dev ? 'development' : 'production',
      }
    }, {
      status: isHealthy ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        ...(dev && { 'Access-Control-Allow-Origin': '*' }),
      }
    });

  } catch (err: any) {
    console.error('Database health check failed:', err);
    
    return json({
      success: false,
      message: 'Database health check failed',
      data: {
        healthy: false,
        status: 'unhealthy',
        error: {
          message: err.message,
          code: err.code || 'DATABASE_ERROR',
          details: dev ? err.stack : undefined,
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: dev ? 'development' : 'production',
      }
    }, { 
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } finally {
    // Always close the connection
    if (sql) {
      try {
        await sql.end();
      } catch (err: any) {
        console.warn('Failed to close database connection:', err.message);
      }
    }
  }
};

// OPTIONS handler for CORS preflight requests
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': dev ? '*' : 'https://yourdomain.com',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    }
  });
};