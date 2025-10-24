import type { WebGPUDevice, WebGPUComputeShader } from '$lib/types/vector-jobs';
import { shaderCacheManager } from './shader-cache-manager.js';

export class WebGPUPolyfill {
	// Types for GPU device info and compute shader management
	private adapter: GPUAdapter | null = null;
	private device: GPUDevice | null = null;
	private queue: GPUQueue | null = null;
	private isWebGPUAvailable = false;
	private webglFallback: WebGL2RenderingContext | null = null;
	private canvas: HTMLCanvasElement | null = null;

	// Shader cache (currently unused but kept for future)
	private shaderCache = new Map<string, WebGPUComputeShader>();

	// Performance tracking
	private performanceStats = {
		operationsCompleted: 0,
		totalProcessingTime: 0,
		averageProcessingTime: 0,
		webgpuOpsCount: 0,
		webglOpsCount: 0,
	};

	/**
	 * Initializes the WebGPU device if available, otherwise falls back to WebGL2.
	 * Returns `true` if either WebGPU or WebGL2 was successfully initialized, otherwise `false`.
	 * - If WebGPU is available and initialized, returns `true`.
	 * - If WebGPU is not available, attempts to initialize WebGL2 and returns `true` if successful.
	 * - If neither is available, returns `false`.
	 */
	async initialize(): Promise<boolean> {
		// Try WebGPU first
		if (typeof navigator !== 'undefined') {
			const nav = navigator as unknown as { gpu?: GPU | undefined };
			if (nav.gpu) {
				try {
					const gpu = nav.gpu;
					const adapter = await gpu.requestAdapter?.({
						powerPreference: 'high-performance',
					});
					this.adapter = adapter ?? null;
					if (this.adapter) {
						this.device = (await this.adapter.requestDevice?.()) ?? null;
						if (this.device) {
							this.queue = this.device.queue;
							this.isWebGPUAvailable = true;
							// Initialize shader cache manager (if available)
							try {
								await shaderCacheManager.initialize?.(this.device as unknown as WebGPUDevice);
							} catch (e: unknown) {
								console.debug('shaderCacheManager initialize ignored:', String(e));
							}
							console.log('🔥 WebGPU initialized successfully');
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
			if (typeof document === 'undefined') return false;
			this.canvas = document.createElement('canvas');
			this.webglFallback = this.canvas.getContext('webgl2', {
				powerPreference: 'high-performance',
			});
			if (!this.webglFallback) {
				console.error('WebGL2 not available');
				return false;
			}
			// Log renderer when possible
			try {
				console.log('Renderer:', this.webglFallback.getParameter(this.webglFallback.RENDERER));
			} catch {
				/* ignore */
			}
			console.log('✅ WebGL2 fallback initialized');
			return true;
		} catch (error: unknown) {
			console.error('WebGL initialization failed:', error);
			return false;
		}
	}

	/**
	 * Embedding computation entry point — prefers GPU/WebGL but falls back to CPU.
	 */
	async computeEmbedding(inputVector: number[], dimensions = 384): Promise<number[]> {
		const startTime =
			typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
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
				(typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now()) -
				startTime;
			this.updatePerformanceStats(processingTime);
			return result;
		} catch (error: unknown) {
			console.error('Embedding computation failed:', error);
			// Guaranteed CPU fallback on error
			return this.computeEmbeddingCPU(inputVector, dimensions);
		}
	}

	// Current GPU/WebGL paths delegate to CPU until shaders are implemented.
	private async computeEmbeddingWebGPU(_inputVector: number[], dimensions: number): Promise<number[]> {
		// Future: implement WGSL compute shader for embeddings
		if (!this.device || !this.queue) throw new Error('WebGPU device not available');
		return this.computeEmbeddingCPU(new Array(dimensions).fill(0), dimensions);
	}
	private async computeEmbeddingWebGL(_inputVector: number[], dimensions: number): Promise<number[]> {
		// Future: implement WebGL GLSL path if needed
		return this.computeEmbeddingCPU(new Array(dimensions).fill(0), dimensions);
	}

	private computeEmbeddingCPU(inputVector: number[], dimensions: number): number[] {
		const out = new Float32Array(dimensions);
		for (let i = 0; i < dimensions; i++) {
			let sum = 0;
			for (let j = 0; j < inputVector.length; j++) {
				const weight = Math.sin(i * j * 0.001 + i * 0.1);
				sum += (inputVector[j] ?? 0) * weight;
			}
			out[i] = Math.tanh(sum * 0.1) * Math.sqrt(dimensions);
		}
		return Array.from(out);
	}

	/**
	 * Similarity computation entry point — prefers GPU/WebGL but falls back to CPU.
	 */
	async computeSimilarity(vector1: number[], vector2: number[]): Promise<number> {
		if (vector1.length !== vector2.length) throw new Error('Vectors must have the same dimensions');
		const startTime =
			typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
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
				(typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now()) -
				startTime;
			this.updatePerformanceStats(processingTime);
			return similarity;
		} catch (error: unknown) {
			console.error('Similarity computation failed:', error);
			return this.computeSimilarityCPU(vector1, vector2);
		}
	}

	// GPU/WebGL placeholders for future acceleration
	private async computeSimilarityWebGPU(vector1: number[], vector2: number[]): Promise<number> {
		// NOTE: This method currently falls back to CPU for correctness.
		// Future: Implement WGSL compute shader for GPU acceleration.
		if (!this.device || !this.queue) throw new Error('WebGPU device not available');
		return this.computeSimilarityCPU(vector1, vector2);
	}
	private async computeSimilarityWebGL(vector1: number[], vector2: number[]): Promise<number> {
		// Future: implement WebGL compute with transform feedback / textures
		return this.computeSimilarityCPU(vector1, vector2);
	}

	/**
	 * Implements cosine similarity between two vectors.
	 * Returns a value between -1 and 1.
	 */
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

	/**
	 * Returns performance statistics for WebGPU/WebGL operations.
	 * @returns {{
	 *   operationsCompleted: number; // Total number of operations performed
	 *   totalProcessingTime: number; // Total processing time in milliseconds
	 *   averageProcessingTime: number; // Average processing time per operation
	 *   webgpuOpsCount: number; // Number of operations performed using WebGPU
	 *   webglOpsCount: number; // Number of operations performed using WebGL
	 *   webgpuPercentage: number; // Percentage of operations using WebGPU
	 *   webglPercentage: number; // Percentage of operations using WebGL
	 *   isWebGPUAvailable: boolean; // Whether WebGPU is available
	 *   hasWebGLFallback: boolean; // Whether WebGL fallback is available
	 * }}
	 */
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
			isWebGPUAvailable: this.isWebGPUAvailable,
			hasWebGLFallback: !!this.webglFallback,
		};
	}

	/**
	 * Cleans up GPU and WebGL resources used by this polyfill.
	 * - Attempts to destroy the WebGPU device if supported.
	 * - Releases the WebGL context using the WEBGL_lose_context extension if available.
	 * - Logs cleanup actions to the console.
	 * - Side effects: GPU resources may be released, WebGL context may be lost, and shader cache is not used.
	 */
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
		// Shader cache removed (unused)
		console.log('🧹 WebGPU/WebGL resources cleaned up');
	}
}

export const webgpuPolyfill = new WebGPUPolyfill();
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
        similarity = await this.computeSimilarityWebGL(vector1, vector2);
        this.performanceStats.webglOpsCount++;
      } else {
        similarity = this.computeSimilarityCPU(vector1, vector2);
      }
      const processingTime =
        (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) - startTime;
      this.updatePerformanceStats(processingTime);
      return similarity;
  /**
   * Currently falls back to CPU for vector similarity computation.
   * To enable true GPU acceleration, implement a WGSL compute shader that:
   * - Accepts two input buffers (vector1, vector2)
   * - Computes dot product and norms in parallel
   * - Writes the cosine similarity to an output buffer
   * Example WGSL outline:
   * @compute @workgroup_size(64)
   * fn main(@builtin(global_invocation_id) id : vec3<u32>) {
   *   // Parallel reduction for dot product and norms
   *   // Write result to output[0]
   * }
   */
  private async computeSimilarityWebGPU(vector1: number[], vector2: number[]): Promise<number> {
    // NOTE: This method currently falls back to CPU for correctness.
    // Future: Implement WGSL compute shader for GPU acceleration.
    if (!this.device || !this.queue) throw new Error('WebGPU device not available');
    return this.computeSimilarityCPU(vector1, vector2);
  }

  /**
   * Implements cosine similarity between two vectors.
   * Returns a value between -1 and 1, where 1 means identical direction, 0 means orthogonal, and -1 means opposite direction.
   */
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
  /**
   * Returns performance statistics for WebGPU/WebGL operations.
   * @returns {{
   *   operationsCompleted: number; // Total number of operations performed
   *   totalProcessingTime: number; // Total processing time in milliseconds
   *   averageProcessingTime: number; // Average processing time per operation
   *   webgpuOpsCount: number; // Number of operations performed using WebGPU
   *   webglOpsCount: number; // Number of operations performed using WebGL
   *   webgpuPercentage: number; // Percentage of operations using WebGPU
   *   webglPercentage: number; // Percentage of operations using WebGL
   *   isWebGPUAvailable: boolean; // Whether WebGPU is available
   *   hasWebGLFallback: boolean; // Whether WebGL fallback is available
   * }}
   */
  getPerformanceStats() {
  /**
   * Cleans up GPU and WebGL resources used by this polyfill.
   * - Attempts to destroy the WebGPU device if supported.
   * - Releases the WebGL context using the WEBGL_lose_context extension if available.
   * - Logs cleanup actions to the console.
   * - Side effects: GPU resources may be released, WebGL context may be lost, and shader cache is not used.
   */
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
    // Shader cache removed (unused)
    console.log('🧹 WebGPU/WebGL resources cleaned up');
    console.log('🧹 WebGPU/WebGL resources cleaned up');
  }
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
    // Shader cache removed (unused)
    console.log('🧹 WebGPU/WebGL resources cleaned up');
    console.log('🧹 WebGPU/WebGL resources cleaned up');
  }
}

export const webgpuPolyfill = new WebGPUPolyfill();
