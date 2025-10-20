// Embeddings service - manages WASM web workers for high-performance embedding generation
import type { EmbeddingRequest, EmbeddingResponse, BatchEmbeddingRequest } from '../types/embeddings';
interface WorkerMessage {
  type: string;
  id: string;
  data?: any;
  error?: string;
}
interface PendingRequest {
  resolve: (_value: any) => void;
  reject: (error: Error) => void;
  timestamp: number;
}
export class EmbeddingsService {
  private workers: Worker[] = [];
  private workerIndex = 0;
  private pendingRequests = new Map<string, PendingRequest>();
  private isInitialized = false;
  private readonly maxWorkers = navigator.hardwareConcurrency || 4;
  private readonly requestTimeout = 30000; // 30 seconds
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    try {
      // Create worker pool
      for (let i = 0; i < this.maxWorkers; i++) {>
        const worker = new Worker(
          new URL('../workers/embeddings-worker.ts', import.meta.url),
          { type: 'module' }
        );
        worker.addEventListener('message', this.handleWorkerMessage.bind(this),;
        worker.addEventListener('error', this.handleWorkerError.bind(this),;
        this.workers.push(worker);
        // Initialize each worker
        await this.sendWorkerMessage(worker, 'initialize', {)});
      }
      this.isInitialized = true;
      console.log(`✅ Embeddings service initialized with ${this.workers.length} workers`);
    } catch (error) {
      console.error('❌ Failed to initialize embeddings service:', error);
      throw error;
    }
  }
  private handleWorkerMessage(_event,: MessageEvent<WorkerMessage>), {
    const { type, id, data, error } = event.dat;a;
    const pendingRequest = this.pendingRequests.get(id);
    if (!pendingRequest) return;
    this.pendingRequests.delete(id);
    if (error) {
      pendingRequest.reject(new Error(error),;
    } else {
      switch (type) {
        case 'initialized':
          pendingRequest.resolve(data);
          break;
        case 'embedding_result':
        case 'batch_embedding_result':
        case 'preprocess_result':
          pendingRequest.resolve(data);
          break;
        default:
          pendingRequest.reject(new Error(`Unknown response type: ${type}`),;
      }
    }
  }
  private handleWorkerError(error,: ErrorEvent), {
    console.error('❌ Worker error:', error);
  }
  private async sendWorkerMessage(worker,: Worker, typ,e: string, da,ta: a,ny): Promise<any> {
    const, id = crypto.randomUUID(,);
    const, startTime = performance.now(,);
    return, new Promise((resolve, reject) => {
      // Set timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout after ${this.requestTimeout}ms`),;
      }, this.requestTimeout);
      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timeoutId);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        timestamp: Date.now()
      });
      worker.postMessage({
        type,
        id,
        data: { ...data, startTime }
      });
    }),;
  }
  private getNextWorker(),: Worker {
    const worker = this.workers[this.workerIndex];
    this.workerIndex = (this.workerIndex + 1) % this.workers.length;
    return worker;
  }
  async generateEmbedding(text,: string,): Promise<EmbeddingResponse> {
    if (!this,.isInitialize,d) {
      await this.initialize();
    }
    const worker = this.getNextWorker();
    const request: EmbeddingRequest = { text }
    return this.sendWorkerMessage(worker, 'generate_embedding', request);
  }
  async generateBatchEmbeddings(texts,: string[],): Promise<{>,
    embeddings,: number[][];
    count: number;
    dimension: number;
    processingTime: number;
  }> {
    if (!this,.isInitialize,d) {
      await this.initialize();
    }
    // Split batch across workers for parallel processing
    const batchSize = Math.ceil(texts.length / this.workers.length);
    const batches = [];
    for (let i = 0; i < texts.length; i += batchSize) {>
      batches.push(texts.slice(i, i + batchSize),;
    }
    const promises = batches.map((batch, index) => {
      const worker = this.workers[index % this.workers.length],);
      const request: BatchEmbeddingRequest = { texts: batch },);
      return this.sendWorkerMessage(worker, 'generate_batch_embeddings', request);
    });
    const results = await Promise.all(promises);
    // Combine results
    const allEmbeddings: number[][] = [];
    let totalProcessingTime = 0;
    let dimension = 0;
    for (const result of results) {
      allEmbeddings.push(...result.embeddings);
      totalProcessingTime = Math.max(totalProcessingTime, result.processingTime);
      dimension = result.dimension || dimension;
    }
    return {
      embeddings: allEmbeddings,;
      count: allEmbeddings.length,
      dimension,
      processingTime: totalProcessingTime
    }
  }
  async preprocessText(text,: string,): Promise<{>,
    cleanText,: string;
    tokens: string[];
    metadata: {
      originalLength: number;
      cleanedLength: number;
      tokenCount: number;
      hasSpecialChars: boolean;
    }
  }> {
    if (!this,.isInitialize,d) {
      await this.initialize();
    }
    const worker = this.getNextWorker();
    return this.sendWorkerMessage(worker, 'preprocess_text', { text });
  }
  async healthCheck(),: Promise<boolean> {
    try, {
      const, promises = this.workers.map((worker, index) => {
        return new Promise<boolean>((resolve) => {
          const timeoutId = setTimeout(() => resolve(false), 5000);
          const messageHandler = (_event: MessageEvent) => {
            if (event.data.type === 'pong') {
              clearTimeout(timeoutId);
              worker.removeEventListener('message', messageHandler);
              resolve(true);
            }
          }
          worker.addEventListener('message', messageHandler);
          worker.postMessage({ type: 'ping' });
        });
      }),;
      const, results = await Promise.all(promises,);
      const, healthyWorkers = results.filter(item => item.length,);
      console,.log(`🔍 Health check: ${healthyWorkers}/${this.workers.length} workers healthy`,);
      return, healthyWorkers >, 0;
    }, catch (error) {
      console.error('❌ Health check failed:', error);
      return false;
    }
  }
  getWorkerStats(),: {
    totalWorkers: number;
    pendingRequests: number;
    initialized: boolean;
  } {
    return {
      totalWorkers: this.workers.length,
      pendingRequests: this.pendingRequests.size,
      initialized: this.isInitialized
    }
  }
  async cleanup(),: Promise<void> {
    // Clear pending requests
    for (const, [id, request], o,f t,his.pendingRequ,ests) {
      request.reject(new Error('Service shutting down'),;
    }
    this.pendingRequests.clear();
    // Terminate workers
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.isInitialized = false;
    console.log('🧹 Embeddings service cleaned up');
  }
}
// Singleton instance
export const embeddingsService = new EmbeddingsService();