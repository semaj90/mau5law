import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { legalAI } from '$lib/server/unified/legal-ai-service';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      query,
      type = 'all',
      limit = 20,
      threshold = 0.7,
      caseId,
      useRecommendations = true,
      cacheResults = true
    } = body;

    if (!query || query.trim().length === 0) {
      return json({ error: 'Query is required' }, { status: 400 });
    }

    // Use unified search across all systems
    const searchResults = await legalAI.searchDocuments({
      query: query.trim(),
      type,
      limit,
      threshold,
      caseId,
      useRecommendations,
      cacheResults
    });

    return json({
      success: true,
      query,
      ...searchResults,
      meta: {
        query,
        type,
        limit,
        threshold,
        caseId: caseId || null,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Unified search error:', error);
    return json(
      { 
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
};