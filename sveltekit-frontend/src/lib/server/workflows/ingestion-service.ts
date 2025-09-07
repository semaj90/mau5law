/**
 * Ingestion Workflow Service
 * Integrates XState machine + LokiJS tracker + RabbitMQ messaging
 */

import { ingestionWorkflowActor, createIngestionJob, type IngestionJob } from '$lib/machines/ingestion-workflow-machine.js';
import { jobTracker } from '$lib/services/job-tracker.js';
import { publishToQueue, setupQueues } from '$lib/server/rabbitmq.js';
import { cache } from '$lib/server/cache/redis.js';

export interface IngestionServiceConfig {
  enableRabbitMQ: boolean;
  enableRedisQueues: boolean;
  maxConcurrency: number;
  retryAttempts: number;
  jobTimeout: number;
}

export class IngestionService {
  private config: IngestionServiceConfig;
  private isInitialized = false;
  private workflowActor = ingestionWorkflowActor;

  constructor(config: Partial<IngestionServiceConfig> = {}) {
    this.config = {
      enableRabbitMQ: true,
      enableRedisQueues: true,
      maxConcurrency: 3,
      retryAttempts: 3,
      jobTimeout: 300000, // 5 minutes
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🚀 Initializing Ingestion Service...');

    // Start XState workflow actor
    if (!this.workflowActor.getSnapshot().status) {
      this.workflowActor.start();
      console.log('✅ XState workflow actor started');
    }

    // Setup RabbitMQ queues if enabled
    if (this.config.enableRabbitMQ) {
      try {
        await setupQueues();
        console.log('✅ RabbitMQ queues setup complete');
      } catch (error) {
        console.warn('⚠️ RabbitMQ setup failed, falling back to Redis only:', error);
        this.config.enableRabbitMQ = false;
      }
    }

    // Subscribe to workflow events for RabbitMQ integration
    this.workflowActor.subscribe((state) => {
      this.handleWorkflowStateChange(state);
    });

    this.isInitialized = true;
    console.log('✅ Ingestion Service initialized');
  }

  async submitDocument(
    documentId: string,
    chunks: string[],
    metadata?: Record<string, any>
  ): Promise<{
    success: boolean;
    jobId?: string;
    error?: string;
    queuePosition?: number;
    estimatedTime?: number;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Create ingestion job
      const job = createIngestionJob(documentId, chunks, metadata);

      // Track in LokiJS
      const trackedJob = jobTracker.addJob(job);
      
      // Cache for quick access
      await cache.set(`job:${job.id}`, job, 3600); // 1 hour TTL

      // Queue job in XState workflow
      this.workflowActor.send({ type: 'QUEUE_JOB', job });

      // Publish to RabbitMQ for worker processing
      if (this.config.enableRabbitMQ) {
        await this.publishJobToQueue(job);
      } else if (this.config.enableRedisQueues) {
        await this.publishJobToRedis(job);
      }

      // Record metrics
      jobTracker.recordMetric('job_submitted', {
        jobId: job.id,
        documentId,
        chunksCount: chunks.length,
        priority: job.metadata.priority,
        userId: job.metadata.userId,
        messageQueue: this.config.enableRabbitMQ ? 'rabbitmq' : 'redis'
      });

      const workflowState = this.workflowActor.getSnapshot();

      return {
        success: true,
        jobId: job.id,
        queuePosition: workflowState.context.jobQueue.length,
        estimatedTime: chunks.length * 2 // Rough estimate: 2 seconds per chunk
      };

    } catch (error) {
      console.error('❌ Failed to submit document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async publishJobToQueue(job: IngestionJob): Promise<void> {
    try {
      // Split job into chunk processing tasks for worker pool
      for (const [index, chunk] of job.chunks.entries()) {
        const chunkJob = {
          jobId: job.id,
          documentId: job.documentId,
          chunkIndex: index,
          chunkText: chunk,
          metadata: {
            ...job.metadata,
            totalChunks: job.chunks.length,
            priority: job.metadata.priority,
            timestamp: new Date().toISOString()
          }
        };

        // Route to appropriate queue based on job type
        const queueName = this.getQueueNameForJob(job);
        await publishToQueue(queueName, chunkJob);
      }

      console.log(`📤 Published job ${job.id} (${job.chunks.length} chunks) to RabbitMQ`);
    } catch (error) {
      console.error(`❌ Failed to publish job ${job.id} to RabbitMQ:`, error);
      
      // Fallback to Redis if RabbitMQ fails
      if (this.config.enableRedisQueues) {
        await this.publishJobToRedis(job);
      } else {
        throw error;
      }
    }
  }

  private async publishJobToRedis(job: IngestionJob): Promise<void> {
    try {
      for (const [index, chunk] of job.chunks.entries()) {
        const chunkJob = {
          jobId: job.id,
          documentId: job.documentId,
          chunkIndex: index,
          text: chunk, // Note: Redis worker expects 'text' field
          metadata: {
            ...job.metadata,
            totalChunks: job.chunks.length,
            priority: job.metadata.priority,
            timestamp: new Date().toISOString()
          }
        };

        await cache.rpush('embedding:jobs', JSON.stringify(chunkJob));
      }

      console.log(`📤 Published job ${job.id} (${job.chunks.length} chunks) to Redis`);
    } catch (error) {
      console.error(`❌ Failed to publish job ${job.id} to Redis:`, error);
      throw error;
    }
  }

  private getQueueNameForJob(job: IngestionJob): string {
    // Route based on job priority and type
    if (job.metadata.priority === 'high') {
      return 'evidence.embedding.priority';
    }
    
    // Default embedding queue
    return 'evidence.embedding.queue';
  }

  private handleWorkflowStateChange(state: any): void {
    const context = state.context;
    const currentJob = context.currentJob;

    // Update job tracking based on workflow state
    if (currentJob) {
      jobTracker.updateJob(currentJob.id, {
        state: this.mapWorkflowStateToJobState(state.value),
        progress: this.calculateJobProgress(currentJob, context),
        metadata: {
          ...currentJob.metadata,
          workflowState: state.value,
          lastUpdated: new Date().toISOString()
        }
      });
    }

    // Handle workflow events for monitoring
    this.emitWorkflowEvent(state.value, context);
  }

  private mapWorkflowStateToJobState(workflowState: any): IngestionJob['state'] {
    // Map XState workflow states to job tracker states
    const stateMap: Record<string, IngestionJob['state']> = {
      'idle': 'queued',
      'processing': 'processing',
      'processing.chunking': 'processing',
      'processing.embedding': 'processing',
      'processing.storing': 'processing',
      'completed': 'completed',
      'failed': 'failed',
      'paused': 'queued'
    };

    return stateMap[workflowState] || 'queued';
  }

  private calculateJobProgress(job: IngestionJob, context: any): number {
    const stats = context.stats || {};
    const processed = stats.processedJobs || 0;
    const total = context.jobQueue.length + processed;
    
    if (total === 0) return 100;
    
    return Math.round((processed / total) * 100);
  }

  private emitWorkflowEvent(state: string, context: any): void {
    // Record workflow state changes as metrics
    jobTracker.recordMetric('workflow_state_change', {
      state,
      queueLength: context.jobQueue?.length || 0,
      currentJobId: context.currentJob?.id,
      concurrency: context.concurrency,
      stats: context.stats,
      timestamp: new Date().toISOString()
    });
  }

  // Job Management API
  async getJobStatus(jobId: string): Promise<{
    success: boolean;
    job?: any;
    workflow?: any;
    error?: string;
  }> {
    try {
      // Try cache first, then LokiJS
      let job = await cache.get(`job:${jobId}`);
      if (!job) {
        job = jobTracker.getJob(jobId);
      }

      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      // Get current workflow state
      const workflowState = this.workflowActor.getSnapshot();
      const isCurrentJob = workflowState.context.currentJob?.id === jobId;

      return {
        success: true,
        job,
        workflow: {
          isCurrentJob,
          currentState: workflowState.value,
          queuePosition: workflowState.context.jobQueue.findIndex((j: any) => j.id === jobId) + 1
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async retryJob(jobId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Send retry command to workflow
      this.workflowActor.send({ type: 'RETRY_FAILED_JOB', jobId });

      // Update job tracker
      const currentJob = jobTracker.getJob(jobId);
      if (currentJob) {
        jobTracker.updateJob(jobId, { 
          state: 'queued', 
          error: undefined,
          retryCount: (currentJob.retryCount || 0) + 1,
          metadata: {
            ...currentJob.metadata,
            retriedAt: new Date().toISOString()
          }
        });

        // Re-publish to queue
        if (this.config.enableRabbitMQ) {
          await this.publishJobToQueue(currentJob);
        } else if (this.config.enableRedisQueues) {
          await this.publishJobToRedis(currentJob);
        }
      }

      return {
        success: true,
        message: `Job ${jobId} queued for retry`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async cancelJob(jobId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Cancel in workflow
      this.workflowActor.send({ type: 'CANCEL_JOB', jobId });

      // Update tracking
      jobTracker.updateJob(jobId, { 
        state: 'failed', 
        error: 'Cancelled by user',
        completedAt: new Date().toISOString()
      });

      return {
        success: true,
        message: `Job ${jobId} cancelled`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Workflow Control API
  async pauseProcessing(): Promise<{ success: boolean; message: string }> {
    this.workflowActor.send({ type: 'PAUSE_PROCESSING' });
    return { success: true, message: 'Processing paused' };
  }

  async resumeProcessing(): Promise<{ success: boolean; message: string }> {
    this.workflowActor.send({ type: 'RESUME_PROCESSING' });
    return { success: true, message: 'Processing resumed' };
  }

  async setConcurrency(concurrency: number): Promise<{ success: boolean; message?: string; error?: string }> {
    if (concurrency < 1 || concurrency > 10) {
      return {
        success: false,
        error: 'Concurrency must be between 1 and 10'
      };
    }

    this.workflowActor.send({ type: 'SET_CONCURRENCY', concurrency });
    return {
      success: true,
      message: `Concurrency set to ${concurrency}`
    };
  }

  // Monitoring API
  getDashboardData() {
    const dashboardData = jobTracker.getDashboardData();
    const workflowState = this.workflowActor.getSnapshot();

    return {
      ...dashboardData,
      workflow: {
        state: workflowState.value,
        context: {
          currentJob: workflowState.context.currentJob,
          queueLength: workflowState.context.jobQueue.length,
          stats: workflowState.context.stats,
          concurrency: workflowState.context.concurrency
        }
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
        config: {
          enableRabbitMQ: this.config.enableRabbitMQ,
          enableRedisQueues: this.config.enableRedisQueues,
          maxConcurrency: this.config.maxConcurrency
        }
      }
    };
  }

  // Cleanup and maintenance
  async clearCompletedJobs(): Promise<{ success: boolean; message: string }> {
    this.workflowActor.send({ type: 'CLEAR_COMPLETED' });
    const cleared = jobTracker.clearCompletedJobs();

    return {
      success: true,
      message: `Cleared ${cleared} completed jobs`
    };
  }

  async resetStats(): Promise<{ success: boolean; message: string }> {
    this.workflowActor.send({ type: 'RESET_STATS' });
    jobTracker.reset();

    return {
      success: true,
      message: 'Statistics reset'
    };
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Ingestion Service...');
    
    if (this.workflowActor) {
      this.workflowActor.stop();
    }
    
    await jobTracker.save();
    console.log('✅ Ingestion Service shutdown complete');
  }
}

// Singleton instance
export const ingestionService = new IngestionService();

export default ingestionService;