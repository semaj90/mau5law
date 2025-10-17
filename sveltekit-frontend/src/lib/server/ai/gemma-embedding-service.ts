/**
 * Gemma Embedding Service
 * High-performance embedding generation using embeddinggemma:latest model
 * with Redis caching and batch processing support
 *
 * Features:
 * - Streaming embeddings from Ollama embeddinggemma:latest
 * - Redis caching with TTL for cost optimization
 * - Batch processing for multiple documents
 * - Dimension optimization (384D for embeddinggemma:latest)
 * - Error handling and fallback strategies
 *
 * @author Legal AI Platform Team
 * @version 1.0.0
 */

import Redis from 'ioredis';
import fetch from 'node-fetch';
import { createHash } from 'crypto';

/**
 * Gemma Embedding Configuration
 */
export interface GemmaEmbeddingConfig {
  ollamaBaseUrl: string;
  model: string;
  dimensions: number;
  timeout: number;
  redis: Redis;
  cacheTtl: number;
  batchSize: number;
}

/**
 * Embedding Request
 */
export interface EmbeddingRequest {
  text: string;
  documentId?: string;
  type?: 'legal_context' | 'case_summary' | 'precedent' | 'text' | 'clause';
  cacheKey?: string;
}

/**
 * Embedding Response
 */
export interface EmbeddingResponse {
  embedding: number[];
  dimensions: number;
  model: string;
  text: string;
  cached: boolean;
  processingTime: number;
}

/**
 * Batch Embedding Response
 */
export interface BatchEmbeddingResponse {
  embeddings: EmbeddingResponse[];
  totalProcessingTime: number;
  cacheHitCount: number;
  cacheHitRatio: number;
}

/**
 * Gemma Embedding Service
 * Handles all embedding generation and caching logic
 */
export class GemmaEmbeddingService {
  private config: GemmaEmbeddingConfig;
  private redis: Redis;
  private readonly CACHE_PREFIX = 'embedding:gemma:';
  private readonly MODEL_NAME = 'embeddinggemma:latest';

  constructor(config: GemmaEmbeddingConfig) {
    this.config = config;
    this.redis = config.redis;
  }

  /**
   * Generate a single embedding with caching
   */
  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = Date.now();
    const cacheKey = request.cacheKey || this.generateCacheKey(request.text);

    // Check Redis cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        cached: true,
        processingTime: Date.now() - startTime
      };
    }

    // Generate embedding from Ollama
    const embedding = await this.generateEmbedding(request.text);

    // Store in Redis cache
    await this.storeInCache(cacheKey, embedding);

    return {
      embedding,
      dimensions: this.config.dimensions,
      model: this.MODEL_NAME,
      text: request.text,
      cached: false,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async embedBatch(requests: EmbeddingRequest[]): Promise<BatchEmbeddingResponse> {
    const startTime = Date.now();
    const results: EmbeddingResponse[] = [];
    let cacheHitCount = 0;

    // Process in parallel with batch size limit
    for (let i = 0; i < requests.length; i += this.config.batchSize) {
      const batch = requests.slice(i, i + this.config.batchSize);
      const batchResults = await Promise.all(
        batch.map(req => this.embed(req))
      );

      results.push(...batchResults);
      cacheHitCount += batchResults.filter(r => r.cached).length;
    }

    return {
      embeddings: results,
      totalProcessingTime: Date.now() - startTime,
      cacheHitCount,
      cacheHitRatio: results.length > 0 ? cacheHitCount / results.length : 0
    };
  }

  /**
   * Generate embedding from Ollama embeddinggemma:latest
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.config.ollamaBaseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt: text
        }),
        timeout: this.config.timeout
      });

      if (!response.ok) {
        throw new Error(
          `Ollama API error: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as { embedding?: number[] };

      if (!Array.isArray(data.embedding)) {
        throw new Error('Invalid embedding response from Ollama');
      }

      if (data.embedding.length !== this.config.dimensions) {
        console.warn(
          `Embedding dimension mismatch: expected ${this.config.dimensions}, got ${data.embedding.length}`
        );
      }

      return data.embedding;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate embedding: ${message}`);
    }
  }

  /**
   * Generate deterministic cache key from text
   */
  private generateCacheKey(text: string): string {
    const hash = createHash('sha256').update(text).digest('hex');
    return `${this.CACHE_PREFIX}${hash}`;
  }

  /**
   * Get embedding from Redis cache
   */
  private async getFromCache(
    cacheKey: string
  ): Promise<Omit<EmbeddingResponse, 'cached' | 'processingTime'> | null> {
    try {
      const cached = await this.redis.getBuffer(cacheKey);
      if (!cached) {
        return null;
      }

      // Decompress and deserialize
      const data = JSON.parse(cached.toString('utf8'));

      return {
        embedding: data.embedding,
        dimensions: data.dimensions,
        model: data.model,
        text: data.text
      };
    } catch (error) {
      console.warn('Cache retrieval failed, will regenerate:', error);
      return null;
    }
  }

  /**
   * Store embedding in Redis cache with TTL
   */
  private async storeInCache(
    cacheKey: string,
    embedding: number[]
  ): Promise<void> {
    try {
      const data = {
        embedding,
        dimensions: this.config.dimensions,
        model: this.MODEL_NAME,
        timestamp: Date.now()
      };

      await this.redis.setex(
        cacheKey,
        this.config.cacheTtl,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('Failed to cache embedding:', error);
      // Don't throw - allow processing to continue
    }
  }

  /**
   * Check if embedding is cached
   */
  async isCached(text: string): Promise<boolean> {
    const cacheKey = this.generateCacheKey(text);
    const exists = await this.redis.exists(cacheKey);
    return exists > 0;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    keysCount: number;
    estimatedMemory: string;
  }> {
    try {
      const pattern = `${this.CACHE_PREFIX}*`;
      const keys = await this.redis.keys(pattern);

      let totalMemory = 0;
      if (keys.length > 0) {
        // Estimate: each embedding ~3KB
        totalMemory = keys.length * 3 * 1024;
      }

      return {
        keysCount: keys.length,
        estimatedMemory: `${(totalMemory / 1024 / 1024).toFixed(2)} MB`
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return { keysCount: 0, estimatedMemory: '0 MB' };
    }
  }

  /**
   * Clear all embeddings from cache
   */
  async clearCache(): Promise<number> {
    try {
      const pattern = `${this.CACHE_PREFIX}*`;
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;

      await this.redis.del(...keys);
      return keys.length;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return 0;
    }
  }

  /**
   * Validate Ollama connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.ollamaBaseUrl}/api/tags`, {
        timeout: this.config.timeout
      });

      if (!response.ok) {
        console.error('Ollama health check failed:', response.statusText);
        return false;
      }

      const data = (await response.json()) as { models?: Array<{ name: string }> };

      // Check if embeddinggemma model is available
      const hasModel = data.models?.some(m =>
        m.name.startsWith('embeddinggemma')
      );

      if (!hasModel) {
        console.warn(
          `Warning: embeddinggemma model not found. Available models: ${data.models?.map(m => m.name).join(', ')}`
        );
      }

      return true;
    } catch (error) {
      console.error('Ollama connection validation failed:', error);
      return false;
    }
  }

  /**
   * Get embedding dimensions
   */
  getDimensions(): number {
    return this.config.dimensions;
  }

  /**
   * Get model name
   */
  getModelName(): string {
    return this.MODEL_NAME;
  }
}

/**
 * Factory function to create and initialize Gemma Embedding Service
 */
export async function createGemmaEmbeddingService(
  config: GemmaEmbeddingConfig
): Promise<GemmaEmbeddingService> {
  const service = new GemmaEmbeddingService(config);

  // Validate connection on startup
  const isConnected = await service.validateConnection();
  if (!isConnected) {
    console.warn(
      'Warning: Could not validate Ollama connection for embeddinggemma'
    );
  }

  return service;
}

/**
 * Default configuration for Gemma Embedding Service
 */
export const DEFAULT_GEMMA_CONFIG: Partial<GemmaEmbeddingConfig> = {
  ollamaBaseUrl: 'http://localhost:11434',
  model: 'embeddinggemma:latest',
  dimensions: 384,  // embeddinggemma:latest outputs 384 dimensions
  timeout: 30000,
  cacheTtl: 86400, // 24 hours
  batchSize: 10
};
