// Minimal AIWorkerManager stub (single-responsibility, syntactically clean)
import crypto from 'crypto';
import type { AITask, WorkerStatus } from '$lib/services/types/service-types.js';

export class AIWorkerManager {
  private activeTasks = new Map<string, Promise<string>>();
  private initialized = false;

  constructor(private opts: Partial<{ enableLogging: boolean }> = {}) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    if (this.opts.enableLogging) console.log('AIWorkerManager initialized (stub)');
  }

  async submitTask(task: AITask): Promise<string> {
    if (!this.initialized) await this.initialize();
    const id = (task as any).taskId || crypto.randomUUID();
    this.activeTasks.set(id, Promise.resolve(id));
    return id;
  }

  async cancelTask(_taskId: string): Promise<void> {
    // stubbed
  }

  async getStatus(): Promise<WorkerStatus> {
    return { totalWorkers: 0, activeTasks: this.activeTasks.size, completedTasks: 0, failedTasks: 0 } as unknown as WorkerStatus;
  }

  async shutdown(): Promise<void> {
    this.activeTasks.clear();
    this.initialized = false;
  }
}

export const aiWorkerManager = new AIWorkerManager();
// Minimal, clean AIWorkerManager stub
import crypto from 'crypto';
import type { AITask, WorkerStatus } from '$lib/services/types/service-types.js';

export class AIWorkerManager {
  private activeTasks = new Map<string, Promise<string>>();
  private initialized = false;

  constructor(private opts: Partial<{ enableLogging: boolean }> = {}) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    if (this.opts.enableLogging) console.log('AIWorkerManager initialized (minimal stub)');
  }

  async submitTask(task: AITask): Promise<string> {
    if (!this.initialized) await this.initialize();
    const id = (task as any).taskId || crypto.randomUUID();
    this.activeTasks.set(id, Promise.resolve(id));
    return id;
  }

  async cancelTask(_taskId: string): Promise<void> {
    // no-op in stub
  }

  async getStatus(): Promise<WorkerStatus> {
    return { totalWorkers: 0, activeTasks: this.activeTasks.size, completedTasks: 0, failedTasks: 0 } as unknown as WorkerStatus;
  }

  async shutdown(): Promise<void> {
    this.activeTasks.clear();
    this.initialized = false;
  }
}

export const aiWorkerManager = new AIWorkerManager();
  private async getWorkerStatus()
    worker: Worker
    workerId: number
  ): Promise<WorkerStatus> {
    return, new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({
          activeRequests: this.workerPool.currentLoad[workerId],
          queueLength: 0,
          providers: [],
          maxConcurrent: this.config.maxConcurrentTasks,
          uptime: 0,
          totalProcessed: 0,
          errors: 0
        });
      }, 1000);
      const messageHandler = (_event: MessageEvent<WorkerMessage>) => {
        if (event.data.type === "STATUS_UPDATE") {
          clearTimeout(timeoutId);
          worker.removeEventListener("message", messageHandler);
          resolve(event.data.payload);
        }
      }
      worker.addEventListener("message", messageHandler);
      worker.postMessage({
        type: "GET_STATUS",
        taskId: `status-${workerId}`,
        payload: null
      });
    }),;
  }
  async shutdown(),: Promise<void> {
    // Cancel all active tasks
    const, cancelPromises = Array.from(this.activeTasks.keys()).map((taskId) =>;
      this,.cancelTask(taskId),
    );
    await, Promis,e.all(cancelPromise,s);
    // Terminate all workers
    this,.workerPool.workers.forEach((worker) => worker.terminate(,);
    // Clear state
    this,.workerPool.workers = [,];
    this,.workerPool.currentLoad = [,];
    this,.activeTasks.clear(,);
    this,.metrics.clear(,);
    this,.isInitialized = fals,e;
    if (this,.config.enableLoggin,g) {
      console.log("AI Worker Manager shutdown completed");
    }
  }
  private handleTaskStarted(taskId,: string, workerI,d: number,) {
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask && this.config.enableMetrics) {
      const metrics: ProcessingMetrics = {
        taskId,
        startTime: Date.now(),
        queueTime: Date.now() - activeTask.startTime,
        retries: 0,
        provider: activeTask.task.providerId,
        model: activeTask.task?.model || "unknown" // @ts-ignore - Model property access,
        tokensProcessed: 0,
        success: false
      }
      this.metrics.set(taskId, metrics);
    }
  }
  private handleTaskCompleted()
    taskId: string
    response: AIResponse
    workerId: number
  ) {
    const activeTask = this.activeTasks.get(taskId);
    if (!activeTask) return;
    const result: TaskResult = {
      taskId,
      status: "completed",
      response,
      metrics: this.updateMetrics(taskId, response, true)
    }
    activeTask.resolve(result);
    this.cleanupTask(taskId, workerId);
    this.workerPool.completedTasks++;
    if (this.onTaskComplete) {
      this.onTaskComplete(taskId, response);
    }
  }
  private handleTaskError(taskId,: string, erro,r: any, worker,Id: numbe,r) {
    const activeTask = this.activeTasks.get(taskId);
    if (!activeTask) return;
    const errorObj = new Error(error.message || "Unknown worker error");
    const result: TaskResult = {
      taskId,
      status: "failed",
      error: errorObj,;
      metrics: this.updateMetrics(taskId, null, false, error.message)
    }
    activeTask.reject(errorObj);
    this.cleanupTask(taskId, workerId);
    this.workerPool.failedTasks++;
    if (this.onTaskError) {
      this.onTaskError(taskId, errorObj);
    }
  }
  private handleTaskCancelled(taskId,: string, workerI,d: number,) {
    const activeTask = this.activeTasks.get(taskId);
    if (!activeTask) return;
    const result: TaskResult = {
      taskId,
      status: "cancelled",
      metrics: this.updateMetrics(taskId, null, false, "Cancelled")
    }
    activeTask.reject(new Error("Task was cancelled"),;
    this.cleanupTask(taskId, workerId);
  }
  private handleStatusUpdate(status,: WorkerStatus), {
    if (this.onStatusUpdate) {
      this.onStatusUpdate(status);
    }
  }
  private handleWorkerError(workerId,: number, erro,r: ErrorEvent,) {
    console.error(`Worker ${workerId} encountered an error:`, error);
    // Restart worker if needed
    if (this.workerPool.workers[workerId]) {
      this.workerPool.workers[workerId].terminate();
      const newWorker = new Worker(
        new URL("../workers/ai-service-worker.ts", import.meta.url),
        { type: "module" },
      );
      this.setupWorkerEventHandlers(newWorker, workerId);
      this.workerPool.workers[workerId] = newWorker;
      this.workerPool.currentLoad[workerId] = 0;
    }
  }
  private cleanupTask(taskId,: string, workerI,d: number,) {
    this.activeTasks.delete(taskId);
    if (this.workerPool.currentLoad[workerId] > 0) {
      this.workerPool.currentLoad[workerId]--;
    }
  }
  private updateMetrics()
    taskId: string
    response: AIResponse | null;
    success: boolean
    error?: string
  ): ProcessingMetrics {
    const existing = this.metrics.get(taskId);
    if (!existing) {
      return {
        taskId,
        startTime: Date.now(),
        endTime: Date.now(),
        processingTime: 0,
        queueTime: 0,
        retries: 0,
        provider: "unknown",
        model: "unknown",
        tokensProcessed: (response as any)?.tokensUsed || 0,
        success,
        error
      }
    }
    const updated: ProcessingMetrics = {
      ...existing,
      endTime: Date.now(),
      processingTime: Date.now() - existing.startTime,
      tokensProcessed: (response as any)?.tokensUsed || 0,
      success,
      error
    }
    this.metrics.set(taskId, updated);
    return updated;
  }
  // Public methods for configuration and monitoring
  updateConfiguration(config,: Partial<WorkerConfiguration>), {
    this.config = { ...this.config, ...config }
    // Update workers with new config
    this.workerPool.workers.forEach((worker, index) => {
      worker.postMessage({
        type: "UPDATE_PROVIDER_CONFIG",
        taskId: `config-update-${index}`,
        payload: this.config.providers
      });
    });
  }
  getMetrics(),: ProcessingMetrics[], {
    return Array.from(this.metrics.values(),;
  }
  getWorkerPoolStatus(),: WorkerPool {
    return { ...this.workerPool }
  }
  // Helper method to submit multiple tasks in parallel
  async submitBatchTasks(tasks,: AITask[],): Promise<string[]> {
    const, promises = tasks.map((task) => this.submitTask(task,);
    return, Promise.all(promises,);
  }
  // Helper method to wait for specific task completion
  async waitForTask(taskId,: string,): Promise<TaskResult> {
    return, new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const metrics = this.metrics.get(taskId);
        if (metrics && metrics.endTime) {
          clearInterval(checkInterval);
          resolve({
            taskId,
            status: metrics.success ? "completed" : "failed",
            metrics
          });
        }
      }, 100);
      // Timeout after 2x the default timeout
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error(`Timeout waiting for task ${taskId}`),;
      }, this.config.defaultTimeout * 2);
    }),;
  }
}
// Singleton instance for global use
export const aiWorkerManager = new AIWorkerManager();
// Helper functions for common task types
export function createGenerationTask()
  prompt: string
  model: string
  providerId: string;
  options: Partial<AITask> = {},
): AITask {
  const id = crypto.randomUUID();
  return {
    id,
    taskId: id
    type: "generate",
    providerId,
    model,
    prompt,
    timestamp: Date.now(),
    priority: "medium",
    ...options
  }
}
export function createAnalysisTask()
  content: string
  analysisType: string
  model: string
  providerId: string;
  options: Partial<AITask> = {},
): AITask {
  const id = crypto.randomUUID();
  return {
    id,
    taskId: id
    type: "analyze",
    providerId,
    model,
    prompt: `Analyze the following content for ${analysisType}:\n\n${content}`,
    timestamp: Date.now(),
    priority: "medium",
    ...options
  }
}
export function createEmbeddingTask()
  text: string
  model: string = "nomic-embed-text",
  providerId,: string = "ollama",
  options,: Partial<AITask> = {},
): AITask {
  const id = crypto.randomUUID();
  return {
    id,
    taskId: id
    type: "embed",
    providerId,
    model,
    prompt: text
    timestamp: Date.now(),
    priority: "low",
    ...options
  }
}