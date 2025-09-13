// Automated Semantic Search API
// File: sveltekit-frontend/src/routes/api/rag/semantic-search/+server.ts

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, fetch }) => {
  try {
    const { query, threshold = 0.8, limit = 10, filters = {} } = await request.json();

    if (!query || typeof query !== 'string') {
      return json({ error: 'Query text is required' }, { status: 400 });
    }

    console.log(`🔍 Semantic search for: "${query}"`);
    const startTime = Date.now();

    // Step 1: Generate embedding for the query
    const embeddingResponse = await fetch('/api/embeddings/gemma?action=generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: query })
    });

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.text();
      console.error('❌ Embedding generation failed:', error);
      return json({ error: 'Failed to generate embedding' }, { status: 500 });
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.embedding;

    console.log(`✅ Generated ${queryEmbedding.length}D embedding in ${embeddingData.metadata.processingTime}ms`);

    // Step 2: Perform vector similarity search
    const searchResponse = await fetch('/api/pgvector/test?action=search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queryEmbedding,
        threshold,
        limit,
        filters
      })
    });

    if (!searchResponse.ok) {
      const error = await searchResponse.text();
      console.error('❌ Vector search failed:', error);
      return json({ error: 'Failed to perform vector search' }, { status: 500 });
    }

    const searchData = await searchResponse.json();
    const totalTime = Date.now() - startTime;

    // Step 3: Enhance results with semantic scoring
    const enhancedResults = searchData.results.map((result: any) => ({
      ...result,
      semanticScore: (1 - result.distance).toFixed(4), // Convert distance to similarity score
      relevanceLevel: getRelevanceLevel(result.distance),
      snippet: generateSnippet(query, result),
    }));

    return json({
      success: true,
      query,
      results: enhancedResults,
      metadata: {
        totalResults: searchData.metadata.totalResults,
        embeddingTime: embeddingData.metadata.processingTime,
        searchTime: searchData.metadata.searchTime,
        totalTime: `${totalTime}ms`,
        threshold,
        limit,
        model: embeddingData.metadata.model
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Semantic search error:', error);
    return json({
      error: 'Internal server error during semantic search',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

// Helper function to determine relevance level
function getRelevanceLevel(distance: number): string {
  if (distance < 0.3) return 'very-high';
  if (distance < 0.5) return 'high';
  if (distance < 0.7) return 'medium';
  if (distance < 0.9) return 'low';
  return 'very-low';
}

// Helper function to generate result snippet
function generateSnippet(query: string, result: any): string {
  // Extract key information for display
  const metadata = result.metadata || {};
  const parts = [];

  if (metadata.parties) {
    parts.push(`Parties: ${metadata.parties.join(', ')}`);
  }

  if (metadata.category) {
    parts.push(`Category: ${metadata.category}`);
  }

  if (metadata.jurisdiction) {
    parts.push(`Jurisdiction: ${metadata.jurisdiction}`);
  }

  return parts.length > 0 ? parts.join(' | ') : 'Legal document';
}