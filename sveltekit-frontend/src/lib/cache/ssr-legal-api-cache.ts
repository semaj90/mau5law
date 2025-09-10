/**
 * SSR Legal API Cache
 * High-performance SSR-optimized cache for legal AI platform
 * Integrates with existing parallel cache orchestrator
 */

import { parallelCacheOrchestrator, type ParallelCacheRequest } from './parallel-cache-orchestrator.js';
import { dev } from '$app/environment';
import { browser } from '$app/environment';

export interface SSRCacheConfig {
  defaultTTL: number;
  maxAge: number;
  staleWhileRevalidate: number;
  quantizeResponses: boolean;
  enableRAG: boolean;
  legalOptimizations: boolean;
}

export interface LegalAPIResponse {
  success: boolean;
  data: any;
  meta?: {
    userId?: string;
    timestamp: string;
    processingTime?: number;
    aiModel?: string;
    cached?: boolean;
    cacheLayer?: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SSRCacheEntry {
  key: string;
  data: LegalAPIResponse;
  timestamp: number;
  ttl: number;
  etag: string;
  contentType: string;
  quantized?: boolean;
  ragContext?: any[];
}

class SSRLegalAPICache {
  private config: SSRCacheConfig = {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxAge: 3600, // 1 hour
    staleWhileRevalidate: 86400, // 24 hours
    quantizeResponses: true,
    enableRAG: true,
    legalOptimizations: true
  };

  private responseQuantizer = new ResponseQuantizer();
  private ragContextCache = new Map<string, any[]>();

  /**
   * Cache GET request with intelligent key generation
   */
  async cacheGet(
    endpoint: string,
    params: Record<string, any> = {},
    options: {
      ttl?: number;
      quantize?: boolean;
      ragContext?: boolean;
      userId?: string;
    } = {}
  ): Promise<LegalAPIResponse | null> {
    const cacheKey = this.generateCacheKey(endpoint, params, options.userId);
    const startTime = performance.now();

    try {
      // Create parallel cache request
      const cacheRequest: ParallelCacheRequest = {
        id: `ssr-${Date.now()}`,
        type: options.ragContext ? 'rag' : 'hybrid',
        priority: this.determinePriority(endpoint),
        keys: [cacheKey],
        ttl: options.ttl || this.config.defaultTTL
      };

      // Execute parallel cache lookup
      const result = await parallelCacheOrchestrator.executeParallel(cacheRequest);

      if (result.success && result.cacheResults.length > 0) {
        const cacheHit = result.cacheResults[0];
        const response = this.deserializeResponse(cacheHit.data);
        
        // Add cache metadata
        if (response.meta) {
          response.meta.cached = true;
          response.meta.cacheLayer = cacheHit.source;
          response.meta.processingTime = performance.now() - startTime;
        }

        console.log(`🚀 SSR Cache HIT: ${endpoint} from ${cacheHit.source} (${result.metrics.totalLatency.toFixed(2)}ms)`);
        return response;
      }

      console.log(`💾 SSR Cache MISS: ${cacheKey}`);
      return null;

    } catch (error) {
      console.error('SSR cache lookup failed:', error);
      return null;
    }
  }

  /**
   * Store response with intelligent caching strategy
   */
  async cacheSet(
    endpoint: string,
    params: Record<string, any>,
    response: LegalAPIResponse,
    options: {
      ttl?: number;
      quantize?: boolean;
      ragContext?: any[];
      userId?: string;
    } = {}
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(endpoint, params, options.userId);

    try {
      // Quantize response if enabled
      let processedResponse = response;
      if (options.quantize !== false && this.config.quantizeResponses) {
        processedResponse = await this.responseQuantizer.quantize(response);
      }

      // Store RAG context if provided
      if (options.ragContext && this.config.enableRAG) {
        this.ragContextCache.set(cacheKey, options.ragContext);
      }

      // Create cache entry
      const cacheEntry: SSRCacheEntry = {
        key: cacheKey,
        data: processedResponse,
        timestamp: Date.now(),
        ttl: options.ttl || this.config.defaultTTL,
        etag: this.generateETag(processedResponse),
        contentType: 'application/json',
        quantized: options.quantize !== false && this.config.quantizeResponses,
        ragContext: options.ragContext
      };

      // Store across cache tiers
      await parallelCacheOrchestrator.storeParallel(
        cacheKey,
        this.serializeEntry(cacheEntry),
        {
          tier: this.selectOptimalTier(endpoint, processedResponse),
          ttl: cacheEntry.ttl,
          priority: this.determinePriority(endpoint) as 'low' | 'normal' | 'high',
          type: 'ssr_legal_api'
        }
      );

      console.log(`💾 SSR Cache SET: ${cacheKey} (quantized: ${cacheEntry.quantized})`);

    } catch (error) {
      console.error('SSR cache store failed:', error);
    }
  }

  /**
   * Execute cached API call with automatic caching
   */
  async cachedApiCall<T = LegalAPIResponse>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST';
      params?: Record<string, any>;
      body?: any;
      headers?: Record<string, string>;
      ttl?: number;
      quantize?: boolean;
      userId?: string;
      ragContext?: boolean;
    } = {}
  ): Promise<T> {
    const {
      method = 'GET',
      params = {},
      body,
      headers = {},
      ttl,
      quantize,
      userId,
      ragContext = false
    } = options;

    // Only cache GET requests
    if (method === 'GET') {
      const cached = await this.cacheGet(endpoint, params, { ttl, quantize, ragContext, userId });
      if (cached) {
        return cached as T;
      }
    }

    // Execute actual API call
    const response = await this.executeAPICall(endpoint, {
      method,
      params,
      body,
      headers
    });

    // Cache successful GET responses
    if (method === 'GET' && response.success) {
      const ragContextData = ragContext ? await this.extractRAGContext(response) : undefined;
      await this.cacheSet(endpoint, params, response, {
        ttl,
        quantize,
        ragContext: ragContextData,
        userId
      });
    }

    return response as T;
  }

  /**
   * Generate HTTP cache headers for SSR
   */
  generateCacheHeaders(endpoint: string, response: LegalAPIResponse): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.isCacheable(endpoint, response)) {
      headers['Cache-Control'] = `public, max-age=${this.config.maxAge}, s-maxage=${this.config.maxAge}, stale-while-revalidate=${this.config.staleWhileRevalidate}`;
      headers['ETag'] = this.generateETag(response);
      headers['Vary'] = 'Accept, Authorization, X-User-ID';
      
      // Legal-specific headers
      if (this.config.legalOptimizations) {
        headers['X-Legal-Cache'] = 'enabled';
        headers['X-Content-Type'] = 'legal-api-response';
        
        if (response.meta?.aiModel) {
          headers['X-AI-Model'] = response.meta.aiModel;
        }
      }
    } else {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
    }

    return headers;
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidatePattern(pattern: string, userId?: string): Promise<number> {
    // This would need to be implemented in the parallel cache orchestrator
    // For now, we'll clear specific known patterns
    const patterns = [
      `api:v1:cases:*:${userId}:*`,
      `api:v1:evidence:*:${userId}:*`,
      `api:v1:timeline:*:${userId}:*`,
      `api:v1:recommendations:*:${userId}:*`,
      `api:v1:citations:*:${userId}:*`,
      `api:v1:detective:*:${userId}:*`
    ];

    let invalidated = 0;
    // Implementation would require pattern matching in the cache layers
    console.log(`🗑️ Cache invalidation requested for pattern: ${pattern}`);
    return invalidated;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    hitRate: number;
    totalRequests: number;
    totalHits: number;
    avgResponseTime: number;
    cacheSize: number;
    quantizedResponses: number;
    ragContextEntries: number;
  }> {
    const perfStats = await parallelCacheOrchestrator.getPerformanceStats();
    
    return {
      hitRate: perfStats.currentMetrics.cacheHitRate,
      totalRequests: perfStats.currentMetrics.layerPerformance.l1MemoryHits + 
                    perfStats.currentMetrics.layerPerformance.l2RedisHits +
                    perfStats.currentMetrics.layerPerformance.l3StorageHits +
                    perfStats.currentMetrics.layerPerformance.gpuTextureHits +
                    perfStats.currentMetrics.layerPerformance.misses,
      totalHits: perfStats.currentMetrics.layerPerformance.l1MemoryHits + 
                perfStats.currentMetrics.layerPerformance.l2RedisHits +
                perfStats.currentMetrics.layerPerformance.l3StorageHits +
                perfStats.currentMetrics.layerPerformance.gpuTextureHits,
      avgResponseTime: perfStats.currentMetrics.totalLatency,
      cacheSize: perfStats.cacheStats.l1Size + perfStats.cacheStats.l2Size + perfStats.cacheStats.l3Size,
      quantizedResponses: 0, // Would need to track this
      ragContextEntries: this.ragContextCache.size
    };
  }

  // Private helper methods

  private generateCacheKey(endpoint: string, params: Record<string, any>, userId?: string): string {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    const baseKey = `api:v1:${endpoint.replace('/api/v1/', '')}:${this.hashString(paramString)}`;
    return userId ? `${baseKey}:${userId}` : baseKey;
  }

  private determinePriority(endpoint: string): 'low' | 'normal' | 'high' | 'critical' {
    if (endpoint.includes('/detective/') || endpoint.includes('/recommendations')) {
      return 'high';
    }
    if (endpoint.includes('/cases/') || endpoint.includes('/evidence/')) {
      return 'normal';
    }
    return 'low';
  }

  private selectOptimalTier(endpoint: string, response: LegalAPIResponse): 'l1' | 'l2' | 'l3' | 'all' {
    const dataSize = JSON.stringify(response).length;
    
    // Critical endpoints -> all tiers
    if (endpoint.includes('/detective/') || endpoint.includes('/recommendations')) {
      return 'all';
    }
    
    // Large responses -> L2/L3 only
    if (dataSize > 50000) {
      return 'l3';
    }
    
    // Small frequent responses -> all tiers
    if (dataSize < 10000) {
      return 'all';
    }
    
    return 'l2';
  }

  private isCacheable(endpoint: string, response: LegalAPIResponse): boolean {
    // Don't cache errors
    if (!response.success) {
      return false;
    }

    // Don't cache user-specific real-time data
    if (endpoint.includes('/auth/') || endpoint.includes('/session/')) {
      return false;
    }

    // Cache legal data
    return true;
  }

  private generateETag(response: LegalAPIResponse): string {
    const content = JSON.stringify(response.data);
    return `"${this.hashString(content)}"`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash).toString(36);
  }

  private async executeAPICall(endpoint: string, options: any): Promise<LegalAPIResponse> {
    const url = new URL(endpoint, browser ? window.location.origin : 'http://localhost:5173');
    
    if (options.method === 'GET' && options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const response = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  private async extractRAGContext(response: LegalAPIResponse): Promise<any[]> {
    // Extract RAG context from response metadata
    if (response.meta && response.meta.aiModel) {
      return [{
        model: response.meta.aiModel,
        timestamp: response.meta.timestamp,
        processingTime: response.meta.processingTime
      }];
    }
    return [];
  }

  private serializeEntry(entry: SSRCacheEntry): string {
    return JSON.stringify(entry);
  }

  private deserializeResponse(data: any): LegalAPIResponse {
    if (typeof data === 'string') {
      const parsed = JSON.parse(data);
      return parsed.data || parsed;
    }
    return data.data || data;
  }
}

/**
 * Response Quantizer - Compress API responses
 */
class ResponseQuantizer {
  async quantize(response: LegalAPIResponse): Promise<LegalAPIResponse> {
    // Simple quantization - in production this would use more sophisticated compression
    const quantized = { ...response };
    
    // Compress data arrays
    if (Array.isArray(quantized.data)) {
      quantized.data = quantized.data.map(item => this.quantizeObject(item));
    } else if (typeof quantized.data === 'object') {
      quantized.data = this.quantizeObject(quantized.data);
    }

    return quantized;
  }

  private quantizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    
    const quantized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.length > 100) {
        // Compress long strings
        quantized[key] = this.compressString(value);
      } else if (typeof value === 'number') {
        // Round numbers to reduce precision
        quantized[key] = Math.round(value * 100) / 100;
      } else if (Array.isArray(value)) {
        quantized[key] = value.map(item => this.quantizeObject(item));
      } else if (typeof value === 'object') {
        quantized[key] = this.quantizeObject(value);
      } else {
        quantized[key] = value;
      }
    }
    
    return quantized;
  }

  private compressString(str: string): string {
    // Simple compression - remove extra whitespace and trim
    return str.replace(/\s+/g, ' ').trim();
  }
}

// Export singleton instance
export const ssrLegalAPICache = new SSRLegalAPICache();
export default ssrLegalAPICache;