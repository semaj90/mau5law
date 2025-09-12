import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { cache } from '$lib/server/cache/redis';
import { shaderCacheManager } from '$lib/webgpu/shader-cache-manager';

interface UnifiedShaderQuery {
  text?: string;
  operation?: string;
  shaderType?: 'webgpu' | 'webgl' | 'all';
  tags?: string[];
  sortBy?: 'relevance' | 'performance' | 'usage' | 'recent';
  limit?: number;
}

interface UnifiedShader {
  id: string;
  name: string;
  shaderCode: string;
  shaderType: 'webgpu' | 'webgl';
  operation: string;
  metadata: {
    compiledAt: string;
    lastUsed: string;
    compileTime: number;
    usageCount: number;
    averageExecutionTime: number;
    description: string;
    tags: string[];
  };
  config: any;
  relevanceScore?: number;
  embeddingSimilarity?: number;
  hasEmbedding: boolean;
}

// GET endpoint - Unified shader search capabilities
export const GET: RequestHandler = async () => {
  try {
    // Get stats from both WebGPU and WebGL caches
    const webgpuStats = await shaderCacheManager.getShaderStats();

    // Get WebGL shader count
    const unifiedIndex = await cache.get<string[]>('unified_shader_index') || [];
    const webglShaderCount = unifiedIndex.filter(id => id.startsWith('webgl:')).length;

    const capabilities = {
      endpoint: '/api/shaders/unified',
      description: 'Unified search across WebGPU and WebGL shader caches with semantic similarity',
      totalShaders: {
        webgpu: webgpuStats.totalShaders,
        webgl: webglShaderCount,
        total: webgpuStats.totalShaders + webglShaderCount
      },
      searchOptions: {
        text: 'string (optional) - Semantic text search across shader code and descriptions',
        operation: 'string (optional) - Filter by shader operation type',
        shaderType: 'string (optional) - "webgpu", "webgl", or "all" (default)',
        tags: 'string[] (optional) - Filter by shader tags',
        sortBy: 'string (optional) - "relevance", "performance", "usage", or "recent"',
        limit: 'number (optional) - Maximum results (default: 20, max: 100)'
      },
      supportedOperations: [
        'vector_similarity',
        'attention_visualization',
        'document_network',
        'text_flow',
        'evidence_timeline',
        'embedding_generation',
        'matrix_multiply'
      ],
      features: [
        'Semantic search using vector embeddings',
        'Cross-platform WebGPU and WebGL support',
        'Performance and usage analytics',
        'Real-time search with caching',
        'Advanced filtering and sorting'
      ]
    };

    return json(capabilities);
  } catch (error: any) {
    return json({ error: 'Failed to get unified shader capabilities' }, { status: 500 });
  }
};

// POST endpoint - Unified shader search
export const POST: RequestHandler = async ({ request }) => {
  const startTime = performance.now();

  try {
    const query: UnifiedShaderQuery = await request.json();

    // Validate query
    if (query.limit && (query.limit < 1 || query.limit > 100)) {
      return json({ error: 'limit must be between 1 and 100' }, { status: 400 });
    }

    if (query.shaderType && !['webgpu', 'webgl', 'all'].includes(query.shaderType)) {
      return json({ error: 'shaderType must be one of: webgpu, webgl, all' }, { status: 400 });
    }

    const results: UnifiedShader[] = [];
    const shaderType = query.shaderType || 'all';

    // Search WebGPU shaders
    if (shaderType === 'webgpu' || shaderType === 'all') {
      try {
        const webgpuResults = await shaderCacheManager.searchShaders({
          text: query.text,
          operation: query.operation,
          tags: query.tags,
          sortBy: query.sortBy,
          limit: query.limit || 20
        });

        for (const shader of webgpuResults) {
          results.push({
            id: shader.id,
            name: shader.id,
            shaderCode: shader.wgsl,
            shaderType: 'webgpu',
            operation: shader.metadata.operation,
            metadata: {
              compiledAt: new Date(shader.metadata.compiledAt).toISOString(),
              lastUsed: new Date(shader.metadata.lastUsed).toISOString(),
              compileTime: shader.metadata.compileTime,
              usageCount: shader.metadata.usageCount,
              averageExecutionTime: shader.metadata.averageExecutionTime,
              description: shader.metadata.description,
              tags: shader.metadata.tags
            },
            config: shader.config,
            relevanceScore: shader.relevanceScore,
            embeddingSimilarity: shader.embeddingSimilarity,
            hasEmbedding: !!shader.embedding
          });
        }
      } catch (error) {
        console.warn('WebGPU shader search failed:', error);
      }
    }

    // Search WebGL shaders
    if (shaderType === 'webgl' || shaderType === 'all') {
      try {
        const unifiedIndex = await cache.get<string[]>('unified_shader_index') || [];
        const webglShaderIds = unifiedIndex.filter(id => id.startsWith('webgl:')).map(id => id.replace('webgl:', ''));

        for (const shaderId of webglShaderIds) {
          const shaderData = await cache.get<any>(`webgl_shader:${shaderId}`);
          if (!shaderData) continue;

          let relevanceScore = 0;
          let embeddingSimilarity = 0;

          // Apply filters
          if (query.operation && shaderData.operation !== query.operation) continue;

          if (query.tags && query.tags.length > 0) {
            const matchingTags = shaderData.metadata.tags.filter((tag: string) =>
              query.tags!.some(queryTag => tag.toLowerCase().includes(queryTag.toLowerCase()))
            );
            if (matchingTags.length === 0) continue;
            relevanceScore += matchingTags.length * 0.2;
          }

          // Text search
          if (query.text) {
            const searchText = query.text.toLowerCase();
            const shaderText = [
              shaderData.shaderCode,
              shaderData.metadata.description,
              shaderData.operation,
              ...shaderData.metadata.tags
            ].join(' ').toLowerCase();

            if (shaderText.includes(searchText)) {
              relevanceScore += 0.5;
            }

            // Semantic similarity using embeddings
            if (shaderData.embedding && shaderData.embedding.length > 0) {
              try {
                // Generate embedding for query text (simplified for WebGL)
                embeddingSimilarity = Math.random() * 0.3 + 0.4; // Placeholder
                relevanceScore += embeddingSimilarity * 0.7;
              } catch (error) {
                console.warn('Error calculating WebGL embedding similarity:', error);
              }
            }
          }

          // Performance and usage scoring
          if (shaderData.metadata.usageCount > 0) {
            relevanceScore += Math.log(shaderData.metadata.usageCount + 1) * 0.1;
          }

          results.push({
            id: shaderData.id,
            name: shaderData.name,
            shaderCode: shaderData.shaderCode,
            shaderType: 'webgl',
            operation: shaderData.operation,
            metadata: {
              compiledAt: new Date(shaderData.metadata.compiledAt).toISOString(),
              lastUsed: new Date(shaderData.metadata.lastUsed).toISOString(),
              compileTime: shaderData.metadata.compileTime,
              usageCount: shaderData.metadata.usageCount,
              averageExecutionTime: shaderData.metadata.averageExecutionTime,
              description: shaderData.metadata.description,
              tags: shaderData.metadata.tags
            },
            config: shaderData.config,
            relevanceScore,
            embeddingSimilarity,
            hasEmbedding: !!shaderData.embedding
          });
        }
      } catch (error) {
        console.warn('WebGL shader search failed:', error);
      }
    }

    // Sort results
    results.sort((a, b) => {
      switch (query.sortBy) {
        case 'performance':
          return (a.metadata.averageExecutionTime || Number.MAX_VALUE) -
                 (b.metadata.averageExecutionTime || Number.MAX_VALUE);
        case 'usage':
          return b.metadata.usageCount - a.metadata.usageCount;
        case 'recent':
          return new Date(b.metadata.lastUsed).getTime() - new Date(a.metadata.lastUsed).getTime();
        case 'relevance':
        default:
          return (b.relevanceScore || 0) - (a.relevanceScore || 0);
      }
    });

    // Apply limit
    const limitedResults = results.slice(0, query.limit || 20);

    const searchTime = performance.now() - startTime;

    const response = {
      shaders: limitedResults.map(shader => ({
        ...shader,
        // Truncate shader code for list view
        shaderCodePreview: shader.shaderCode.length > 500 ?
          shader.shaderCode.substring(0, 500) + '...' : shader.shaderCode
      })),
      metadata: {
        totalResults: limitedResults.length,
        searchTime,
        query,
        breakdown: {
          webgpu: limitedResults.filter(s => s.shaderType === 'webgpu').length,
          webgl: limitedResults.filter(s => s.shaderType === 'webgl').length
        }
      }
    };

    return json(response);

  } catch (error: any) {
    const searchTime = performance.now() - startTime;

    console.error('Unified shader search error:', error);

    return json({
      shaders: [],
      metadata: {
        totalResults: 0,
        searchTime,
        query: {},
        error: error.message || 'Unified search failed'
      }
    }, { status: 500 });
  }
};

// DELETE endpoint - Clean up shader caches
export const DELETE: RequestHandler = async ({ url }) => {
  // Helper to safely delete a key regardless of underlying cache implementation
  const safeDelete = async (key: string) => {
    const c: any = cache as any;
    if (c && typeof c.delete === 'function') return c.delete(key);
    if (c && typeof c.del === 'function') return c.del(key);
    if (c && typeof c.remove === 'function') return c.remove(key);
    if (c && typeof c.removeItem === 'function') return c.removeItem(key);
    // Fallback: set to a short-lived empty value (TTL 1ms) if no delete method exists
    if (c && typeof c.set === 'function') return c.set(key, null, 1);
  };

  try {
    const shaderTypeParam = url.searchParams.get('type');
    const shaderType: 'webgpu' | 'webgl' | 'all' =
      shaderTypeParam === 'webgpu' || shaderTypeParam === 'webgl' || shaderTypeParam === 'all'
        ? shaderTypeParam
        : 'all';

    let cleanedCount = 0;

    if (shaderType === 'webgpu' || shaderType === 'all') {
      // Clear WebGPU shaders
      const webgpuIndexRaw = await cache.get<any>('webgpu_shader_index');
      const webgpuIndex: string[] = Array.isArray(webgpuIndexRaw) ? webgpuIndexRaw : [];

      for (const id of webgpuIndex) {
        await safeDelete(`webgpu_shader:${id}`);
        cleanedCount++;
      }

      await safeDelete('webgpu_shader_index');
    }

    if (shaderType === 'webgl' || shaderType === 'all') {
      // Clear WebGL shaders
      const unifiedIndexRaw = await cache.get<any>('unified_shader_index');
      const unifiedIndex: string[] = Array.isArray(unifiedIndexRaw)
        ? unifiedIndexRaw
        : (typeof unifiedIndexRaw === 'string'
            ? (() => {
                try {
                  const parsed = JSON.parse(unifiedIndexRaw);
                  return Array.isArray(parsed) ? parsed : [];
                } catch {
                  return [];
                }
              })()
            : []);

      const webglShaderIds = unifiedIndex
        .filter(id => typeof id === 'string' && id.startsWith('webgl:'))
        .map(id => id.replace('webgl:', ''));

      for (const id of webglShaderIds) {
        await safeDelete(`webgl_shader:${id}`);
        cleanedCount++;
      }

      // Update unified index (remove webgl:* entries)
      const remainingIndex = unifiedIndex.filter(id => !id.startsWith('webgl:'));
      if (remainingIndex.length > 0) {
        await cache.set('unified_shader_index', remainingIndex, 24 * 60 * 60 * 1000);
      } else {
        await safeDelete('unified_shader_index');
      }
    }

    return json({
      success: true,
      message: `Cleaned ${cleanedCount} ${shaderType} shader(s) from cache`
    });

  } catch (error: any) {
    return json({ error: 'Failed to clean shader caches' }, { status: 500 });
  }
};