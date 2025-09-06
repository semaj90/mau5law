/**
 * Concurrent Operation Queue Manager for Legal AI Platform
 * Handles background processing with proper concurrency control
 * Integrates with Superforms + Zod validation and SvelteKit 2
 */

import { transactionManager } from './transaction-manager';
import { advisoryLocks, type LockType, type LockMode } from './advisory-locks';
import { randomUUID } from 'crypto';
import { z } from 'zod';

// Zod schemas for type safety with Superforms
export const QueueJobSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'evidence_analysis',
    'document_processing', 
    'case_synthesis',
    'chain_of_custody_update',
    'vector_index_rebuild',
    'ai_training',
    'report_generation'
  ]),
  entityType: z.enum(['case', 'evidence', 'document', 'user', 'workflow', 'analysis', 'vector_index', 'chain_of_custody']),
  entityId: z.string(),
  priority: z.number().min(1).max(10).default(5),
  payload: z.record(z.any()),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  timeout: z.number().default(30000),
  retryCount: z.number().default(0),
  maxRetries: z.number().default(3),
  createdAt: z.date().default(() => new Date()),
  scheduledFor: z.date().optional(),
  dependencies: z.array(z.string().uuid()).default([]),
  metadata: z.record(z.any()).default({})
});

export type QueueJob = z.infer<typeof QueueJobSchema>;

export const QueueStatsSchema = z.object({
  pending: z.number(),
  processing: z.number(), 
  completed: z.number(),
  failed: z.number(),
  totalThroughput: z.number(),
  avgProcessingTime: z.number(),
  lastUpdated: z.date()
});

export type QueueStats = z.infer<typeof QueueStatsSchema>;

interface JobProcessor {
  (job: QueueJob): Promise<any>;
}

export class QueueManager {
  private processors = new Map<QueueJob['type'], JobProcessor>();
  private pendingJobs = new Map<string, QueueJob>();
  private processingJobs = new Map<string, QueueJob>();
  private completedJobs = new Map<string, { job: QueueJob; result: any; completedAt: Date }>();
  private failedJobs = new Map<string, { job: QueueJob; error: Error; failedAt: Date }>();
  private isRunning = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private maxConcurrentJobs = 5;

  constructor() {
    // Register default processors
    this.registerProcessor('evidence_analysis', this.processEvidenceAnalysis.bind(this));
    this.registerProcessor('document_processing', this.processDocumentProcessing.bind(this));
    this.registerProcessor('case_synthesis', this.processCaseSynthesis.bind(this));
    this.registerProcessor('chain_of_custody_update', this.processChainOfCustodyUpdate.bind(this));
    this.registerProcessor('vector_index_rebuild', this.processVectorIndexRebuild.bind(this));
  }

  /**
   * Register a job processor
   */
  registerProcessor(type: QueueJob['type'], processor: JobProcessor): void {
    this.processors.set(type, processor);
    console.log(`📝 Registered processor for ${type}`);
  }

  /**
   * Add a job to the queue with Zod validation
   */
  async enqueue(jobData: Partial<QueueJob>): Promise<string> {
    try {
      // Validate with Zod schema
      const job = QueueJobSchema.parse({
        id: randomUUID(),
        ...jobData
      });

      // Check dependencies
      if (job.dependencies.length > 0) {
        const unmetDependencies = job.dependencies.filter(depId => 
          !this.completedJobs.has(depId) && !this.processingJobs.has(depId)
        );

        if (unmetDependencies.length > 0) {
          console.log(`⏳ Job ${job.id} waiting for dependencies: ${unmetDependencies.join(', ')}`);
        }
      }

      this.pendingJobs.set(job.id, job);
      console.log(`➕ Enqueued ${job.type} job ${job.id} (priority: ${job.priority})`);

      return job.id;

    } catch (error) {
      console.error('❌ Invalid job data:', error);
      throw new Error(`Invalid job data: ${error}`);
    }
  }

  /**
   * Start the queue processor
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log(`🚀 Starting queue manager with max ${this.maxConcurrentJobs} concurrent jobs`);

    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 1000);
  }

  /**
   * Stop the queue processor
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    console.log('⏹️ Queue manager stopped');
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingJobs.size >= this.maxConcurrentJobs) {
      return;
    }

    // Get jobs ready for processing (sorted by priority)
    const readyJobs = Array.from(this.pendingJobs.values())
      .filter(job => this.areJobDependenciesMet(job))
      .filter(job => !job.scheduledFor || job.scheduledFor <= new Date())
      .sort((a, b) => b.priority - a.priority);

    const availableSlots = this.maxConcurrentJobs - this.processingJobs.size;
    const jobsToProcess = readyJobs.slice(0, availableSlots);

    for (const job of jobsToProcess) {
      this.pendingJobs.delete(job.id);
      this.processingJobs.set(job.id, job);
      
      // Process job without blocking
      this.processJob(job).catch(error => {
        console.error(`❌ Unhandled error processing job ${job.id}:`, error);
      });
    }
  }

  /**
   * Check if job dependencies are met
   */
  private areJobDependenciesMet(job: QueueJob): boolean {
    return job.dependencies.every(depId => this.completedJobs.has(depId));
  }

  /**
   * Process a single job
   */
  private async processJob(job: QueueJob): Promise<void> {
    const startTime = Date.now();
    console.log(`⚙️ Processing ${job.type} job ${job.id}`);

    try {
      const processor = this.processors.get(job.type);
      if (!processor) {
        throw new Error(`No processor registered for job type: ${job.type}`);
      }

      // Execute with appropriate concurrency control
      const result = await transactionManager.withTransactionAndLock(
        job.entityType as LockType,
        job.entityId,
        async () => {
          return await processor(job);
        },
        'exclusive',
        {
          timeout: job.timeout,
          userId: job.userId,
          sessionId: job.sessionId,
          metadata: { jobId: job.id, jobType: job.type }
        }
      );

      // Mark as completed
      this.processingJobs.delete(job.id);
      this.completedJobs.set(job.id, {
        job,
        result,
        completedAt: new Date()
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Completed ${job.type} job ${job.id} in ${duration}ms`);

    } catch (error: any) {
      console.error(`❌ Failed ${job.type} job ${job.id}:`, error);
      
      this.processingJobs.delete(job.id);

      // Retry logic
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        job.scheduledFor = new Date(Date.now() + (job.retryCount * 5000)); // Exponential backoff
        this.pendingJobs.set(job.id, job);
        
        console.log(`🔄 Retrying ${job.type} job ${job.id} (attempt ${job.retryCount + 1}/${job.maxRetries + 1})`);
      } else {
        this.failedJobs.set(job.id, {
          job,
          error: error instanceof Error ? error : new Error(String(error)),
          failedAt: new Date()
        });
        
        console.log(`💥 Permanently failed ${job.type} job ${job.id} after ${job.maxRetries} retries`);
      }
    }
  }

  /**
   * Evidence Analysis Processor (with AI integration)
   */
  private async processEvidenceAnalysis(job: QueueJob): Promise<any> {
    const { evidenceId, analysisType = 'comprehensive' } = job.payload;
    
    console.log(`🔍 Analyzing evidence ${evidenceId} (type: ${analysisType})`);
    
    // Simulate AI analysis (replace with actual Ollama/LLM calls)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      evidenceId,
      analysisType,
      findings: ['Pattern identified', 'Metadata extracted', 'Classification complete'],
      confidence: 0.87,
      processedAt: new Date()
    };
  }

  /**
   * Document Processing Processor (with OCR and text extraction)
   */
  private async processDocumentProcessing(job: QueueJob): Promise<any> {
    const { documentId, operations = ['ocr', 'extract', 'classify'] } = job.payload;
    
    console.log(`📄 Processing document ${documentId} (operations: ${operations.join(', ')})`);
    
    // Simulate document processing pipeline
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return {
      documentId,
      operations,
      extractedText: 'Sample extracted text...',
      classification: 'legal_contract',
      processedAt: new Date()
    };
  }

  /**
   * Case Synthesis Processor (with LLM integration)
   */
  private async processCaseSynthesis(job: QueueJob): Promise<any> {
    const { caseId, evidenceIds = [] } = job.payload;
    
    console.log(`⚖️ Synthesizing case ${caseId} with ${evidenceIds.length} evidence items`);
    
    // Simulate case synthesis with LLM
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    return {
      caseId,
      evidenceCount: evidenceIds.length,
      synthesis: 'Generated case synthesis...',
      recommendations: ['Review additional evidence', 'Consider expert testimony'],
      processedAt: new Date()
    };
  }

  /**
   * Chain of Custody Update Processor (critical legal operation)
   */
  private async processChainOfCustodyUpdate(job: QueueJob): Promise<any> {
    const { evidenceId, custodyEvent } = job.payload;
    
    console.log(`🔗 Updating chain of custody for evidence ${evidenceId}`);
    
    // Critical operation - simulate custody update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      evidenceId,
      custodyEvent,
      integrityVerified: true,
      updatedAt: new Date()
    };
  }

  /**
   * Vector Index Rebuild Processor (high-performance operation)
   */
  private async processVectorIndexRebuild(job: QueueJob): Promise<any> {
    const { indexName, vectorCount = 0 } = job.payload;
    
    console.log(`🔍 Rebuilding vector index ${indexName} (${vectorCount} vectors)`);
    
    // Simulate vector index rebuild
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    return {
      indexName,
      vectorCount,
      rebuildTime: Date.now(),
      performance: 'optimized'
    };
  }

  /**
   * Get queue statistics (Zod validated)
   */
  getStats(): QueueStats {
    const stats = {
      pending: this.pendingJobs.size,
      processing: this.processingJobs.size,
      completed: this.completedJobs.size,
      failed: this.failedJobs.size,
      totalThroughput: this.completedJobs.size + this.failedJobs.size,
      avgProcessingTime: this.calculateAverageProcessingTime(),
      lastUpdated: new Date()
    };

    return QueueStatsSchema.parse(stats);
  }

  /**
   * Calculate average processing time
   */
  private calculateAverageProcessingTime(): number {
    const completedJobs = Array.from(this.completedJobs.values());
    if (completedJobs.length === 0) return 0;

    const totalTime = completedJobs.reduce((sum, { job, completedAt }) => {
      return sum + (completedAt.getTime() - job.createdAt.getTime());
    }, 0);

    return totalTime / completedJobs.length;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): 'pending' | 'processing' | 'completed' | 'failed' | 'not_found' {
    if (this.pendingJobs.has(jobId)) return 'pending';
    if (this.processingJobs.has(jobId)) return 'processing';
    if (this.completedJobs.has(jobId)) return 'completed';
    if (this.failedJobs.has(jobId)) return 'failed';
    return 'not_found';
  }

  /**
   * Get job result
   */
  getJobResult(jobId: string): any {
    const completed = this.completedJobs.get(jobId);
    if (completed) return completed.result;

    const failed = this.failedJobs.get(jobId);
    if (failed) return { error: failed.error.message };

    return null;
  }

  /**
   * Health check and cleanup
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    stats: QueueStats;
    issues: string[];
  }> {
    const stats = this.getStats();
    const issues: string[] = [];

    // Check for too many failed jobs
    if (stats.failed > stats.completed * 0.1) {
      issues.push('High failure rate detected');
    }

    // Check for stuck jobs
    const now = Date.now();
    for (const job of this.processingJobs.values()) {
      const processingTime = now - job.createdAt.getTime();
      if (processingTime > job.timeout * 2) {
        issues.push(`Job ${job.id} appears stuck (processing for ${processingTime}ms)`);
      }
    }

    // Cleanup old completed/failed jobs
    const oneHourAgo = new Date(Date.now() - 3600000);
    let cleanedCount = 0;

    for (const [id, { completedAt }] of this.completedJobs.entries()) {
      if (completedAt < oneHourAgo) {
        this.completedJobs.delete(id);
        cleanedCount++;
      }
    }

    for (const [id, { failedAt }] of this.failedJobs.entries()) {
      if (failedAt < oneHourAgo) {
        this.failedJobs.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old job records`);
    }

    const status = issues.length === 0 ? 'healthy' : 
                   issues.length < 3 ? 'degraded' : 'critical';

    return { status, stats, issues };
  }
}

// Export singleton instance
export const queueManager = new QueueManager();
export default queueManager;