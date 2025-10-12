import type { RequestHandler } from './$types.js';
/*
 * Vector Intelligence Search API Endpoint
 * Provides semantic search capabilities with Phase 4 Vector Intelligence
 */
import { json, error } from '@sveltejs/kit';
import { vectorIntelligenceService } from '$lib/services/vector-intelligence-service.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      query,
      options = {},
    }: {
      query: string;
      options: Partial<VectorSearchOptions>;
    } = body;
    if (!query || typeof query !== 'string') {
      throw error(400, 'Invalid query: must be a non-empty string');
    }
    console.log(`🔍 Vector intelligence search: "${query.substring(0, 100)}..."`);
    // Configure search options with intelligent defaults
    const searchOptions: VectorSearchOptions = {
      query,
      threshold: options.threshold ?? 0.7,
      limit: options.limit ?? 10,
      includeMetadata: options.includeMetadata !== false,
      contextFilter: options.contextFilter,
    };
    // Perform enhanced semantic search with vector intelligence
    const results = await vectorIntelligenceService.semanticSearch(searchOptions);
    // Get system health for response metadata
    const systemHealth = await vectorIntelligenceService.getSystemHealth();
    return json({
      success: true,
      query,
      results,
      metadata: {
        totalResults: results.length,
        processingTime: Date.now(),
        searchOptions,
        systemHealth: {
          status: systemHealth.systemHealth,
          confidence: systemHealth.modelConfidence,
          indexedDocuments: systemHealth.indexedDocuments,
        },
      },
    });
  } catch (err: unknown) {
    console.error('❌ Vector intelligence search API error:', err);
    const errorMessage = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
    let statusCode = 500;
    if (err && typeof err === 'object' && 'status' in err) {
      const s = (err as { status?: unknown }).status;
      if (typeof s === 'number') statusCode = s;
      else if (typeof s === 'string') {
        const parsed = Number.parseInt(s, 10);
        if (!Number.isNaN(parsed)) statusCode = parsed;
      }
    }
    throw error(statusCode, errorMessage);
  }
};
export const GET: RequestHandler = async ({ url }) => {
  const query = url.searchParams.get('q');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const threshold = parseFloat(url.searchParams.get('threshold') || '0.7');
  const caseId = url.searchParams.get('caseId');
  const evidenceType = url.searchParams.get('evidenceType');
  if (!query) {
    // Return API documentation and system status
    const systemHealth = await vectorIntelligenceService.getSystemHealth();
    return json({
      message: 'Vector Intelligence Search API - Phase 4',
      endpoints: {
        'POST /api/vector/search': 'Enhanced semantic search with vector intelligence',
        'GET /api/vector/search?q=query': 'Quick search via query parameter',
      },
      parameters: {
        query: 'Search query (required)',
        limit: 'Max results (default: 10)',
        threshold: 'Similarity threshold (default: 0.7)',
        caseId: 'Filter by case ID (optional)',
        evidenceType: 'Filter by evidence type (optional)',
      },
      systemHealth,
      capabilities: [
        'Semantic vector search',
        'Multi-modal embedding support',
        'Contextual filtering',
        'Relevance scoring',
        'Intelligent caching',
        'Real-time health monitoring',
      ],
    });
  }
  try {
    // Build search options from query parameters
    const searchOptions: VectorSearchOptions = {
      query,
      threshold,
      limit,
      includeMetadata: true,
      contextFilter: {
        ...(caseId && { caseId }),
        ...(evidenceType && { evidenceType }),
      },
    };
    const results = await vectorIntelligenceService.semanticSearch(searchOptions);
    return json({
      success: true,
      query,
      results,
      metadata: {
        totalResults: results.length,
        processingTime: Date.now(),
        searchOptions,
      },
    });
  } catch (err: unknown) {
    console.error('❌ Vector intelligence GET search error:', err);
    const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Search failed';
    throw error(500, msg);
  }
};
