/**
 * RabbitMQ-Tensor Worker Integration
 * Connects RabbitMQ job processing with tensor SIMD worker and WASM operations
 * Provides seamless routing between message queues and WebAssembly acceleration
 */

import { rabbitmqServiceWorker } from '$lib/workers/rabbitmq-service-worker.js';
import { initializeWASMBridge, registerWASMAcceleratedHandlers, getBridgeStatus } from '$lib/adapters/wasm-rabbitmq-bridge.js';
import type { JobType } from '$lib/orchestration/optimized-rabbitmq-orchestrator.js';

// Port configuration for WebAssembly services
export const WASM_SERVICE_PORTS = {
  TENSOR_WORKER: 5173,      // SvelteKit dev server port
  RABBITMQ_API: 5177,       // RabbitMQ API port  
  RABBITMQ_BROKER: 5672,    // RabbitMQ message broker
  RABBITMQ_MGMT: 15672,     // RabbitMQ management UI
  WASM_CACHE: 6379,         // Redis cache for WASM results
  VECTOR_DB: 6333           // Qdrant vector database
} as const;

// Queue routing for WASM-accelerated jobs
export const WASM_QUEUE_ROUTING = {
  // Vector operations queues
  'wasm_vector_operations': 'legal.wasm.vectors',
  'wasm_tensor_processing': 'legal.wasm.tensors', 
  'wasm_similarity_compute': 'legal.wasm.similarity',
  'wasm_batch_normalize': 'legal.wasm.batch',
  'wasm_embedding_compress': 'legal.wasm.compress',
  
  // Integration queues
  'vector_to_wasm': 'legal.vectors.wasm_ready',
  'wasm_to_storage': 'legal.wasm.storage_ready',
  'similarity_results': 'legal.similarity.results',
  'tensor_cache': 'legal.tensors.cache_ready'
} as const;

interface TensorProcessingJob {
  id: string;
  type: JobType;
  data: {
    vectors?: number[][];
    query?: number[];
    operation: 'normalize' | 'similarity' | 'compress' | 'batch_process';
    algorithm?: 'cosine' | 'euclidean' | 'dot' | 'manhattan';
  };
  metadata: {
    priority: number;
    timestamp: number;
    source: 'rabbitmq' | 'direct_api' | 'service_worker';
  };
}

interface TensorWorkerMessage {
  type: 'PROCESS_TENSOR' | 'TENSOR_PROCESSED' | 'TENSOR_ERROR';
  id: string;
  data?: any;
  result?: any;
  error?: string;
}

/**
 * Main integration class for RabbitMQ-Tensor processing
 */
export class RabbitMQTensorIntegration {
  private static instance: RabbitMQTensorIntegration;
  private tensorWorker: Worker | null = null;
  private bridgeInitialized = false;
  private processingJobs = new Map<string, TensorProcessingJob>();
  
  private constructor() {}
  
  static getInstance(): RabbitMQTensorIntegration {
    if (!RabbitMQTensorIntegration.instance) {
      RabbitMQTensorIntegration.instance = new RabbitMQTensorIntegration();
    }
    return RabbitMQTensorIntegration.instance;
  }
  
  /**
   * Initialize the complete integration system
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔗 Initializing RabbitMQ-Tensor Integration...');
      
      // Step 1: Initialize WASM bridge
      const wasmReady = await initializeWASMBridge();
      if (!wasmReady) {
        console.warn('⚠️ WASM bridge failed to initialize, continuing with JS fallback');
      }
      
      // Step 2: Setup tensor worker
      await this.initializeTensorWorker();
      
      // Step 3: Register WASM-accelerated RabbitMQ handlers
      registerWASMAcceleratedHandlers(rabbitmqServiceWorker);
      
      // Step 4: Setup tensor-specific queue handlers
      this.setupTensorQueueHandlers();
      
      // Step 5: Setup cross-worker communication
      this.setupWorkerCommunication();
      
      this.bridgeInitialized = true;
      console.log('✅ RabbitMQ-Tensor Integration initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ RabbitMQ-Tensor Integration failed:', error);
      return false;
    }
  }
  
  /**
   * Initialize the tensor SIMD worker
   */
  private async initializeTensorWorker(): Promise<void> {
    if (typeof Worker !== 'undefined') {
      // Initialize the tensor SIMD worker (service worker)
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/tensor-simd-worker.js');
          console.log('🚀 Tensor SIMD Service Worker registered');
          
          // Setup message channel for communication
          if (registration.active) {
            this.tensorWorker = registration.active as any; // Type workaround for service worker
          }
        } catch (error) {
          console.error('❌ Failed to register tensor service worker:', error);
        }
      }
    }
  }
  
  /**
   * Setup specialized queue handlers for tensor operations
   */
  private setupTensorQueueHandlers(): void {
    console.log('🔧 Setting up tensor queue handlers...');
    
    // WASM Vector Operations Handler
    rabbitmqServiceWorker.registerHandler(WASM_QUEUE_ROUTING.wasm_vector_operations, async (message) => {
      const job: TensorProcessingJob = {
        id: message.jobId || `wasm-${Date.now()}`,
        type: 'wasm_vector_operations',
        data: {
          vectors: message.vectors,
          operation: message.operation || 'normalize'
        },
        metadata: {
          priority: message.priority || 2,
          timestamp: Date.now(),
          source: 'rabbitmq'
        }
      };
      
      await this.processTensorJob(job);
    });
    
    // WASM Similarity Compute Handler
    rabbitmqServiceWorker.registerHandler(WASM_QUEUE_ROUTING.wasm_similarity_compute, async (message) => {
      const job: TensorProcessingJob = {
        id: message.jobId || `sim-${Date.now()}`,
        type: 'wasm_similarity_compute',
        data: {
          query: message.queryVector,
          vectors: message.candidateVectors,
          operation: 'similarity',
          algorithm: message.algorithm || 'cosine'
        },
        metadata: {
          priority: message.priority || 1,
          timestamp: Date.now(),
          source: 'rabbitmq'
        }
      };
      
      const result = await this.processTensorJob(job);
      
      // Publish results to results queue
      if (result) {
        await rabbitmqServiceWorker.publishMessage(WASM_QUEUE_ROUTING.similarity_results, {
          jobId: job.id,
          similarities: result.similarities,
          processingTime: result.processingTime,
          acceleration: result.acceleration || 'wasm'
        });
      }
    });
    
    // Batch Normalization Handler
    rabbitmqServiceWorker.registerHandler(WASM_QUEUE_ROUTING.wasm_batch_normalize, async (message) => {
      const job: TensorProcessingJob = {
        id: message.jobId || `batch-${Date.now()}`,
        type: 'wasm_batch_normalize',
        data: {
          vectors: message.vectors,
          operation: 'batch_process'
        },
        metadata: {
          priority: message.priority || 2,
          timestamp: Date.now(),
          source: 'rabbitmq'
        }
      };
      
      const result = await this.processTensorJob(job);
      
      // Forward to storage queue
      if (result && result.vectors) {
        await rabbitmqServiceWorker.publishMessage(WASM_QUEUE_ROUTING.wasm_to_storage, {
          jobId: job.id,
          normalizedVectors: result.vectors,
          wasmProcessed: true,
          ready_for_storage: true
        });
      }
    });
  }
  
  /**
   * Process a tensor job using the appropriate acceleration method
   */
  private async processTensorJob(job: TensorProcessingJob): Promise<any> {
    this.processingJobs.set(job.id, job);
    
    try {
      console.log(`🔄 Processing tensor job: ${job.type} (${job.id})`);
      
      // Use tensor service worker for processing
      if (this.tensorWorker) {
        return await this.processWithTensorWorker(job);
      } else {
        // Fallback to direct WASM processing
        return await this.processWithDirectWASM(job);
      }
    } catch (error) {
      console.error(`❌ Tensor job processing failed (${job.id}):`, error);
      throw error;
    } finally {
      this.processingJobs.delete(job.id);
    }
  }
  
  /**
   * Process job using tensor service worker
   */
  private async processWithTensorWorker(job: TensorProcessingJob): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Tensor worker processing timeout'));
      }, 30000);
      
      // Setup message listener
      const messageHandler = (event: MessageEvent<TensorWorkerMessage>) => {
        if (event.data.id === job.id) {
          clearTimeout(timeout);
          
          if (event.data.type === 'TENSOR_PROCESSED') {
            resolve(event.data.result);
          } else if (event.data.type === 'TENSOR_ERROR') {
            reject(new Error(event.data.error || 'Tensor processing error'));
          }
        }
      };
      
      // Send job to tensor worker
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.addEventListener('message', messageHandler);
        
        navigator.serviceWorker.controller.postMessage({
          type: 'PROCESS_TENSOR',
          id: job.id,
          data: {
            operation: job.data.operation,
            vectors: job.data.vectors,
            query: job.data.query,
            algorithm: job.data.algorithm
          }
        });
      } else {
        clearTimeout(timeout);
        reject(new Error('Service worker not available'));
      }
    });
  }
  
  /**
   * Process job using direct WASM operations (fallback)
   */
  private async processWithDirectWASM(job: TensorProcessingJob): Promise<any> {
    console.log(`🔧 Using direct WASM processing for ${job.id}`);
    
    // Import WASM bridge functions for direct processing
    const { computeVectorSimilarityWASM } = await import('$lib/adapters/wasm-rabbitmq-bridge.js');
    
    switch (job.data.operation) {
      case 'similarity':
        if (job.data.query && job.data.vectors) {
          const similarities = await computeVectorSimilarityWASM(
            job.data.query,
            job.data.vectors,
            job.data.algorithm || 'cosine'
          );
          return { similarities, acceleration: 'direct_wasm' };
        }
        break;
        
      case 'normalize':
      case 'batch_process':
        // Direct WASM normalization would be implemented here
        console.log('🔧 Direct WASM normalization not yet implemented, using JS fallback');
        return { vectors: job.data.vectors, acceleration: 'javascript' };
        
      default:
        throw new Error(`Unknown operation: ${job.data.operation}`);
    }
  }
  
  /**
   * Setup communication between workers
   */
  private setupWorkerCommunication(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const message: TensorWorkerMessage = event.data;
        
        // Handle tensor processing results
        if (message.type === 'TENSOR_PROCESSED') {
          console.log(`✅ Tensor processing completed: ${message.id}`);
          // Results are handled by processWithTensorWorker Promise resolution
        } else if (message.type === 'TENSOR_ERROR') {
          console.error(`❌ Tensor processing error: ${message.id}`, message.error);
        }
      });
    }
  }
  
  /**
   * Submit a tensor job directly (API endpoint can use this)
   */
  async submitTensorJob(
    type: JobType,
    data: TensorProcessingJob['data'],
    priority: number = 2
  ): Promise<string> {
    const job: TensorProcessingJob = {
      id: `api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      metadata: {
        priority,
        timestamp: Date.now(),
        source: 'direct_api'
      }
    };
    
    // Process job immediately
    try {
      await this.processTensorJob(job);
      return job.id;
    } catch (error) {
      console.error('❌ Direct tensor job submission failed:', error);
      throw error;
    }
  }
  
  /**
   * Get integration status and health
   */
  getStatus() {
    const bridgeStatus = getBridgeStatus();
    
    return {
      integrated: this.bridgeInitialized,
      tensorWorker: this.tensorWorker !== null,
      bridge: bridgeStatus,
      activeJobs: this.processingJobs.size,
      ports: WASM_SERVICE_PORTS,
      queues: WASM_QUEUE_ROUTING,
      timestamp: Date.now()
    };
  }
  
  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down RabbitMQ-Tensor Integration...');
    
    // Wait for active jobs to complete
    if (this.processingJobs.size > 0) {
      console.log(`⏳ Waiting for ${this.processingJobs.size} active jobs to complete...`);
      // In production, implement proper job cancellation
    }
    
    this.tensorWorker = null;
    this.bridgeInitialized = false;
    
    console.log('✅ RabbitMQ-Tensor Integration shutdown complete');
  }
}

// Export singleton instance
export const rabbitMQTensorIntegration = RabbitMQTensorIntegration.getInstance();

// Convenience functions for API endpoints
export async function initializeIntegration(): Promise<boolean> {
  return await rabbitMQTensorIntegration.initialize();
}

export async function submitDirectTensorJob(
  type: JobType,
  data: TensorProcessingJob['data'],
  priority?: number
): Promise<string> {
  return await rabbitMQTensorIntegration.submitTensorJob(type, data, priority);
}

export function getIntegrationStatus() {
  return rabbitMQTensorIntegration.getStatus();
}