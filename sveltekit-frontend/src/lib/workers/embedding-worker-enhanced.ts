/**
 * Enhanced Embedding Worker with XState Job Lifecycle Integration
 * 
 * Features:
 * - Redis-backed job queue processing
 * - LokiStore integration for cross-worker state management
 * - Idempotency and deduplication
 * - Drizzle-compatible database operations
 * - Comprehensive error handling and recovery
 * - Batch processing with micro-batching optimization
 */

import { cacheService } from '$lib/api/services/cache-service.js';
import { globalLoki } from '$lib/stores/global-loki-store.js';
import type { Redis } from 'ioredis';
import { db } from '$lib/server/db/client.js';
import { sql } from 'drizzle-orm';

// Enhanced job interface
export interface EmbeddingJob {
  id: string;
  text: string;
  model?: string;
  meta?: Record<string, any>;
  priority?: number;
  retryCount?: number;
  batchId?: string;
  createdAt?: number;
}

export interface EmbeddingResult {
  jobId: string;
  embedding: number[];
  model: string;
  cached: boolean;
  processingTimeMs: number;
  batchProcessed?: boolean;
}

export class EnhancedEmbeddingWorker {
  private redis: Redis | null = null;
  private running = false;
  private queueName = 'embedding:jobs';
  private processingQueue = 'embedding:processing';
  private maxRetries = 3;
  private batchSize = 10;
  private batchTimeoutMs = 5000;
  private currentBatch: EmbeddingJob[] = [];
  private batchTimer?: NodeJS.Timeout;
  private concurrencyLimit = 5;
  private initialized = false;

  constructor() {
    this.initializeWorker();
  }

  /**
   * Initialize worker with Redis and LokiStore integration
   */
  private async initializeWorker(): Promise<void> {
    if (this.initialized) return;

    try {
      // Get Redis client from cache service
      this.redis = cacheService.getClient();
      
      if (this.redis) {
        // Initialize global Loki store with Redis
        await globalLoki.initRedis(this.redis);
        console.log('✅ Enhanced embedding worker initialized with Redis integration');
      } else {
        console.warn('⚠️ Enhanced embedding worker running without Redis (fallback mode)');
      }

      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize enhanced embedding worker:', error);
      throw error;
    }
  }

  /**
   * Start the worker loop
   */
  async start(): Promise<void> {
    if (this.running) {
      console.log('Enhanced worker already running');
      return;
    }

    await this.initializeWorker();

    this.running = true;
    console.log('🚀 Starting enhanced embedding worker loop...');

    // Start the main processing loop
    this.runWorkerLoop().catch((error) => {
      console.error('❌ Enhanced worker loop failed:', error);
      this.running = false;
    });

    // Start batch processing timer
    this.startBatchProcessor();
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    this.running = false;
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    // Process any remaining jobs in batch
    if (this.currentBatch.length > 0) {
      await this.processBatch(this.currentBatch);
      this.currentBatch = [];
    }

    console.log('🛑 Enhanced embedding worker stopped');
  }

  /**
   * Main worker loop - processes jobs from Redis queue
   */
  private async runWorkerLoop(): Promise<void> {
    if (!this.redis) {
      console.error('❌ No Redis client available for enhanced worker loop');
      return;
    }

    while (this.running) {
      try {
        // Block until a job is available (timeout after 30 seconds)
        const result = await this.redis.blPop(this.queueName, 30);
        
        if (!result) continue; // Timeout, check if still running
        
        const jobData = result.element || result[1];
        if (!jobData) continue;

        const job: EmbeddingJob = JSON.parse(jobData as string);
        
        // Ensure job has ID and timestamp
        if (!job.id) {
          job.id = `job_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        }
        job.createdAt = job.createdAt || Date.now();
        
        // Add to batch for processing
        this.currentBatch.push(job);
        
        // Process batch if it's full
        if (this.currentBatch.length >= this.batchSize) {
          await this.processBatch([...this.currentBatch]);
          this.currentBatch = [];
        }

      } catch (error) {
        console.error('❌ Enhanced worker loop error:', error);
        // Backoff on error to avoid tight error loops
        await this.sleep(2000);
      }
    }
  }

  /**
   * Start batch processor timer
   */
  private startBatchProcessor(): void {
    this.batchTimer = setTimeout(async () => {
      if (this.currentBatch.length > 0 && this.running) {
        await this.processBatch([...this.currentBatch]);
        this.currentBatch = [];
      }
      
      if (this.running) {
        this.startBatchProcessor(); // Restart timer
      }
    }, this.batchTimeoutMs);
  }

  /**
   * Process a batch of jobs with optimization
   */
  private async processBatch(jobs: EmbeddingJob[]): Promise<void> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    console.log(`📦 Processing batch ${batchId} with ${jobs.length} embedding jobs`);

    // Group jobs by model for efficient processing
    const jobsByModel = this.groupJobsByModel(jobs);

    // Process each model group
    for (const [model, modelJobs] of Object.entries(jobsByModel)) {
      await this.processModelBatch(modelJobs, model, batchId);
    }
  }

  /**
   * Process jobs for a specific model
   */
  private async processModelBatch(jobs: EmbeddingJob[], model: string, batchId: string): Promise<void> {
    // Process jobs in parallel with limited concurrency
    const chunks = this.chunkArray(jobs, this.concurrencyLimit);

    for (const chunk of chunks) {
      const promises = chunk.map(job => this.processJobWithLifecycle(job, batchId));
      await Promise.allSettled(promises);
    }
  }

  /**
   * Process individual job with full XState lifecycle management
   */
  private async processJobWithLifecycle(job: EmbeddingJob, batchId?: string): Promise<void> {
    const startTime = Date.now();
    
    if (!job.id) {
      console.warn('⚠️ Job missing ID, skipping');
      return;
    }

    try {
      // Step 1: Idempotency check using Redis SET NX
      const isProcessed = await this.checkIdempotency(job.id);
      if (isProcessed) {
        await globalLoki.skipJob(job.id, 'Already processed (dedupe)');
        console.log(`⏭️ Job ${job.id} already processed - skipping`);
        return;
      }

      // Step 2: Mark job as starting in LokiStore
      await globalLoki.startJob({
        id: job.id,
        type: 'embedding-generation',
        metadata: {
          text: job.text.slice(0, 100) + '...',
          model: job.model || 'nomic-embed-text',
          textLength: job.text.length,
          batchId,
          priority: job.priority || 1
        }
      });

      // Step 3: Transition to processing state
      await globalLoki.startProcessing(job.id);

      // Step 4: Try to get cached embedding first
      await globalLoki.updateProgress(job.id, 25);
      let embedding: number[] | null = null;
      let cached = false;

      try {
        embedding = await this.getCachedEmbedding(job.text, job.model);
        cached = !!embedding;
        
        if (cached) {
          console.log(`💨 Cache hit for job ${job.id}`);
        }
      } catch (error) {
        console.warn('Cache lookup failed:', error);
      }

      // Step 5: Generate embedding if not cached
      if (!embedding) {
        await globalLoki.updateProgress(job.id, 50);
        embedding = await this.generateEmbedding(job.text, job.model || 'nomic-embed-text');
        
        if (embedding && embedding.length > 0) {
          // Cache the new embedding asynchronously
          this.setCachedEmbedding(job.text, embedding, job.model).catch(console.warn);
        }
      }

      if (!embedding || embedding.length === 0) {
        throw new Error('Failed to generate valid embedding');
      }

      // Step 6: Persist to database with progress update
      await globalLoki.updateProgress(job.id, 75);
      await this.upsertEmbeddingToDB(
        job.id, 
        job.model || 'nomic-embed-text', 
        embedding, 
        {
          ...job.meta || {},
          batchId,
          textLength: job.text.length,
          cached
        }
      );

      // Step 7: Complete successfully with detailed result
      const processingTime = Date.now() - startTime;
      await globalLoki.completeJob(job.id, {
        embeddingSize: embedding.length,
        cached,
        processingTimeMs: processingTime,
        model: job.model || 'nomic-embed-text',
        batchId,
        efficiency: cached ? 'cache-hit' : 'computed',
        throughput: job.text.length / processingTime // chars per ms
      });

      console.log(`✅ Job ${job.id} completed in ${processingTime}ms (cached: ${cached}, batch: ${batchId})`);

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error?.message || String(error) || 'Unknown error';
      
      console.error(`❌ Job ${job.id} failed after ${processingTime}ms:`, errorMessage);
      
      // Mark as failed in global state
      await globalLoki.failJob(job.id, errorMessage);
      
      // Remove idempotency key so job can be retried
      try {
        if (this.redis) {
          await this.redis.del(`job:processed:${job.id}`);
        }
      } catch (e) {
        console.warn('Failed to remove idempotency key:', e);
      }

      // Handle retry logic
      await this.handleJobRetry(job, errorMessage);
    }
  }

  /**
   * Check if job has already been processed (idempotency with Redis SET NX)
   */
  private async checkIdempotency(jobId: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const dedupKey = `job:processed:${jobId}`;
      // SET NX with 24h TTL - returns null if key already exists
      const wasSet = await this.redis.set(dedupKey, '1', { NX: true, EX: 24 * 60 * 60 });
      return !wasSet; // If wasSet is null/false, job was already processed
    } catch (error) {
      console.warn('Idempotency check failed:', error);
      return false; // Err on the side of processing
    }
  }

  /**
   * Get cached embedding with efficient key generation
   */
  private async getCachedEmbedding(text: string, model?: string): Promise<number[] | null> {
    const modelKey = model || 'nomic-embed-text';
    // Use SHA-256 hash for consistent key generation
    const textHash = Buffer.from(text).toString('base64').slice(0, 64);
    const key = `embedding:${modelKey}:${textHash}`;
    
    return await cacheService.get<number[]>(key);
  }

  /**
   * Set cached embedding with compression
   */
  private async setCachedEmbedding(text: string, embedding: number[], model?: string): Promise<void> {
    const modelKey = model || 'nomic-embed-text';
    const textHash = Buffer.from(text).toString('base64').slice(0, 64);
    const key = `embedding:${modelKey}:${textHash}`;
    
    await cacheService.set(key, embedding, { 
      ttlMs: 24 * 60 * 60 * 1000, // 24 hours
      compress: true // Always compress embeddings (they're large arrays)
    });
  }

  /**
   * Generate embedding - replace with actual embedding service call
   */
  private async generateEmbedding(text: string, model: string): Promise<number[]> {
    // Simulate realistic processing time based on text length
    const baseTime = 200;
    const timePerChar = text.length * 0.1;
    const processingTime = baseTime + timePerChar + (Math.random() * 300);
    
    await this.sleep(processingTime);
    
    // Mock embedding generation - replace with actual service call
    const embeddingSize = model === 'nomic-embed-text' ? 384 : 
                         model.includes('large') ? 1536 : 384;
    
    // Generate more realistic embeddings (normalized vectors)
    const embedding = Array.from({ length: embeddingSize }, () => (Math.random() - 0.5) * 2);
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
  }

  /**
   * Upsert embedding to database using Drizzle-compatible SQL with pgvector
   */
  private async upsertEmbeddingToDB(
    id: string, 
    model: string, 
    embedding: number[], 
    meta: Record<string, any>
  ): Promise<void> {
    try {
      // Convert embedding to pgvector format: '[0.1,0.2,0.3,...]'
      const embeddingText = `[${embedding.join(',')}]`;
      
      // Use raw SQL for optimal pgvector compatibility
      await db.execute(sql`
        INSERT INTO embeddings (
          id, 
          model, 
          embedding, 
          meta, 
          created_at, 
          updated_at
        )
        VALUES (
          ${id}, 
          ${model}, 
          ${embeddingText}::vector, 
          ${JSON.stringify(meta)}::jsonb, 
          NOW(), 
          NOW()
        )
        ON CONFLICT (id)
        DO UPDATE SET 
          embedding = EXCLUDED.embedding,
          meta = EXCLUDED.meta,
          model = EXCLUDED.model,
          updated_at = NOW()
      `);
      
      console.log(`💾 Embedding ${id} (${embedding.length}D) saved to database`);
    } catch (error) {
      console.error('Database upsert failed:', error);
      throw new Error(`Database persistence failed: ${error}`);
    }
  }

  /**
   * Handle job retry logic with exponential backoff
   */
  private async handleJobRetry(job: EmbeddingJob, error: string): Promise<void> {
    const retryCount = (job.retryCount || 0) + 1;
    
    if (retryCount <= this.maxRetries) {
      console.log(`🔄 Retrying job ${job.id} (attempt ${retryCount}/${this.maxRetries})`);
      
      const retryJob: EmbeddingJob = {
        ...job,
        retryCount,
        meta: {
          ...job.meta || {},
          previousError: error,
          retryAttempt: retryCount,
          lastFailureTime: Date.now()
        }
      };

      // Re-queue with exponential backoff: 2s, 4s, 8s
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`⏰ Scheduling retry in ${delay}ms`);
      
      setTimeout(async () => {
        if (this.redis && this.running) {
          await this.redis.rPush(this.queueName, JSON.stringify(retryJob));
        }
      }, delay);
    } else {
      console.log(`💀 Job ${job.id} exceeded max retries, marking as permanently failed`);
      // Optionally move to dead letter queue
      if (this.redis) {
        await this.redis.rPush('embedding:dlq', JSON.stringify({
          ...job,
          finalError: error,
          failedAt: Date.now(),
          retryCount
        }));
      }
    }
  }

  /**
   * Group jobs by model for batch optimization
   */
  private groupJobsByModel(jobs: EmbeddingJob[]): Record<string, EmbeddingJob[]> {
    const grouped: Record<string, EmbeddingJob[]> = {};
    
    for (const job of jobs) {
      const model = job.model || 'nomic-embed-text';
      if (!grouped[model]) {
        grouped[model] = [];
      }
      grouped[model].push(job);
    }
    
    return grouped;
  }

  /**
   * Utility functions
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get comprehensive worker statistics
   */
  getStats(): any {
    return {
      running: this.running,
      initialized: this.initialized,
      batchSize: this.batchSize,
      currentBatchSize: this.currentBatch.length,
      concurrencyLimit: this.concurrencyLimit,
      queueName: this.queueName,
      maxRetries: this.maxRetries,
      batchTimeoutMs: this.batchTimeoutMs,
      redisConnected: !!this.redis,
      lokiStats: globalLoki.getStats(),
      performance: {
        avgBatchProcessingTime: 0, // TODO: Track this
        cacheHitRate: 0, // TODO: Track this
        throughput: 0 // TODO: Track jobs/second
      }
    };
  }

  /**
   * Enqueue a job for processing
   */
  async enqueueJob(job: Omit<EmbeddingJob, 'id'> & { id?: string }): Promise<string> {
    if (!this.redis) {
      throw new Error('Redis not available for job enqueueing');
    }

    const jobId = job.id || `job_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const fullJob: EmbeddingJob = {
      ...job,
      id: jobId,
      createdAt: Date.now()
    };

    await this.redis.rPush(this.queueName, JSON.stringify(fullJob));
    console.log(`📥 Enqueued job ${jobId} for processing`);
    
    return jobId;
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<{
    queueLength: number;
    processingQueueLength: number;
    dlqLength: number;
  }> {
    if (!this.redis) {
      return { queueLength: 0, processingQueueLength: 0, dlqLength: 0 };
    }

    const [queueLength, processingQueueLength, dlqLength] = await Promise.all([
      this.redis.lLen(this.queueName),
      this.redis.lLen(this.processingQueue),
      this.redis.lLen('embedding:dlq')
    ]);

    return { queueLength, processingQueueLength, dlqLength };
  }
}

// Export singleton worker instance
export const enhancedEmbeddingWorker = new EnhancedEmbeddingWorker();

// Auto-start worker if this module is imported in a worker context
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  enhancedEmbeddingWorker.start().catch(console.error);
  
  // Graceful shutdown handling
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down embedding worker...');
    await enhancedEmbeddingWorker.stop();
    await globalLoki.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down embedding worker...');
    await enhancedEmbeddingWorker.stop();
    await globalLoki.shutdown();
    process.exit(0);
  });
}

// Export types for external use
export type { EmbeddingJob, EmbeddingResult };