// ======================================================================
// CANONICAL CACHE API ENDPOINT - SvelteKit Integration
// Provides HTTP/REST interface for the canonical result cache system
// ======================================================================

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canonicalResultCache, type CanonicalResult, type RankingSet } from '$lib/services/canonical-result-cache.js';
import { enhancedRAGService } from '$lib/services/enhanced-rag-service.js';

// GET /api/v1/cache/ranking?key=X&metadata=true&limit=10
export const GET: RequestHandler = async ({ url, request }) => {
  const startTime = performance.now();

  try {
    // Extract query parameters
    const slotKey = url.searchParams.get('key');
    const includeMetadata = url.searchParams.get('metadata') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '0') || undefined;

    // Validate slot key
    if (!slotKey || slotKey.length !== 1) {
      throw error(400, {
        message: 'Invalid or missing slot key - must be single character',
        code: 'INVALID_SLOT_KEY'
      });
    }

    // Check if client prefers binary response
    const acceptHeader = request.headers.get('accept') || '';
    const preferBinary = acceptHeader.includes('application/octet-stream');

    // Attempt to retrieve from cache
    const rankingSet = await canonicalResultCache.retrieveRankingSet(slotKey);
    const latency = performance.now() - startTime;

    if (!rankingSet) {
      // Cache miss - return 404 with metrics
      throw error(404, {
        message: 'Ranking set not found for slot key',
        code: 'CACHE_MISS',
        slotKey,
        latencyMs: latency
      });
    }

    // Apply result limit if specified
    let results = rankingSet.results;
    if (limit && limit > 0 && limit < results.length) {
      results = results.slice(0, limit);
    }

    // Prepare response
    const responseData = {
      ...rankingSet,
      results,
      metadata: includeMetadata ? {
        slotKey,
        cacheHit: true,
        latencyMs: latency,
        compressionRatio: undefined, // Will be calculated if binary
        resultCount: results.length,
        totalResultCount: rankingSet.results.length,
        truncated: limit ? results.length < rankingSet.results.length : false
      } : undefined
    };

    // Return binary response if requested
    if (preferBinary) {
      const binaryData = await packRankingSetToBinary(responseData as RankingSet);
      return new Response(binaryData, {
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Cache-Status': 'hit',
          'X-Latency-Ms': latency.toString(),
          'X-Result-Count': results.length.toString(),
          'Cache-Control': 'max-age=30, public'
        }
      });
    }

    // Return JSON response
    return json(responseData, {
      status: 200,
      headers: {
        'X-Cache-Status': 'hit',
        'X-Latency-Ms': latency.toString(),
        'X-Result-Count': results.length.toString(),
        'Cache-Control': 'max-age=30, public'
      }
    });

  } catch (err) {
    const latency = performance.now() - startTime;
    
    if (err && typeof err === 'object' && 'status' in err) {
      // SvelteKit error - re-throw
      throw err;
    }

    // Unexpected error
    console.error('Cache ranking retrieval failed:', err);
    throw error(500, {
      message: 'Internal cache error',
      code: 'CACHE_ERROR',
      latencyMs: latency
    });
  }
};

// POST /api/v1/cache/ranking - Store new ranking set
export const POST: RequestHandler = async ({ request }) => {
  const startTime = performance.now();

  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.query || !Array.isArray(body.results)) {
      throw error(400, {
        message: 'Missing required fields: query and results array',
        code: 'INVALID_REQUEST_BODY'
      });
    }

    // Validate results format
    const results: CanonicalResult[] = body.results.map((result: any, index: number) => {
      if (!result.docId || typeof result.score !== 'number') {
        throw error(400, {
          message: `Invalid result at index ${index}: missing docId or score`,
          code: 'INVALID_RESULT_FORMAT'
        });
      }

      return {
        docId: result.docId,
        score: Math.max(0, Math.min(1, result.score)), // Clamp to [0, 1]
        flags: result.flags || 0,
        summaryHash: result.summaryHash || '',
        targetUrlId: result.targetUrlId,
        metadata: result.metadata
      };
    });

    // Create ranking set
    const rankingSet: RankingSet = {
      results,
      query: body.query,
      totalResults: body.totalResults || results.length,
      timestamp: Date.now(),
      version: body.version || 1
    };

    // Store in cache and get slot key
    const slotKey = await canonicalResultCache.storeRankingSet(rankingSet);
    const latency = performance.now() - startTime;

    // Return slot key and metadata
    return json({
      success: true,
      slotKey,
      metadata: {
        resultCount: results.length,
        latencyMs: latency,
        cacheUtilization: canonicalResultCache.getSlotTableStatus().utilization,
        expiresAt: Date.now() + (30 * 1000) // 30 seconds TTL
      }
    }, {
      status: 201,
      headers: {
        'X-Slot-Key': slotKey,
        'X-Latency-Ms': latency.toString(),
        'X-Result-Count': results.length.toString()
      }
    });

  } catch (err) {
    const latency = performance.now() - startTime;
    
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }

    console.error('Cache ranking storage failed:', err);
    throw error(500, {
      message: 'Failed to store ranking set',
      code: 'STORAGE_ERROR',
      latencyMs: latency
    });
  }
};

// DELETE /api/v1/cache/ranking - Clear cache
export const DELETE: RequestHandler = async ({ url }) => {
  const startTime = performance.now();

  try {
    const slotKey = url.searchParams.get('key');
    
    if (slotKey) {
      // Clear specific slot (if we implement single slot clearing)
      throw error(501, {
        message: 'Single slot clearing not yet implemented',
        code: 'NOT_IMPLEMENTED'
      });
    } else {
      // Clear entire cache
      await canonicalResultCache.clear();
      const latency = performance.now() - startTime;

      return json({
        success: true,
        message: 'Cache cleared successfully',
        latencyMs: latency
      });
    }

  } catch (err) {
    const latency = performance.now() - startTime;
    
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }

    console.error('Cache clear failed:', err);
    throw error(500, {
      message: 'Failed to clear cache',
      code: 'CLEAR_ERROR',
      latencyMs: latency
    });
  }
};

// Utility function to pack ranking set to binary format
async function packRankingSetToBinary(rankingSet: RankingSet): Promise<Uint8Array> {
  // This would use the actual packing logic from canonical-result-cache
  // For now, return a mock binary representation
  const jsonString = JSON.stringify(rankingSet);
  const encoder = new TextEncoder();
  const jsonBytes = encoder.encode(jsonString);
  
  // Simple compression simulation (gzip would be used in production)
  const compressionRatio = 0.6; // Assume 40% compression
  const mockCompressedSize = Math.floor(jsonBytes.length * compressionRatio);
  
  return jsonBytes.slice(0, mockCompressedSize);
}