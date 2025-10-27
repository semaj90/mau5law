/**
 * WebASM llama.cpp Inference Engine
 * High-performance client-side LLM inference using WebAssembly
 * Eliminates server round-trips for 2-5 second response times
 */
// Remove triple-slash reference and use an import-style include for local type file
import type {} from '../types/webgpu'; // keeps any local ambient webgpu declarations included

export interface LlamaCppConfig {
  modelPath: string;
  contextSize: number;
  gpuLayers: number; // RTX 3060 Ti can handle 32-40 layers,
  threadCount: number;
  batchSize: number;
  useGPU: boolean;
  quantization: 'f16' | 'q4_0' | 'q4_1' | 'q5_0' | 'q5_1' | 'q8_0';
}
export interface InferenceRequest {
  prompt: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  stopTokens?: string[];
  stream?: boolean;
}
export interface InferenceResult {
  text: string;
  tokens: number;
  processingTime: number;
  tokensPerSecond: number;
  memoryUsage: number;
  gpuUtilization?: number;
}

// Add narrow types for wasm interactions
type WasmPtr = number;
type TokenArray = Int32Array | Uint32Array | number[];

interface LlamaInitOptions {
  model_ptr: WasmPtr;
  model_size: number;
  context_size?: number;
  gpu_layers?: number;
  thread_count?: number;
  batch_size?: number;
  use_gpu?: number | boolean;
  [key: string]: unknown;
}

interface LlamaParams {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  [key: string]: unknown;
}

interface LlamaGenerateOptions {
  input_tokens: TokenArray;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  batch_size?: number;
  [key: string]: unknown;
}

// Add a typed interface for wasm exports we call so TS knows functions and memory exist
interface WasmExports {
  // memory exported from the wasm module
  memory: WebAssembly.Memory;

  // basic allocator helpers
  malloc(size: number): WasmPtr;
  free(ptr: WasmPtr): void;

  // llama.cpp bindings (signatures are more specific)
  llama_init(opts: LlamaInitOptions): number | boolean;
  llama_cleanup(): void;

  llama_set_params(opts: LlamaParams): void;
  // accepts a pointer to tokens or an array of token IDs
  llama_eval(inputPtrOrArray: WasmPtr | TokenArray): void;
  llama_sample(): number;
  llama_token_eos(): number;

  // generation helpers
  llama_generate(opts: LlamaGenerateOptions): number[]; // may vary by build

  // tokenizer / detokenizer helpers (approx)
  llama_tokenize(textPtr: WasmPtr, length: number): WasmPtr;
  llama_token_count(tokensPtr: WasmPtr): number;
  llama_detokenize(tokensPtrOrArray: WasmPtr | TokenArray): WasmPtr;
  llama_text_length(textPtr: WasmPtr): number;

  // any other exported helpers used elsewhere can be added here
  [key: string]: unknown;
}

export class WebASMLlamaCppEngine {
  // change wasmModule type to the new interface (or null)
  private wasmModule: WasmExports | null = null; // was WebAssembly.Exports | null
  private modelLoaded = false;
  private config: LlamaCppConfig;
  private gpuDevice: GPUDevice | null = null;
  private db: IDBDatabase | null = null; // Added for IndexedDB
  // Performance monitoring
  private totalInferences = 0;
  private totalTokens = 0;
  private averageLatency = 0;
  constructor(config: Partial<LlamaCppConfig> = {}) {
    this.config = {
      modelPath: config.modelPath || '/models/gemma-3-270m-q4_0.gguf', // Changed from gemma-2b-q4_0.gguf
      contextSize: config.contextSize || 2048,
      gpuLayers: config.gpuLayers || 35, // RTX 3060 Ti optimized
      threadCount: config.threadCount || navigator.hardwareConcurrency || 8,
      batchSize: config.batchSize || 512,
      useGPU: config.useGPU ?? true,
      quantization: config.quantization || 'q4_0',
    };
  }
  /**
   * Initialize WebAssembly module and GPU acceleration
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing WebASM llama.cpp engine...');
      // Load WebAssembly module
      const wasmUrl = this.config.useGPU
        ? '/wasm/llama-cpp-cuda.wasm' // CUDA-enabled build
        : '/wasm/llama-cpp-cpu.wasm'; // CPU-only fallback
      this.wasmModule = await this.loadWasmModule(wasmUrl);
      // Initialize GPU if available
      if (this.config.useGPU) {
        await this.initializeGPU();
      }
      this.db = await this.openIndexedDB(); // Initialize IndexedDB
      // Load the model
      await this.loadModel();
      console.log('✅ WebASM llama.cpp engine initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ WebASM engine initialization failed:', error);
      return false;
    }
  }
  /**
   * Load WebAssembly module with optimization flags
   */
  private async loadWasmModule(wasmUrl: string): Promise<WasmExports> {
    const response = await fetch(wasmUrl);
    const wasmBytes = await response.arrayBuffer();
    const wasmModule = await WebAssembly.compile(wasmBytes);

    const memory = new WebAssembly.Memory({
      initial: 256,
      maximum: 2048,
      shared: true,
    });

    const instance = await WebAssembly.instantiate(wasmModule, {
      env: {
        memory,
        gpu_malloc: this.gpuMalloc.bind(this),
        gpu_free: this.gpuFree.bind(this),
        gpu_memcpy: this.gpuMemcpy.bind(this),
        __pthread_create: this.pthreadCreate.bind(this),
        __pthread_join: this.pthreadJoin.bind(this),
        get_time_ms: () => performance.now(),
      },
    });

    // Cast exports to the typed interface so callable members and memory.buffer are known
    return instance.exports as unknown as WasmExports;
  }
  /**
   * Initialize WebGPU for tensor operations
   */
  private async initializeGPU(): Promise<void> {
    if (!navigator.gpu) {
      console.warn('WebGPU not available, using CPU fallback');
      return;
    }
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance', // RTX 3060 Ti
    });
    if (!adapter) {
      throw new Error('No WebGPU adapter available');
    }
    this.gpuDevice = await adapter.requestDevice({
      requiredFeatures: ['shader-f16'] as GPUFeatureName[],
      requiredLimits: {
        maxComputeWorkgroupSizeX: 1024,
        maxComputeInvocationsPerWorkgroup: 1024,
        maxBufferSize: 2 * 1024 * 1024 * 1024, // 2GB for large models
      },
    });
    console.log('🎮 WebGPU initialized for tensor acceleration');
  }
  /**
   * Load quantized model into WebASM memory
   */
  private async loadModel(): Promise<void> {
    console.log(`📦 Loading model: ${this.config.modelPath}`);
    // Download model if not cached
    const modelData = await this.downloadModel(this.config.modelPath);
    const modelSize = modelData.byteLength;

    if (!this.wasmModule) throw new Error('WASM module not initialized');

    const modelPtr = this.wasmModule.malloc(modelSize);

    // Access memory.buffer now that wasmModule.memory is typed as WebAssembly.Memory
    const wasmMemory = new Uint8Array(this.wasmModule.memory.buffer);
    wasmMemory.set(new Uint8Array(modelData), modelPtr);

    const success = this.wasmModule.llama_init({
      model_ptr: modelPtr,
      model_size: modelSize,
      context_size: this.config.contextSize,
      gpu_layers: this.config.gpuLayers,
      thread_count: this.config.threadCount,
      batch_size: this.config.batchSize,
      use_gpu: this.config.useGPU ? 1 : 0,
    });

    if (!success) {
      throw new Error('Failed to initialize llama.cpp context');
    }
    this.modelLoaded = true;
    console.log('✅ Model loaded successfully');
  }
  /**
   * Download and cache model file
   */
  private async downloadModel(modelPath: string): Promise<ArrayBuffer> {
    // Check IndexedDB cache first
    const cachedModel = await this.getCachedModel(modelPath);
    if (cachedModel) {
      console.log('📁 Using cached model');
      return cachedModel;
    }
    console.log('⬇️ Downloading model...');
    const response = await fetch(modelPath, {
      headers: {
        'Range': 'bytes=0-', // Support resume
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to download model: ${response.status}`);
    }
    const modelData = await response.arrayBuffer();
    // Cache for future use
    await this.cacheModel(modelPath, modelData);
    return modelData;
  }
  /**
   * Run inference with WebASM + GPU acceleration
   */
  async runInference(request: InferenceRequest): Promise<InferenceResult> {
    if (!this.modelLoaded) {
      throw new Error('Model not loaded. Call initialize() first.');
    }
    const startTime = performance.now();
    try {
      // Tokenize input
      const inputTokens = await this.tokenize(request.prompt);
      // Run inference loop
      let outputTokens: number[] = [];
      let outputText = '';
      if (request.stream) {
        // Streaming inference
        for await (const token of this.streamInference(inputTokens, request)) {
          outputTokens.push(token);
          outputText += await this.detokenize([token]);
          // Check stop conditions
          if (outputTokens.length >= request.maxTokens) break;
          if (request.stopTokens?.some(stop => outputText.includes(stop))) break;
        }
      } else {
        // Batch inference
        outputTokens = await this.batchInference(inputTokens, request);
        outputText = await this.detokenize(outputTokens);
      }
      const processingTime = performance.now() - startTime;
      const tokensPerSecond = outputTokens.length / (processingTime / 1000);
      // Update performance metrics
      this.updateMetrics(outputTokens.length, processingTime);
      return {
        text: outputText,
        tokens: outputTokens.length,
        processingTime,
        tokensPerSecond,
        memoryUsage: this.getMemoryUsage(),
        gpuUtilization: await this.getGPUUtilization(),
      };
    } catch (error) {
      console.error('Inference failed:', error);
      throw error;
    }
  }
  /**
   * Streaming inference with real-time token generation
   */
  private async *streamInference(inputTokens: number[], request: InferenceRequest): AsyncGenerator<number> {
    if (!this.wasmModule) throw new Error('WASM module not initialized');
    this.wasmModule.llama_set_params({
      temperature: request.temperature,
      top_p: request.topP,
      max_tokens: request.maxTokens,
    });

    this.wasmModule.llama_eval(inputTokens);

    for (let i = 0; i < request.maxTokens; i++) {
      const token = this.wasmModule.llama_sample();
      if (token === this.wasmModule.llama_token_eos()) break;
      yield token;
      this.wasmModule.llama_eval([token]);
    }
  }
  /**
   * Batch inference for non-streaming requests
   */
  private async batchInference(inputTokens: number[], request: InferenceRequest): Promise<number[]> {
    return this.wasmModule.llama_generate({
      input_tokens: inputTokens,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      top_p: request.topP,
      batch_size: this.config.batchSize,
    });
  }
  /**
   * Tokenize text to token IDs
   */
  private async tokenize(text: string): Promise<number[]> {
    if (!this.wasmModule) throw new Error('WASM module not initialized');
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text);
    const textPtr = this.wasmModule.malloc(textBytes.length);
    const wasmMemory = new Uint8Array(this.wasmModule.memory.buffer);
    wasmMemory.set(textBytes, textPtr);

    const tokensPtr = this.wasmModule.llama_tokenize(textPtr, textBytes.length);
    const tokenCount = this.wasmModule.llama_token_count(tokensPtr);

    const tokens = new Int32Array(this.wasmModule.memory.buffer, tokensPtr, tokenCount);
    this.wasmModule.free(textPtr);
    return Array.from(tokens);
  }
  /**
   * Detokenize token IDs to text
   */
  private async detokenize(tokens: number[]): Promise<string> {
    if (!this.wasmModule) throw new Error('WASM module not initialized');
    const textPtr = this.wasmModule.llama_detokenize(tokens);
    const textLength = this.wasmModule.llama_text_length(textPtr);
    const textBytes = new Uint8Array(this.wasmModule.memory.buffer, textPtr, textLength);
    const decoder = new TextDecoder();
    return decoder.decode(textBytes);
  }
  // GPU Memory Management for WebASM
  private gpuMalloc(size: number): number {
    if (!this.gpuDevice) return 0;
    const buffer = this.gpuDevice.createBuffer({
      size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    // Return buffer ID (simplified)
    return buffer.getMapMode ? 1 : 0;
  }
  private gpuFree(_ptr: number): void {
    // GPU buffer cleanup would happen here
  }
  private gpuMemcpy(_dest: number, _src: number, _size: number): void {
    // GPU memory copy operations
  }
  // Threading support for WebASM
  private pthreadCreate(): number {
    // WebWorker creation for threading
    return 0;
  }
  private pthreadJoin(): void {
    // WebWorker cleanup
  }
  // Performance monitoring
  private updateMetrics(tokens: number, time: number): void {
    this.totalInferences++;
    this.totalTokens += tokens;
    this.averageLatency = (this.averageLatency + time) / 2;
  }
  private getMemoryUsage(): number {
    // memory.buffer is available on typed WasmExports.memory
    return this.wasmModule?.memory?.buffer?.byteLength ?? 0;
  }
  private async getGPUUtilization(): Promise<number> {
    // Would query GPU metrics if available
    return 0.75; // Placeholder
  }
  // Model caching
  private async getCachedModel(modelPath: string): Promise<ArrayBuffer | null> {
    try {
      if (!this.db) {
        console.warn('IndexedDB not initialized.');
        return null;
      }
      const transaction = this.db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      const result = await this.promisifyRequest(store.get(modelPath)); // Fixed missing ')'
      return result?.data || null;
    } catch {
      return null;
    }
  }
  private async cacheModel(modelPath: string, data: ArrayBuffer): Promise<void> {
    try {
      if (!this.db) {
        console.warn('IndexedDB not initialized.');
        return;
      }
      const transaction = this.db.transaction(['models'], 'readwrite');
      const store = transaction.objectStore('models');
      await this.promisifyRequest(store.put({ path: modelPath, data })); // Fixed missing ')'
    } catch (error) {
      console.warn('Failed to cache model:', error);
    }
  }
  private openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('LlamaCppModels', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result; // Correctly get db from event
        db.createObjectStore('models', { keyPath: 'path' });
      };
    });
  }
  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
  /**
   * Get performance statistics
   */
  getStats(): {
    totalInferences: number;
    totalTokens: number;
    averageLatency: number;
    tokensPerSecond: number;
    memoryUsage: number;
  } {
    return {
      totalInferences: this.totalInferences,
      totalTokens: this.totalTokens,
      averageLatency: this.averageLatency,
      tokensPerSecond: this.averageLatency > 0 ? 1000 / this.averageLatency : 0,
      memoryUsage: this.getMemoryUsage(),
    };
  }
  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.wasmModule) {
      this.wasmModule.llama_cleanup?.();
    }
    if (this.gpuDevice) {
      // Some implementations may not expose destroy(); guard defensively
      // call destroy only if it exists and is a function (no TS directive needed)
      const anyDevice = this.gpuDevice as unknown as { destroy?: unknown };
      if (typeof anyDevice.destroy === 'function') {
        (anyDevice.destroy as () => void)();
      }
    }
    console.log('🔥 WebASM llama.cpp engine cleaned up');
  }
}
// Export singleton instance
export const llamaCppEngine = new WebASMLlamaCppEngine({
  modelPath: '/models/gemma-3-270m-q4_0.gguf', // Changed from gemma-2b-q4_0.gguf
  contextSize: 2048,
  gpuLayers: 35,
});
// Convenience function for quick inference
export async function runQuickInference(
  prompt: string,
  options: Partial<InferenceRequest> = {}
): Promise<InferenceResult> {
  if (!llamaCppEngine) {
    throw new Error('llama.cpp engine not initialized');
  }
  return llamaCppEngine.runInference({
    prompt,
    maxTokens: options.maxTokens || 256,
    temperature: options.temperature || 0.1,
    topP: options.topP || 0.9,
    stream: options.stream || false,
    stopTokens: options.stopTokens || ['</s>', '\n\n'],
  });
}