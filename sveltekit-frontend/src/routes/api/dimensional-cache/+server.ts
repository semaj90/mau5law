import type { RequestHandler } from './$types.js';

/**
 * Dimensional Cache API
 * Multi-dimensional array caching with LRU eviction
 * Supports embeddings, attention weights, and metadata
 */

import { dimensionalCache } from '$lib/ai/dimensional-cache-engine';
import type { DimensionalArray, CacheMetadata } from '$lib/ai/dimensional-cache-engine';
import { URL } from "url";

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const action = url.searchParams.get('action') || 'store';
    const body = await request.json();

    switch (action) {
      case 'store': {
        const { key, embeddings, attentionWeights, metadata } = body;
        
        if (!key || !embeddings) {
          return json({
            success: false,
            error: 'Key and embeddings are required'
          }, { status: 400 });
        }

        const result = await dimensionalCache.store(key, {
          embeddings: new Float32Array(embeddings),
          attentionWeights: attentionWeights ? new Float32Array(attentionWeights) : undefined,
          metadata: metadata || {}
        });

        return json({
          success: true,
          cached: result,
          timestamp: Date.now()
        });
      }

      case 'get': {
        const { key } = body;
        
        if (!key) {
          return json({
            success: false,
            error: 'Key is required'
          }, { status: 400 });
        }

        const cached = await dimensionalCache.get(key);
        
        return json({
          success: true,
          found: !!cached,
          data: cached ? {
            embeddings: Array.from(cached.embeddings.slice(0, 10)), // First 10 for demo
            attentionWeights: cached.attentionWeights ? Array.from(cached.attentionWeights.slice(0, 16)) : null,
            metadata: cached.metadata
          } : null,
          timestamp: Date.now()
        });
      }

      case 'clear': {
        const { pattern } = body;
        
        const cleared = await dimensionalCache.clear(pattern);
        
        return json({
          success: true,
          cleared,
          timestamp: Date.now()
        });
      }

      default:
        return json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 });
    }

  } catch (error: any) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: Date.now()
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const stats = await dimensionalCache.getStats();
    
    return json({
      service: 'dimensional-cache',
      status: 'operational',
      stats: {
        cacheSize: stats.size,
        capacity: stats.capacity,
        hitRate: stats.hitRate,
        memoryUsage: stats.memoryUsage
      },
      endpoints: {
        store: '/api/dimensional-cache?action=store (POST)',
        get: '/api/dimensional-cache?action=get (POST)', 
        clear: '/api/dimensional-cache?action=clear (POST)',
        stats: '/api/dimensional-cache (GET)'
      },
      capabilities: [
        'Multi-dimensional array storage',
        'LRU eviction policy',
        'Embedding caching',
        'Attention weight storage',
        'Metadata association',
        'Pattern-based clearing'
      ],
      timestamp: Date.now()
    });

  } catch (error: any) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: Date.now()
    }, { status: 500 });
  }
};