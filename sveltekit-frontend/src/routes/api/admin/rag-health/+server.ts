// src/routes/api/admin/rag-health/+server.ts

import { json } from '@sveltejs/kit';
import { sql } from '$lib/server/db';
import { getCached, setCached, getCacheStats } from '$lib/server/rag/cache';

export async function GET() {
  try {
    // Check cache first (health data changes infrequently)
    const cacheParams = {
      operation: 'health_check',
      timestamp: Math.floor(Date.now() / 60000), // Cache for 1 minute buckets
    };

    const cached = await getCached<any>('health', cacheParams);
    if (cached) {
      return json({ ...cached, cache: 'hit' });
    }

    // Global health metrics
    const [global] = await sql`
      SELECT
        COUNT(*)::int AS total_chunks,
        COUNT(rci.chunk_id)::int AS indexed_chunks,
        (COUNT(*) - COUNT(rci.chunk_id))::int AS missing_index_rows,
        MAX(rci.indexed_at) AS last_indexed_at
      FROM evidence_chunks ec
      LEFT JOIN rag_chunk_index rci ON ec.id = rci.chunk_id
    `;

    // Per-document breakdown
    const perDoc = await sql`
      SELECT
        ef.id,
        ef.filename,
        ef.chunk_count,
        COUNT(rci.chunk_id)::int AS indexed_chunks,
        MAX(rci.indexed_at) AS last_indexed_at
      FROM evidence_files ef
      LEFT JOIN evidence_chunks ec ON ef.id = ec.evidence_id
      LEFT JOIN rag_chunk_index rci ON ec.id = rci.chunk_id
      GROUP BY ef.id, ef.filename, ef.chunk_count
      ORDER BY (COUNT(rci.chunk_id)::int) ASC, ef.filename ASC
      LIMIT 500
    `;

    // Sample of failed chunks
    const failedChunks = await sql`
      SELECT ec.id AS chunk_id, ef.filename, ec.page_number
      FROM evidence_chunks ec
      JOIN evidence_files ef ON ef.id = ec.evidence_id
      LEFT JOIN rag_chunk_index rci ON ec.id = rci.chunk_id
      WHERE rci.chunk_id IS NULL
      ORDER BY ef.filename ASC, ec.page_number ASC
      LIMIT 200
    `;

    // Get cache statistics for additional health info
    const cacheStats = await getCacheStats();

    const healthData = {
      global,
      perDoc,
      failedChunks,
      cache: {
        ...cacheStats,
        status: 'miss',
      },
    };

    // Cache the results
    await setCached('health', cacheParams, healthData);

    return json(healthData);
  } catch (error) {
    console.error('RAG health error:', error);
    return json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}