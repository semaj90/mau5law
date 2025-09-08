// WebAssembly llama.cpp with WebGPU acceleration for client-side AI
// Supports Gemma 3 Legal models in browser with hardware acceleration

import '../types/index.js';
import type { WebASMRankingCache } from '../webgpu/webasm-ranking-cache';
// Use the ranking cache metrics only for reporting (kept separate from our local metrics)
type RankingCacheMetrics = import('../webgpu/webasm-ranking-cache').CacheMetrics;

// Define missing types locally
type RankingAlgorithm = 'cosine' | 'euclidean' | 'dot_product' | 'manhattan';
type LlamaGenerationParams = { maxTokens?: number; temperature?: number };

export interface WebLlamaConfig {
  modelUrl: string;
  wasmUrl: string;
  threadsCount: number;
  contextSize: number;
  enableWebGPU: boolean;
  enableMultiCore: boolean;
  batchSize: number;
  temperature: number;
  // Enhanced caching configuration
  enableRankingCache: boolean;
  cacheStrategy: RankingAlgorithm;
  maxCacheSize: number;
  enableServiceWorker: boolean;
  quicEndpoint?: string;
}

export interface WebLlamaResponse {
  text: string;
  tokensGenerated: number;
  processingTime: number;
  confidence: number;
  fromCache: boolean;
  // Enhanced response metadata
  cacheHit: boolean;
  rankingScore?: number;
  vectorSimilarity?: number;
  processingPath:
    | 'wasm'
    | 'worker'
    | 'cache'
    | 'fallback'
    | 'ollama'
    | 'webasm-cache'
    | 'nes-orchestrator'
    | 'llamacpp-cuda'
    | 'ollama-fallback';
  metrics?: {
    embeddingTime: number;
    inferenceTime: number;
    cacheTime: number;
    totalTime: number;
  };
}

class WebAssemblyLlamaService {
  private module: any = null;
  private modelLoaded = false;
  private currentModel: string | null = null;
  private config: WebLlamaConfig;
  private cache = new Map<string, WebLlamaResponse>();
  private maxCacheSize = 100;
  private worker: Worker | null = null;
  private webgpuDevice: GPUDevice | null = null;
  // Enhanced caching system
  private rankingCache: WebASMRankingCache | null = null;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private cacheMetrics: {
    hitRatio: number;
    avgLatency: number;
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
    evictions: number;
    memoryUsage: number;
    lastUpdated: number;
  } = {
    hitRatio: 0,
    avgLatency: 0,
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    evictions: 0,
    memoryUsage: 0,
    lastUpdated: Date.now(),
  };

  constructor(config: Partial<WebLlamaConfig> = {}) {
    this.config = {
      modelUrl: '/models/gemma3:270m',
      wasmUrl: '/wasm/llama.wasm',
      threadsCount: navigator.hardwareConcurrency || 4,
      contextSize: 8192,
      enableWebGPU: true,
      enableMultiCore: true,
      batchSize: 512,
      temperature: 0.1,
      // Enhanced caching defaults
      enableRankingCache: true,
      cacheStrategy: 'cosine',
      maxCacheSize: 500,
      enableServiceWorker: true,
      quicEndpoint: '/api/cache/ranking',
      ...config,
    };

    this.initializeWebGPU();
    this.initializeWorker();
    this.initializeRankingCache();
  }

  /**
   * Initialize WebGPU for hardware acceleration
   */
  private async initializeWebGPU(): Promise<any> {
    if (!this.config.enableWebGPU || !navigator.gpu) {
      console.log('[WebLlama] WebGPU not available, falling back to CPU');
      return;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
      });

      if (!adapter) {
        console.warn('[WebLlama] No WebGPU adapter found');
        return;
      }

      this.webgpuDevice = await adapter.requestDevice({
        requiredFeatures: [] as GPUFeatureName[], // No special features for broader compatibility
        requiredLimits: {
          maxBufferSize: 1024 * 1024 * 1024, // 1GB
          maxStorageBufferBindingSize: 512 * 1024 * 1024, // 512MB
        },
      });

      console.log('[WebLlama] WebGPU initialized successfully');

      // Set up error handling
      (this.webgpuDevice as any).onuncapturederror = (event: any) => {
        console.error('[WebLlama] WebGPU error:', event.error);
      };
    } catch (error: any) {
      console.error('[WebLlama] WebGPU initialization failed:', error);
    }
  }

  /**
   * Initialize WebAssembly Ranking Cache with service worker support
   */
  private async initializeRankingCache(): Promise<void> {
    if (!this.config.enableRankingCache) return;

    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.log(
        '[WebLlama] Browser environment not available, skipping ranking cache initialization'
      );
      return;
    }

    try {
      // Import the ranking cache module dynamically
      const { WebASMRankingCache } = await import('../webgpu/webasm-ranking-cache');

      // Map our config to the cache's API
      this.rankingCache = new WebASMRankingCache({
        maxEntries: this.config.maxCacheSize,
        ttlSeconds: 300,
        enableServiceWorker: this.config.enableServiceWorker,
        wasmModulePath: '/webasm/ranking-cache.wasm',
      });

      await this.rankingCache.initialize();

      // Set up service worker for concurrent processing
      if (this.config.enableServiceWorker && 'serviceWorker' in navigator) {
        // Register lightweight SW; ignore failures in dev
        try {
          this.serviceWorkerRegistration = await navigator.serviceWorker.register(
            '/sw-webasm-cache.js',
            { scope: '/' }
          );
        } catch (e) {
          console.warn('[WebLlama] Service Worker registration failed (dev-safe):', e);
        }

        console.log('[WebLlama] Service Worker registered for cache concurrency');
      }

      console.log('[WebLlama] Ranking cache initialized successfully');
    } catch (error: any) {
      console.error('[WebLlama] Ranking cache initialization failed:', error);
      this.config.enableRankingCache = false;
    }
  }

  /**
   * Initialize Web Worker for multi-threading
   */
  private initializeWorker(): void {
    // Only initialize workers in browser context
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      console.log('[WebLlama] Skipping worker initialization - not in browser context');
      return;
    }

    try {
      // Create a module worker for parallel generation
      this.worker = new Worker(new URL('../../workers/webllama.worker.ts', import.meta.url), {
        type: 'module',
      } as WorkerOptions);
      if (this.worker) {
        this.worker.onerror = (error) => {
          console.error('[WebLlama Worker] Error:', error);
        };
        // Optionally send init messages
        this.worker.postMessage({ type: 'init', data: { wasmUrl: this.config.wasmUrl } });
        this.worker.postMessage({ type: 'load_model', data: { modelUrl: this.config.modelUrl } });
      }
    } catch (error: any) {
      console.error('[WebLlama] Worker initialization failed:', error);
    }
  }

  /**
        console.log('[WebLlama] Optional ranking cache setup (SW only) complete');
   */
  async loadModel(): Promise<boolean> {
    try {
      console.log('[WebLlama] Connecting to Ollama API...');

      // Check if Ollama is available
      const healthCheck = await fetch('/api/ai/health');
      if (!healthCheck.ok) {
        throw new Error('Ollama API not available');
      }

      // Verify model is loaded in Ollama
      const modelCheck = await fetch('/api/ai/models');
      const models = await modelCheck.json();
      
      if (!models.models || models.models.length === 0) {
        throw new Error('No models available in Ollama');
      }

      this.modelLoaded = true;
      this.currentModel = models.models[0]?.name || 'gemma3:270m';
      console.log(`[WebLlama] Connected to Ollama with model: ${this.currentModel}`);
      return true;

    } catch (error: any) {
      console.error('[WebLlama] Ollama connection failed:', error);
      return false;
    }
  }

  /**
   * Generate text using WebAssembly llama.cpp with enhanced ranking cache
   */
  async generate(
    prompt: string,
    options: {
      maxTokens?: number;
      temperature?: number;
      useCache?: boolean;
      enableRanking?: boolean;
    } = {}
  ): Promise<WebLlamaResponse> {
    const startTime = performance.now();
    const metrics = {
      embeddingTime: 0,
      inferenceTime: 0,
      cacheTime: 0,
      totalTime: 0,
    };

    // Enhanced cache lookup with ranking (disabled in this build; using legacy cache below)

    // Fallback to legacy cache
    if (options.useCache !== false) {
      const cacheKey = this.getCacheKey(prompt, options);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return {
          ...cached,
          fromCache: true,
          cacheHit: true,
          processingPath: 'cache',
        };
      }
    }

    if (!this.modelLoaded || !this.module) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    try {
      let result: WebLlamaResponse;
      const inferenceStart = performance.now();

      if (this.worker && this.config.enableMultiCore) {
        // Use worker for parallel processing
        result = await this.generateWithWorker(prompt, options);
      } else {
        // Direct WASM call
        result = await this.generateDirect(prompt, options);
      }

      metrics.inferenceTime = performance.now() - inferenceStart;
      metrics.totalTime = performance.now() - startTime;

      // Enhanced result metadata
      result.processingTime = metrics.totalTime;
      result.fromCache = false;
      result.cacheHit = false;
      result.processingPath = this.worker && this.config.enableMultiCore ? 'worker' : 'wasm';
      result.metrics = metrics;

      // Store in enhanced ranking cache
      if (options.useCache !== false && result.confidence > 0.7) {
        await this.storeInRankingCache(prompt, result, options);
        this.addToCache(prompt, options, result); // Legacy cache backup
      }

      this.cacheMetrics.cacheMisses++;
      this.cacheMetrics.totalRequests++;
      this.updateCacheMetrics();

      return result;
    } catch (error: any) {
      console.error('[WebLlama] Generation failed:', error);
      throw error;
    }
  }

  /**
   * Analyze legal document using WebAssembly Gemma 3 Legal
   */
  async analyzeLegalDocument(
    title: string,
    content: string,
    analysisType: 'comprehensive' | 'quick' | 'risk-focused' = 'comprehensive'
  ): Promise<{
    summary: string;
    keyTerms: string[];
    entities: Array<{ type: string; value: string; confidence: number }>;
    risks: Array<{ type: string; severity: string; description: string }>;
    recommendations: string[];
    confidence: number;
    processingTime: number;
    method: string;
  }> {
    const prompt = this.buildLegalAnalysisPrompt(title, content, analysisType);

    const result = await this.generate(prompt, {
      maxTokens: 2048,
      temperature: 0.1,
      useCache: true,
    });

    const analysis = this.parseLegalAnalysisResponse(result.text) as any;

    return {
      summary: analysis?.summary || '',
      keyTerms: analysis?.keyTerms || [],
      entities: analysis?.entities || [],
      risks: analysis?.risks || [],
      recommendations: analysis?.recommendations || [],
      confidence: analysis?.confidence || 0,
      processingTime: result.processingTime,
      method: 'WebAssembly llama.cpp + Gemma 3 Legal',
    };
  }

  /**
   * Generate embedding for semantic similarity
   */
  private async generateEmbedding(text: string): Promise<Float32Array> {
    try {
      // Use WebGPU for embedding if available
      if (this.webgpuDevice) {
        return await this.generateEmbeddingWebGPU(text);
      }

      // Fallback to WASM embedding (mock for dev)
      return await this.generateEmbeddingWASM(text);
    } catch (error: any) {
      console.warn('[WebLlama] Embedding generation failed, using hash fallback:', error);
      return this.generateHashEmbedding(text);
    }
  }

  private async generateEmbeddingWebGPU(text: string): Promise<Float32Array> {
    // Minimal placeholder: hash-based fixed-size vector normalized
    const dim = 256;
    const vec = new Float32Array(dim);
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      const idx = c % dim;
      vec[idx] += (c % 13) / 13;
    }
    // Normalize
    let norm = 0;
    for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < dim; i++) vec[i] /= norm;
    return vec;
  }

  // WASM embedding fallback (mock): reuse hash embedding for now
  private async generateEmbeddingWASM(text: string): Promise<Float32Array> {
    return this.generateHashEmbedding(text);
  }

  // Pure JS hash embedding as last resort
  private generateHashEmbedding(text: string): Float32Array {
    const dim = 256;
    const vec = new Float32Array(dim);
    let h1 = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h1 ^= text.charCodeAt(i);
      h1 += (h1 << 1) + (h1 << 4) + (h1 << 7) + (h1 << 8) + (h1 << 24);
      const idx = Math.abs(h1) % dim;
      vec[idx] += 1;
    }
    // Normalize
    let norm = 0;
    for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < dim; i++) vec[i] /= norm;
    return vec;
  }

  /**
   * Store result in enhanced ranking cache
   */
  private async storeInRankingCache(
    prompt: string,
    result: WebLlamaResponse,
    options: any
  ): Promise<void> {
    // Deferred: the ranking cache API doesn't expose direct set/get; storage not supported in this build
    void prompt;
    void result;
    void options;
  }

  /**
   * Update cache performance metrics
   */
  private updateCacheMetrics(): void {
    const now = Date.now();
    this.cacheMetrics.hitRatio =
      this.cacheMetrics.totalRequests > 0
        ? this.cacheMetrics.cacheHits / this.cacheMetrics.totalRequests
        : 0;
    this.cacheMetrics.lastUpdated = now;
    // Optionally pull memory usage from ranking cache metrics
    if (this.rankingCache) {
      const m = this.rankingCache.getMetrics();
      this.cacheMetrics.memoryUsage = m.memoryUsage;
    }
  }

  /**
   * Get comprehensive service health and capabilities
   */
  getHealthStatus(): {
    modelLoaded: boolean;
    webgpuAvailable: boolean;
    webgpuEnabled: boolean;
    workerEnabled: boolean;
    cacheSize: number;
    threadsCount: number;
    wasmSupported: boolean;
    // Enhanced cache metrics
    rankingCacheEnabled: boolean;
    serviceWorkerEnabled: boolean;
    cacheMetrics: {
      hitRatio: number;
      avgLatency: number;
      totalRequests: number;
      cacheHits: number;
      cacheMisses: number;
      evictions: number;
      memoryUsage: number;
      lastUpdated: number;
    };
    performance: {
      avgLatency: number;
      hitRatio: number;
      throughput: number;
    };
  } {
    return {
      modelLoaded: this.modelLoaded,
      webgpuAvailable: !!navigator.gpu,
      webgpuEnabled: !!this.webgpuDevice,
      workerEnabled: !!this.worker,
      cacheSize: this.cache.size,
      threadsCount: this.config.threadsCount,
      wasmSupported: typeof WebAssembly !== 'undefined',
      // Enhanced metrics
      rankingCacheEnabled: !!this.rankingCache,
      serviceWorkerEnabled: !!this.serviceWorkerRegistration,
      cacheMetrics: this.cacheMetrics,
      performance: {
        avgLatency: this.cacheMetrics.avgLatency,
        hitRatio: this.cacheMetrics.hitRatio,
        throughput: this.cacheMetrics.totalRequests,
      },
    };
  }

  /**
   * Get detailed cache analytics
   */
  getCacheAnalytics(): {
    legacy: { size: number; maxSize: number };
    ranking: RankingCacheMetrics | null;
    serviceWorker: { registered: boolean; active: boolean };
  } {
    return {
      legacy: {
        size: this.cache.size,
        maxSize: this.maxCacheSize,
      },
      ranking: this.rankingCache ? this.rankingCache.getMetrics() : null,
      serviceWorker: {
        registered: !!this.serviceWorkerRegistration,
        active: !!this.serviceWorkerRegistration?.active,
      },
    };
  }

  /**
   * Clear all caches
   */
  async clearCaches(): Promise<void> {
    // Clear legacy cache
    this.cache.clear();

    // Clear ranking cache
    // No external ranking cache to clear

    // Reset metrics
    this.cacheMetrics = {
      hitRatio: 0,
      avgLatency: 0,
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      evictions: 0,
      memoryUsage: 0,
      lastUpdated: Date.now(),
    };

    console.log('[WebLlama] All caches cleared');
  }

  // Private helper methods

  private createWasmImports(): WebAssembly.Imports {
    const memory = new WebAssembly.Memory({
      initial: 256,
      maximum: 1024,
      shared: this.config.enableMultiCore,
    });

    return {
      env: {
        memory,
        // WebGPU device interface for hardware acceleration
        webgpu_device: this.webgpuDevice as unknown as WebAssembly.ImportValue,

        // Threading support
        __pthread_create: (thread: number, attr: number, func: number, arg: number) => {
          // Thread creation for multi-core processing
          return 0;
        },

        // Memory management
        malloc: (size: number) => {
          // Custom malloc implementation
          return 0;
        },

        free: (ptr: number) => {
          // Custom free implementation
        },

        // Logging
        console_log: (ptr: number, len: number) => {
          const bytes = new Uint8Array(memory.buffer, ptr, len);
          const str = new TextDecoder().decode(bytes);
          console.log('[WASM]', str);
        },

        // Performance timing
        performance_now: () => performance.now(),

        // Math functions
        Math_random: Math.random,
        Math_floor: Math.floor,
        Math_ceil: Math.ceil,
        Math_sqrt: Math.sqrt,
        Math_exp: Math.exp,
        Math_log: Math.log,
        Math_pow: Math.pow,
      },

      wasi_snapshot_preview1: {
        // WASI interface stubs
        proc_exit: (code: number) => {
          console.log('[WASM] Process exit:', code);
        },

        fd_write: (fd: number, iovs: number, iovs_len: number, nwritten: number) => {
          // File descriptor write (stdout/stderr)
          return 0;
        },
      },
    };
  }

  private async generateWithWorker(prompt: string, options: any): Promise<WebLlamaResponse> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Worker generation timeout'));
      }, 30000);

      const messageHandler = (e: MessageEvent) => {
        const { type, result, error } = e.data;

        if (type === 'generation_complete') {
          clearTimeout(timeout);
          this.worker!.removeEventListener('message', messageHandler);
          resolve({
            ...result,
            confidence: 0.9,
            fromCache: false,
          });
        } else if (type === 'generation_error') {
          clearTimeout(timeout);
          this.worker!.removeEventListener('message', messageHandler);
          reject(new Error(error));
        }
      };

      this.worker.addEventListener('message', messageHandler);
      this.worker.postMessage({
        type: 'generate',
        data: { prompt, options },
      });
    });
  }

  private async generateDirect(prompt: string, options: any): Promise<WebLlamaResponse> {
    // Call Ollama API directly
    const opts = options as LlamaGenerationParams;
    const maxTokens = opts.maxTokens || 1024;
    const temperature = opts.temperature || this.config.temperature;

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.currentModel,
          prompt: prompt,
          options: {
            num_predict: maxTokens,
            temperature: temperature,
          },
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      const resultText = data.response || '';

      return {
        text: resultText,
        tokensGenerated: this.estimateTokenCount(resultText),
        processingTime: 0, // Will be set by caller
        confidence: 0.85,
        fromCache: false,
        cacheHit: false,
        processingPath: 'ollama',
      };
    } catch (error: any) {
      console.error('[WebLlama] Ollama API call failed:', error);
      throw error;
    }
  }

  private buildLegalAnalysisPrompt(title: string, content: string, analysisType: string): string {
    const instructions = {
      comprehensive: 'Provide detailed analysis of all legal aspects',
      quick: 'Provide concise summary of key legal points',
      'risk-focused': 'Focus on identifying legal risks and compliance issues',
    };

    return `<|system|>You are a specialized legal AI assistant. Analyze the following legal document.

Instructions: ${instructions[analysisType as keyof typeof instructions]}

Document Title: ${title}

Document Content:
${content.substring(0, 6000)}

Provide analysis in structured format:

<analysis>
<summary>[Clear summary]</summary>
<key_terms>[Terms separated by commas]</key_terms>
<entities>[TYPE:VALUE:CONFIDENCE format, one per line]</entities>
<risks>[TYPE:SEVERITY:DESCRIPTION format, one per line]</risks>
<recommendations>[One per line]</recommendations>
<confidence>[0.0 to 1.0]</confidence>
</analysis>

<|assistant|>`;
  }

  private parseLegalAnalysisResponse(response: string): any {
    // Similar parsing logic as in the server-side version
    const analysis = {
      summary: '',
      keyTerms: [] as string[],
      entities: [] as Array<{ type: string; value: string; confidence: number }>,
      risks: [] as Array<{ type: string; severity: string; description: string }>,
      recommendations: [] as string[],
      confidence: 0.8,
    };

    try {
      // Extract sections using regex
      const summaryMatch = response.match(/<summary>(.*?)<\/summary>/s);
      if (summaryMatch) analysis.summary = summaryMatch[1].trim();

      const keyTermsMatch = response.match(/<key_terms>(.*?)<\/key_terms>/s);
      if (keyTermsMatch) {
        analysis.keyTerms = keyTermsMatch[1]
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t);
      }

      const entitiesMatch = response.match(/<entities>(.*?)<\/entities>/s);
      if (entitiesMatch) {
        analysis.entities = entitiesMatch[1]
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => {
            const [type, value, confidenceStr] = line.split(':');
            return {
              type: type?.trim() || 'unknown',
              value: value?.trim() || '',
              confidence: parseFloat(confidenceStr?.trim() || '0.8'),
            };
          })
          .filter((e) => e.value);
      }

      const risksMatch = response.match(/<risks>(.*?)<\/risks>/s);
      if (risksMatch) {
        analysis.risks = risksMatch[1]
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => {
            const [type, severity, description] = line.split(':');
            return {
              type: type?.trim() || 'general',
              severity: severity?.trim() || 'medium',
              description: description?.trim() || '',
            };
          })
          .filter((r) => r.description);
      }

      const recommendationsMatch = response.match(/<recommendations>(.*?)<\/recommendations>/s);
      if (recommendationsMatch) {
        analysis.recommendations = recommendationsMatch[1]
          .split('\n')
          .map((r) => r.trim())
          .filter((r) => r);
      }

      const confidenceMatch = response.match(/<confidence>(.*?)<\/confidence>/s);
      if (confidenceMatch) {
        analysis.confidence = parseFloat(confidenceMatch[1].trim()) || 0.8;
      }
    } catch (error: any) {
      console.error('[WebLlama] Failed to parse analysis:', error);
    }

    return analysis;
  }

  private getCacheKey(prompt: string, options: any): string {
    const optionsStr = JSON.stringify(options);
    return `${prompt.substring(0, 100)}:${optionsStr}`;
  }

  private addToCache(prompt: string, options: any, result: WebLlamaResponse): void {
    const key = this.getCacheKey(prompt, options);

    // LFU cache implementation
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const iter = this.cache.keys().next();
      if (!iter.done) this.cache.delete(iter.value as string);
    }

    this.cache.set(key, result);
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    console.log('[WebLlama] Disposing resources...');

    // Terminate worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Clean up WebGPU resources
    if (this.webgpuDevice) {
      // GPUDevice doesn't have a destroy method - it's automatically cleaned up
      this.webgpuDevice = null;
    }

    // No external ranking cache to dispose in this mode

    // Unregister service worker
    if (this.serviceWorkerRegistration) {
      try {
        await this.serviceWorkerRegistration.unregister();
        this.serviceWorkerRegistration = null;
      } catch (error: any) {
        console.warn('[WebLlama] Failed to unregister service worker:', error);
      }
    }

    // Clear legacy cache
    this.cache.clear();

    // Reset state
    this.module = null;
    this.modelLoaded = false;

    console.log('[WebLlama] Resource cleanup complete');
  }
}

// Export singleton for global use
export const webLlamaService = new WebAssemblyLlamaService();

// Export class for custom instances
export { WebAssemblyLlamaService };
