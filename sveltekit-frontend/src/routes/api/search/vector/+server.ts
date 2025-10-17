/*
 * Enhanced Semantic Vector Search API
 * Advanced semantic search with pgvector, Gemma embeddings, caching, and AI-powered query understanding
 * Production-ready with enterprise security, performance optimization, and comprehensive analytics
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { semanticSearchService, type SemanticSearchOptions } from '$lib/services/semantic-search.js';
import { performanceOptimizer } from '$lib/services/performance-optimizer.js';
import { securityService } from '$lib/services/security.js';
import { vectorSearchCache } from '$lib/server/optimize/query-cache';

// Helper function to ensure the error is an Error object
function ensureError(err: unknown): Error {
  if (err instanceof Error) {
    return err;
  }
  // Attempt to get a message from non-Error objects
  if (typeof err === 'string') {
    return new Error(err);
  }
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    return new Error((err as { message: string }).message);
  }
  return new Error('An unknown error occurred');
}

// Simple in-memory cache for query results (fallback if Redis unavailable)
const queryCache = new Map<string, { result: SemanticSearchResult; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Add small, safe JSON value types to avoid `any`
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

// Assuming these are the types returned by semanticSearchService.search
interface SemanticSearchAnalytics {
  processingTime: number;
  cacheHit: boolean;
  searchStrategy: string;
  queryComplexity: string;
  semanticConcepts: string[];
  dbOptimization?: string;
  securityLevel?: string;
  performanceFeatures?: string[];
}

// Define a more specific type for search results
interface DocumentResult {
  id: string;
  title: string;
  snippet: string; // A short excerpt of the document content
  score: number; // Similarity score
  metadata: Record<string, JsonValue>; // Replaced `any` with JsonValue for stricter typing
  // Add other relevant fields like documentType, date, source, etc.
}

interface SemanticSearchResult {
  results: DocumentResult[]; // Define a more specific type if known, e.g., DocumentResult[]
  analytics?: SemanticSearchAnalytics; // Make analytics property optional
  suggestions?: string[];
}

interface EnhancedSearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
  includeContent?: boolean;
  includeMetadata?: boolean;
  semanticExpansion?: boolean;
  queryRewriting?: boolean;
  analytics?: boolean;
  filters?: {
    documentType?: string[];
    dateRange?: { start?: string; end?: string };
    tags?: string[];
    source?: string[];
  };
}
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const startTime = Date.now();
  const clientIP = getClientAddress();
  try {
    // Security check: Rate limiting
    const securityCheck = securityService.checkRateLimit(clientIP);
    // Define minimal typed shapes to avoid `any` casts while remaining tolerant
    type RateLimitShape = {
      remaining?: number | null;
      resetTime?: number | null;
    };
    type SecurityCheckResult = {
      allowed: boolean;
      remaining?: number | null;
      resetTime?: number | null;
      rateLimitInfo?: RateLimitShape;
      rateLimit?: RateLimitShape;
      [key: string]: unknown;
    };
    const sc = securityCheck as SecurityCheckResult;
    // Tolerant extraction using typed fields
    const remaining = sc.remaining ?? sc.rateLimitInfo?.remaining ?? sc.rateLimit?.remaining ?? null;
    const resetTime = sc.resetTime ?? sc.rateLimitInfo?.resetTime ?? sc.rateLimit?.resetTime ?? null;
    if (!sc.allowed) {
      securityService.logAuditEvent({
        action: 'semantic_search_rate_limited',
        resource: '/api/search/vector',
        clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown',
        success: false,
        errorMessage: 'Rate limit exceeded',
        metadata: {
          remaining,
          resetTime,
        },
      });
      return json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          remaining,
          resetTime,
        },
        {
          status: 429,
          headers: securityService.getSecurityHeaders(),
        }
      );
    }
    const body = (await request.json()) as EnhancedSearchRequest;
    const {
      query,
      limit = 10,
      threshold = 0.7,
      includeContent = true,
      includeMetadata = true,
      semanticExpansion = true,
      queryRewriting = true,
      analytics = true,
      filters,
    } = body || ({} as EnhancedSearchRequest);
    // Enhanced input validation
    if (!query || !query.trim()) {
      securityService.logAuditEvent({
        action: 'semantic_search_validation_error',
        resource: '/api/search/vector',
        clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown',
        success: false,
        errorMessage: 'Empty query provided',
      });
      return json(
        {
          success: false,
          error: 'Query is required and must not be empty',
        },
        {
          status: 400,
          headers: securityService.getSecurityHeaders(),
        }
      );
    }
    // Validate query length
    if (query.length > 500) {
      return json(
        {
          success: false,
          error: 'Query too long. Maximum 500 characters allowed.',
        },
        {
          status: 400,
          headers: securityService.getSecurityHeaders(),
        }
      );
    }
    // Validate limit bounds
    if (limit && (limit < 1 || limit > 50)) {
      return json(
        {
          success: false,
          error: 'Limit must be between 1 and 50',
        },
        {
          status: 400,
          headers: securityService.getSecurityHeaders(),
        }
      );
    }
    // Validate threshold bounds
    if (threshold && (threshold < 0.1 || threshold > 1.0)) {
      return json(
        {
          success: false,
          error: 'Threshold must be between 0.1 and 1.0',
        },
        {
          status: 400,
          headers: securityService.getSecurityHeaders(),
        }
      );
    }
    // Prepare semantic search options
    const searchOptions: SemanticSearchOptions = {
      limit,
      threshold,
      includeContent,
      includeMetadata,
      semanticExpansion,
      queryRewriting,
      filters: filters && {
        ...filters,
        dateRange: filters.dateRange && {
          start: filters.dateRange.start ? new Date(filters.dateRange.start) : undefined,
          end: filters.dateRange.end ? new Date(filters.dateRange.end) : undefined,
        },
      },
    };

    // Use vector search cache for improved performance (30 min TTL)
    // Note: This wraps semanticSearchService which generates embeddings internally
    const { data: searchResult, cacheHit } = await vectorSearchCache.getOrQuery(
      {
        query: query.trim(),
        options: searchOptions,
        type: 'vector-search',
      },
      async () => {
        return await semanticSearchService.search(query.trim(), searchOptions);
      },
      { ttl: 1800, namespace: 'vector-search' }
    );

    const responseTime = Date.now() - startTime;

    console.log(
      `🔍 Vector search ${cacheHit.hit ? 'HIT' : 'MISS'} (${cacheHit.source}) - Latency: ${cacheHit.latency.toFixed(2)}ms`
    );

    // Ensure analytics object exists before updating
    if (!searchResult.analytics) {
      searchResult.analytics = {
        processingTime: 0, // Will be updated below
        cacheHit: false, // Default value
        searchStrategy: 'unknown', // Default value
        queryComplexity: 'unknown', // Default value
        semanticConcepts: [], // Default value
      };
    }

    // Update analytics with actual response time and cache status
    searchResult.analytics.processingTime = responseTime;
    searchResult.analytics.cacheHit = cacheHit.hit; // Update with our cache status

    // Log successful search with detailed metrics
    performanceOptimizer.recordQuery(query, responseTime, cacheHit.hit);
    securityService.logAuditEvent({
      action: 'semantic_search_success',
      resource: '/api/search/vector',
      clientIP,
      userAgent: request.headers.get('user-agent') || 'unknown',
      success: true,
      metadata: {
        query: query.substring(0, 100), // Truncate for privacy
        resultsCount: searchResult.results.length,
        responseTime,
        searchStrategy: searchResult.analytics.searchStrategy,
        queryComplexity: searchResult.analytics.queryComplexity,
        semanticConcepts: searchResult.analytics.semanticConcepts.slice(0, 5), // Limit for logs
        cacheHit: searchResult.analytics.cacheHit,
        semanticExpansion,
        queryRewriting,
      },
    });
    // Prepare response with comprehensive metadata
    const response = {
      success: true,
      query,
      results: searchResult.results,
      metadata: {
        totalResults: searchResult.results.length,
        responseTime,
        searchStrategy: searchResult.analytics.searchStrategy,
        queryComplexity: searchResult.analytics.queryComplexity,
        semanticConcepts: searchResult.analytics.semanticConcepts,
        cacheHit: searchResult.analytics.cacheHit,
        pgvectorCompatibility: '768D→1536D',
        embeddingModel: 'Gemma',
        indexType: 'IVFFLAT',
        ...(analytics && {
          analytics: {
            ...searchResult.analytics,
            dbOptimization: 'IVFFLAT index optimized for current dataset',
            securityLevel: 'Enterprise-grade middleware',
            performanceFeatures: ['Caching', 'Parallel processing', 'Analytics'],
          },
        }),
      },
      ...(searchResult.suggestions &&
        searchResult.suggestions.length > 0 && {
          suggestions: searchResult.suggestions,
        }),
    };
    return json(response, {
      headers: {
        ...securityService.getSecurityHeaders(),
        'X-Search-Strategy': searchResult.analytics.searchStrategy,
        'X-Query-Complexity': searchResult.analytics.queryComplexity,
        'X-Response-Time': responseTime.toString(),
        'X-Cache-Hit': searchResult.analytics.cacheHit.toString(),
      },
    });
  } catch (error: unknown) {
    // Changed from any
    const e = ensureError(error);
    const responseTime = Date.now() - startTime;
    // Enhanced error logging with context
    securityService.logAuditEvent({
      action: 'semantic_search_error',
      resource: '/api/search/vector',
      clientIP,
      userAgent: request.headers.get('user-agent') || 'unknown',
      success: false,
      errorMessage: e.message,
      metadata: {
        responseTime,
        errorType: e.constructor.name,
        stack: e.stack?.substring(0, 500), // Truncated stack trace
      },
    });
    console.error('Enhanced semantic search error:', e);
    return json(
      {
        success: false,
        error: 'Semantic search failed. Please try again with a simpler query.',
        responseTime,
        errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
      {
        status: 500,
        headers: securityService.getSecurityHeaders(),
      }
    );
  }
};
export const GET: RequestHandler = async ({ url, getClientAddress }) => {
  const action = url.searchParams.get('action') || 'health';
  try {
    switch (action) {
      case 'health':
        return json(
          {
            success: true,
            status: 'healthy',
            service: 'semantic-vector-search',
            timestamp: new Date().toISOString(),
            features: [
              'pgvector IVFFLAT optimization',
              '768D→1536D Gemma compatibility',
              'Semantic query expansion',
              'AI-powered query understanding',
              'Enterprise security middleware',
              'Performance analytics',
              'Redis caching (when available)',
              'SvelteKit 2 + TypeScript best practices',
            ],
            endpoints: {
              search: 'POST /api/search/vector',
              health: 'GET /api/search/vector?action=health',
              cache: 'GET /api/search/vector?action=cache',
              performance: 'GET /api/search/vector?action=performance',
              analytics: 'GET /api/search/vector?action=analytics',
            },
          },
          {
            headers: securityService.getSecurityHeaders(),
          }
        );
      case 'cache': {
        // Get cache statistics from both in-memory and Redis
        const memoryCacheStats = {
          entries: queryCache.size,
          ttl: CACHE_TTL,
          active: Array.from(queryCache.entries()).filter(([_, entry]) => Date.now() - entry.timestamp < CACHE_TTL)
            .length,
        };
        return json(
          {
            success: true,
            cache: {
              memory: memoryCacheStats,
              redis: 'Available when configured',
              strategy: 'Multi-tier caching with TTL',
            },
            timestamp: new Date().toISOString(),
          },
          {
            headers: securityService.getSecurityHeaders(),
          }
        );
      }
      case 'performance': {
        const analytics = await performanceOptimizer.getPerformanceAnalytics();
        return json(
          {
            success: true,
            performance: {
              ...analytics,
              database: {
                type: 'PostgreSQL + pgvector',
                indexing: 'IVFFLAT optimized for current dataset',
                compatibility: '768D Gemma → 1536D pgvector storage',
              },
              search: {
                strategy: 'Advanced semantic search',
                features: ['Query rewriting', 'Semantic expansion', 'Concept analysis'],
                ai: 'Gemma embeddings with semantic understanding',
              },
            },
            timestamp: new Date().toISOString(),
          },
          {
            headers: securityService.getSecurityHeaders(),
          }
        );
      }
      case 'analytics':
        return json(
          {
            success: true,
            analytics: {
              searchCapabilities: [
                'Semantic query understanding',
                'Legal domain concept extraction',
                'Query complexity analysis',
                'Automatic query rewriting',
                'Multi-concept semantic expansion',
              ],
              performance: [
                'IVFFLAT index optimization',
                'Parallel document processing',
                'Multi-tier caching strategy',
                'Real-time performance monitoring',
              ],
              security: [
                'Rate limiting (100 RPM)',
                'Comprehensive audit logging',
                'Input validation and sanitization',
                'Enterprise-grade middleware',
              ],
              architecture: [
                'SvelteKit 2 + TypeScript',
                'Drizzle ORM integration',
                'Barrel export patterns',
                'Production best practices',
              ],
            },
            timestamp: new Date().toISOString(),
          },
          {
            headers: securityService.getSecurityHeaders(),
          }
        );
      default:
        return json(
          {
            success: false,
            error: 'Invalid action. Available: health, cache, performance, analytics',
          },
          {
            status: 400,
            headers: securityService.getSecurityHeaders(),
          }
        );
    }
  } catch (error: unknown) {
    // Changed from any
    const e = ensureError(error);
    console.error('GET /api/search/vector error:', e);
    securityService.logAuditEvent({
      action: 'semantic_search_error',
      resource: '/api/search/vector',
      clientIP: getClientAddress(),
      userAgent: url.searchParams.get('user-agent') || 'unknown',
      success: false,
      errorMessage: e.message,
      metadata: {
        errorType: e.constructor.name,
        stack: e.stack?.substring(0, 500), // Truncated stack trace
      },
    });
    return json(
      {
        success: false,
        error: 'Service temporarily unavailable',
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: securityService.getSecurityHeaders(),
      }
    );
  }
};
