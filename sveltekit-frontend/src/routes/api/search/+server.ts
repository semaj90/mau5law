/**
 * Search API Endpoint
 * Agentic RAG search with semantic + keyword + reranking
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { SearchOrchestrator } from '$lib/server/services/search/search-orchestrator';

// Initialize orchestrator (in production, use dependency injection)
let orchestrator: SearchOrchestrator | null = null;

async function getOrchestrator(): Promise<SearchOrchestrator> {
  if (!orchestrator) {
    const { createSearchOrchestrator } = await import(
      '$lib/server/services/search/search-orchestrator'
    );

    const pgvectorUrl =
      process.env.DATABASE_URL ||
      'postgres://legal_admin:123456@localhost:5432/legal_ai_db?sslmode=disable';
    const elasticsearchNode = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
    const rerankerUrl = process.env.RERANKER_URL || 'http://localhost:8000';

    orchestrator = await createSearchOrchestrator(pgvectorUrl, elasticsearchNode, rerankerUrl);
  }

  return orchestrator;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { query, embedding, top_k = 7 } = body;

    if (!query || !embedding) {
      return json({ error: 'Missing query or embedding' }, { status: 400 });
    }

    if (!Array.isArray(embedding) || embedding.length !== 768) {
      return json({ error: 'Embedding must be a 768-dimensional vector' }, { status: 400 });
    }

    const orch = await getOrchestrator();
    const results = await orch.search({ text: query, embedding }, top_k);

    return json(results);
  } catch (error) {
    console.error('Search error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
};

export const GET: RequestHandler = async () => {
  try {
    const orch = await getOrchestrator();
    const stats = await orch.getStats();

    return json({
      status: 'healthy',
      stats,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return json({ error: 'Failed to get stats' }, { status: 500 });
  }
};
