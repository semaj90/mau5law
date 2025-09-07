import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { shaderCacheManager } from '$lib/webgpu/shader-cache-manager';
import type { ShaderSearchQuery, ShaderSearchResult } from '$lib/webgpu/shader-cache-manager';

// GET endpoint - Get shader search capabilities info
export const GET: RequestHandler = async () => {
  try {
    const stats = await shaderCacheManager.getShaderStats();
    
    const capabilities = {
      endpoint: '/api/shaders/search',
      description: 'Search cached WebGPU shaders using semantic similarity and filters',
      stats,
      methods: ['GET', 'POST'],
      searchOptions: {
        text: 'string (optional) - Semantic text search',
        operation: 'string (optional) - Filter by shader operation',
        tags: 'string[] (optional) - Filter by tags',
        sortBy: 'string (optional) - "relevance", "performance", "usage", or "recent"',
        limit: 'number (optional) - Maximum results to return (default: 20)'
      },
      responseFormat: {
        shaders: 'ShaderSearchResult[] - Array of matching shaders',
        metadata: {
          totalResults: 'number - Total matching shaders',
          searchTime: 'number - Search execution time in ms',
          query: 'object - Original search query'
        }
      },
      examples: [
        {
          description: 'Search for vector similarity shaders',
          query: { text: 'vector similarity', operation: 'vector_similarity' }
        },
        {
          description: 'Find high-performance embedding shaders',
          query: { operation: 'embedding', sortBy: 'performance' }
        },
        {
          description: 'Search by tags',
          query: { tags: ['optimization', 'tensor'], limit: 10 }
        }
      ]
    };

    return json(capabilities);
  } catch (error: any) {
    return json({ error: 'Failed to get shader search capabilities' }, { status: 500 });
  }
};

// POST endpoint - Search shaders
export const POST: RequestHandler = async ({ request }) => {
  const startTime = performance.now();

  try {
    const query: ShaderSearchQuery = await request.json();

    // Validate query
    if (query.limit && (query.limit < 1 || query.limit > 100)) {
      return json({
        error: 'limit must be between 1 and 100'
      }, { status: 400 });
    }

    if (query.sortBy && !['relevance', 'performance', 'usage', 'recent'].includes(query.sortBy)) {
      return json({
        error: 'sortBy must be one of: relevance, performance, usage, recent'
      }, { status: 400 });
    }

    // Execute search
    const results = await shaderCacheManager.searchShaders(query);
    const searchTime = performance.now() - startTime;

    const response = {
      shaders: results.map(shader => ({
        id: shader.id,
        wgsl: shader.wgsl,
        config: shader.config,
        metadata: {
          ...shader.metadata,
          // Format timestamps for readability
          compiledAt: new Date(shader.metadata.compiledAt).toISOString(),
          lastUsed: new Date(shader.metadata.lastUsed).toISOString(),
        },
        relevanceScore: shader.relevanceScore,
        embeddingSimilarity: shader.embeddingSimilarity,
        // Truncate WGSL code in list view for performance
        wgslPreview: shader.wgsl.length > 500 ? shader.wgsl.substring(0, 500) + '...' : shader.wgsl
      })),
      metadata: {
        totalResults: results.length,
        searchTime,
        query: query,
        timestamp: new Date().toISOString()
      }
    };

    return json(response);

  } catch (error: any) {
    const searchTime = performance.now() - startTime;
    
    console.error('Shader search error:', error);
    
    return json({
      shaders: [],
      metadata: {
        totalResults: 0,
        searchTime,
        query: {},
        error: error.message || 'Search failed'
      }
    }, { status: 500 });
  }
};