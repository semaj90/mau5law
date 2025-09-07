import type { RequestHandler } from './$types.js';

/*
 * RAG QUIC Proxy API - Enhanced RAG Service with Edge Caching
 * Provides RAG operations with edge caching, metrics, and JSON optimization
 * Port: 8451 (QUIC), 8452 (HTTP/2 fallback)
 * Backend: Upload Service (8093), Enhanced RAG (8094)
 */
import { json, error } from '@sveltejs/kit';

import { ensureError } from '$lib/utils/ensure-error';

const RAG_QUIC_CONFIG = {
  primaryPort: 8451,    // QUIC HTTP/3
  fallbackPort: 8452,   // HTTP/2
  baseUrl: 'http://localhost:8451',
  fallbackUrl: 'http://localhost:8452',
  timeout: 45000,       // RAG operations can be intensive
  cacheEnabled: true,
  etagRevalidation: true,
  maxPayloadSize: 10 * 1024 * 1024, // 10MB
};

export interface RAGRequest {
  query: string;
  context?: string[];
  documentIds?: string[];
  maxResults?: number;
  threshold?: number;
  includeMetadata?: boolean;
  useCache?: boolean;
  model?: string;
}

export interface RAGResponse {
  answer: string;
  sources: Array<{
    id: string;
    content: string;
    score: number;
    metadata?: Record<string, any>;
  }>;
  model: string;
  confidence: number;
  executionTime: number;
  cached: boolean;
}

// Import the Go microservice manager
import { goServiceManager } from '$lib/services/goMicroservice';
import crypto from "crypto";
import { URL } from "url";

/*
 * GET /api/v1/quic/rag-proxy - RAG proxy health and metrics
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const includeMetrics = url.searchParams.get('metrics') === 'true';

    // Check RAG proxy health
    const healthResponse = await fetch(`${RAG_QUIC_CONFIG.baseUrl}/health`, {
      signal: AbortSignal.timeout(RAG_QUIC_CONFIG.timeout)
    });

    let proxyStatus = 'healthy';
    let responseData: any = {};

    if (healthResponse.ok) {
      responseData = await healthResponse.json();
    } else {
      // Try fallback HTTP/2
      const fallbackResponse = await fetch(`${RAG_QUIC_CONFIG.fallbackUrl}/health`, {
        signal: AbortSignal.timeout(RAG_QUIC_CONFIG.timeout)
      });

      if (fallbackResponse.ok) {
        responseData = await fallbackResponse.json();
        proxyStatus = 'fallback';
      } else {
        proxyStatus = 'unhealthy';
      }
    }

    // Get detailed metrics if requested
    let metricsData = null;
    if (includeMetrics && proxyStatus !== 'unhealthy') {
      try {
        const metricsUrl =
          proxyStatus === 'healthy'
            ? `${RAG_QUIC_CONFIG.baseUrl}/metrics`
            : `${RAG_QUIC_CONFIG.fallbackUrl}/metrics`;

        const metricsResponse = await fetch(metricsUrl, {
          headers: {
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(10000)
        });

        if (metricsResponse.ok) {
          metricsData = await metricsResponse.json();
        }
      } catch (metricsError) {
        console.warn('Failed to fetch metrics:', metricsError);
      }
    }

    return json({
      service: 'rag-quic-proxy',
      status: proxyStatus,
      protocol: proxyStatus === 'healthy' ? 'HTTP/3' : proxyStatus === 'fallback' ? 'HTTP/2' : 'N/A',
      ports: {
        quic: RAG_QUIC_CONFIG.primaryPort,
        fallback: RAG_QUIC_CONFIG.fallbackPort
      },
      backends: {
        uploadService: 'http://localhost:8093',
        enhancedRAG: 'http://localhost:8094'
      },
      features: [
        'Enhanced RAG Operations',
        'Edge Caching with ETag Revalidation',
        'Prometheus Metrics Integration',
        'JSON Response Optimization',
        'HTTP/3 Acceleration',
        'Multi-backend Load Balancing'
      ],
      caching: {
        enabled: RAG_QUIC_CONFIG.cacheEnabled,
        etagRevalidation: RAG_QUIC_CONFIG.etagRevalidation,
        maxPayloadSize: RAG_QUIC_CONFIG.maxPayloadSize
      },
      metrics: metricsData,
      healthCheck: responseData,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('RAG QUIC Proxy health check failed:', err);

    return json({
      service: 'rag-quic-proxy',
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

/*
 * POST /api/v1/quic/rag-proxy - Enhanced RAG query with caching
 */
export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const ragRequest: RAGRequest = await request.json();
    const useHttp3 = url.searchParams.get('http3') !== 'false';
    const bypassCache = url.searchParams.get('bypass-cache') === 'true';

    // Validate RAG request
    if (!ragRequest.query || ragRequest.query.trim().length === 0) {
      error(400, ensureError({ message: 'Query is required and cannot be empty' }));
    }

    if (ragRequest.maxResults && (ragRequest.maxResults < 1 || ragRequest.maxResults > 100)) {
      error(400, ensureError({ message: 'Max results must be between 1 and 100' }));
    }

    if (ragRequest.threshold && (ragRequest.threshold < 0 || ragRequest.threshold > 1)) {
      error(400, ensureError({ message: 'Threshold must be between 0 and 1' }));
    }

    // Placeholder: Enhanced RAG go client is not available; use HTTP path or future client

    // Prepare request payload for Go service
    const requestPayload = {
      query: ragRequest.query,
      context: ragRequest.context || [],
      documentIds: ragRequest.documentIds || [],
      maxResults: ragRequest.maxResults || 10,
      threshold: ragRequest.threshold || 0.7,
      includeMetadata: ragRequest.includeMetadata !== false,
      useCache: ragRequest.useCache !== false && !bypassCache,
      model: ragRequest.model || 'gemma3-legal',
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: Date.now(),
        protocol: useHttp3 ? 'HTTP/3' : 'HTTP/2',
      },
    };

    // Generate ETag for caching
    const requestHash = await generateRequestHash(JSON.stringify(requestPayload));

    let response: Response;
    let protocol: string;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Request-ID': requestPayload.meta.requestId,
        'X-Use-Cache': String(requestPayload.useCache),
        'X-QUIC-Request': 'true',
      };

      // Add ETag for cache revalidation
      if (RAG_QUIC_CONFIG.etagRevalidation && requestPayload.useCache) {
        headers['If-None-Match'] = requestHash;
      }

      // Use direct fetch to QUIC proxy (or fallback) for now
      const targetUrl = useHttp3
        ? `${RAG_QUIC_CONFIG.baseUrl}/api/rag/query`
        : `${RAG_QUIC_CONFIG.fallbackUrl}/api/rag/query`;
      response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(RAG_QUIC_CONFIG.timeout),
      });
      protocol = useHttp3 ? 'HTTP/3' : 'HTTP/2';
    } catch (quicError) {
      console.error('RAG QUIC Proxy failed:', quicError);
      error(
        503,
        ensureError({
          message: 'RAG service unavailable',
          error: quicError instanceof Error ? quicError.message : 'Unknown error',
        })
      );
    }

    // Handle 304 Not Modified (cached response)
    if (response.status === 304) {
      return json({
        success: true,
        cached: true,
        message: 'Response served from cache',
        protocol,
        timestamp: new Date().toISOString(),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      error(response.status, `RAG proxy error: ${response.statusText} - ${errorText}`);
    }

    const responseData = await response.json();

    const ragResponse: RAGResponse = {
      answer: responseData.answer || responseData.response,
      sources: responseData.sources || responseData.context || [],
      model: responseData.model || requestPayload.model,
      confidence: responseData.confidence || 0.8,
      executionTime: responseData.executionTime || 0,
      cached: responseData.cached || false,
    };

    return json({
      success: true,
      data: ragResponse,
      protocol,
      source: 'rag-quic-proxy',
      etag: response.headers.get('ETag') || requestHash,
      timestamp: new Date().toISOString(),
      metrics: {
        queryLength: ragRequest.query.length,
        resultsCount: ragResponse.sources.length,
        executionTimeMs: ragResponse.executionTime,
        confidence: ragResponse.confidence,
        cached: ragResponse.cached,
        model: ragResponse.model,
      },
    });
  } catch (err: any) {
    console.error('RAG QUIC Proxy error:', err);
    error(500, err instanceof Error ? err.message : 'RAG operation failed');
  }
};

/*
 * PUT /api/v1/quic/rag-proxy - Update document in RAG index
 */
export const PUT: RequestHandler = async ({ request, url }) => {
  try {
    const document = await request.json();
    const useHttp3 = url.searchParams.get('http3') !== 'false';

    // Validate document
    if (!document.id || !document.content) {
      error(400, ensureError({ message: 'Document ID and content are required' }));
    }

    const targetUrl = useHttp3
      ? `${RAG_QUIC_CONFIG.baseUrl}/api/rag/documents`
      : `${RAG_QUIC_CONFIG.fallbackUrl}/api/rag/documents`;

    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-QUIC-Request': 'true',
      },
      body: JSON.stringify(document),
      signal: AbortSignal.timeout(RAG_QUIC_CONFIG.timeout),
    });

    if (!response.ok) {
      throw new Error(`Document update failed: ${response.statusText}`);
    }

    const result = await response.json();

    return json({
      success: true,
      message: `Document '${document.id}' updated in RAG index`,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('RAG document update error:', err);
    error(
      500,
      ensureError({
        message: 'Document update failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );
  }
};

/*
 * DELETE /api/v1/quic/rag-proxy - Remove document from RAG index
 */
export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const documentId = url.searchParams.get('documentId');
    const useHttp3 = url.searchParams.get('http3') !== 'false';

    if (!documentId) {
      error(400, ensureError({ message: 'Document ID is required' }));
    }

    const targetUrl = useHttp3
      ? `${RAG_QUIC_CONFIG.baseUrl}/api/rag/documents/${documentId}`
      : `${RAG_QUIC_CONFIG.fallbackUrl}/api/rag/documents/${documentId}`;

    const response = await fetch(targetUrl, {
      method: 'DELETE',
      headers: {
        'X-QUIC-Request': 'true',
      },
      signal: AbortSignal.timeout(RAG_QUIC_CONFIG.timeout),
    });

    if (!response.ok) {
      throw new Error(`Document deletion failed: ${response.statusText}`);
    }

    const result = await response.json();

    return json({
      success: true,
      message: `Document '${documentId}' removed from RAG index`,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('RAG document deletion error:', err);
    error(
      500,
      ensureError({
        message: 'Document deletion failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );
  }
};

/*
 * Generate SHA-256 hash for request caching
 */
async function generateRequestHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}