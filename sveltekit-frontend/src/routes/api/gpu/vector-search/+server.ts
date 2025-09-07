/*
 * SvelteKit API Route: GPU-Accelerated Vector Search
 * 
 * Exposes RTX 3060 Ti CUDA vector search to the frontend
 * Integrated with NES memory architecture and legal AI processing
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { 
  cudaVectorService, 
  type CUDAVectorRequest, 
  formatLegalSearchResults,
  createLegalSearchContext,
  cacheVectorResults,
  getCachedVectorResults
} from '$lib/services/cuda-vector-integration';
import { createHash } from 'node:crypto';
import { dev } from '$app/environment';

// Request validation schema
interface VectorSearchAPIRequest {
  query_vectors: number[][];
  database_vectors?: number[][];
  search_config?: {
    metric_type?: 'cosine' | 'euclidean' | 'manhattan';
    threshold?: number;
    top_k?: number;
    batch_size?: number;
  };
  legal_context?: {
    case_id?: string;
    document_type?: 'contract' | 'brief' | 'evidence' | 'citation';
    jurisdiction?: string;
    practice_area?: string;
    risk_assessment?: boolean;
    neural_visualization?: boolean;
  };
  cache_options?: {
    use_cache?: boolean;
    cache_ttl?: number;
  };
}

interface VectorSearchAPIResponse {
  success: boolean;
  data?: {
    results: any[];
    processing_time_ms: number;
    gpu_metrics: any;
    legal_insights?: any;
    neural_sprites?: any[];
    cache_info: {
      hit: boolean;
      key?: string;
      ttl?: number;
    };
  };
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  metadata: {
    timestamp: number;
    service_version: string;
    gpu_available: boolean;
    request_id: string;
  };
}

// Request validation
function validateRequest(data: any): VectorSearchAPIRequest {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request body');
  }

  if (!Array.isArray(data.query_vectors) || data.query_vectors.length === 0) {
    throw new Error('query_vectors is required and must be a non-empty array');
  }

  // Validate query vector dimensions
  const firstVectorDim = data.query_vectors[0]?.length;
  if (!firstVectorDim || firstVectorDim === 0) {
    throw new Error('Query vectors must have non-zero dimensions');
  }

  // Check dimension consistency
  for (let i = 1; i < data.query_vectors.length; i++) {
    if (data.query_vectors[i].length !== firstVectorDim) {
      throw new Error(`Inconsistent vector dimensions: expected ${firstVectorDim}, got ${data.query_vectors[i].length} at index ${i}`);
    }
  }

  // Validate database vectors if provided
  if (data.database_vectors && Array.isArray(data.database_vectors)) {
    for (let i = 0; i < data.database_vectors.length; i++) {
      if (data.database_vectors[i].length !== firstVectorDim) {
        throw new Error(`Database vector dimension mismatch: expected ${firstVectorDim}, got ${data.database_vectors[i].length} at index ${i}`);
      }
    }
  }

  return data as VectorSearchAPIRequest;
}

// Generate cache key for vector search request
function generateCacheKey(request: VectorSearchAPIRequest): string {
  const cacheData = {
    query_vectors: request.query_vectors,
    database_vectors: request.database_vectors,
    config: request.search_config,
    legal_context: request.legal_context
  };
  
  return createHash('sha256')
    .update(JSON.stringify(cacheData))
    .digest('hex')
    .substring(0, 16);
}

// POST /api/gpu/vector-search
export const POST: RequestHandler = async ({ request }) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Parse and validate request
    const rawData = await request.json();
    const validatedRequest = validateRequest(rawData);

    if (dev) {
      console.log(`🎯 GPU Vector Search Request ${requestId}:`, {
        query_count: validatedRequest.query_vectors.length,
        vector_dim: validatedRequest.query_vectors[0]?.length,
        database_count: validatedRequest.database_vectors?.length,
        legal_context: validatedRequest.legal_context
      });
    }

    // Check cache first if enabled
    const useCache = validatedRequest.cache_options?.use_cache !== false;
    let cacheKey = '';
    let cachedResult = null;

    if (useCache) {
      cacheKey = generateCacheKey(validatedRequest);
      cachedResult = await getCachedVectorResults(cacheKey);
      
      if (cachedResult) {
        const response: VectorSearchAPIResponse = {
          success: true,
          data: {
            results: formatLegalSearchResults(cachedResult),
            processing_time_ms: Date.now() - startTime,
            gpu_metrics: cachedResult.gpu_metrics,
            legal_insights: cachedResult.legal_insights,
            neural_sprites: cachedResult.results.map(r => r.neural_sprite_data).filter(Boolean),
            cache_info: {
              hit: true,
              key: cacheKey,
              ttl: validatedRequest.cache_options?.cache_ttl
            }
          },
          metadata: {
            timestamp: Date.now(),
            service_version: '1.0.0',
            gpu_available: true,
            request_id: requestId
          }
        };

        if (dev) {
          console.log(`⚡ Cache hit for request ${requestId} (key: ${cacheKey})`);
        }

        return json(response);
      }
    }

    // Check GPU service health
    const isGPUHealthy = await cudaVectorService.checkHealth();
    if (!isGPUHealthy) {
      throw error(503, {
        message: 'GPU vector search service is unavailable',
        code: 'GPU_SERVICE_DOWN'
      });
    }

    // Prepare CUDA request
    const cudaRequest: CUDAVectorRequest = {
      query_vectors: validatedRequest.query_vectors,
      database_vectors: validatedRequest.database_vectors,
      metric_type: validatedRequest.search_config?.metric_type || 'cosine',
      threshold: validatedRequest.search_config?.threshold || 0.5,
      top_k: validatedRequest.search_config?.top_k || 10,
      batch_size: validatedRequest.search_config?.batch_size || validatedRequest.query_vectors.length,
      legal_context: createLegalSearchContext(
        validatedRequest.legal_context?.case_id,
        validatedRequest.legal_context?.document_type,
        validatedRequest.legal_context?.jurisdiction,
        {
          practice_areas: validatedRequest.legal_context?.practice_area ? [validatedRequest.legal_context.practice_area] : undefined
        }
      )
    };

    // Execute GPU vector search
    const cudaResponse = await cudaVectorService.searchVectors(cudaRequest, { request } as any);

    // Cache results if enabled
    if (useCache && cacheKey) {
      await cacheVectorResults(cacheKey, cudaResponse);
    }

    // Format response
    const response: VectorSearchAPIResponse = {
      success: true,
      data: {
        results: formatLegalSearchResults(cudaResponse),
        processing_time_ms: cudaResponse.processing_time_ms,
        gpu_metrics: cudaResponse.gpu_metrics,
        legal_insights: cudaResponse.legal_insights,
        neural_sprites: cudaResponse.results
          .map(r => r.neural_sprite_data)
          .filter(Boolean),
        cache_info: {
          hit: false,
          key: useCache ? cacheKey : undefined,
          ttl: validatedRequest.cache_options?.cache_ttl
        }
      },
      metadata: {
        timestamp: Date.now(),
        service_version: '1.0.0',
        gpu_available: true,
        request_id: requestId
      }
    };

    if (dev) {
      console.log(`✅ GPU Vector Search completed for request ${requestId}:`, {
        processing_time_ms: response.data!.processing_time_ms,
        results_count: response.data!.results.length,
        gpu_utilization: (response.data!.gpu_metrics.memory_used_mb / response.data!.gpu_metrics.total_memory_mb * 100).toFixed(2) + '%'
      });
    }

    return json(response);

  } catch (err) {
    console.error(`❌ GPU Vector Search error for request ${requestId}:`, err);

    const errorResponse: VectorSearchAPIResponse = {
      success: false,
      error: {
        message: err instanceof Error ? err.message : 'Unknown error occurred',
        code: err instanceof Error && 'code' in err ? (err as any).code : 'INTERNAL_ERROR',
        details: dev ? (err instanceof Error ? err.stack : String(err)) : undefined
      },
      metadata: {
        timestamp: Date.now(),
        service_version: '1.0.0',
        gpu_available: false,
        request_id: requestId
      }
    };

    // Return appropriate HTTP status
    if (err instanceof Error && err.message.includes('service unavailable')) {
      return json(errorResponse, { status: 503 });
    } else if (err instanceof Error && err.message.includes('validation')) {
      return json(errorResponse, { status: 400 });
    } else {
      return json(errorResponse, { status: 500 });
    }
  }
};

// GET /api/gpu/vector-search - Status and health check
export const GET: RequestHandler = async () => {
  const requestId = crypto.randomUUID();

  try {
    // Check GPU service health
    const isHealthy = await cudaVectorService.checkHealth();
    const gpuMetrics = isHealthy ? await cudaVectorService.getGPUStatus() : null;

    const response = {
      status: isHealthy ? 'operational' : 'unavailable',
      gpu_available: isHealthy,
      gpu_metrics: gpuMetrics,
      service_info: {
        name: 'cuda-vector-search',
        version: '1.0.0',
        description: 'RTX 3060 Ti accelerated vector similarity search for legal AI',
        endpoints: {
          search: 'POST /api/gpu/vector-search',
          status: 'GET /api/gpu/vector-search',
          metrics: 'GET /api/gpu/metrics'
        }
      },
      features: {
        cuda_acceleration: true,
        rtx_3060ti_optimized: true,
        legal_ai_integration: true,
        nes_memory_cache: true,
        neural_sprite_visualization: true,
        multi_metric_search: true,
        top_k_results: true,
        batch_processing: true
      },
      limitations: {
        max_batch_size: 32,
        max_vector_dimension: 1536,
        max_database_vectors: 100000,
        request_timeout_ms: 30000
      },
      metadata: {
        timestamp: Date.now(),
        request_id: requestId
      }
    };

    return json(response);

  } catch (err) {
    console.error(`GPU Vector Search status check failed for request ${requestId}:`, err);
    
    return json({
      status: 'error',
      gpu_available: false,
      error: {
        message: 'Failed to check GPU service status',
        code: 'STATUS_CHECK_FAILED'
      },
      metadata: {
        timestamp: Date.now(),
        request_id: requestId
      }
    }, { status: 500 });
  }
};

// OPTIONS - CORS preflight
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
};