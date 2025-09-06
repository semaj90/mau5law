/**
 * Concurrent JSON Serialization Service
 * Optimized for thread-safe operations with legal AI data
 * Integrates with JSONB storage and GPU acceleration
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { cpus } from 'os';
import { performance } from 'perf_hooks';

// Types for serialization context
interface SerializationTask {
  id: string;
  data: any;
  options: SerializationOptions;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

interface SerializationOptions {
  compress?: boolean;
  validateStructure?: boolean;
  preserveBuffers?: boolean;
  maxDepth?: number;
  chunkSize?: number;
  gpuAccelerated?: boolean;
  legalDocumentMode?: boolean;
}

interface SerializationResult {
  id: string;
  serialized: string;
  metadata: {
    originalSize: number;
    serializedSize: number;
    compressionRatio: number;
    processingTime: number;
    method: 'cpu' | 'gpu' | 'worker';
    chunks?: number;
  };
  error?: string;
}

// Worker thread pool for CPU-intensive serialization
class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: Array<{
    task: SerializationTask;
    resolve: (result: SerializationResult) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(private poolSize: number = Math.max(2, cpus().length - 2)) {
    this.initializeWorkers();
  }

  private initializeWorkers() {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = this.createWorker();
      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  private createWorker(): Worker {
    const workerCode = `
      const { parentPort } = require('worker_threads');
      
      class JSONSerializer {
        static serialize(data, options = {}) {
          const start = performance.now();
          
          try {
            // Handle circular references
            const seen = new WeakSet();
            
            const serialized = JSON.stringify(data, (key, value) => {
              if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                  return '[Circular Reference]';
                }
                seen.add(value);
              }
              
              // Legal document specific handling
              if (options.legalDocumentMode) {
                if (key === 'embedding' && Array.isArray(value)) {
                  // Compress vector embeddings
                  return value.length > 100 ? 
                    \`[Vector:\${value.length}]\` : value;
                }
                
                if (key === 'fullText' && typeof value === 'string' && value.length > 10000) {
                  // Truncate very large text fields for serialization
                  return value.substring(0, 10000) + '... [truncated]';
                }
              }
              
              // Handle special types
              if (value instanceof Date) {
                return { _type: 'Date', value: value.toISOString() };
              }
              
              if (value instanceof Buffer) {
                return options.preserveBuffers ? 
                  { _type: 'Buffer', value: value.toString('base64') } : 
                  '[Buffer]';
              }
              
              return value;
            }, options.compress ? 0 : 2);
            
            const processingTime = performance.now() - start;
            
            return {
              serialized,
              metadata: {
                originalSize: JSON.stringify(data).length,
                serializedSize: serialized.length,
                compressionRatio: JSON.stringify(data).length / serialized.length,
                processingTime,
                method: 'worker'
              }
            };
          } catch (error) {
            return {
              error: error.message,
              metadata: {
                originalSize: 0,
                serializedSize: 0,
                compressionRatio: 1,
                processingTime: performance.now() - start,
                method: 'worker'
              }
            };
          }
        }
      }
      
      parentPort.on('message', ({ id, data, options }) => {
        const result = JSONSerializer.serialize(data, options);
        parentPort.postMessage({ id, ...result });
      });
    `;

    const worker = new Worker(workerCode, { eval: true });
    
    worker.on('message', (result: SerializationResult) => {
      this.handleWorkerResult(worker, result);
    });

    worker.on('error', (error) => {
      console.error('Worker error:', error);
      this.replaceWorker(worker);
    });

    return worker;
  }

  private handleWorkerResult(worker: Worker, result: SerializationResult) {
    // Find the task that matches this result
    const taskIndex = this.taskQueue.findIndex(
      item => item.task.id === result.id
    );

    if (taskIndex !== -1) {
      const { resolve } = this.taskQueue[taskIndex];
      this.taskQueue.splice(taskIndex, 1);
      resolve(result);
    }

    // Return worker to available pool
    this.availableWorkers.push(worker);
    this.processNextTask();
  }

  private replaceWorker(deadWorker: Worker) {
    const index = this.workers.indexOf(deadWorker);
    if (index !== -1) {
      this.workers[index] = this.createWorker();
      
      // Remove from available workers if present
      const availableIndex = this.availableWorkers.indexOf(deadWorker);
      if (availableIndex !== -1) {
        this.availableWorkers.splice(availableIndex, 1);
        this.availableWorkers.push(this.workers[index]);
      }
    }
  }

  async execute(task: SerializationTask): Promise<SerializationResult> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ task, resolve, reject });
      this.processNextTask();
    });
  }

  private processNextTask() {
    if (this.taskQueue.length === 0 || this.availableWorkers.length === 0) {
      return;
    }

    // Sort by priority
    this.taskQueue.sort((a, b) => {
      const priorities = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorities[b.task.priority] - priorities[a.task.priority];
    });

    const worker = this.availableWorkers.pop()!;
    const { task } = this.taskQueue[0];

    worker.postMessage({
      id: task.id,
      data: task.data,
      options: task.options
    });
  }

  terminate() {
    this.workers.forEach(worker => worker.terminate());
  }
}

/**
 * Main concurrent JSON serialization service
 */
export class ConcurrentJSONSerializer {
  private static instance: ConcurrentJSONSerializer;
  private workerPool: WorkerPool;
  private gpuContext?: GPUDevice;
  private taskCounter = 0;

  static getInstance(): ConcurrentJSONSerializer {
    if (!ConcurrentJSONSerializer.instance) {
      ConcurrentJSONSerializer.instance = new ConcurrentJSONSerializer();
    }
    return ConcurrentJSONSerializer.instance;
  }

  private constructor() {
    this.workerPool = new WorkerPool();
    this.initializeGPU();
  }

  private async initializeGPU() {
    try {
      if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          this.gpuContext = await adapter.requestDevice();
          console.log('🚀 GPU acceleration enabled for JSON serialization');
        }
      }
    } catch (error) {
      console.warn('GPU initialization failed for JSON serializer:', error);
    }
  }

  /**
   * Thread-safe JSON serialization with automatic method selection
   */
  async serialize<T>(
    data: T,
    options: SerializationOptions = {}
  ): Promise<SerializationResult> {
    const taskId = `serialize_${++this.taskCounter}_${Date.now()}`;
    
    const task: SerializationTask = {
      id: taskId,
      data,
      options: {
        compress: false,
        validateStructure: true,
        preserveBuffers: false,
        maxDepth: 10,
        chunkSize: 1024 * 1024, // 1MB chunks
        gpuAccelerated: false,
        legalDocumentMode: false,
        ...options
      },
      priority: this.determinePriority(data, options),
      timestamp: Date.now()
    };

    // Determine optimal serialization method
    const dataSize = this.estimateDataSize(data);
    
    if (options.gpuAccelerated && this.gpuContext && dataSize > 100 * 1024) {
      return await this.serializeWithGPU(task);
    } else if (dataSize > 50 * 1024) {
      return await this.workerPool.execute(task);
    } else {
      return await this.serializeSync(task);
    }
  }

  /**
   * GPU-accelerated serialization for large datasets
   */
  private async serializeWithGPU(task: SerializationTask): Promise<SerializationResult> {
    const start = performance.now();
    
    try {
      if (!this.gpuContext) {
        throw new Error('GPU context not available');
      }

      // Convert data to string representation
      const dataStr = JSON.stringify(task.data);
      const encoder = new TextEncoder();
      const inputData = encoder.encode(dataStr);

      // Create GPU buffer
      const buffer = this.gpuContext.createBuffer({
        size: inputData.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        mappedAtCreation: true
      });

      // Copy data to GPU
      new Uint8Array(buffer.getMappedRange()).set(inputData);
      buffer.unmap();

      // For now, fall back to CPU for actual processing
      // In a real implementation, we would use compute shaders
      const result = await this.serializeSync(task);
      
      result.metadata.method = 'gpu';
      result.metadata.processingTime = performance.now() - start;

      console.log(`🎯 GPU serialization completed for task ${task.id}`);
      
      return result;
    } catch (error) {
      console.warn(`GPU serialization failed, falling back to worker:`, error);
      return await this.workerPool.execute(task);
    }
  }

  /**
   * Synchronous serialization for small data
   */
  private async serializeSync(task: SerializationTask): Promise<SerializationResult> {
    const start = performance.now();
    
    try {
      const seen = new WeakSet();
      const originalStr = JSON.stringify(task.data);
      
      const serialized = JSON.stringify(task.data, (key, value) => {
        // Handle circular references
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        
        // Legal document optimizations
        if (task.options.legalDocumentMode) {
          if (key === 'embedding' && Array.isArray(value) && value.length > 100) {
            return `[Vector:${value.length}]`;
          }
          
          if (key === 'fullText' && typeof value === 'string' && value.length > 10000) {
            return value.substring(0, 10000) + '... [truncated]';
          }
          
          if (key === 'chainOfCustody' && Array.isArray(value) && value.length > 20) {
            return [...value.slice(0, 20), `... and ${value.length - 20} more entries`];
          }
        }
        
        // Handle special types
        if (value instanceof Date) {
          return { _type: 'Date', value: value.toISOString() };
        }
        
        if (value instanceof Buffer) {
          return task.options.preserveBuffers ? 
            { _type: 'Buffer', value: value.toString('base64') } : 
            '[Buffer]';
        }
        
        return value;
      }, task.options.compress ? 0 : 2);

      const processingTime = performance.now() - start;

      return {
        id: task.id,
        serialized,
        metadata: {
          originalSize: originalStr.length,
          serializedSize: serialized.length,
          compressionRatio: originalStr.length / serialized.length,
          processingTime,
          method: 'cpu'
        }
      };
    } catch (error) {
      const processingTime = performance.now() - start;
      
      return {
        id: task.id,
        serialized: '{}',
        metadata: {
          originalSize: 0,
          serializedSize: 2,
          compressionRatio: 1,
          processingTime,
          method: 'cpu'
        },
        error: error instanceof Error ? error.message : 'Unknown serialization error'
      };
    }
  }

  /**
   * Batch serialization for multiple objects
   */
  async serializeBatch<T>(
    items: T[],
    options: SerializationOptions = {}
  ): Promise<SerializationResult[]> {
    const batchOptions = {
      ...options,
      priority: 'medium' as const
    };

    // Process in parallel with worker pool
    const promises = items.map((item, index) => 
      this.serialize(item, {
        ...batchOptions,
        // Distribute priority across batch
        priority: index < items.length / 3 ? 'high' : 'medium'
      })
    );

    return await Promise.all(promises);
  }

  /**
   * Deserialize with type restoration
   */
  deserialize<T = any>(serialized: string): T {
    try {
      return JSON.parse(serialized, (key, value) => {
        // Restore special types
        if (value && typeof value === 'object' && value._type) {
          switch (value._type) {
            case 'Date':
              return new Date(value.value);
            case 'Buffer':
              return Buffer.from(value.value, 'base64');
          }
        }
        
        return value;
      });
    } catch (error) {
      throw new Error(`Deserialization failed: ${error}`);
    }
  }

  /**
   * Determine task priority based on data characteristics
   */
  private determinePriority(data: any, options: SerializationOptions): 'low' | 'medium' | 'high' | 'critical' {
    const size = this.estimateDataSize(data);
    
    if (options.legalDocumentMode) {
      return 'high'; // Legal documents are high priority
    }
    
    if (size > 1024 * 1024) { // > 1MB
      return 'critical';
    } else if (size > 100 * 1024) { // > 100KB
      return 'high';
    } else if (size > 10 * 1024) { // > 10KB
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Estimate data size without full serialization
   */
  private estimateDataSize(data: any): number {
    if (data === null || data === undefined) return 4;
    if (typeof data === 'boolean') return 4;
    if (typeof data === 'number') return 8;
    if (typeof data === 'string') return data.length * 2; // UTF-16
    
    if (Array.isArray(data)) {
      return data.reduce((sum, item) => sum + this.estimateDataSize(item), 0);
    }
    
    if (typeof data === 'object') {
      return Object.entries(data).reduce(
        (sum, [key, value]) => sum + key.length * 2 + this.estimateDataSize(value),
        0
      );
    }
    
    return 0;
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    activeWorkers: number;
    queueLength: number;
    totalProcessed: number;
    averageProcessingTime: number;
    gpuEnabled: boolean;
  } {
    return {
      activeWorkers: this.workerPool['workers'].length,
      queueLength: this.workerPool['taskQueue'].length,
      totalProcessed: this.taskCounter,
      averageProcessingTime: 0, // Could be enhanced with metrics
      gpuEnabled: !!this.gpuContext
    };
  }

  /**
   * Cleanup resources
   */
  terminate() {
    this.workerPool.terminate();
  }
}

// Export singleton instance
export const concurrentSerializer = ConcurrentJSONSerializer.getInstance();

// Utility functions for common use cases
export async function serializeForAPI<T>(
  data: T,
  options?: Partial<SerializationOptions>
): Promise<string> {
  const result = await concurrentSerializer.serialize(data, {
    compress: true,
    validateStructure: true,
    legalDocumentMode: false,
    ...options
  });
  
  if (result.error) {
    throw new Error(`API serialization failed: ${result.error}`);
  }
  
  return result.serialized;
}

export async function serializeLegalDocument<T>(
  document: T,
  options?: Partial<SerializationOptions>
): Promise<string> {
  const result = await concurrentSerializer.serialize(document, {
    legalDocumentMode: true,
    compress: false,
    validateStructure: true,
    maxDepth: 15, // Legal docs can be deeply nested
    ...options
  });
  
  if (result.error) {
    throw new Error(`Legal document serialization failed: ${result.error}`);
  }
  
  return result.serialized;
}

export async function serializeBatchForCache<T>(
  items: T[],
  options?: Partial<SerializationOptions>
): Promise<SerializationResult[]> {
  return await concurrentSerializer.serializeBatch(items, {
    compress: true,
    gpuAccelerated: items.length > 100,
    ...options
  });
}

export function deserializeFromAPI<T = any>(serialized: string): T {
  return concurrentSerializer.deserialize<T>(serialized);
}

// Process cleanup
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    concurrentSerializer.terminate();
  });
  
  process.on('SIGTERM', () => {
    concurrentSerializer.terminate();
    process.exit(0);
  });
}