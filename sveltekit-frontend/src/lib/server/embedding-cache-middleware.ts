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

// Redis client for hot cache
let redisClient: any = null;

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
      redisUrl: config.redisUrl || 'redis://localhost:4005',
      pythonWorkerUrl: config.pythonWorkerUrl || 'http://localhost:8000',
      cacheTTL: config.cacheTTL || 86400, // 24 hours
      batchSize: config.batchSize || 128, // RTX 3060 Ti optimized
      useGPUAcceleration: config.useGPUAcceleration ?? true
    };
  }

  /**
   * Initialize Redis connection for hot cache
   */
  async initializeRedisCache(): Promise<void> {
    if (!redisClient) {
      // Import Redis dynamically to avoid SSR issues
      const { createClient } = await import('redis');
      redisClient = createClient({ url: this.config.redisUrl });
      
      redisClient.on('error', (err: Error) => {
        console.warn('Redis cache error, falling back to Postgres:', err.message);
      });

      try {
        await redisClient.connect();
        console.log('🔥 Redis embedding cache connected');
      } catch (error) {
        console.warn('Redis connection failed, using Postgres only:', error);
        redisClient = null;
      }
    }
  }

  /**
   * Generate SHA256 cache key for text
   */
  private generateCacheKey(text: string): string {
    return crypto.createHash('sha256').update(text.trim()).digest('hex');
  }

  /**
   * Check Redis hot cache for embedding
   */
  private async checkRedisCache(cacheKey: string): Promise<Float32Array | null> {
    if (!redisClient) return null;

    try {
      const cached = await redisClient.get(`embed:${cacheKey}`);
      if (cached) {
        const buffer = Buffer.from(cached, 'binary');
        return new Float32Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
      }
    } catch (error) {
      console.warn('Redis cache read failed:', error);
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
   * Store embedding in both Redis and Postgres
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

    // Store in Redis hot cache
    if (redisClient) {
      try {
        const buffer = Buffer.from(vector.buffer);
        await redisClient.setEx(`embed:${cacheKey}`, this.config.cacheTTL, buffer);
      } catch (error) {
        console.warn('Redis cache write failed:', error);
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

    // 1. Check Redis hot cache first
    const redisResult = await this.checkRedisCache(cacheKey);
    if (redisResult) {
      console.log('📦 Redis cache hit for embedding');
      return redisResult;
    }

    // 2. Check Postgres persistent storage
    const postgresResult = await this.checkPostgresCache(cacheKey);
    if (postgresResult) {
      console.log('🗄️ Postgres cache hit for embedding');
      
      // Backfill Redis cache
      if (redisClient) {
        try {
          const buffer = Buffer.from(postgresResult.vector.buffer);
          await redisClient.setEx(`embed:${cacheKey}`, this.config.cacheTTL, buffer);
        } catch (error) {
          console.warn('Redis backfill failed:', error);
        }
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
   * Batch embedding processing with intelligent caching
   */
  async getBatchEmbeddings(texts: string[]): Promise<Float32Array[]> {
    if (texts.length === 0) return [];

    const results: Float32Array[] = new Array(texts.length);
    const missingTexts: { index: number; text: string; cacheKey: string }[] = [];

    await this.initializeRedisCache();

    // Check cache for all texts
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const cacheKey = this.generateCacheKey(text);

      // Try Redis first
      const redisResult = await this.checkRedisCache(cacheKey);
      if (redisResult) {
        results[i] = redisResult;
        continue;
      }

      // Try Postgres
      const postgresResult = await this.checkPostgresCache(cacheKey);
      if (postgresResult) {
        results[i] = postgresResult.vector;
        
        // Backfill Redis
        if (redisClient) {
          try {
            const buffer = Buffer.from(postgresResult.vector.buffer);
            await redisClient.setEx(`embed:${cacheKey}`, this.config.cacheTTL, buffer);
          } catch (error) {
            console.warn('Redis backfill failed:', error);
          }
        }
        continue;
      }

      // Mark for GPU processing
      missingTexts.push({ index: i, text, cacheKey });
    }

    // Process missing embeddings in batches
    if (missingTexts.length > 0) {
      console.log(`🚀 Processing ${missingTexts.length} embeddings on GPU`);
      
      const batchTexts = missingTexts.map(m => m.text);
      const newEmbeddings = await this.callPythonGPUWorker(batchTexts);

      // Store new embeddings and populate results
      for (let i = 0; i < missingTexts.length; i++) {
        const { index, text, cacheKey } = missingTexts[i];
        const embedding = newEmbeddings[i];
        
        results[index] = embedding;
        
        // Store in cache (fire and forget)
        this.storeEmbedding(text, embedding, cacheKey).catch(error => {
          console.warn('Failed to cache embedding:', error);
        });
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
      redisConnected: redisClient?.isReady || false,
      postgresConnected: postgresHealth.connected,
      totalEmbeddings,
      gpuAcceleration: this.config.useGPUAcceleration
    };
  }

  /**
   * Clear embeddings cache
   */
  async clearCache(): Promise<void> {
    // Clear Redis
    if (redisClient) {
      try {
        const keys = await redisClient.keys('embed:*');
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
        console.log(`🗑️ Cleared ${keys.length} Redis embeddings`);
      } catch (error) {
        console.warn('Redis cache clear failed:', error);
      }
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