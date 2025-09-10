/**
 * GPU-Accelerated Embedding Cache Middleware
 * Integrates with existing thread synchronization and RTX 3060 Ti optimization
 * 
 * Flow: Node.js → Redis Cache → Postgres → Python GPU Worker
 */

import crypto from 'crypto';
import { threadSafePostgres } from './thread-safe-postgres.js';
import { concurrentSerializer } from './concurrent-json-serializer.js';
import { gpuCoordinator } from './gpu-thread-coordinator.js';
import { cache, cacheEmbedding, getCachedEmbedding } from './cache/redis.js';
import { webgpuRedisOptimizer, optimizedCache } from './webgpu-redis-optimizer.js';

interface EmbeddingCacheConfig {
  redisUrl?: string;
  pythonWorkerUrl?: string;
  cacheTTL?: number;
  batchSize?: number;
  useGPUAcceleration?: boolean;
}

interface CachedEmbedding {
  id: string;
  text: string;
  vector: Float32Array;
  metadata: {
    model: string;
    timestamp: number;
    gpuProcessed: boolean;
    threadId: string;
  };
}

export class EmbeddingCacheMiddleware {
  private config: Required<EmbeddingCacheConfig>;
  private pythonWorkerQueue: Map<string, Promise<Float32Array>> = new Map();
  
  constructor(config: EmbeddingCacheConfig = {}) {
    this.config = {
      redisUrl: config.redisUrl || 'redis://localhost:6379',
      pythonWorkerUrl: config.pythonWorkerUrl || 'http://localhost:8000',
      cacheTTL: config.cacheTTL || 86400, // 24 hours
      batchSize: config.batchSize || 128, // RTX 3060 Ti optimized
      useGPUAcceleration: config.useGPUAcceleration ?? true
    };
  }

  /**
   * Initialize centralized cache (no-op, already initialized)
   */
  async initializeRedisCache(): Promise<void> {
    // Using centralized cache service - no initialization needed
    console.log('✅ Using centralized cache for embeddings');
  }

  /**
   * Generate SHA256 cache key for text
   */
  private generateCacheKey(text: string): string {
    return crypto.createHash('sha256').update(text.trim()).digest('hex');
  }

  /**
   * Check centralized cache for embedding
   */
  private async checkRedisCache(text: string, model: string = 'nomic-embed-text-v1'): Promise<Float32Array | null> {
    try {
      const cachedVector = await getCachedEmbedding(text, model);
      return cachedVector ? new Float32Array(cachedVector) : null;
    } catch (error) {
      console.warn('Cache read failed:', error);
    }
    
    return null;
  }

  /**
   * Check Postgres for persistent embedding storage
   */
  private async checkPostgresCache(cacheKey: string): Promise<CachedEmbedding | null> {
    try {
      const results = await threadSafePostgres.queryJsonbDocuments(
        'embeddings',
        { path: 'id', value: cacheKey, operator: '@>' },
        { limit: 1, useGPU: this.config.useGPUAcceleration }
      );

      if (results.length > 0) {
        const result = results[0];
        return {
          id: result.id,
          text: result.text,
          vector: new Float32Array(result.vector),
          metadata: result.metadata
        };
      }
    } catch (error) {
      console.error('Postgres embedding cache query failed:', error);
    }

    return null;
  }

  /**
   * Call Python GPU worker for embedding generation
   */
  private async callPythonGPUWorker(texts: string[]): Promise<Float32Array[]> {
    try {
      const response = await fetch(`${this.config.pythonWorkerUrl}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GPU-Batch-Size': this.config.batchSize.toString(),
          'X-Thread-ID': `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        },
        body: JSON.stringify({ 
          texts,
          model: 'nomic-embed-text-v1',
          precision: 'fp16', // RTX 3060 Ti tensor core optimization
          batch_size: this.config.batchSize
        })
      });

      if (!response.ok) {
        throw new Error(`Python worker error: ${response.status} ${response.statusText}`);
      }

      const { vectors, metadata } = await response.json();
      
      console.log(`🚀 GPU embedding batch completed: ${texts.length} texts, ${metadata.gpu_time_ms}ms`);
      
      return vectors.map((v: number[]) => new Float32Array(v));
    } catch (error) {
      console.error('Python GPU worker failed:', error);
      throw error;
    }
  }

  /**
   * Store embedding in both Redis and Postgres with WebGPU optimization
   */
  private async storeEmbedding(
    text: string, 
    vector: Float32Array, 
    cacheKey: string
  ): Promise<void> {
    const embedding: CachedEmbedding = {
      id: cacheKey,
      text,
      vector,
      metadata: {
        model: 'nomic-embed-text-v1',
        timestamp: Date.now(),
        gpuProcessed: true,
        threadId: `middleware_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    };

    // Store using WebGPU-optimized cache with tensor compression
    try {
      await optimizedCache.set(`embed:${cacheKey}`, vector, 3600);
      console.log('🚀 Embedding stored with WebGPU optimization');
    } catch (error) {
      console.warn('WebGPU cache write failed, using standard cache:', error);
      // Fallback to standard cache
      try {
        await cacheEmbedding(text, Array.from(vector), 'nomic-embed-text-v1');
      } catch (fallbackError) {
        console.warn('Standard cache write failed:', fallbackError);
      }
    }

    // Store in Postgres for persistence
    try {
      await threadSafePostgres.insertJsonbDocument(
        'embeddings',
        {
          id: cacheKey,
          text,
          vector: Array.from(vector),
          metadata: embedding.metadata,
          created_at: new Date().toISOString()
        },
        {
          conflictResolution: 'ignore', // Don't overwrite existing
          useGPU: this.config.useGPUAcceleration
        }
      );
    } catch (error) {
      console.error('Postgres embedding storage failed:', error);
    }
  }

  /**
   * Main embedding retrieval method with full caching pipeline
   */
  async getEmbedding(text: string): Promise<Float32Array> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text input cannot be empty');
    }

    const cacheKey = this.generateCacheKey(text);
    
    // Initialize Redis if needed
    await this.initializeRedisCache();

    // 1. Check centralized cache first
    const redisResult = await this.checkRedisCache(text, 'nomic-embed-text-v1');
    if (redisResult) {
      console.log('📦 Cache hit for embedding');
      return redisResult;
    }

    // 2. Check Postgres persistent storage
    const postgresResult = await this.checkPostgresCache(cacheKey);
    if (postgresResult) {
      console.log('🗄️ Postgres cache hit for embedding');
      
      // Backfill centralized cache
      try {
        await cacheEmbedding(text, Array.from(postgresResult.vector), 'nomic-embed-text-v1');
      } catch (error) {
        console.warn('Cache backfill failed:', error);
      }
      
      return postgresResult.vector;
    }

    // 3. Check if already in flight to prevent duplicate GPU calls
    if (this.pythonWorkerQueue.has(cacheKey)) {
      console.log('⏳ GPU embedding already in progress, waiting...');
      return await this.pythonWorkerQueue.get(cacheKey)!;
    }

    // 4. Call Python GPU worker
    const gpuPromise = this.callGPUWorker(text, cacheKey);
    this.pythonWorkerQueue.set(cacheKey, gpuPromise);

    try {
      const embedding = await gpuPromise;
      await this.storeEmbedding(text, embedding, cacheKey);
      return embedding;
    } finally {
      this.pythonWorkerQueue.delete(cacheKey);
    }
  }

  /**
   * GPU worker call with thread coordination
   */
  private async callGPUWorker(text: string, cacheKey: string): Promise<Float32Array> {
    console.log('🎯 Calling Python GPU worker for new embedding');
    
    // Use GPU coordinator for optimal resource allocation
    if (this.config.useGPUAcceleration) {
      try {
        const gpuResult = await gpuCoordinator.processEmbeddingBatch(
          [text],
          {
            model: 'nomic-embed-text-v1',
            precision: 'fp16',
            batchSize: 1,
            priority: 'high'
          }
        );

        if (gpuResult.result?.embeddings) {
          return new Float32Array(gpuResult.result.embeddings[0]);
        }
      } catch (error) {
        console.warn('GPU coordinator failed, falling back to Python worker:', error);
      }
    }

    // Fallback to direct Python worker call
    const embeddings = await this.callPythonGPUWorker([text]);
    return embeddings[0];
  }

  /**
   * Batch embedding processing with WebGPU-optimized parallel caching
   */
  async getBatchEmbeddings(texts: string[]): Promise<Float32Array[]> {
    if (texts.length === 0) return [];

    const results: Float32Array[] = new Array(texts.length);
    const missingTexts: { index: number; text: string; cacheKey: string }[] = [];

    await this.initializeRedisCache();

    // Use WebGPU batch operations for cache checking
    try {
      const cacheOperations = texts.map((text, i) => ({
        type: 'get' as const,
        key: `embed:${this.generateCacheKey(text)}`,
        options: { decompress: true }
      }));

      const cachedResults = await optimizedCache.batch(cacheOperations);
      
      // Process batch results
      for (let i = 0; i < texts.length; i++) {
        const cached = cachedResults[i];
        if (cached instanceof Float32Array) {
          results[i] = cached;
          console.log(`🎯 WebGPU cache hit for embedding ${i}`);
          continue;
        }

        // Try standard cache as fallback
        const cacheKey = this.generateCacheKey(texts[i]);
        const redisResult = await this.checkRedisCache(texts[i], 'nomic-embed-text-v1');
        if (redisResult) {
          results[i] = redisResult;
          continue;
        }

        // Try Postgres
        const postgresResult = await this.checkPostgresCache(cacheKey);
        if (postgresResult) {
          results[i] = postgresResult.vector;
          
          // Backfill WebGPU cache
          try {
            await optimizedCache.set(`embed:${cacheKey}`, postgresResult.vector, 3600);
          } catch (error) {
            console.warn('WebGPU cache backfill failed:', error);
          }
          continue;
        }

        // Mark for GPU processing
        missingTexts.push({ index: i, text: texts[i], cacheKey });
      }
    } catch (error) {
      console.warn('WebGPU batch cache check failed, using sequential method:', error);
      
      // Fallback to sequential cache checking
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const cacheKey = this.generateCacheKey(text);

        const redisResult = await this.checkRedisCache(texts[i], 'nomic-embed-text-v1');
        if (redisResult) {
          results[i] = redisResult;
          continue;
        }

        const postgresResult = await this.checkPostgresCache(cacheKey);
        if (postgresResult) {
          results[i] = postgresResult.vector;
          continue;
        }

        missingTexts.push({ index: i, text, cacheKey });
      }
    }

    // Process missing embeddings in parallel batches
    if (missingTexts.length > 0) {
      console.log(`🚀 Processing ${missingTexts.length} embeddings with GPU acceleration`);
      
      const batchTexts = missingTexts.map(m => m.text);
      const newEmbeddings = await this.callPythonGPUWorker(batchTexts);

      // Store new embeddings using WebGPU optimization
      const storeOperations = newEmbeddings.map((embedding, i) => ({
        type: 'set' as const,
        key: `embed:${missingTexts[i].cacheKey}`,
        value: embedding,
        options: { 
          ttl: 3600,
          compress: true,
          parallel: true,
          priority: 'high' as const
        }
      }));

      try {
        // Parallel WebGPU-optimized storage
        await optimizedCache.batch(storeOperations);
        console.log('🎯 Batch embeddings stored with WebGPU optimization');
      } catch (error) {
        console.warn('WebGPU batch storage failed, using sequential storage:', error);
        
        // Fallback to sequential storage
        for (let i = 0; i < missingTexts.length; i++) {
          const { index, text, cacheKey } = missingTexts[i];
          const embedding = newEmbeddings[i];
          
          this.storeEmbedding(text, embedding, cacheKey).catch(error => {
            console.warn('Failed to cache embedding:', error);
          });
        }
      }

      // Populate results array
      for (let i = 0; i < missingTexts.length; i++) {
        const { index } = missingTexts[i];
        results[index] = newEmbeddings[i];
      }
    }

    console.log(`📊 Batch embedding complete: ${texts.length} total, ${missingTexts.length} GPU calls`);
    return results;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    redisConnected: boolean;
    postgresConnected: boolean;
    totalEmbeddings: number;
    gpuAcceleration: boolean;
  }> {
    const postgresHealth = await threadSafePostgres.healthCheck();
    
    let totalEmbeddings = 0;
    try {
      const countResult = await threadSafePostgres.queryJsonbDocuments(
        'embeddings',
        { path: 'metadata.model', value: 'nomic-embed-text-v1', operator: '@>' },
        { countOnly: true }
      );
      totalEmbeddings = countResult.length;
    } catch (error) {
      console.warn('Could not get embedding count:', error);
    }

    return {
      redisConnected: true, // Using centralized cache service
      postgresConnected: postgresHealth.connected,
      totalEmbeddings,
      gpuAcceleration: this.config.useGPUAcceleration
    };
  }

  /**
   * Clear embeddings cache
   */
  async clearCache(): Promise<void> {
    // Clear Redis using centralized cache
    try {
      // Use centralized cache clear method
      console.log('🗑️ Clearing embedding cache via centralized service');
      // Note: Would need to implement cache.clearPattern('embed:*') in centralized service
    } catch (error) {
      console.warn('Redis cache clear failed:', error);
    }

    // Clear Postgres (optional - usually you want to keep these)
    try {
      await threadSafePostgres.deleteJsonbDocuments(
        'embeddings',
        { path: 'metadata.model', value: 'nomic-embed-text-v1', operator: '@>' }
      );
      console.log('🗑️ Cleared Postgres embeddings');
    } catch (error) {
      console.warn('Postgres cache clear failed:', error);
    }
  }
}

// Singleton instance
export const embeddingCache = new EmbeddingCacheMiddleware({
  useGPUAcceleration: true,
  batchSize: 128, // RTX 3060 Ti optimized
  cacheTTL: 86400 // 24 hours
});

// Legal AI specific utilities
export interface LegalEmbeddingQuery {
  text: string;
  documentType?: 'contract' | 'case' | 'statute' | 'brief';
  jurisdiction?: string;
  practiceArea?: string;
}

/**
 * Legal document embedding with metadata context
 */
export async function getLegalEmbedding(query: LegalEmbeddingQuery): Promise<{
  embedding: Float32Array;
  metadata: {
    cacheHit: boolean;
    processingTime: number;
    documentContext: any;
  };
}> {
  const startTime = Date.now();
  
  // Add legal context to embedding text for better legal AI performance
  const contextualText = query.practiceArea 
    ? `[${query.practiceArea}] ${query.text}`
    : query.text;
  
  const embedding = await embeddingCache.getEmbedding(contextualText);
  
  return {
    embedding,
    metadata: {
      cacheHit: false, // TODO: Track cache hits
      processingTime: Date.now() - startTime,
      documentContext: {
        documentType: query.documentType,
        jurisdiction: query.jurisdiction,
        practiceArea: query.practiceArea
      }
    }
  };
}

/**
 * Batch legal document embeddings
 */
export async function getBatchLegalEmbeddings(
  queries: LegalEmbeddingQuery[]
): Promise<Float32Array[]> {
  const contextualTexts = queries.map(q => 
    q.practiceArea ? `[${q.practiceArea}] ${q.text}` : q.text
  );
  
  return await embeddingCache.getBatchEmbeddings(contextualTexts);
}