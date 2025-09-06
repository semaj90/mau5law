/**
 * Vector Search API (PGVector-first)
 * Reuses the central EmbeddingRepository to avoid schema drift.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { SimilarityResult } from '$lib/server/embedding/embedding-repository';
import { getEmbeddingRepository } from '$lib/server/embedding/embedding-repository';

interface VectorSearchQuery {
  query: string;
  limit?: number;
  threshold?: number; // reserved for future use
  filters?: Record<string, any>; // reserved; repo doesn’t support yet
}

interface VectorResult {
  id: string;
  title?: string;
  content: string;
  score: number;
  metadata: Record<string, any> & { source: string };
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = (await request.json()) as VectorSearchQuery;
    const { query, limit = 8 } = body || {} as VectorSearchQuery;
    if (!query || !query.trim()) {
      return json({ error: 'Query is required' }, { status: 400 });
    }

    const repo = await getEmbeddingRepository();
    const results = await repo.querySimilar(query.trim(), { limit });

    const mapped: VectorResult[] = results.map(mapRepoResult);
    return json({
      query,
      results: mapped,
      metadata: {
        totalResults: mapped.length,
        sources: { pgvector: mapped.length, qdrant: 0 }
      }
    });
  } catch (error: any) {
    console.error('vector-search route error:', error);
    return json({ error: 'Vector search failed' }, { status: 500 });
  }
};

function mapRepoResult(r: SimilarityResult): VectorResult {
  return {
    id: r.id,
    title: r.metadata?.title,
    content: r.content,
    score: r.score,
    metadata: { ...r.metadata, documentId: r.documentId, chunkIndex: r.chunkIndex, source: 'pgvector' }
  };
}