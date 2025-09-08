/**
 * SIMD JSON Web Worker Client
 * Provides easy interface for off-main-thread JSON parsing
 */

interface SIMDWorkerMessage {
  type: string;
  id: string;
  data?: any;
  error?: string;
  success?: boolean;
  metadata?: any;
}

interface ParseOptions {
  timeout?: number;
  structured_clone?: boolean;
}

export class SIMDJSONWorkerClient {
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout?: NodeJS.Timeout;
  }>();
  
  private isReady = false;
  private initPromise: Promise<boolean> | null = null;
  
  constructor() {
    if (typeof Worker !== 'undefined') {
      this.initWorker();
    }
  }
  
  /**
   * Initialize the SIMD JSON worker
   */
  private async initWorker(): Promise<void> {
    try {
      this.worker = new Worker('/simd-json-worker.js');
      
      this.worker.addEventListener('message', (event) => {
        this.handleWorkerMessage(event.data);
      });
      
      this.worker.addEventListener('error', (error) => {
        console.error('SIMD JSON Worker Error:', error);
        this.rejectAllPending(new Error('Worker error occurred'));
      });
      
      console.log('🚀 SIMD JSON Worker Client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize SIMD JSON Worker:', error);
      throw error;
    }
  }
  
  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(message: SIMDWorkerMessage): void {
    const { type, id } = message;
    
    // Handle worker ready message
    if (type === 'WORKER_READY') {
      console.log('✅ SIMD JSON Worker ready');
      return;
    }
    
    // Handle initialization complete
    if (type === 'INIT_COMPLETE') {
      this.isReady = message.success || false;
      console.log(`🔧 SIMD JSON Worker initialization: ${this.isReady ? 'success' : 'failed'}`);
    }
    
    // Handle pending requests
    const pending = this.pendingRequests.get(id);
    if (!pending) return;
    
    // Clear timeout
    if (pending.timeout) {
      clearTimeout(pending.timeout);
    }
    
    // Remove from pending
    this.pendingRequests.delete(id);
    
    // Resolve or reject based on message type
    switch (type) {
      case 'PARSE_COMPLETE':
      case 'BATCH_COMPLETE':
      case 'VECTOR_PARSE_COMPLETE':
      case 'STATS':
      case 'BENCHMARK_COMPLETE':
      case 'STATS_RESET':
        pending.resolve({
          data: message.data,
          metadata: message.metadata,
          success: true
        });
        break;
        
      case 'PARSE_ERROR':
      case 'ERROR':
        pending.reject(new Error(message.error || 'Unknown worker error'));
        break;
        
      default:
        pending.reject(new Error(`Unknown message type: ${type}`));
    }
  }
  
  /**
   * Send message to worker and return promise
   */
  private sendMessage(type: string, data?: any, options: ParseOptions = {}): Promise<any> {
    if (!this.worker) {
      return Promise.reject(new Error('Worker not available'));
    }
    
    const id = `msg-${++this.messageId}-${Date.now()}`;
    const timeout = options.timeout || 30000; // 30s default timeout
    
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Worker request timeout'));
      }, timeout);
      
      // Store pending request
      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeout: timeoutId
      });
      
      // Send message to worker
      this.worker!.postMessage({
        type,
        id,
        data
      });
    });
  }
  
  /**
   * Initialize worker with SIMD capabilities
   */
  async initialize(): Promise<boolean> {
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = (async () => {
      if (!this.worker) return false;
      
      try {
        const result = await this.sendMessage('INIT');
        return result.success;
      } catch (error) {
        console.error('❌ Worker initialization failed:', error);
        return false;
      }
    })();
    
    return this.initPromise;
  }
  
  /**
   * Parse JSON string using SIMD acceleration
   */
  async parseJSON(jsonString: string, options: ParseOptions = {}): Promise<any> {
    if (!this.isReady) {
      await this.initialize();
    }
    
    if (!this.worker) {
      // Fallback to native JSON.parse
      return JSON.parse(jsonString);
    }
    
    try {
      const result = await this.sendMessage('PARSE_JSON', { jsonString, options }, options);
      return result.data;
    } catch (error) {
      // Fallback to native JSON.parse on error
      console.warn('SIMD JSON parsing failed, falling back to native:', error);
      return JSON.parse(jsonString);
    }
  }
  
  /**
   * Parse multiple JSON strings in batch
   */
  async parseBatch(jsonStrings: string[], options: ParseOptions = {}): Promise<any[]> {
    if (!this.isReady) {
      await this.initialize();
    }
    
    if (!this.worker) {
      // Fallback to native JSON.parse
      return jsonStrings.map(json => JSON.parse(json));
    }
    
    try {
      const result = await this.sendMessage('PARSE_BATCH', { jsonStrings }, options);
      return result.data;
    } catch (error) {
      // Fallback to native JSON.parse
      console.warn('SIMD batch parsing failed, falling back to native:', error);
      return jsonStrings.map(json => JSON.parse(json));
    }
  }
  
  /**
   * Parse vector/tensor data with validation
   */
  async parseVectorData(vectorJson: string, options: ParseOptions = {}): Promise<{
    vectors?: number[][];
    embeddings?: number[][];
    similarities?: number[];
    metadata?: any;
  }> {
    if (!this.isReady) {
      await this.initialize();
    }
    
    if (!this.worker) {
      // Fallback to native JSON.parse
      return JSON.parse(vectorJson);
    }
    
    try {
      const result = await this.sendMessage('PARSE_VECTOR_DATA', { vectorJson }, options);
      return result.data;
    } catch (error) {
      // Fallback to native JSON.parse
      console.warn('SIMD vector parsing failed, falling back to native:', error);
      return JSON.parse(vectorJson);
    }
  }
  
  /**
   * Get worker performance statistics
   */
  async getStats(): Promise<{
    totalParsed: number;
    totalTime: number;
    avgTime: number;
    errors: number;
    simdReady: boolean;
  }> {
    if (!this.worker) {
      return {
        totalParsed: 0,
        totalTime: 0,
        avgTime: 0,
        errors: 0,
        simdReady: false
      };
    }
    
    try {
      const result = await this.sendMessage('GET_STATS');
      return result.data;
    } catch (error) {
      console.error('Failed to get worker stats:', error);
      throw error;
    }
  }
  
  /**
   * Run performance benchmark
   */
  async benchmark(iterations: number = 1000, testSize: 'small' | 'medium' | 'large' = 'medium'): Promise<{
    iterations: number;
    totalTime: number;
    avgTime: number;
    parsesPerSecond: number;
    testDataSize: number;
  }> {
    if (!this.worker) {
      throw new Error('Worker not available for benchmarking');
    }
    
    const result = await this.sendMessage('BENCHMARK', { iterations, testSize });
    return result.data;
  }
  
  /**
   * Reset worker statistics
   */
  async resetStats(): Promise<void> {
    if (!this.worker) return;
    
    await this.sendMessage('RESET_STATS');
  }
  
  /**
   * Check if worker is ready and SIMD is available
   */
  isWorkerReady(): boolean {
    return this.isReady && this.worker !== null;
  }
  
  /**
   * Reject all pending requests
   */
  private rejectAllPending(error: Error): void {
    for (const [id, pending] of this.pendingRequests) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }
  
  /**
   * Terminate worker and cleanup
   */
  terminate(): void {
    if (this.worker) {
      this.rejectAllPending(new Error('Worker terminated'));
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
      this.initPromise = null;
    }
  }
}

// Export singleton instance for global use
export const simdJSONClient = new SIMDJSONWorkerClient();

// Convenience functions for common operations
export async function parseJSONOffThread(jsonString: string, timeout?: number): Promise<any> {
  return simdJSONClient.parseJSON(jsonString, { timeout });
}

export async function parseBatchOffThread(jsonStrings: string[], timeout?: number): Promise<any[]> {
  return simdJSONClient.parseBatch(jsonStrings, { timeout });
}

export async function parseVectorDataOffThread(vectorJson: string, timeout?: number): Promise<any> {
  return simdJSONClient.parseVectorData(vectorJson, { timeout });
}

export async function benchmarkSIMDJSON(iterations?: number, testSize?: 'small' | 'medium' | 'large'): Promise<any> {
  return simdJSONClient.benchmark(iterations, testSize);
}