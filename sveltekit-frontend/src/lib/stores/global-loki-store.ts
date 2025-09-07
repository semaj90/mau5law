/**
 * Global LokiStore with Redis Integration
 *
 * Provides cross-worker job state management using LokiJS with Redis pub/sub
 * for real-time updates and synchronization
 */

import Loki from 'lokijs';
import type { Redis } from 'ioredis';

export interface JobState {
  id: string;
  type: string;
  state: 'queued' | 'processing' | 'completed' | 'failed' | 'skipped';
  progress?: number;
  result?: any;
  error?: string;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export class GlobalLokiStore {
  private db: Loki;
  private coll: Collection<JobState>;
  private redis?: Redis;
  private subscriber?: Redis;
  private redisKeyPrefix = 'loki:jobs:';
  private pubsubChannel = 'loki:jobs:updates';
  private initialized = false;

  constructor() {
    this.db = new Loki('global-jobs.loki');
    this.coll = this.db.addCollection<JobState>('jobs', {
      unique: ['id'],
      indices: ['state', 'type', 'createdAt']
    });
  }

  /**
   * Initialize with Redis client for cross-worker synchronization
   */
  async initRedis(redisClient?: Redis): Promise<void> {
    if (this.initialized) return;

    this.redis = redisClient || undefined;

    if (this.redis) {
      try {
        // Create subscriber connection (Redis clients can't pub/sub on same connection)
        this.subscriber = this.redis.duplicate();
        await this.subscriber.connect();

        // Subscribe to job updates from other workers
        await this.subscriber.subscribe(this.pubsubChannel);

        this.subscriber.on('message', (channel: string, message: string) => {
          if (channel === this.pubsubChannel) {
            try {
              const update = JSON.parse(message) as JobState;
              this.applyRemoteUpdate(update);
            } catch (e) {
              console.warn('Failed to parse Redis job update:', e);
            }
          }
        });

        console.log('✅ GlobalLokiStore wired to Redis with pub/sub');
      } catch (error) {
        console.warn('⚠️ Redis pub/sub setup failed, running in local mode:', error);
        this.redis = undefined;
      }
    } else {
      console.log('⚠️ GlobalLokiStore running without Redis (fallback mode)');
    }

    this.initialized = true;
  }

  /**
   * Apply remote update from Redis pub/sub
   */
  private applyRemoteUpdate(update: JobState): void {
    try {
      const existing = this.coll.by('id', update.id);

      if (existing) {
        // Update existing job (avoid infinite pub/sub loops by checking timestamp)
        if (update.updatedAt > existing.updatedAt) {
          Object.assign(existing, update);
          this.coll.update(existing);
        }
      } else {
        // Insert new job
        this.coll.insert({ ...update });
      }
    } catch (e) {
      console.warn('Failed to apply remote job update:', e);
    }
  }

  /**
   * Start a new job
   */
  async startJob(jobMeta: Partial<JobState>): Promise<void> {
    const now = Date.now();
    const job: JobState = {
      id: jobMeta.id || `job_${now}_${Math.random().toString(36).slice(2)}`,
      type: jobMeta.type || 'unknown',
      state: 'queued',
      progress: 0,
      metadata: jobMeta.metadata || {},
      createdAt: now,
      updatedAt: now,
      ...jobMeta
    };

    // Update local collection
    try {
      const existing = this.coll.by('id', job.id);
      if (existing) {
        Object.assign(existing, job);
        this.coll.update(existing);
      } else {
        this.coll.insert({ ...job });
      }
    } catch (e) {
      console.warn('Failed to insert job locally:', e);
    }

    // Broadcast to other workers
    await this.broadcastUpdate(job);
  }

  /**
   * Update job state
   */
  async updateJob(jobId: string, patch: Partial<JobState>): Promise<void> {
    const existing = this.coll.by('id', jobId);
    if (!existing) {
      console.warn(`Job ${jobId} not found for update`);
      return;
    }

    const updated: JobState = {
      ...existing,
      ...patch,
      updatedAt: Date.now()
    };

    // Update local collection
    try {
      Object.assign(existing, updated);
      this.coll.update(existing);
    } catch (e) {
      console.warn('Failed to update job locally:', e);
    }

    // Broadcast to other workers
    await this.broadcastUpdate(updated);
  }

  /**
   * Mark job as processing
   */
  async startProcessing(jobId: string): Promise<void> {
    return this.updateJob(jobId, {
      state: 'processing',
      progress: 0
    });
  }

  /**
   * Update job progress
   */
  async updateProgress(jobId: string, progress: number): Promise<void> {
    return this.updateJob(jobId, { progress });
  }

  /**
   * Complete job successfully
   */
  async completeJob(jobId: string, result?: any): Promise<void> {
    return this.updateJob(jobId, {
      state: 'completed',
      progress: 100,
      result
    });
  }

  /**
   * Mark job as failed
   */
  async failJob(jobId: string, error: string): Promise<void> {
    return this.updateJob(jobId, {
      state: 'failed',
      error
    });
  }

  /**
   * Mark job as skipped (dedupe)
   */
  async skipJob(jobId: string, reason: string): Promise<void> {
    return this.updateJob(jobId, {
      state: 'skipped',
      error: reason
    });
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): JobState | null {
    return this.coll.by('id', jobId) || null;
  }

  /**
   * Get jobs by state
   */
  getJobsByState(state: JobState['state']): JobState[] {
    return this.coll.find({ state });
  }

  /**
   * Get jobs by type
   */
  getJobsByType(type: string): JobState[] {
    return this.coll.find({ type });
  }

  /**
   * Get all jobs
   */
  getAllJobs(): JobState[] {
    return this.coll.find();
  }

  /**
   * Get job statistics
   */
  getStats(): {
    total: number;
    byState: Record<string, number>;
    byType: Record<string, number>;
  } {
    const jobs = this.getAllJobs();
    const byState: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const job of jobs) {
      byState[job.state] = (byState[job.state] || 0) + 1;
      byType[job.type] = (byType[job.type] || 0) + 1;
    }

    return {
      total: jobs.length,
      byState,
      byType
    };
  }

  /**
   * Clear old completed jobs
   */
  async cleanup(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = Date.now() - olderThanMs;
    const oldJobs = this.coll.find({
      $and: [
        { state: { $in: ['completed', 'failed'] } },
        { updatedAt: { $lt: cutoff } }
      ]
    });

    for (const job of oldJobs) {
      this.coll.remove(job);
    }

    console.log(`🧹 Cleaned up ${oldJobs.length} old jobs`);
    return oldJobs.length;
  }

  /**
   * Broadcast update to Redis pub/sub
   */
  private async broadcastUpdate(job: JobState): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.publish(this.pubsubChannel, JSON.stringify(job));
    } catch (e) {
      console.warn('Failed to broadcast job update to Redis:', e);
    }
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    if (this.subscriber) {
      try {
        await this.subscriber.disconnect();
      } catch (e) {
        console.warn('Error disconnecting Redis subscriber:', e);
      }
    }

    console.log('GlobalLokiStore shutdown completed');
  }
}

// Export singleton instance
export const globalLoki = new GlobalLokiStore();