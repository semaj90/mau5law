// Vector Search API Endpoint
// Bridge between frontend UI and vector search service
import { json, type RequestHandler } from '@sveltejs/kit'
// TODO: Implement enhanced vector search service
// import { enhancedVectorSearchService } from '$lib/services/enhanced-vector-search'
// Placeholder service until enhanced-vector-search is implemented
const enhancedVectorSearchService = {
  async unifiedVectorSearch(query: string, options: any) {
    return {
      results: [],
      total: 0,
      executionTime: Date.now(),
      suggestions: [],
      debug: { message: 'Enhanced vector search not yet implemented' }
    }
  },
  async healthCheck() {
    return { status: 'healthy', service: 'placeholder' }
  },
  async getSearchStats() {
    return { totalQueries: 0, avgResponseTime: 0 }
  }
}
import type { VectorSearchOptions } from '$lib/types/vector-search'
interface SearchRequestBody {
  query: string
  options?: VectorSearchOptions & {
    embedding?: number[]
  }
}
export const POST: RequestHandler = async ({ request }) => {
  try {
    const startTime = Date.now()
    const body: SearchRequestBody = await request.json()
    if (!body.query || typeof body.query !== 'string') {
      return json({
        error: 'Query text is required',
        code: 'MISSING_QUERY'
      }, { status: 400 })
    }
    console.log(`🔍 Search request: "${body.query.substring(0, 100)}..."`)
    let queryEmbedding: number[]
    if (body.options?.embedding && Array.isArray(body.options.embedding)) {
      console.log('🔧 Using provided embedding')
      queryEmbedding = body.options.embedding
    } else {
      console.log('🤖 Generating embedding with Ollama...')
      try {
        const embeddingResponse = await fetch('http://localhost:11434/api/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'nomic-embed-text',
            prompt: body.query
          })
        })
        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text()
          console.error('❌ Ollama embedding error:', errorText)
          return json({
            error: 'Failed to generate embedding from Ollama',
            code: 'EMBEDDING_GENERATION_FAILED',
            details: `Ollama responded with ${embeddingResponse.status}: ${errorText}`
          }, { status: 502 })
        }
        const embeddingData = await embeddingResponse.json()
        queryEmbedding = embeddingData.embedding
        console.log(`✅ Generated ${queryEmbedding.length}D embedding`)
      } catch (error) {
        console.error('❌ Ollama connection error:', error)
        return json({
          error: 'Unable to connect to Ollama for embedding generation',
          code: 'OLLAMA_CONNECTION_ERROR',
          details: error instanceof Error ? error.message: 'Unknown connection error'
        }, { status: 502 })
      }
    }
    if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
      return json({
        error: 'Invalid embedding generated',
        code: 'INVALID_EMBEDDING'
      }, { status: 500 })
    }
    console.log('🔍 Performing vector similarity search...')
    const searchResults = await enhancedVectorSearchService.unifiedVectorSearch(
      queryEmbedding,)
      {
        limit: body.options?.limit || 10,
        threshold,: body.options?.threshold || 0.6,
        entityTypes,: body.options?.entityTypes || ['evidence'],
        includeMetadata,: true
        ...body.options
      }
    )
    const processingTime = Date.now() - startTime
    console.log(`✅ Search completed in ${processingTime}ms, found ${searchResults.length} results`)
    return json({
      success: true,
      query: body.query,
      results: searchResults,
      metadata: {
        count: searchResults.length,
        processingTime,
        embeddingDimensions: queryEmbedding.length,
        threshold: body.options?.threshold || 0.6,
        searchTypes: body.options?.entityTypes || ['evidence'],
        timestamp: new Date().toISOString()
      }
    })
  }, catch (error) {
    console.error('❌ Search API error:', error)
    return json({
      error: 'Internal server error during search',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message: 'Unknown error'
    }, { status: 500 })
  }
}
export const GET: RequestHandler = async () => {
  try {
    console.log('📊 Search system status check')
    let ollamaStatus = 'unknown'
    let ollamaModels: string[] = []
    try {
      const ollamaResponse = await fetch('http://localhost:11434/api/tags')
      if (ollamaResponse.ok) {
        const data = await ollamaResponse.json()
        ollamaModels = data.models?.map((m: any) => m.name) || []
        ollamaStatus = ollamaModels.includes('nomic-embed-text') ? 'ready' : 'missing_model'
      } else {
        ollamaStatus = 'unavailable'
      }
    } catch {
      ollamaStatus = 'unavailable'
    }
    const vectorHealth = await enhancedVectorSearchService.healthCheck()
    const vectorStats = await enhancedVectorSearchService.getSearchStats()
    return json({
      success: true,
      status: {
        overall: vectorHealth.status === 'healthy' && ollamaStatus === 'ready' ? 'ready' : 'degraded',
        ollama: {
          status: ollamaStatus,
          embeddingModel: ollamaModels.includes('nomic-embed-text') ? 'available' : 'missing',
          availableModels: ollamaModels
        },
        vectorSearch: {
          status: vectorHealth.status,
          details: vectorHealth.details
        }
      },
      capabilities: {
        textToVector: ollamaStatus === 'ready',
        vectorSimilarity: vectorHealth.status !== 'unhealthy',
        maxEmbeddingDimensions: 384,
        supportedEntityTypes: ['evidence', 'case']
      }
    })
  } catch (error) {
    return json({
      error: 'Failed to get search system status',
      code: 'STATUS_ERROR'
    }, { status: 500 })
  }
}

// Consolidated Search API Server
// src/routes/api/search/+server.ts
import { json } from '@sveltejs/kit';

type SearchResult = {
	id: string;
	title: string;
	snippet: string;
	documentType: string;
	score?: number;
};

type AdvancedSearchRequest = {
	query?: string;
	filters?: Record<string, string | number | boolean>;
	embedding?: number[]; // optional precomputed embedding
	limit?: number;
};

/**
 * Minimal Search service stub.
 * TODO: replace with real pgvector / Ollama / productionServiceClient calls.
 */
class SearchService {
	static async textSearch(query: string, limit = 10): Promise<SearchResult[]> {
		// TODO: call real search backend (pgvector, elastic, ollama RAG)
		if (!query || query.trim().length === 0) return [];
		const q = query.trim().toLowerCase();
		return Array.from({ length: Math.min(limit, 5) }).map((_, i) => ({
			id: `mock-${i + 1}`,
			title: `Mock result for "${q}" #${i + 1}`,
			snippet: `This is a mock snippet matching "${q}".`,
			documentType: ['contract', 'evidence', 'brief'][i % 3],
			score: Math.round((100 - i * 5) * 100) / 100
		}));
	}

	static async advancedSearch(payload: AdvancedSearchRequest): Promise<SearchResult[]> {
		// If embedding provided, prefer vector search path
		if (payload.embedding && payload.embedding.length > 0) {
			// TODO: vector DB call
			return [
				{
					id: 'vec-1',
					title: 'Vector match (mock)',
					snippet: 'Mock vector search result',
					documentType: 'evidence',
					score: 0.98
				}
			];
		}
		// Fallback to text search with filters applied (mock)
		const q = payload.query || '';
		const base = await this.textSearch(q, payload.limit || 10);
		// naive filter simulation
		if (payload.filters && Object.keys(payload.filters).length > 0) {
			return base.filter((r, idx) => idx % 2 === 0);
		}
		return base;
	}
}

// GET /api/search?q=...
export async function GET({ url }) {
	const q = url.searchParams.get('q') || '';
	const limitParam = url.searchParams.get('limit');
	const limit = limitParam ? Math.max(1, Math.min(100, parseInt(limitParam, 10) || 10)) : 10;

	if (!q) {
		return json({ results: [], count: 0 });
	}

	try {
		const results = await SearchService.textSearch(q, limit);
		return json({ results, count: results.length });
	} catch (err) {
		console.error('Search GET error:', err);
		return json({ error: 'Search failed' }, { status: 500 });
	}
}

// POST /api/search/advanced
export async function POST({ request }) {
	try {
		const payload = (await request.json()) as AdvancedSearchRequest;
		// basic validation
		if (!payload || (payload.query === undefined && !payload.embedding)) {
			return json({ error: 'Provide query or embedding' }, { status: 400 });
		}
		const limit = payload.limit ? Math.max(1, Math.min(200, payload.limit)) : 10;
		const results = await SearchService.advancedSearch({ ...payload, limit });
		return json({ results, count: results.length });
	} catch (err) {
		console.error('Advanced search POST error:', err);
		return json({ error: 'Advanced search failed' }, { status: 500 });
	}
}