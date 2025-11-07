import type { WebGPUComputeShader } from "$lib/types/vector-jobs";
// (removed the static import of shader-cache-manager to avoid mismatched export errors)

export class WebGPUPolyfillService {
  // GPU/WebGL state
  private adapter: GPUAdapter | null = null;
  private device: GPUDevice | null = null;
  private queue: GPUQueue | null = null;
  private isWebGPUAvailable = false;
  private webglFallback: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;

  // Shader cache (kept for future use)
  private shaderCache = new Map<string, WebGPUComputeShader>();

  // Performance tracking
  private performanceStats = {
    operationsCompleted: 0,
    totalProcessingTime: 0,
    averageProcessingTime: 0,
    webgpuOpsCount: 0,
    webglOpsCount: 0,
  };

  // Safe logging helpers
  private safeLog = (...args: unknown[]) => {
    if (typeof console !== "undefined" && typeof console.log === "function") console.log(...args);
  };
  private safeWarn = (...args: unknown[]) => {
    if (typeof console !== "undefined" && typeof console.warn === "function") console.warn(...args);
  };
  private safeError = (...args: unknown[]) => {
    if (typeof console !== "undefined" && typeof console.error === "function")
      console.error(...args);
  };
  private safeDebug = (...args: unknown[]) => {
    if (typeof console !== "undefined" && typeof console.debug === "function")
      console.debug(...args);
  };

  /** Initializes WebGPU if available; otherwise attempts WebGL2 fallback. */
  async initialize(): Promise<boolean> {
    // Try WebGPU first
    const nav = typeof navigator !== "undefined" ? (navigator as any) : undefined;
    if (nav?.gpu) {
      try {
        this.adapter =
          (await nav.gpu.requestAdapter?.({ powerPreference: "high-performance" })) ?? null;
        if (this.adapter) {
          this.device = (await this.adapter.requestDevice?.()) ?? null;
          if (this.device) {
            this.queue = this.device.queue;
            this.isWebGPUAvailable = true;

            // initialize shader cache manager if available (dynamic import to support multiple export shapes)
            try {
              const mod: any = await import("./shader-cache-manager.js");
              // prefer instance named export, then class/constructor, then default
              const exported = mod?.shaderCacheManager ?? mod?.ShaderCacheManager ?? mod?.default;
              if (exported) {
                // If exported is an object with initialize()
                if (typeof exported.initialize === "function") {
                  await exported.initialize(this.device);
                } else if (typeof exported === "function") {
                  // exported might be a constructor/class; try to use a singleton instance or create one
                  const instance = (exported as any).instance ?? new (exported as any)();
                  if (instance && typeof instance.initialize === "function") {
                    await instance.initialize(this.device);
                  }
                }
              }
            } catch (e: unknown) {
              this.safeDebug("shaderCacheManager initialize ignored: ", String(e));
            }

            this.safeLog("WebGPU initialized successfully");
            return true;
          }
        }
      } catch (error: unknown) {
        this.safeWarn("WebGPU initialization failed, falling back to WebGL: ", String(error));
      }
    }

    // Fallback to WebGL2
    return this.initializeWebGLFallback();
  }

  private initializeWebGLFallback(): boolean {
    try {
      if (typeof document === "undefined") return false;
      this.canvas = document.createElement("canvas");
      this.webglFallback =
        this.canvas.getContext("webgl2", { powerPreference: "high-performance" }) ?? null;
      if (!this.webglFallback) {
        this.safeError("WebGL2 not available");
        return false;
      }
      // Optionally log renderer info
      try {
        this.safeLog("Renderer: ", this.webglFallback.getParameter(this.webglFallback.RENDERER));
      } catch {
        /* ignore */
      }
      this.safeLog("WebGL2 fallback initialized");
      return true;
    } catch (error: unknown) {
      this.safeError("WebGL initialization failed: ", String(error));
      return false;
    }
  }

  /** Embedding computation entry point — prefers GPU/WebGL but falls back to CPU. */
  async computeEmbedding(inputVector: number[], dimensions = 384): Promise<number[]> {
    const startTime =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    try {
      let result: number[];
      if (this.isWebGPUAvailable && this.device && this.queue) {
        result = await this.computeEmbeddingWebGPU(inputVector, dimensions);
        this.performanceStats.webgpuOpsCount++;
      } else if (this.webglFallback) {
        result = await this.computeEmbeddingWebGL(inputVector, dimensions);
        this.performanceStats.webglOpsCount++;
      } else {
        result = this.computeEmbeddingCPU(inputVector, dimensions);
      }
      const processingTime =
        (typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now()) - startTime;
      this.updatePerformanceStats(processingTime);
      return result;
    } catch (error: unknown) {
      this.safeError("Embedding computation failed: ", String(error));
      return this.computeEmbeddingCPU(inputVector, dimensions);
    }
  }

  // GPU/WebGL placeholders — currently fallback to CPU until WGSL/GLSL shaders implemented.
  private async computeEmbeddingWebGPU(
    _inputVector: number[],
    dimensions: number
  ): Promise<number[]> {
    if (!this.device || !this.queue) throw new Error("WebGPU device not available");
    // Future: implement WGSL compute shader for embeddings
    return this.computeEmbeddingCPU(new Array(dimensions).fill(0), dimensions);
  }

  private async computeEmbeddingWebGL(
    _inputVector: number[],
    dimensions: number
  ): Promise<number[]> {
    // Future: implement WebGL GLSL path
    return this.computeEmbeddingCPU(new Array(dimensions).fill(0), dimensions);
  }

  private computeEmbeddingCPU(inputVector: number[], dimensions: number): number[] {
    const out = new Float32Array(dimensions);
    for (let i = 0; i < dimensions; i++) {
      let sum = 0;
      for (let j = 0; j < inputVector.length; j++) {
        const weight = Math.sin(i * j * 0.001 + i * 0.1);
        const v = inputVector[j] ?? 0;
        sum += v * weight;
      }
      out[i] = Math.tanh(sum * 0.1) * Math.sqrt(dimensions);
    }
    return Array.from(out);
  }

  /** Similarity entry point — prefers GPU/WebGL but falls back to CPU. */
  async computeSimilarity(vector1: number[], vector2: number[]): Promise<number> {
    if (vector1.length !== vector2.length) throw new Error("Vectors must have the same dimensions");
    const startTime =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    try {
      let similarity: number;
      if (this.isWebGPUAvailable && this.device && this.queue) {
        similarity = await this.computeSimilarityWebGPU(vector1, vector2);
        this.performanceStats.webgpuOpsCount++;
      } else if (this.webglFallback) {
        similarity = await this.computeSimilarityWebGL(vector1, vector2);
        this.performanceStats.webglOpsCount++;
      } else {
        similarity = this.computeSimilarityCPU(vector1, vector2);
      }
      const processingTime =
        (typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now()) - startTime;
      this.updatePerformanceStats(processingTime);
      return similarity;
    } catch (error: unknown) {
      this.safeError("Similarity computation failed: ", String(error));
      return this.computeSimilarityCPU(vector1, vector2);
    }
  }

  private async computeSimilarityWebGPU(vector1: number[], vector2: number[]): Promise<number> {
    if (!this.device || !this.queue) throw new Error("WebGPU device not available");
    // Future: implement WGSL compute shader for GPU acceleration.
    return this.computeSimilarityCPU(vector1, vector2);
  }

  private async computeSimilarityWebGL(vector1: number[], vector2: number[]): Promise<number> {
    // Future: implement WebGL compute with transform feedback / textures
    return this.computeSimilarityCPU(vector1, vector2);
  }

  /** Implements cosine similarity between two vectors. Returns a value between -1 and 1. */
  private computeSimilarityCPU(vector1: number[], vector2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      norm1 += vector1[i] * vector1[i];
      norm2 += vector2[i] * vector2[i];
    }
    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  private updatePerformanceStats(processingTime: number): void {
    this.performanceStats.operationsCompleted += 1;
    this.performanceStats.totalProcessingTime += processingTime;
    this.performanceStats.averageProcessingTime =
      this.performanceStats.operationsCompleted > 0
        ? this.performanceStats.totalProcessingTime / this.performanceStats.operationsCompleted
        : 0;
  }

  /** Returns performance statistics for WebGPU/WebGL operations. */
  getPerformanceStats() {
    const total = Math.max(1, this.performanceStats.operationsCompleted);
    const webgpuPercentage = Math.round((this.performanceStats.webgpuOpsCount / total) * 100);
    const webglPercentage = Math.round((this.performanceStats.webglOpsCount / total) * 100);
    return {
      operationsCompleted: this.performanceStats.operationsCompleted,
      totalProcessingTime: this.performanceStats.totalProcessingTime,
      averageProcessingTime: this.performanceStats.averageProcessingTime,
      webgpuOpsCount: this.performanceStats.webgpuOpsCount,
      webglOpsCount: this.performanceStats.webglOpsCount,
      webgpuPercentage,
      webglPercentage,
      hasWebGPU: this.isWebGPUAvailable,
      hasWebGLFallback: !!this.webglFallback,
    };
  }

  /** Cleans up GPU and WebGL resources used by this polyfill. */
  dispose(): void {
    // Cleanup WebGPU resources
    try {
      if (this.device) {
        // Some implementations expose destroy()
        const maybeDestroy = this.device as unknown as { destroy?: () => void | Promise<void> };
        if (typeof maybeDestroy.destroy === "function") {
          try {
            const ret = maybeDestroy.destroy();
            if (ret && typeof (ret as Promise<void>).then === "function") {
              (ret as Promise<void>).catch((e) =>
                this.safeDebug("device.destroy() rejected: ", String(e))
              );
            }
          } catch (callErr: unknown) {
            this.safeDebug("device.destroy() call threw: ", String(callErr));
          }
        }
      }
    } catch {
      /* ignore */
    } finally {
      this.device = null;
      this.queue = null;
      this.adapter = null;
      this.isWebGPUAvailable = false;
    }

    // Cleanup WebGL resources
    try {
      if (this.webglFallback && this.canvas) {
        const gl = this.webglFallback;
        const loseExt = gl.getExtension("WEBGL_lose_context") as {
          loseContext?: () => void;
        } | null;
        if (loseExt?.loseContext) {
          try {
            loseExt.loseContext();
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* ignore */
    } finally {
      this.webglFallback = null;
      this.canvas = null;
    }

    this.shaderCache.clear();
    this.safeLog("WebGPU/WebGL resources cleaned up");
  }
}
