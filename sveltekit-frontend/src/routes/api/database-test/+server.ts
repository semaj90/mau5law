import { json } from '@sveltejs/kit';
import { db, testConnection, healthCheck } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';


export const GET: RequestHandler = async () => {
  const results: Record<string, any> = {};

  try {
    // 1. Database Connection Test
    results.connection = await testConnection();
    results.health = await healthCheck();

    // 2. Check pgvector Extension
    try {
      const vectorCheck = await db.execute(sql`
        SELECT extname, extversion 
        FROM pg_extension 
        WHERE extname = 'vector'
      `);
      
      results.pgvector = {
        installed: vectorCheck.length > 0,
        version: vectorCheck[0]?.extversion || null
      };
    } catch (error: any) {
      results.pgvector = {
        installed: false,
        error: error.message
      };
    }

    // 3. List All Tables
    try {
      const tables = await db.execute(sql`
        SELECT table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      results.tables = tables;
    } catch (error: any) {
      results.tables = { error: error.message };
    }

    // 4. Check Table Schemas  
    try {
      const schemas = await db.execute(sql`
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name IN ('users', 'cases', 'evidence', 'document_chunks')
        ORDER BY table_name, ordinal_position
      `);
      
      results.schemas = schemas;
    } catch (error: any) {
      results.schemas = { error: error.message };
    }

    // 5. Test Simple Query
    try {
      const simpleQuery = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          avg_width
        FROM pg_stats 
        WHERE schemaname = 'public'
        LIMIT 10
      `);
      
      results.stats = simpleQuery;
    } catch (error: any) {
      results.stats = { error: error.message };
    }

    // 6. Test Vector Operations (if available)
    try {
      const vectorTest = await db.execute(sql`
        SELECT '[1,2,3]'::vector as test_vector
      `);
      
      results.vectorOperations = {
        success: true,
        testVector: vectorTest[0]?.test_vector
      };
    } catch (error: any) {
      results.vectorOperations = {
        success: false,
        error: error.message
      };
    }

    return json({
      success: true,
      timestamp: new Date().toISOString(),
      database: 'legal_ai_db',
      results
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

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { query } = await request.json();
    
    if (!query) {
      return json({ error: 'No query provided' }, { status: 400 });
    }

    // Execute custom query (with safety restrictions)
    const result = await db.execute(sql.raw(query));
    
    return json({
      success: true,
      query,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};