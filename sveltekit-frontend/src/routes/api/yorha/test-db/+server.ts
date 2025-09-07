
import { json } from "@sveltejs/kit";
import type { RequestHandler } from './$types';
// Use the canonical DB barrel: provides db, sql, and table exports
import { db, sql, legalDocuments } from "$lib/server/db";


// YoRHa Database Test API
// Tests JSON/JSONB data flow and database connectivity

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { action = "test-connection" } = await request.json();

  // Loosely type results to avoid noisy structural typing errors
  const results: any = {
      timestamp: new Date(),
      action,
      results: {},
      success: true,
      service: "yorha-db-test"
    };

    switch (action) {
      case "test-connection":
        // Test basic database connectivity
        const connectionTest = await db.execute(sql`SELECT version(), current_database(), current_user`);
        results.results.connection = {
          database: connectionTest[0],
          status: "connected"
        };
        break;

      case "test-pgvector":
        // Test pgvector extension
        try {
          const vectorTest = await db.execute(sql`SELECT extname FROM pg_extension WHERE extname = 'vector'`);
          const vectorVersion = await db.execute(sql`SELECT extversion FROM pg_extension WHERE extname = 'vector'`);
          results.results.pgvector = {
            installed: vectorTest.length > 0,
            version: vectorVersion[0]?.extversion || null,
            status: vectorTest.length > 0 ? "available" : "not_installed"
          };
        } catch (error: any) {
          results.results.pgvector = {
            installed: false,
            error: error.message,
            status: "error"
          };
        }
        break;

      case "test-json":
        // Test JSONB functionality
        const testDoc = {
          title: "YoRHa Test Document",
          content: "This is a test document for YoRHa system integration",
          documentType: "test",
          keywords: ["yorha", "test", "integration", "legal-ai"],
          topics: ["system-testing", "database-integration"],
          metadata: {
            testRun: true,
            timestamp: new Date(),
            version: "4.0.0",
            system: "yorha-legal-ai"
          }
        };

        const insertResult = await db.insert(legalDocuments).values({
          title: testDoc.title,
          content: testDoc.content,
          document_type: testDoc.documentType,
          keywords: testDoc.keywords,
          topics: testDoc.topics,
          full_text: testDoc.content,
          summary: "Test document for YoRHa system validation",
          created_at: new Date(),
          updated_at: new Date()
        }).returning();

        // Test JSON query
        const jsonTest = await db.execute(sql`
          SELECT
            id,
            title,
            keywords,
            topics,
            keywords @> ${JSON.stringify(["yorha"])} as has_yorha_keyword,
            jsonb_array_length(keywords) as keyword_count,
            jsonb_array_length(topics) as topic_count
          FROM legal_documents
          WHERE id = ${insertResult[0].id}
        `);

        results.results.json = {
          inserted: insertResult[0],
          jsonQuery: jsonTest[0],
          status: "success"
        };
        break;

      case "test-vector":
        // Test vector operations (if available)
        try {
          // Create a test vector
          const testVector = Array.from({ length: 768 }, () => Math.random());

          const vectorInsert = await db.insert(legalDocuments).values({
            title: "Vector Test Document",
            content: "This document tests vector embedding functionality",
            document_type: "test",
            embedding: sql`${JSON.stringify(testVector)}::vector`,
            keywords: ["vector", "embedding", "test"],
            full_text: "Vector embedding test content",
            created_at: new Date(),
            updated_at: new Date()
          }).returning();

          // Test vector similarity (cosine similarity)
          const similarityTest = await db.execute(sql`
            SELECT
              id,
              title,
              1 - (embedding <=> ${JSON.stringify(testVector)}::vector) as similarity
            FROM legal_documents
            WHERE embedding IS NOT NULL
            ORDER BY similarity DESC
            LIMIT 3
          `);

          results.results.vector = {
            inserted: vectorInsert[0],
            similarities: similarityTest,
            vectorLength: testVector.length,
            status: "success"
          };
        } catch (error: any) {
          results.results.vector = {
            error: error.message,
            status: "error"
          };
        }
        break;

      case "test-full-stack":
        // Comprehensive test of all functionality
  const fullStackResults: any = {};

        // 1. Connection test
        const conn = await db.execute(sql`SELECT 'connection_ok' as status`);
        fullStackResults.connection = conn[0];

        // 2. JSON operations
        const jsonDoc = await db.insert(legalDocuments).values({
          title: "Full Stack Test Document",
          content: "Comprehensive test of YoRHa legal AI system",
          document_type: "integration-test",
          keywords: ["full-stack", "yorha", "integration", "test"],
          topics: ["system-validation", "end-to-end-testing"],
          full_text: "Full stack integration test content for YoRHa legal AI platform",
          summary: "End-to-end system validation document",
          jurisdiction: "test-jurisdiction",
          court: "test-court",
          citation: "TEST-001-2024",
          created_at: new Date(),
          updated_at: new Date()
        }).returning();

        // 3. Complex JSON query
        const complexQuery = await db.execute(sql`
          SELECT
            COUNT(*) as total_docs,
            COUNT(CASE WHEN keywords @> '["yorha"]' THEN 1 END) as yorha_docs,
            COUNT(CASE WHEN document_type = 'test' THEN 1 END) as test_docs,
            AVG(jsonb_array_length(keywords)) as avg_keywords,
            MAX(created_at) as latest_doc
          FROM legal_documents
        `);

        // 4. Search functionality test
        const searchTest = await db.execute(sql`
          SELECT id, title, document_type
          FROM legal_documents
          WHERE
            title ILIKE '%test%'
            OR content ILIKE '%yorha%'
            OR keywords @> '["test"]'
          ORDER BY created_at DESC
          LIMIT 5
        `);

        fullStackResults.json = {
          document: jsonDoc[0],
          analytics: complexQuery[0],
          search: searchTest
        };

        // 5. Performance test
        const perfStart = Date.now();
        await db.execute(sql`SELECT COUNT(*) FROM legal_documents`);
        const perfEnd = Date.now();

        fullStackResults.performance = {
          queryTime: perfEnd - perfStart,
          status: perfEnd - perfStart < 100 ? "excellent" : "acceptable"
        };

        results.results.fullStack = fullStackResults;
        break;

      case "cleanup":
        // Clean up test data
        const cleanupResult = await db.execute(sql`
          DELETE FROM legal_documents
          WHERE title LIKE '%Test%'
          OR document_type = 'test'
          OR document_type = 'integration-test'
        `);

        results.results.cleanup = {
          deletedRows:
            (cleanupResult as any)?.rowCount ??
            (Array.isArray(cleanupResult) ? cleanupResult.length : 0),
          status: 'completed',
        };
        break;

      default:
        results.success = false;
        results.error = `Unknown action: ${action}`;
    }

    return json(results);

  } catch (error: any) {
    console.error("YoRHa DB test error:", error);
    return json(
      {
        success: false,
        error: error.message || "Database test failed",
        timestamp: new Date(),
        service: "yorha-db-test"
      },
      { status: 500 }
    );
  }
};

export const GET: RequestHandler = async () => {
  try {
    // Quick health check
    const healthCheck = await db.execute(sql`
      SELECT
        'healthy' as status,
        version() as db_version,
        current_database() as database,
        current_user as user,
        NOW() as timestamp
    `);

    const tableCheck = await db.execute(sql`
      SELECT
        COUNT(*) as document_count
      FROM legal_documents
    `);

    return json({
      success: true,
      status: "healthy",
      database: healthCheck[0],
      statistics: tableCheck[0],
      availableTests: [
        "test-connection",
        "test-pgvector",
        "test-json",
        "test-vector",
        "test-full-stack",
        "cleanup"
      ],
      service: "yorha-db-test"
    });

  } catch (error: any) {
    return json(
      {
        success: false,
        error: error.message || "Health check failed",
        service: "yorha-db-test"
      },
      { status: 500 }
    );
  }
};
