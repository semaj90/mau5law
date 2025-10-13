import { telemetryBus } from '$lib/telemetry/telemetry-bus.js';

// Lightweight local types to avoid `any` while remaining permissive for environments
type GPUAdapterLike = { requestDevice?: () => Promise<GPUDevice | null> };
type NavigatorWithGPU = Navigator & { gpu?: { requestAdapter?: () => Promise<GPUAdapterLike | null> } };

export type QuantizationLevel = 'float32' | 'int8' | 'int4' | 'binary';
export interface VectorProcessingConfig {
  dimensions: number;
  batchSize: number;
  memoryBudget: { total: number };
  quantization: QuantizationLevel;
  fallbackToWebGL?: boolean;
}

export class GpuVectorProcessor {
  private device?: GPUDevice;
  private config: VectorProcessingConfig;
  private isInitialized = false;
  // WebGL fallback resources (created only when running in browser)
  private gl?: WebGL2RenderingContext;
  private glCanvas?: HTMLCanvasElement;

  constructor(config: VectorProcessingConfig) {
    this.config = config;
  }

  // Initialize with optional WebGPU device. Safe to call on server — will be a no-op.
  async initialize(device?: GPUDevice) {
    // Guard SSR: do not touch DOM / GPU globals on server
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this.device = device;
    let backend = this.device ? 'injected' : 'none';

    // Try to auto-acquire a WebGPU device when none was injected
    if (!this.device) {
      try {
        const nav = globalThis.navigator as NavigatorWithGPU | undefined;
        if (nav && nav.gpu && typeof nav.gpu.requestAdapter === 'function') {
          const adapter = await nav.gpu.requestAdapter();
          if (adapter && typeof adapter.requestDevice === 'function') {
            const maybeDevice = await adapter.requestDevice();
            if (maybeDevice) {
              this.device = maybeDevice;
              backend = 'webgpu';
            }
          }
        }
      } catch (e) {
        // continue to fallback path
      }
    }

    if (!this.device && this.config.fallbackToWebGL) {
      await this.initWebGL2();
      backend = this.gl ? 'webgl2' : backend;
    }

    // only mark initialized if we actually have a GPU device or a WebGL fallback
    this.isInitialized = !!(this.device || this.gl);

    telemetryBus.publish({
      type: 'gpu.backend',
      meta: { operation: 'initialize', backend, fallbackToWebGL: !!this.gl },
    });
  }

  private async initWebGL2() {
    if (typeof document === 'undefined') return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const gl = canvas.getContext('webgl2', { antialias: false }) as WebGL2RenderingContext | null;
      if (!gl) throw new Error('webgl2-unavailable');
      this.glCanvas = canvas;
      this.gl = gl;
      telemetryBus.publish({ type: 'gpu.backend', meta: { operation: 'init_webgl2', success: true } });
    } catch (e) {
      telemetryBus.publish({
        type: 'error',
        meta: { operation: 'init_webgl2', success: false, error: (e as Error).message || String(e) },
      });
    }
  }

  // Very small and safe fallback: perform CPU-based passthrough processing so callers
  // can still run in SSR or when GPU is unavailable. Keeps API compatibility.
  async processBatch(vectors: Float32Array[]): Promise<Float32Array[]> {
    if (!this.isInitialized) throw new Error('GpuVectorProcessor not initialized');
    // If a real WebGPU path is present, it should be injected via initialize(device).
    // For now, implement safe CPU fallback that respects configured dimensions.
    const dim = this.config.dimensions;
    return vectors.map(v => {
      // produce consistent-dimension vectors: pad with zeros if input is shorter
      const out = new Float32Array(dim);
      const len = Math.min(v.length, dim);
      if (len > 0) out.set(v.subarray(0, len));
      return out;
    });
  }

  async processEmbeddings(params: {
    inputVectors: Float32Array[];
    similarityThreshold?: number;
    topK?: number;
    useAdaptiveQuantization?: boolean;
  }): Promise<{
    processedVectors: Float32Array[];
    processingTime: number;
    memoryUsed: number;
    quantizationApplied: QuantizationLevel;
    gpuUtilization: number;
    cacheHitRate: number;
    topK: number;
    similarityThreshold: number;
  }> {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const processedVectors = await this.processBatch(params.inputVectors || []);
    const processingTime = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start;
    const memoryUsed = (params.inputVectors || []).reduce((sum, v) => sum + (v?.byteLength || 0), 0);

    telemetryBus.publish({
      type: 'gpu.vector.process.end',
      meta: { duration: processingTime, memoryUsed, count: processedVectors.length },
    });

    return {
      processedVectors,
      processingTime,
      memoryUsed,
      quantizationApplied: this.config.quantization,
      gpuUtilization: 0,
      cacheHitRate: 0,
      topK: params.topK ?? 0,
      similarityThreshold: params.similarityThreshold ?? 0,
    };
  }

  cleanup() {
    if (this.gl) {
      try {
        // Best-effort cleanup
        this.gl = undefined;
        if (this.glCanvas && this.glCanvas.parentElement) {
          try {
            this.glCanvas.remove();
          } catch (err) {
            telemetryBus.publish({
              type: 'warning' as const,
              meta: { operation: 'gpu.cleanup.remove_attached_canvas', error: String(err) },
            });
          }
        } else if (this.glCanvas) {
          // remove even if not attached
          try {
            this.glCanvas.remove();
          } catch (err) {
            telemetryBus.publish({
              type: 'warning' as const,
              meta: { operation: 'gpu.cleanup.remove_detached_canvas', error: String(err) },
            });
          }
        }
        this.glCanvas = undefined;
      } catch (err) {
        telemetryBus.publish({
          type: 'error',
          meta: { operation: 'gpu.cleanup', error: String(err) },
        });
      }
    }
    // clear any held WebGPU device reference
    this.device = undefined;
    this.isInitialized = false;
    telemetryBus.publish({ type: 'gpu.backend', meta: { operation: 'cleanup_resources' } });
  }
}

export default GpuVectorProcessor;
