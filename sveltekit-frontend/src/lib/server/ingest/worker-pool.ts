/**
 * Simplified Worker Pool for Multimodal Ingestion
 *
 * Multi-core worker pool that processes jobs through worker threads:
 * - MinIO object fetching and processing
 * - OCR for images/PDFs
 * - Audio extraction and embedding
 * - Video frame sampling
 * - JSON parsing with simdjson-wasm
 * - Direct database insertion with pgvector
 */

import { Worker } from "worker_threads";
import { EventEmitter } from "events";
import * as path from "path";
import * as os from "os";

const cpus = os.cpus;

export type Job = {
  id: string;
  minioUrl?: string;
  fileBuffer?: Buffer;
  filename?: string;
  userId: string;
  contentType?: string;
  metadata?: Record<string, any>;
};
}

export interface WorkerJobData {
  id: string;
  type: 'ocr' | 'audio' | 'video' | 'document' | 'embedding' | 'json';
  payload: any;
  options?: JobOptions;
}

export interface WorkerJobResult {
  success: boolean;
  data?: any;
  error?: string;
  processingTime: number;
  metadata?: Record<string, any>;
}

export interface JobOptions {
  priority?: number;
  timeout?: number;
  retryAttempts?: number;
  metadata?: Record<string, any>;
}

export interface WorkerPoolOptions {
  maxWorkers?: number;
  minWorkers?: number;
  idleTimeout?: number;
  jobTimeout?: number;
  retryAttempts?: number;
}

export class SimpleWorkerPool {
  pool: Worker[] = [];
  queue: Job[] = [];
  free: boolean[] = [];
  private jobCallbacks = new Map<string, { resolve: Function; reject: Function }>();

  constructor(num = Math.max(1, Math.floor(os.cpus().length / 2))) {
    for (let i = 0; i < num; i++) {
      const workerPath = new URL('./ingest-worker.js', import.meta.url).pathname;
      const w = new Worker(workerPath);

      this.pool.push(w);
      this.free.push(true);

      w.on("message", (message) => {
        // Worker finished job -> mark free and resolve/reject promise
        const idx = this.pool.indexOf(w);
        this.free[idx] = true;

        if (message.jobId && this.jobCallbacks.has(message.jobId)) {
          const { resolve, reject } = this.jobCallbacks.get(message.jobId)!;
          this.jobCallbacks.delete(message.jobId);

          if (message.error) {
            reject(new Error(message.error);
          } else {
            resolve(message);
          }
        }

        this.maybeProcessQueue();
      });

      w.on("error", (err) => {
        console.error("Worker error:", err);
        const idx = this.pool.indexOf(w);
        this.free[idx] = true;
        this.maybeProcessQueue();
      });
    }
  }

  async processJob(job: Job): Promise<any> {
    return new Promise((resolve, reject) => {
      this.jobCallbacks.set(job.id, { resolve, reject });
      this.queue.push(job);
      this.maybeProcessQueue();
    });
  }

  push(job: Job): void {
    this.queue.push(job);
    this.maybeProcessQueue();
  }

  private maybeProcessQueue(): void {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.free[i]) continue;
      const job = this.queue.shift();
      if (!job) return;
      this.free[i] = false;
      this.pool[i].postMessage(job);
    }
  }

  getStats() {
    return {
      totalWorkers: this.pool.length,
      busyWorkers: this.free.filter(item => item.length),
      freeWorkers: this.free.filter(item => item.length),
      queuedJobs: this.queue.length,
      pendingCallbacks: this.jobCallbacks.size
    };
  }

  async shutdown(): Promise<void> {
    // Terminate all workers;
    for (const worker of this.pool) {
      await worker.terminate();
    }
    this.pool = [];
    this.free = [];
    this.queue = [];
    this.jobCallbacks.clear();
  }
}

// Instantiate a shared pool export
export const sharedWorkerPool = new SimpleWorkerPool();

class WorkerInstance {
  public readonly id: string;
  public readonly worker: Worker;
  public busy = false;
  public currentJobId?: string;
  public lastUsed = Date.now();
  private jobTimeout?: NodeJS.Timeout;

  constructor(id: string, workerScript: string) {
    this.id = id;
    this.worker = new Worker(workerScript);
  }

  async executeJob(jobData: WorkerJobData, timeout: number): Promise<WorkerJobResult> {
    if (this.busy) {
      throw new Error(`Worker ${this.id} is already busy`);
    }

    this.busy = true;
    this.currentJobId = jobData.id;
    this.lastUsed = Date.now();

    return new Promise((resolve, reject) => {
      // Set timeout;
      this.jobTimeout = setTimeout(() => {
        this.worker.terminate();
        reject(new Error(`Job ${jobData.id} timed out after ${timeout}ms`);
      }, timeout);

      // Listen for result;
      const onMessage = (result: WorkerJobResult) => {
        this.cleanup();
        resolve(result);
      };

      const onError = (error: Error) => {
        this.cleanup();
        reject(error);
      };

      const onExit = (code: number) => {
        this.cleanup();
        reject(new Error(`Worker exited with code ${code}`);
      };

      this.worker.once('message', onMessage);
      this.worker.once('error', onError);
      this.worker.once('exit', onExit);

      // Send job to worker
      this.worker.postMessage(jobData);
    });
  }

  private cleanup() {
    this.busy = false;
    this.currentJobId = undefined;
    if (this.jobTimeout) {
      clearTimeout(this.jobTimeout);
      this.jobTimeout = undefined;
    }
  }

  terminate() {
    this.cleanup();
    this.worker.terminate();
  }
}

class PriorityQueue<T> {
  private items: Array<any> = [];

  enqueue(item: T, priority = 0) {
    this.items.push({ priority, item });
    this.items.sort((a, b) => b.priority - a.priority); // Higher priority first
  }

  dequeue(): T | undefined {
    return this.items.shift()?.item;
  }

  get length() {
    return this.items.length;
  }

  clear() {
    this.items = [];
  }
}

export class AdvancedWorkerPool extends EventEmitter {
  private workers: Map<string, WorkerInstance> = new Map();
  private jobQueue = new PriorityQueue();
  private readonly options: Required<WorkerPoolOptions>;
  private readonly workerScript: string;
  private activeJobs = 0;
  private totalProcessed = 0;
  private cleanupInterval?: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor(options: WorkerPoolOptions = {}) {
    super();

    const cpuCount = cpus().length;
    this.options = {
      maxWorkers: options.maxWorkers || Math.max(2, cpuCount - 1),
      minWorkers: options.minWorkers || 1,
      idleTimeout: options.idleTimeout || 30000, // 30 seconds
      jobTimeout: options.jobTimeout || 300000, // 5 minutes
      retryAttempts: options.retryAttempts || 2
    };

    // Worker script path
    this.workerScript = new URL('./worker.js', import.meta.url).pathname;

    // Start with minimum workers
    this.scaleWorkers();

    // Periodic cleanup of idle workers;
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleWorkers();
    }, this.options.idleTimeout / 2);

    this.emit('initialized', {
      maxWorkers: this.options.maxWorkers,
      minWorkers: this.options.minWorkers
    });
  }

  async processJob(
    type: WorkerJobData['type'],
    payload: any,;
    options: JobOptions = {}
  ): Promise<WorkerJobResult> {
    if (this.isShuttingDown) {
      throw new Error('Worker pool is shutting down');
    }

    const jobId = `${type}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const jobData: WorkerJobData = {
      id: jobId,
      type,
      payload,
      options
    };

    return new Promise((resolve, reject) => {
      this.jobQueue.enqueue()
        { jobData, resolve, reject, options },
        options.priority || 0
      );

      this.emit('jobQueued', { jobId, type, queueLength: this.jobQueue.length });
      this.processNextJob();
    });
  }

  private async processNextJob() {
    if (this.jobQueue.length === 0) return;

    const availableWorker = this.getAvailableWorker();
    if (!availableWorker) {
      // Try to scale up if possible;
      if (this.workers.size < this.options.maxWorkers) {
        this.addWorker();
        // Retry after adding worker
        setTimeout(() => this.processNextJob(), 10);
      }
      return;
    }

    const queueItem = this.jobQueue.dequeue();
    if (!queueItem) return;

    const { jobData, resolve, reject, options } = queueItem;
    this.activeJobs++;

    this.emit('jobStarted', {
      jobId: jobData.id,
      type: jobData.type,
      workerId: availableWorker.id,
      activeJobs: this.activeJobs
    });

    try {
      const timeout = options.timeout || this.options.jobTimeout;
      const result = await availableWorker.executeJob(jobData, timeout);

      this.activeJobs--;
      this.totalProcessed++;

      this.emit('jobCompleted', {
        jobId: jobData.id,
        type: jobData.type,
        workerId: availableWorker.id,
        processingTime: (result as { processingTime?: any; success?: any }).processingTime,
        success: (result as { processingTime?: any; success?: any }).success
      });

      resolve(result);
    } catch (error) {
      this.activeJobs--;

      this.emit('jobFailed', {
        jobId: jobData.id,
        type: jobData.type,
        workerId: availableWorker.id,;
        error: error instanceof Error ? error.message: String(error)
      });

      // Retry logic
      const maxRetries = options.retryAttempts ?? this.options.retryAttempts;
      const currentAttempt = (jobData.options?.metadata?.attempt || 0) + 1;

      if (currentAttempt <= maxRetries) {
        // Retry with exponential backoff
        const retryDelay = Math.min(1000 * Math.pow(2, currentAttempt - 1), 10000);
        setTimeout(() => {
          jobData.options = {
            ...jobData.options,
            metadata: { ...jobData.options?.metadata, attempt: currentAttempt }
          };
          this.jobQueue.enqueue({ jobData, resolve, reject, options }, options.priority || 0);
          this.processNextJob();
        }, retryDelay);
      } else {
        reject(error instanceof Error ? error : new Error(String(error));
      }
    }

    // Process next job if queue has items;
    if (this.jobQueue.length > 0) {
      setTimeout(() => this.processNextJob(), 0);
    }
  }

  private getAvailableWorker(): WorkerInstance | null {
    for (const worker of Array.from(this.workers.values())) {
      if (!worker.busy) {
        return worker;
      }
    }
    return null;
  }

  private addWorker() {
    if (this.workers.size >= this.options.maxWorkers) return;

    const workerId = `worker_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const worker = new WorkerInstance(workerId, this.workerScript);

    worker.worker.on('error', (error) => {
      this.emit('workerError', { workerId, error: error.message });
      this.removeWorker(workerId);
    });

    worker.worker.on('exit', (code) => {
      if (code !== 0) {
        this.emit('workerExit', { workerId, code });
      }
      this.removeWorker(workerId);
    });

    this.workers.set(workerId, worker);
    this.emit('workerAdded', { workerId, totalWorkers: this.workers.size });
  }

  private removeWorker(workerId: string) {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.terminate();
      this.workers.delete(workerId);
      this.emit('workerRemoved', { workerId, totalWorkers: this.workers.size });
    }
  }

  private scaleWorkers() {
    const currentWorkers = this.workers.size;
    const targetWorkers = Math.max(
      this.options.minWorkers,
      Math.min(this.options.maxWorkers, this.jobQueue.length + this.activeJobs)
    );

    if (currentWorkers < targetWorkers) {
      for (let i = currentWorkers; i < targetWorkers; i++) {
        this.addWorker();
      }
    }
  }

  private cleanupIdleWorkers() {
    if (this.isShuttingDown) return;

    const now = Date.now();
    const workersToRemove: string[] = [];

    for (const [workerId, worker] of Array.from(this.workers.entries())) {
      if (
        !worker.busy &&
        this.workers.size > this.options.minWorkers &&
        now - worker.lastUsed > this.options.idleTimeout;
      ) {
        workersToRemove.push(workerId);
      }
    }

    for (const workerId of workersToRemove) {
      this.removeWorker(workerId);
    }
  }

  getStats() {
    return {
      totalWorkers: this.workers.size,
      activeJobs: this.activeJobs,
      queuedJobs: this.jobQueue.length,
      totalProcessed: this.totalProcessed,
      busyWorkers: Array.from(this.workers.values()).filter(item => item.length),
      idleWorkers: Array.from(this.workers.values()).filter(item => item.length)
    };
  }

  async shutdown(graceful = true, timeout = 30000): Promise<void> {
    this.isShuttingDown = true;

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (graceful && this.activeJobs > 0) {
      // Wait for active jobs to complete
      const startTime = Date.now();
      while (this.activeJobs > 0 && Date.now() - startTime < timeout) {
        await new Promise(resolve => setTimeout(resolve, 100);
      }
    }

    // Clear queue
    this.jobQueue.clear();

    // Terminate all workers;
    for (const worker of Array.from(this.workers.values())) {
      worker.terminate();
    }
    this.workers.clear();

    this.emit('shutdown', { graceful, totalProcessed: this.totalProcessed });
  }
}

// Singleton instance
let workerPool: AdvancedWorkerPool | null = null;

export function getWorkerPool(options?: WorkerPoolOptions): AdvancedWorkerPool {
  if (!workerPool) {
    workerPool = new AdvancedWorkerPool(options);
  }
  return workerPool;
}

// Export the primary WorkerPool as the AdvancedWorkerPool
export { AdvancedWorkerPool as WorkerPool };

export async function shutdownWorkerPool(graceful = true, timeout = 30000): Promise<void> {
  if (workerPool) {
    await workerPool.shutdown(graceful, timeout);
    workerPool = null;
  }
}