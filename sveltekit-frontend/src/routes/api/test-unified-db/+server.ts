import { unifiedDb, db } from '$lib/server/db/unified-client';
import { sql } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async () => {
  try {
    console.log('🧪 Testing Unified Database Client...');

    // Test 1: Health Check
    const health = await unifiedDb.healthCheck();
    console.log('✅ Health Check:', health);

    // Test 2: Basic Database Query
    const testQuery = await db.execute(sql`SELECT 1 as test, NOW() as timestamp`);
    console.log('✅ Basic Query:', testQuery);

    // Test 3: Schema Query (test if tables exist)
    const tableCheck = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('users', 'cases', 'evidence', 'document_metadata')
      ORDER BY table_name
    `);
    console.log('✅ Table Check:', tableCheck);

    // Test 4: Vector Extension Check
    let vectorSupport = false;
    try {
      await db.execute(sql`SELECT '[1,2,3]'::vector`);
      vectorSupport = true;
      console.log('✅ pgvector Extension: Available');
    } catch (error) {
      console.log('⚠️ pgvector Extension: Not Available');
    }

    // Test 5: Qdrant Connection Check
    const qdrant = unifiedDb.qdrant();
    let qdrantSupport = false;
    if (qdrant) {
      try {
        await qdrant.getCollections();
        qdrantSupport = true;
        console.log('✅ Qdrant Connection: Available');
      } catch (error) {
        console.log('⚠️ Qdrant Connection: Not Available');
      }
    } else {
      console.log('ℹ️ Qdrant: Not configured');
    }

    // Test 6: Test Vector Search (if vector support available)
    let vectorSearchTest = null;
    if (vectorSupport) {
      try {
        const testEmbedding = new Array(384).fill(0).map(() => Math.random());
        const searchResults = await unifiedDb.vectorSearch(testEmbedding, {
          limit: 2,
          threshold: 0.1
        });
        vectorSearchTest = {
          resultsCount: searchResults.results.length,
          performance: searchResults.performance
        };
        console.log('✅ Vector Search Test:', vectorSearchTest);
      } catch (error) {
        console.log('⚠️ Vector Search Test Failed:', error);
        vectorSearchTest = { error: String(error) };
      }
    }

    const results = {
      status: 'success',
      timestamp: new Date().toISOString(),
      tests: {
        healthCheck: health,
        basicQuery: testQuery.length > 0,
        tableCheck: tableCheck.map(t => t.table_name),
        vectorSupport,
        qdrantSupport,
        vectorSearchTest
      },
      summary: {
        database: health.postgresql ? '✅ Connected' : '❌ Failed',
        pgvector: vectorSupport ? '✅ Available' : '⚠️ Not Available',
        qdrant: qdrantSupport ? '✅ Connected' : '⚠️ Not Connected',
        overallHealth: health.overallHealth ? '✅ Healthy' : '❌ Unhealthy'
      }
    };

    console.log('🎉 Unified Database Client Test Complete:', results.summary);
    return json(results);

  } catch (error) {
    console.error('❌ Unified Database Client Test Failed:', error);
    return json({
      status: 'error',
      error: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};