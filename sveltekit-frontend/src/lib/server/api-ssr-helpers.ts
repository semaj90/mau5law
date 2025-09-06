/**
 * SSR API Data Extraction Helpers for Bits UI Compatibility
 * Enhanced with thread-safe JSONB operations and GPU acceleration
 * 
 * This module ensures all API route data is properly serialized and structured
 * for server-side rendering with Bits UI components.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { threadSafePostgres } from './thread-safe-postgres.js';
import { concurrentSerializer, serializeForAPI } from './concurrent-json-serializer.js';
import { gpuCoordinator, gpuProcessJsonb } from './gpu-thread-coordinator.js';
import { cognitiveCache } from '../services/cognitive-cache-integration.js';

export interface SSRResponse<T = any> {
  success: boolean;
  data: T;
  meta: {
    timestamp: string;
    cached: boolean;
    source: 'ssr' | 'api';
  };
  error?: string;
}

export interface BitsUICompatibleData {
  // Ensure all data is JSON serializable for SSR
  [key: string]: 
    | string 
    | number 
    | boolean 
    | null 
    | undefined 
    | Date 
    | BitsUICompatibleData 
    | BitsUICompatibleData[];
}

/**
 * Creates an SSR-optimized JSON response for Bits UI components
 * Enhanced with GPU-accelerated serialization and thread-safe operations
 */
export async function createSSRResponse<T extends BitsUICompatibleData>(
  data: T,
  options?: {
    cached?: boolean;
    status?: number;
    headers?: Record<string, string>;
    gpuAccelerated?: boolean;
    threadSafe?: boolean;
    cacheKey?: string;
  }
): Promise<Response> {
  let sanitizedData: T;
  let serializedResponse: string;

  // Use GPU acceleration for large datasets
  const shouldUseGPU = options?.gpuAccelerated && estimateDataSize(data) > 100 * 1024; // > 100KB
  
  if (shouldUseGPU) {
    try {
      const gpuResult = await gpuProcessJsonb([data], 'serialize', {
        priority: 'high',
        cacheResults: !!options?.cacheKey
      });
      
      if (gpuResult.result?.serialized) {
        sanitizedData = gpuResult.result.serialized[0].serialized;
      } else {
        sanitizedData = sanitizeForSSR(data);
      }
    } catch (error) {
      console.warn('GPU serialization failed, falling back to CPU:', error);
      sanitizedData = sanitizeForSSR(data);
    }
  } else {
    sanitizedData = sanitizeForSSR(data);
  }

  const response: SSRResponse<T> = {
    success: true,
    data: sanitizedData,
    meta: {
      timestamp: new Date().toISOString(),
      cached: options?.cached ?? false,
      source: 'ssr',
      gpuAccelerated: shouldUseGPU,
      threadSafe: options?.threadSafe ?? true
    }
  };

  // Use concurrent serializer for better performance
  try {
    serializedResponse = await serializeForAPI(response, {
      compress: estimateDataSize(response) > 50 * 1024, // Compress if > 50KB
      gpuAccelerated: shouldUseGPU
    });
  } catch (error) {
    console.warn('Concurrent serialization failed, using standard JSON:', error);
    serializedResponse = JSON.stringify(response);
  }

  // Cache the response if requested
  if (options?.cacheKey) {
    await cognitiveCache.storeJsonbDocument(
      options.cacheKey,
      response,
      {
        responseType: 'ssr',
        gpuProcessed: shouldUseGPU,
        threadSafe: true
      }
    );
  }

  return new Response(serializedResponse, {
    status: options?.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=30',
      'X-GPU-Accelerated': shouldUseGPU ? 'true' : 'false',
      'X-Thread-Safe': 'true',
      ...options?.headers
    }
  });
}

/**
 * Creates an error response optimized for SSR
 */
export function createSSRErrorResponse(
  error: string,
  status: number = 500,
  data?: any
): Response {
  const response: SSRResponse = {
    success: false,
    data: data ?? null,
    meta: {
      timestamp: new Date().toISOString(),
      cached: false,
      source: 'ssr'
    },
    error
  };

  return json(response, { status });
}

/**
 * Sanitizes data to ensure it's serializable for SSR
 * Handles Date objects, functions, undefined values, etc.
 */
export function sanitizeForSSR<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (data instanceof Date) {
    return data.toISOString() as unknown as T;
  }

  if (typeof data === 'function') {
    return undefined as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeForSSR) as unknown as T;
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeForSSR(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * @deprecated Use the enhanced withSSRHandler with GPU and thread-safe support below
 */

/**
 * Page data loader helper for Bits UI SSR
 */
export async function loadWithSSR<T extends BitsUICompatibleData>(
  loader: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    const data = await loader();
    return sanitizeForSSR(data);
  } catch (error) {
    console.error('SSR Data Loading Error:', error);
    return fallback;
  }
}

/**
 * Batch API calls for efficient SSR data loading
 */
export async function batchSSRRequests<T extends Record<string, any>>(
  requests: Record<keyof T, () => Promise<any>>,
  timeout: number = 5000
): Promise<T> {
  const results = {} as T;
  
  const requestEntries = Object.entries(requests) as Array<[keyof T, () => Promise<any>]>;
  
  await Promise.allSettled(
    requestEntries.map(async ([key, requestFn]) => {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        );
        
        const result = await Promise.race([requestFn(), timeoutPromise]);
        results[key] = sanitizeForSSR(result);
      } catch (error) {
        console.error(`SSR batch request failed for ${String(key)}:`, error);
        results[key] = null;
      }
    })
  );
  
  return results;
}

/**
 * Enhanced error boundary for SSR API routes
 */
export function ssrErrorBoundary<T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  return fn().catch((error) => {
    console.error('SSR Error Boundary:', error);
    return fallback;
  });
}

/**
 * Type-safe API response validator for Bits UI
 */
export function validateSSRResponse<T>(
  response: any,
  validator: (data: any) => data is T
): response is SSRResponse<T> {
  return (
    response &&
    typeof response === 'object' &&
    'success' in response &&
    'data' in response &&
    'meta' in response &&
    (response.success === false || validator(response.data))
  );
}

/**
 * Estimate data size for optimization decisions
 */
function estimateDataSize(data: any): number {
  try {
    return JSON.stringify(data).length * 2; // UTF-16 estimation
  } catch {
    return 0;
  }
}

/**
 * Enhanced wrapper for API route handlers with GPU and thread-safe support
 */
export function withSSRHandler<T extends BitsUICompatibleData>(
  handler: (event: Parameters<RequestHandler>[0]) => Promise<T | Response>,
  options?: {
    gpuAccelerated?: boolean;
    cacheKey?: (event: Parameters<RequestHandler>[0]) => string;
    threadSafe?: boolean;
  }
): RequestHandler {
  return async (event) => {
    const threadId = `handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const result = await handler(event);
      
      // If handler returns a Response, pass it through
      if (result instanceof Response) {
        return result;
      }
      
      // Generate cache key if provided
      const cacheKey = options?.cacheKey ? options.cacheKey(event) : undefined;
      
      // Otherwise, wrap in enhanced SSR response
      return await createSSRResponse(result, {
        gpuAccelerated: options?.gpuAccelerated,
        threadSafe: options?.threadSafe ?? true,
        cacheKey
      });
    } catch (error: any) {
      console.error('SSR API Handler Error:', error);
      return createSSRErrorResponse(
        error.message || 'Internal server error',
        error.status || 500
      );
    }
  };
}

/**
 * Thread-safe JSONB query wrapper for legal documents
 */
export async function queryLegalDocumentsSSR(
  query: {
    path?: string;
    operator?: '@>' | '@?' | '@@' | '->' | '->>';
    value?: any;
    conditions?: Record<string, any>;
  },
  options?: {
    limit?: number;
    offset?: number;
    useGPU?: boolean;
    cacheResults?: boolean;
  }
): Promise<any[]> {
  try {
    const cacheKey = options?.cacheResults ? 
      `legal_query_${Buffer.from(JSON.stringify(query)).toString('base64')}` : 
      undefined;

    // Check cognitive cache first
    if (cacheKey) {
      const cached = await cognitiveCache.retrieveJsonbDocument(cacheKey);
      if (cached) {
        return cached.content;
      }
    }

    // Use thread-safe postgres for the query
    const results = await threadSafePostgres.queryJsonbDocuments(
      'legal_documents',
      query,
      {
        limit: options?.limit,
        offset: options?.offset,
        orderBy: 'relevance',
        useGPU: options?.useGPU,
        cacheResults: options?.cacheResults
      }
    );

    // Cache results if requested
    if (cacheKey && results.length > 0) {
      await cognitiveCache.storeJsonbDocument(cacheKey, results, {
        queryType: 'legal_search',
        resultCount: results.length,
        gpuProcessed: options?.useGPU || false
      });
    }

    return results;
  } catch (error) {
    console.error('Legal document query failed:', error);
    return [];
  }
}

/**
 * Enhanced batch SSR requests with GPU acceleration
 */
export async function batchSSRRequestsGPU<T extends Record<string, any>>(
  requests: Record<keyof T, () => Promise<any>>,
  options: {
    timeout?: number;
    gpuAccelerated?: boolean;
    cacheResults?: boolean;
    threadSafe?: boolean;
  } = {}
): Promise<T> {
  const {
    timeout = 5000,
    gpuAccelerated = false,
    cacheResults = false,
    threadSafe = true
  } = options;
  
  const results = {} as T;
  const requestEntries = Object.entries(requests) as Array<[keyof T, () => Promise<any>]>;
  
  // Use GPU coordinator for large batch operations
  if (gpuAccelerated && requestEntries.length > 10) {
    try {
      const batchResult = await gpuCoordinator.batchDatabaseOperations(
        requestEntries.map(([key, requestFn]) => ({
          type: 'query',
          table: 'batch_requests',
          data: { key: String(key), requestFn: requestFn.toString() }
        })),
        {
          atomic: false,
          gpuSerialize: true,
          threadSafe
        }
      );

      if (batchResult.result?.success) {
        console.log(`🚀 GPU batch processing completed for ${requestEntries.length} requests`);
      }
    } catch (error) {
      console.warn('GPU batch processing failed, using standard processing:', error);
    }
  }

  await Promise.allSettled(
    requestEntries.map(async ([key, requestFn]) => {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        );
        
        const result = await Promise.race([requestFn(), timeoutPromise]);
        
        // Use concurrent serializer if GPU acceleration is enabled
        if (gpuAccelerated) {
          const serialized = await concurrentSerializer.serialize(result, {
            gpuAccelerated: true,
            legalDocumentMode: true,
            compress: estimateDataSize(result) > 50 * 1024
          });
          
          results[key] = JSON.parse(serialized.serialized);
        } else {
          results[key] = sanitizeForSSR(result);
        }
        
        // Cache individual results if requested
        if (cacheResults) {
          const cacheKey = `batch_result_${String(key)}_${Date.now()}`;
          await cognitiveCache.storeJsonbDocument(cacheKey, results[key], {
            batchKey: String(key),
            gpuProcessed: gpuAccelerated,
            threadSafe
          });
        }
      } catch (error) {
        console.error(`SSR batch request failed for ${String(key)}:`, error);
        results[key] = null;
      }
    })
  );
  
  return results;
}

/**
 * System health check for thread synchronization components
 */
export async function getThreadSyncHealth(): Promise<{
  postgres: any;
  cognitive_cache: any;
  serializer: any;
  gpu_coordinator: any;
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
}> {
  try {
    const [postgresHealth, cacheStats, serializerStats, gpuHealth] = await Promise.all([
      threadSafePostgres.healthCheck(),
      cognitiveCache.getCacheStats(),
      concurrentSerializer.getStats(),
      gpuCoordinator.getSystemHealth()
    ]);

    const overallStatus = 
      postgresHealth.connected && 
      cacheStats.threadSafe && 
      serializerStats.activeWorkers > 0 && 
      gpuHealth.gpuAvailable ? 'healthy' : 
      (postgresHealth.connected && cacheStats.threadSafe ? 'degraded' : 'unhealthy');

    return {
      postgres: postgresHealth,
      cognitive_cache: cacheStats,
      serializer: serializerStats,
      gpu_coordinator: gpuHealth,
      overall_status: overallStatus
    };
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      postgres: { connected: false },
      cognitive_cache: { threadSafe: false },
      serializer: { activeWorkers: 0 },
      gpu_coordinator: { gpuAvailable: false },
      overall_status: 'unhealthy'
    };
  }
}