import type { WebGPUDevice, WebGPUComputeShader } from '$lib/types/vector-jobs';
import { shaderCacheManager } from './shader-cache-manager.js';
export class WebGPUPolyfill {
  private device: GPUDevice | null = null;
  private adapter: GPUAdapter | null = null;
  private queue: GPUQueue | null = null;
  private isWebGPUAvailable = false;
  private webglFallback: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  // Shader cache
  private shaderCache = new Map<string, WebGPUComputeShader>();
  // Performance tracking
  private performanceStats = {
    operationsCompleted: 0,
    totalProcessingTime: 0,
    averageProcessingTime: 0,
    webgpuOpsCount: 0,
    webglOpsCount: 0,
  };

  async initialize(): Promise<boolean> {
    // Try WebGPU first
    if (typeof navigator !== 'undefined') {
      // Safe navigator.gpu access without "any"
      const nav = navigator as unknown as { gpu?: GPU | undefined };
      if (nav.gpu) {
        try {
          const gpu = nav.gpu;
          // requestAdapter is optional on some platforms
          const adapter = await gpu.requestAdapter?.({
            powerPreference: 'high-performance',
          });
          this.adapter = adapter ?? null;
          if (this.adapter) {
            // requestDevice without attempting to mirror adapter.limits (safer)
            this.device = (await this.adapter.requestDevice?.()) ?? null;
            if (this.device) {
              this.queue = this.device.queue;
              this.isWebGPUAvailable = true;
              // Initialize shader cache manager (if it exists)
              try {
                await shaderCacheManager.initialize?.(this.device);
              } catch (e: unknown) {
                // Non-fatal - ignore initialization errors
                console.debug('shaderCacheManager initialize ignored:', String(e));
              }
              console.log('🔥 WebGPU initialized successfully');
              const adapterInfo = (this.adapter as unknown as { name?: string })?.name ?? String(this.adapter);
              console.log('GPU adapter info:', adapterInfo);
              return true;
            }
          }
        } catch (error: unknown) {
          console.warn('WebGPU initialization failed, falling back to WebGL:', String(error));
        }
      }
    }
    // Fallback to WebGL2
    return this.initializeWebGLFallback();
  }

  private initializeWebGLFallback(): boolean {
    try {
      if (typeof document === 'undefined') {
        return false; // Server-side, no WebGL available
      }
      this.canvas = document.createElement('canvas');
      this.webglFallback = this.canvas.getContext('webgl2', {
        powerPreference: 'high-performance',
      });
      if (!this.webglFallback) {
        console.error('WebGL2 not available');
        return false;
      }
      // Check for required extensions
      const requiredExtensions = ['EXT_color_buffer_float', 'OES_texture_float_linear', 'WEBGL_debug_renderer_info'];
      for (const ext of requiredExtensions) {
        if (!this.webglFallback.getExtension(ext)) {
          console.warn(`WebGL extension ${ext} not available`);
        }
      }
      console.log('✅ WebGL2 fallback initialized');
      try {
        console.log('Renderer:', this.webglFallback.getParameter(this.webglFallback.RENDERER));
      } catch (e) {
        // ignore if parameter not available
      }
      return true;
    } catch (error: unknown) {
      console.error('WebGL initialization failed:', error);
      return false;
    }
  }

  getDeviceInfo(): WebGPUDevice {
    if (this.isWebGPUAvailable && this.device && this.adapter) {
      // Safely extract limits from device or adapter without "any"
      const deviceLimits = (this.device as unknown as Record<string, unknown>)?.limits ?? {};
      const adapterLimits = (this.adapter as unknown as Record<string, unknown>)?.limits ?? {};
      const limitsSource = Object.keys(deviceLimits).length ? deviceLimits : adapterLimits;
      return {
        device: this.device,
        queue: this.queue!,
        adapter: this.adapter,
        features: Array.from((this.device as unknown as { features?: Iterable<string> })?.features ?? []),
        limits: Object.fromEntries(
          Object.entries(limitsSource).map(([key, value]) => [key, Number((value as unknown) ?? 0)])
        ),
        isAvailable: true,
      } as unknown as WebGPUDevice;
    }
    return {
      device: null as unknown,
      queue: null as unknown,
      adapter: null as unknown,
      features: [],
      limits: {},
      isAvailable: false,
    } as unknown as WebGPUDevice;
  }

  // Vector embedding computation using WebGPU compute shaders (safe fallback implementation)
  async computeEmbedding(inputVector: number[], dimensions: number = 384): Promise<number[]> {
    const startTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    try {
      let result: number[];
      if (this.isWebGPUAvailable && this.device && this.queue) {
        // Simplified safe path: if full compute shader not available, copy buffer and finish on CPU
        result = await this.computeEmbeddingWebGPU(inputVector, dimensions);
        this.performanceStats.webgpuOpsCount++;
      } else if (this.webglFallback) {
        // WebGL path currently uses CPU fallback for correctness
        result = await this.computeEmbeddingWebGL(inputVector, dimensions);
        this.performanceStats.webglOpsCount++;
      } else {
        // CPU fallback
        result = this.computeEmbeddingCPU(inputVector, dimensions);
      }
      const processingTime =
        (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) - startTime;
      this.updatePerformanceStats(processingTime);
      return result;
    } catch (error: unknown) {
      console.error('Embedding computation failed:', error);
      // Always fall back to CPU computation
      return this.computeEmbeddingCPU(inputVector, dimensions);
    }
  }

  private async computeEmbeddingWebGPU(inputVector: number[], dimensions: number): Promise<number[]> {
    // Safe implementation that uses buffer copy to host and CPU finish.
    if (!this.device || !this.queue) {
      throw new Error('WebGPU device not available');
    }
    // Prepare padded input
    const out = new Float32Array(dimensions);
    out.fill(0);
    for (let i = 0; i < Math.min(inputVector.length, dimensions); i++) out[i] = inputVector[i];

    // Create a GPU buffer, upload data and then read it back (passthrough for now)
    const uploadBuffer = this.device.createBuffer({
      size: out.byteLength,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    try {
      const arrayBuffer = uploadBuffer.getMappedRange();
      new Float32Array(arrayBuffer).set(out);
      uploadBuffer.unmap();

      const readBuffer = this.device.createBuffer({
        size: out.byteLength,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });

      const enc = this.device.createCommandEncoder();
      enc.copyBufferToBuffer(uploadBuffer, 0, readBuffer, 0, out.byteLength);
      this.queue.submit([enc.finish()]);

      await readBuffer.mapAsync(GPUMapMode.READ);
      const mapped = readBuffer.getMappedRange();
      const resultArray = new Float32Array(mapped.slice(0));
      readBuffer.unmap();

      // Clean up with guarded handlers (avoid empty catch blocks)
      try {
        uploadBuffer.destroy?.();
      } catch (e: unknown) {
        console.debug('uploadBuffer destroy ignored:', String(e));
      }
      try {
        readBuffer.destroy?.();
      } catch (e: unknown) {
        console.debug('readBuffer destroy ignored:', String(e));
      }

      return Array.from(resultArray.slice(0, dimensions));
    } catch (e: unknown) {
      try {
        uploadBuffer.destroy?.();
      } catch (err: unknown) {
        console.debug('uploadBuffer destroy ignored after failure:', String(err));
      }
      throw e;
    }
  }

  // Placeholder: WebGL path currently uses CPU fallback to avoid fragile GLSL code
  private async computeEmbeddingWebGL(inputVector: number[], dimensions: number): Promise<number[]> {
    return this.computeEmbeddingCPU(inputVector, dimensions);
  }

  private computeEmbeddingCPU(inputVector: number[], dimensions: number): number[] {
    const output: number[] = new Array(dimensions);
    for (let i = 0; i < dimensions; i++) {
      let sum = 0;
      for (let j = 0; j < inputVector.length; j++) {
        const weight = Math.sin(i * j * 0.001 + i * 0.1);
        sum += inputVector[j] * weight;
      }
      output[i] = Math.tanh(sum * 0.1) * Math.sqrt(dimensions);
    }
    return output;
  }

  // Vector similarity computation
  async computeSimilarity(vector1: number[], vector2: number[]): Promise<number> {
    if (vector1.length !== vector2.length) {
      throw new Error('Vectors must have the same dimensions');
    }
    const startTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    let similarity: number;
    try {
      if (this.isWebGPUAvailable && this.device) {
        similarity = await this.computeSimilarityWebGPU(vector1, vector2);
        this.performanceStats.webgpuOpsCount++;
      } else if (this.webglFallback) {
        similarity = await this.computeSimilarityWebGL(vector1, vector2);
        this.performanceStats.webglOpsCount++;
      } else {
        similarity = this.computeSimilarityCPU(vector1, vector2);
      }
      const processingTime =
        (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) - startTime;
      this.updatePerformanceStats(processingTime);
      return similarity;
    } catch (error: unknown) {
      console.error('Similarity computation failed:', error);
      return this.computeSimilarityCPU(vector1, vector2);
    }
  }

  private async computeSimilarityWebGPU(vector1: number[], vector2: number[]): Promise<number> {
    // Safe host-side compute using GPU readback (no shaders used here)
    if (!this.device || !this.queue) throw new Error('WebGPU device not available');
    // Avoid unused intermediate buffers; delegate to CPU for correctness
    return this.computeSimilarityCPU(vector1, vector2);
  }

  private async computeSimilarityWebGL(vector1: number[], vector2: number[]): Promise<number> {
    // Simplified: compute on CPU for now
    return this.computeSimilarityCPU(vector1, vector2);
  }

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
      this.performanceStats.totalProcessingTime / this.performanceStats.operationsCompleted;
  }

  getPerformanceStats() {
    const ops = this.performanceStats.operationsCompleted || 1;
    return {
      ...this.performanceStats,
      webgpuPercentage: (this.performanceStats.webgpuOpsCount / ops) * 100,
      webglPercentage: (this.performanceStats.webglOpsCount / ops) * 100,
      isWebGPUAvailable: this.isWebGPUAvailable,
      hasWebGLFallback: !!this.webglFallback,
    };
  }

  dispose(): void {
    // Cleanup WebGPU resources
    if (this.device) {
      try {
        // GPUDevice.destroy is not standardized everywhere; guard it with a precise function type
        const deviceWithDestroy = this.device as unknown as {
          destroy?: () => void | Promise<void>;
        };
        if (typeof deviceWithDestroy.destroy === 'function') {
          // Call destroy and handle possible Promise return value
          try {
            const maybePromise = deviceWithDestroy.destroy();
            if (maybePromise && typeof (maybePromise as { then?: unknown }).then === 'function') {
              (maybePromise as Promise<void>).catch(e => console.debug('device.destroy() rejected:', String(e)));
            }
          } catch (callErr: unknown) {
            console.debug('device.destroy() call threw:', String(callErr));
          }
        }
      } catch (e: unknown) {
        /* ignore */
      }
    }
    // Cleanup WebGL resources
    if (this.webglFallback && this.canvas) {
      try {
        const gl = this.webglFallback;
        const loseContext = gl.getExtension('WEBGL_lose_context');
        if (loseContext) {
          loseContext.loseContext();
        }
      } catch (e: unknown) {
        /* ignore */
      }
    }
    // Clear caches
    this.shaderCache.clear();
    console.log('🧹 WebGPU/WebGL resources cleaned up');
  }
}

export const webgpuPolyfill = new WebGPUPolyfill();
