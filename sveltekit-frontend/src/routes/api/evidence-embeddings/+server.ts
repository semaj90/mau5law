import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { embeddingBackfillWorker } from '$lib/server/workers/embedding-backfill-worker.js';
import { query } from '$lib/server/db/client.js';

/*
 * Evidence Embeddings API
 * 
 * POST /api/evidence-embeddings - Trigger embedding backfill process
 * GET /api/evidence-embeddings - Get embedding statistics and status
 * GET /api/evidence-embeddings?search=query - Search for similar evidence
 */

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { action } = await request.json();

    switch (action) {
      case 'backfill':
        // Trigger embedding generation for all files without embeddings
        const result = await embeddingBackfillWorker.processAll();
        return json({
          success: true,
          message: 'Embedding backfill completed',
          result
        });

      case 'process-single':
        // TODO: Process a single file by ID
        return json({
          success: false,
          error: 'Single file processing not yet implemented'
        }, { status: 501 });

      default:
        return json({
          success: false,
          error: 'Invalid action. Use "backfill" or "process-single"'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Embedding backfill error:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const searchQuery = url.searchParams.get('search');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const caseId = url.searchParams.get('case_id');

    if (searchQuery) {
      // Perform semantic search using embeddings
      return await performSemanticSearch(searchQuery, { limit, caseId });
    }

    // Return embedding statistics
    const stats = await embeddingBackfillWorker.getStats();
    
    return json({
      success: true,
      stats,
      endpoints: {
        backfill: 'POST /api/evidence-embeddings with { "action": "backfill" }',
        search: 'GET /api/evidence-embeddings?search=query&limit=10&case_id=uuid',
        stats: 'GET /api/evidence-embeddings'
      }
    });

  } catch (error) {
    console.error('Evidence embeddings API error:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
};

/*
 * Perform semantic search using pgvector similarity
 */
async function performSemanticSearch(
  searchQuery: string, 
  options: { limit: number; caseId?: string | null }
): Promise<Response> {
  try {
    // Generate embedding for the search query
    const response = await fetch('http://localhost:5174/api/ai/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: searchQuery,
        model: 'mock', // Use mock for testing
        dimensions: 768
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate search embedding');
    }

    const { embedding: queryEmbedding } = await response.json();
    
    if (!queryEmbedding) {
      throw new Error('No embedding returned for search query');
    }

    // Convert embedding to PostgreSQL vector format
    const embeddingVector = `[${queryEmbedding.join(',')}]`;

    // Build similarity search query
    let searchSql = `
      SELECT 
        id,
        title,
        description,
        evidence_type,
        mime_type,
        uploaded_at,
        case_id,
        (embeddings <=> $1::vector) AS similarity_distance,
        (1 - (embeddings <=> $1::vector)) AS similarity_score
      FROM evidence_files 
      WHERE embeddings IS NOT NULL
    `;
    
    const params: any[] = [embeddingVector];
    
    // Filter by case_id if provided
    if (options.caseId) {
      searchSql += ` AND case_id = $2`;
      params.push(options.caseId);
    }
    
    // Order by similarity (lower distance = more similar)
    searchSql += ` ORDER BY embeddings <=> $1::vector LIMIT $${params.length + 1}`;
    params.push(options.limit);

    const { rows } = await query(searchSql, params);

    // Format results with similarity scores
    const results = rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      evidenceType: row.evidence_type,
      mimeType: row.mime_type,
      uploadedAt: row.uploaded_at,
      caseId: row.case_id,
      similarity: Math.max(0, Math.min(1, row.similarity_score)), // Clamp between 0-1
      similarityDistance: row.similarity_distance
    }));

    return json({
      success: true,
      query: searchQuery,
      results,
      count: results.length,
      searchStats: {
        queryEmbeddingDimensions: queryEmbedding.length,
        totalCandidates: rows.length
      }
    });

  } catch (error) {
    console.error('Semantic search error:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Semantic search failed'
    }, { status: 500 });
  }
}