// Mock Data Sync API - Test integration with PostgreSQL, pgvector, and Drizzle ORM
// This endpoint provides test data and verifies database connectivity

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { initializeMockDataWithEmbeddings, mockApiResponses } from '$lib/data/mock-legal-data.js';

// Database connection (with fallback for development)
let db: any = null;
let dbStatus = 'disconnected';

async function initializeDatabase() {
  try {
    // Try to import the database connection
    const { db: dbConnection } = await import('$lib/server/db/index.js');
    db = dbConnection;
    
    // Test connection with a simple query
    await db.execute('SELECT 1');
    dbStatus = 'connected';
    console.log('✅ Database connected successfully');
    
    // Check for pgvector extension
    try {
      const vectorCheck = await db.execute('SELECT extname FROM pg_extension WHERE extname = \'vector\';');
      if (vectorCheck.length > 0) {
        console.log('✅ pgvector extension is available');
      } else {
        console.log('⚠️ pgvector extension not found - vector operations may not work');
      }
    } catch (err) {
      console.log('⚠️ Could not check pgvector status:', err);
    }
    
  } catch (error) {
    console.log('⚠️ Database connection failed, using mock mode:', error);
    dbStatus = 'mock_mode';
  }
}

// Initialize on first request
let initialized = false;

export const GET: RequestHandler = async ({ url }) => {
  if (!initialized) {
    await initializeDatabase();
    initialized = true;
  }

  const action = url.searchParams.get('action') || 'status';
  const format = url.searchParams.get('format') || 'json';

  try {
    switch (action) {
      case 'status':
        return json({
          success: true,
          database: {
            status: dbStatus,
            available: db !== null,
            pgvector: dbStatus === 'connected' ? 'available' : 'unknown'
          },
          mock_data: {
            users: 2,
            cases: 2,
            evidence: 2,
            documents: 1,
            chat_messages: 2
          },
          api_endpoints: {
            cases: '/api/cases',
            evidence: '/api/evidence',
            search: '/api/search',
            mock_sync: '/api/test/mock-sync'
          },
          sveltekit_version: '2.x',
          drizzle_orm: 'configured',
          timestamp: new Date().toISOString()
        });

      case 'mock-data':
        const mockData = initializeMockDataWithEmbeddings();
        return json({
          success: true,
          data: mockData,
          metadata: {
            generated_embeddings: true,
            embedding_dimensions: 384,
            total_records: {
              users: mockData.users.length,
              cases: mockData.cases.length,
              evidence: mockData.evidence.length,
              documents: mockData.legalDocuments.length,
              messages: mockData.chatMessages.length
            }
          }
        });

      case 'api-examples':
        return json({
          success: true,
          examples: mockApiResponses,
          usage: {
            cases_list: 'GET /api/cases',
            cases_create: 'POST /api/cases',
            evidence_list: 'GET /api/evidence?caseId=xxx',
            evidence_create: 'POST /api/evidence',
            vector_search: 'POST /api/search',
            health_check: 'GET /api/test/mock-sync?action=status'
          }
        });

      case 'database-test':
        if (dbStatus !== 'connected') {
          return json({
            success: false,
            error: 'Database not connected',
            status: dbStatus,
            suggestion: 'Ensure PostgreSQL is running on localhost:5432 with legal_ai_db database'
          });
        }

        try {
          // Test basic database operations
          const testResults: any = {
            connection: 'ok',
            tables: 'unknown',
            pgvector: 'unknown'
          };

          // Test table existence (safe queries)
          try {
            const tableQuery = await db.execute(`
              SELECT table_name 
              FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name IN ('users', 'cases', 'evidence', 'legal_documents')
              ORDER BY table_name;
            `);
            testResults.tables = tableQuery.length > 0 ? 'ok' : 'missing';
            testResults.found_tables = tableQuery.map((row: any) => row.table_name);
          } catch (err) {
            testResults.tables = 'error';
          }

          // Test pgvector
          try {
            await db.execute('SELECT \'[1,2,3]\'::vector;');
            testResults.pgvector = 'ok';
          } catch (err) {
            testResults.pgvector = 'error';
          }

          return json({
            success: true,
            database_test: testResults,
            recommendations: testResults.tables === 'missing' 
              ? ['Run database migrations: npm run db:migrate', 'Seed test data: npm run db:seed']
              : ['Database appears ready for use']
          });

        } catch (error) {
          return json({
            success: false,
            error: 'Database test failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }

      default:
        return json({
          success: false,
          error: `Unknown action: ${action}`,
          available_actions: ['status', 'mock-data', 'api-examples', 'database-test']
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Mock sync API error:', error);
    return json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  if (!initialized) {
    await initializeDatabase();
    initialized = true;
  }

  try {
    const { action, data } = await request.json();

    switch (action) {
      case 'insert-mock-data':
        if (dbStatus !== 'connected') {
          return json({
            success: false,
            error: 'Database not connected - cannot insert mock data',
            suggestion: 'Use GET /api/test/mock-sync?action=mock-data for in-memory testing'
          });
        }

        // This would insert mock data into the actual database
        // For safety, we'll return a simulation instead
        return json({
          success: true,
          message: 'Mock data insertion simulated',
          note: 'Actual database insertion disabled for safety. Use migration scripts instead.',
          recommended_approach: [
            '1. Use npm run db:migrate to create tables',
            '2. Use npm run db:seed to insert test data',
            '3. Use npm run db:studio to view data'
          ]
        });

      case 'test-vector-operations':
        if (dbStatus !== 'connected') {
          return json({
            success: false,
            error: 'Database not connected - cannot test vectors'
          });
        }

        try {
          // Test basic vector operations
          const vectorTest = await db.execute(`
            SELECT 
              '[1,2,3]'::vector as test_vector,
              '[1,2,3]'::vector <-> '[1,2,4]'::vector as cosine_distance;
          `);

          return json({
            success: true,
            vector_test: vectorTest[0],
            message: 'pgvector is working correctly'
          });

        } catch (error) {
          return json({
            success: false,
            error: 'Vector test failed',
            details: error instanceof Error ? error.message : 'Unknown error',
            suggestion: 'Ensure pgvector extension is installed: CREATE EXTENSION vector;'
          });
        }

      default:
        return json({
          success: false,
          error: `Unknown POST action: ${action}`,
          available_actions: ['insert-mock-data', 'test-vector-operations']
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Mock sync POST error:', error);
    return json({
      success: false,
      error: 'Failed to process POST request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};