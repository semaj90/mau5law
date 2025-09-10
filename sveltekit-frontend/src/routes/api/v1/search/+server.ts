import { json } from '@sveltejs/kit';
import { orchestrator } from '$lib/services/unified-legal-orchestrator';
import { qdrant } from '$lib/server/vector/qdrant-manager';
import { db, vectorSearch } from '$lib/server/database/connection';
import { rabbitmq } from '$lib/server/queue/rabbitmq-manager';
import type { RequestHandler } from './$types.js';

// Unified Search API with hybrid vector + text + filtered search
export const POST: RequestHandler = async ({ request }) => {
  const startTime = Date.now();
  
  try {
    const searchRequest = await request.json();
    const {
      query,
      type = 'hybrid', // 'semantic', 'text', 'filtered', 'hybrid'
      filters = {},
      limit = 10,
      threshold = 0.7,
      collections = ['documents'],
      user_id,
      case_id
    } = searchRequest;

    if (!query) {
      return json({
        error: 'Query parameter is required',
        status: 'error'
      }, { status: 400 });
    }

    // Generate query embedding for semantic search
    let queryEmbedding: number[] = [];
    if (type === 'semantic' || type === 'hybrid') {
      queryEmbedding = await generateQueryEmbedding(query);
    }

    // Build orchestration request
    const orchestrationRequest = {
      type: 'search' as const,
      payload: {
        query,
        type,
        filters,
        limit,
        threshold,
        collections,
        embedding: queryEmbedding,
        dataset_size: await estimateDatasetSize(collections, filters),
        has_filters: Object.keys(filters).length > 0
      },
      context: {
        user_id,
        case_id,
        priority: 'normal' as const
      },
      performance_requirements: {
        max_latency_ms: 2000,
        accuracy_threshold: threshold
      }
    };

    // Process through orchestrator
    const response = await orchestrator.processRequest(orchestrationRequest);

    // If hybrid search wasn't used by orchestrator, do it manually
    let finalResults = response;
    if (type === 'hybrid' && response._metadata?.execution_path !== 'hybrid') {
      finalResults = await performHybridSearch(query, queryEmbedding, filters, limit, threshold, collections);
    }

    // Track search analytics
    await rabbitmq.publishAnalyticsEvent({
      event_type: 'search_request',
      event_data: {
        query,
        search_type: type,
        user_id,
        case_id,
        filters_count: Object.keys(filters).length,
        results_count: finalResults.results?.length || 0,
        execution_path: response._metadata?.execution_path
      },
      response_time_ms: Date.now() - startTime,
      cache_hit: response._metadata?.cached || false
    });

    return json({
      success: true,
      data: {
        results: finalResults.results || [],
        metadata: {
          query,
          search_type: type,
          total_results: finalResults.results?.length || 0,
          execution_path: response._metadata?.execution_path,
          latency_ms: Date.now() - startTime,
          cached: response._metadata?.cached,
          threshold_used: threshold,
          collections_searched: collections
        },
        suggestions: await generateSearchSuggestions(query, finalResults.results || [])
      }
    });

  } catch (error: any) {
    console.error('Search API error:', error);
    
    return json({
      error: 'Search processing failed',
      details: error.message,
      status: 'error'
    }, { status: 500 });
  }
};

// GET endpoint for saved searches and search history
export const GET: RequestHandler = async ({ url }) => {
  const user_id = url.searchParams.get('user_id');
  const action = url.searchParams.get('action') || 'history';
  const limit = parseInt(url.searchParams.get('limit') || '10');

  try {
    switch (action) {
      case 'history':
        if (!user_id) {
          return json({ error: 'user_id required for search history' }, { status: 400 });
        }
        
        const history = await getSearchHistory(user_id, limit);
        return json({
          success: true,
          data: { history }
        });

      case 'suggestions':
        const query = url.searchParams.get('query') || '';
        const suggestions = await getSearchSuggestions(query);
        return json({
          success: true,
          data: { suggestions }
        });

      case 'trending':
        const trending = await getTrendingSearches(limit);
        return json({
          success: true,
          data: { trending }
        });

      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Search GET error:', error);
    
    return json({
      error: 'Search request failed',
      details: error.message
    }, { status: 500 });
  }
};

// Helper functions
async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    // In production, this would call your embedding service
    // For now, return a placeholder embedding
    return new Array(1536).fill(0.1);
  } catch (error) {
    console.warn('Embedding generation failed, using zero vector');
    return new Array(1536).fill(0);
  }
}

async function estimateDatasetSize(collections: string[], filters: any): Promise<number> {
  try {
    // Quick estimate of how much data we'll be searching
    let totalSize = 0;
    
    for (const collection of collections) {
      const info = await qdrant.getCollectionInfo(collection as any);
      if (info) {
        totalSize += info.vectors_count;
      }
    }
    
    // Rough filter adjustment
    const filterReduction = Object.keys(filters).length > 0 ? 0.3 : 1.0;
    return Math.floor(totalSize * filterReduction);
    
  } catch (error) {
    return 1000; // Default estimate
  }
}

async function performHybridSearch(
  query: string, 
  queryEmbedding: number[], 
  filters: any, 
  limit: number, 
  threshold: number, 
  collections: string[]
): Promise<any> {
  try {
    // Run multiple search strategies in parallel
    const searchTasks = [];

    // 1. Vector similarity search in Qdrant
    for (const collection of collections) {
      searchTasks.push(
        qdrant.hybridSearch({
          query,
          queryEmbedding,
          collection: collection as any,
          filters,
          limit: Math.ceil(limit / collections.length),
          scoreThreshold: threshold
        })
      );
    }

    // 2. PostgreSQL full-text search with pgvector
    searchTasks.push(
      vectorSearch.searchSimilarDocuments(queryEmbedding, limit, threshold)
    );

    // 3. Direct text search if query is short
    if (query.length < 100) {
      searchTasks.push(
        performTextSearch(query, filters, limit)
      );
    }

    // Wait for all searches to complete
    const results = await Promise.allSettled(searchTasks);
    
    // Combine and rank results
    return combineSearchResults(results, query);

  } catch (error: any) {
    console.error('Hybrid search error:', error);
    throw error;
  }
}

async function performTextSearch(query: string, filters: any, limit: number): Promise<any> {
  try {
    // Simple text search using PostgreSQL full-text search
    const { documentsTable } = await import('$lib/server/database/schema');
    const { ilike, and, eq } = await import('drizzle-orm');
    
    let searchQuery = db.select().from(documentsTable);
    
    const conditions = [];
    
    // Add text search condition
    conditions.push(ilike(documentsTable.content, `%${query}%`));
    
    // Add filters
    for (const [key, value] of Object.entries(filters)) {
      if (key === 'case_id') {
        conditions.push(eq(documentsTable.case_id, value as string));
      }
      // Add more filter conditions as needed
    }
    
    if (conditions.length > 0) {
      searchQuery = searchQuery.where(and(...conditions));
    }
    
    const results = await searchQuery.limit(limit);
    
    return {
      results: results.map(doc => ({
        id: doc.id,
        title: doc.title,
        content_preview: doc.content?.substring(0, 200),
        score: 0.5, // Default score for text search
        source: 'text_search'
      }))
    };
    
  } catch (error) {
    console.error('Text search error:', error);
    return { results: [] };
  }
}

function combineSearchResults(results: PromiseSettledResult<any>[], query: string): any {
  const combinedResults: any[] = [];
  const seenIds = new Set<string>();
  
  // Process each search result
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value?.results) {
      for (const item of result.value.results) {
        // Avoid duplicates
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          combinedResults.push({
            ...item,
            _hybrid_sources: [result.value.metadata?.source || 'unknown']
          });
        } else {
          // Merge sources for duplicates
          const existing = combinedResults.find(r => r.id === item.id);
          if (existing && !existing._hybrid_sources.includes(item.source)) {
            existing._hybrid_sources.push(item.source);
            // Boost score for items found in multiple sources
            existing.score = Math.min((existing.score + item.score) / 2 * 1.1, 1.0);
          }
        }
      }
    }
  }
  
  // Sort by relevance score
  combinedResults.sort((a, b) => (b.score || 0) - (a.score || 0));
  
  return {
    results: combinedResults,
    metadata: {
      hybrid: true,
      sources_combined: results.length,
      total_results: combinedResults.length
    }
  };
}

async function generateSearchSuggestions(query: string, results: any[]): Promise<string[]> {
  // Generate search suggestions based on query and results
  const suggestions: string[] = [];
  
  // Extract common terms from successful results
  if (results.length > 0) {
    const commonTerms = extractCommonTerms(results);
    suggestions.push(...commonTerms.slice(0, 3));
  }
  
  // Add query variations
  if (query.length > 3) {
    suggestions.push(`"${query}"`, `${query} AND legal`, `${query} case law`);
  }
  
  return suggestions.slice(0, 5);
}

function extractCommonTerms(results: any[]): string[] {
  const termCounts = new Map<string, number>();
  
  for (const result of results) {
    const text = (result.title + ' ' + (result.content_preview || '')).toLowerCase();
    const words = text.match(/\b\w{4,}\b/g) || [];
    
    for (const word of words) {
      termCounts.set(word, (termCounts.get(word) || 0) + 1);
    }
  }
  
  return Array.from(termCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term]) => term);
}

async function getSearchHistory(user_id: string, limit: number): Promise<any[]> {
  // Implementation would query analytics or search history table
  return [];
}

async function getSearchSuggestions(query: string): Promise<string[]> {
  // Implementation would use Fuse.js or similar for fuzzy suggestions
  return [];
}

async function getTrendingSearches(limit: number): Promise<any[]> {
  // Implementation would analyze recent search analytics
  return [];
}