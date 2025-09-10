/**
 * Legal ONNX API Router
 * Handles parallel ONNX processing requests with intelligent load balancing
 * Routes: entity extraction, document classification, embeddings, batch processing
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Worker pool management
class ONNXWorkerPool {
  private workers: Worker[] = [];
  private workerStats: Map<number, any> = new Map();
  private taskQueue: Array<{ id: string; resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = [];
  private isInitialized = false;
  private maxWorkers = Math.min(4, navigator?.hardwareConcurrency || 2);
  private roundRobinIndex = 0;

  constructor() {
    this.initializeWorkers();
  }

  private async initializeWorkers() {
    try {
      for (let i = 0; i < this.maxWorkers; i++) {
        const worker = new Worker('/workers/legal-bert-onnx-worker.js');
        
        worker.onmessage = (e) => this.handleWorkerMessage(i, e);
        worker.onerror = (error) => this.handleWorkerError(i, error);
        
        this.workers[i] = worker;
        this.workerStats.set(i, {
          id: i,
          busy: false,
          totalTasks: 0,
          errors: 0,
          averageLatency: 0
        });
        
        // Initialize worker
        worker.postMessage({ type: 'INITIALIZE' });
      }
      
      console.log(`✅ Initialized ${this.maxWorkers} ONNX workers`);
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize ONNX worker pool:', error);
    }
  }

  private handleWorkerMessage(workerId: number, event: MessageEvent) {
    const { type, payload, taskId } = event.data;
    
    // Find pending task and resolve it
    const taskIndex = this.taskQueue.findIndex(task => task.id === taskId);
    if (taskIndex >= 0) {
      const task = this.taskQueue[taskIndex];
      this.taskQueue.splice(taskIndex, 1);
      
      clearTimeout(task.timeout);
      
      if (type.includes('ERROR')) {
        task.reject(new Error(payload.error || 'Task failed'));
      } else {
        task.resolve(payload);
      }
      
      // Update worker stats
      const stats = this.workerStats.get(workerId);
      if (stats) {
        stats.busy = false;
        stats.totalTasks++;
        if (payload.processingTime) {
          stats.averageLatency = (stats.averageLatency * (stats.totalTasks - 1) + payload.processingTime) / stats.totalTasks;
        }
      }
    }
    
    // Handle special message types
    switch (type) {
      case 'INITIALIZED':
        console.log(`🔧 Worker ${workerId} initialized:`, payload);
        break;
      case 'BATCH_COMPLETE':
        console.log(`📦 Batch processing complete on worker ${workerId}:`, payload);
        break;
    }
  }

  private handleWorkerError(workerId: number, error: ErrorEvent) {
    console.error(`❌ Worker ${workerId} error:`, error);
    
    const stats = this.workerStats.get(workerId);
    if (stats) {
      stats.errors++;
      stats.busy = false;
    }
  }

  private selectBestWorker(): number {
    // Find least busy worker
    let bestWorker = 0;
    let minLoad = Infinity;
    
    for (const [workerId, stats] of this.workerStats.entries()) {
      if (!stats.busy) {
        const load = stats.totalTasks + stats.errors * 2; // Penalty for errors
        if (load < minLoad) {
          minLoad = load;
          bestWorker = workerId;
        }
      }
    }
    
    // Fallback to round-robin if all workers are busy
    if (minLoad === Infinity) {
      bestWorker = this.roundRobinIndex % this.workers.length;
      this.roundRobinIndex++;
    }
    
    return bestWorker;
  }

  async executeTask(type: string, payload: any, timeout = 30000): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Worker pool not initialized');
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const workerId = this.selectBestWorker();
    
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        const taskIndex = this.taskQueue.findIndex(task => task.id === taskId);
        if (taskIndex >= 0) {
          this.taskQueue.splice(taskIndex, 1);
          reject(new Error(`Task ${taskId} timed out after ${timeout}ms`));
        }
      }, timeout);
      
      // Add to task queue
      this.taskQueue.push({
        id: taskId,
        resolve,
        reject,
        timeout: timeoutHandle
      });
      
      // Mark worker as busy
      const stats = this.workerStats.get(workerId);
      if (stats) {
        stats.busy = true;
      }
      
      // Send task to worker
      this.workers[workerId].postMessage({
        type,
        payload,
        taskId
      });
    });
  }

  async executeBatch(tasks: Array<{ type: string; payload: any }>): Promise<any> {
    const workerId = this.selectBestWorker();
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new Error(`Batch ${batchId} timed out`));
      }, 60000); // 60 second timeout for batches
      
      this.taskQueue.push({
        id: batchId,
        resolve: (result) => {
          clearTimeout(timeoutHandle);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeoutHandle);
          reject(error);
        },
        timeout: timeoutHandle
      });
      
      this.workers[workerId].postMessage({
        type: 'BATCH_PROCESS',
        payload: { tasks },
        taskId: batchId
      });
    });
  }

  getStats() {
    return {
      totalWorkers: this.workers.length,
      workerStats: Array.from(this.workerStats.values()),
      queueLength: this.taskQueue.length,
      isInitialized: this.isInitialized
    };
  }
}

// Global worker pool instance
let workerPool: ONNXWorkerPool | null = null;

function getWorkerPool(): ONNXWorkerPool {
  if (!workerPool) {
    workerPool = new ONNXWorkerPool();
  }
  return workerPool;
}

// Entity Extraction Endpoint
export const POST: RequestHandler = async ({ request, url }) => {
  const endpoint = url.pathname.split('/').pop();
  
  try {
    const body = await request.json();
    const pool = getWorkerPool();
    
    switch (endpoint) {
      case 'extract-entities': {
        const { text, options = {} } = body;
        
        if (!text || typeof text !== 'string') {
          return json({ error: 'Text field is required and must be a string' }, { status: 400 });
        }
        
        const result = await pool.executeTask('EXTRACT_ENTITIES', { text }, options.timeout);
        
        return json({
          success: true,
          entities: result.entities,
          processingTime: result.processingTime,
          modelUsed: result.modelUsed
        });
      }
      
      case 'classify-document': {
        const { text, options = {} } = body;
        
        if (!text || typeof text !== 'string') {
          return json({ error: 'Text field is required and must be a string' }, { status: 400 });
        }
        
        const result = await pool.executeTask('CLASSIFY_DOCUMENT', { text }, options.timeout);
        
        return json({
          success: true,
          predictions: result.predictions,
          topPrediction: result.topPrediction,
          processingTime: result.processingTime,
          modelUsed: result.modelUsed
        });
      }
      
      case 'generate-embeddings': {
        const { text, options = {} } = body;
        
        if (!text || typeof text !== 'string') {
          return json({ error: 'Text field is required and must be a string' }, { status: 400 });
        }
        
        const result = await pool.executeTask('GENERATE_EMBEDDINGS', { text }, options.timeout);
        
        return json({
          success: true,
          embeddings: result.embeddings,
          dimensions: result.dimensions,
          processingTime: result.processingTime,
          modelUsed: result.modelUsed
        });
      }
      
      case 'batch-process': {
        const { tasks, options = {} } = body;
        
        if (!Array.isArray(tasks) || tasks.length === 0) {
          return json({ error: 'Tasks array is required and must not be empty' }, { status: 400 });
        }
        
        // Validate task format
        for (const task of tasks) {
          if (!task.type || !task.payload || !task.payload.text) {
            return json({ error: 'Each task must have type and payload.text' }, { status: 400 });
          }
        }
        
        const result = await pool.executeBatch(tasks);
        
        return json({
          success: true,
          batchId: result.batchId,
          results: result.results,
          totalTasks: result.totalTasks,
          processingTime: result.processingTime,
          averageTimePerTask: result.averageTimePerTask
        });
      }
      
      case 'parallel-process': {
        const { requests } = body;
        
        if (!Array.isArray(requests) || requests.length === 0) {
          return json({ error: 'Requests array is required' }, { status: 400 });
        }
        
        // Process multiple requests in parallel
        const startTime = Date.now();
        
        const promises = requests.map(async (req: any) => {
          try {
            return await pool.executeTask(req.type, req.payload, req.timeout);
          } catch (error) {
            return { error: error.message, requestId: req.id };
          }
        });
        
        const results = await Promise.allSettled(promises);
        const totalTime = Date.now() - startTime;
        
        return json({
          success: true,
          results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason }),
          totalRequests: requests.length,
          processingTime: totalTime,
          parallelExecution: true
        });
      }
      
      default:
        return json({ error: `Unknown endpoint: ${endpoint}` }, { status: 404 });
    }
    
  } catch (error: any) {
    console.error('ONNX API error:', error);
    return json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
};

// Get worker pool statistics
export const GET: RequestHandler = async ({ url }) => {
  const endpoint = url.pathname.split('/').pop();
  
  if (endpoint === 'stats') {
    try {
      const pool = getWorkerPool();
      const stats = pool.getStats();
      
      return json({
        success: true,
        workerPool: stats,
        timestamp: new Date().toISOString(),
        uptime: process.uptime ? process.uptime() * 1000 : 0
      });
    } catch (error: any) {
      return json(
        { error: 'Failed to get stats', details: error.message },
        { status: 500 }
      );
    }
  }
  
  return json({ error: 'Not found' }, { status: 404 });
};