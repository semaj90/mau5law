import type { HybridGPUContext } from './hybrid-gpu-context.js';
import { browser } from '$app/environment';

class GlobalGPUManager {
  private static instance: GlobalGPUManager;
  private gpuEnabled: boolean = false;
  private contextType: 'webgpu' | 'webgl2' | 'webgl' | 'cpu-fallback' = 'cpu-fallback';
  private hybridGPUContext: HybridGPUContext | null = null;

  private constructor() {}

  static getInstance(): GlobalGPUManager {
    if (!GlobalGPUManager.instance) {
      GlobalGPUManager.instance = new GlobalGPUManager();
    }
    return GlobalGPUManager.instance;
  }

  async initialize(canvas?: HTMLCanvasElement): Promise<boolean> {
    if (!browser) {
      this.gpuEnabled = false;
      this.contextType = 'cpu-fallback';
      this.hybridGPUContext = { type: 'cpu-fallback' };
      return false;
    }

    try {
      // Attempt WebGPU initialization
      if (navigator.gpu) {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          const device = await adapter.requestDevice();
          if (device) {
            this.gpuEnabled = true;
            this.contextType = 'webgpu';
            this.hybridGPUContext = { type: 'webgpu', device };
            console.log('GlobalGPUManager: WebGPU initialized.');
            return true;
          }
        }
      }

      // Fallback to WebGL2
      if (canvas) {
        const gl2 = canvas.getContext('webgl2');
        if (gl2) {
          this.gpuEnabled = true;
          this.contextType = 'webgl2';
          this.hybridGPUContext = { type: 'webgl2', gl: gl2 };
          console.log('GlobalGPUManager: WebGL2 initialized.');
          return true;
        }
        // Fallback to WebGL
        const gl = canvas.getContext('webgl');
        if (gl) {
          this.gpuEnabled = true;
          this.contextType = 'webgl';
          this.hybridGPUContext = { type: 'webgl', gl };
          console.log('GlobalGPUManager: WebGL initialized.');
          return true;
        }
      }

      console.warn('GlobalGPUManager: No GPU context available, falling back to CPU.');
      this.gpuEnabled = false;
      this.contextType = 'cpu-fallback';
      this.hybridGPUContext = { type: 'cpu-fallback' };
      return false;
    } catch (error) {
      console.error('GlobalGPUManager: Error during GPU initialization:', error);
      this.gpuEnabled = false;
      this.contextType = 'cpu-fallback';
      this.hybridGPUContext = { type: 'cpu-fallback' };
      return false;
    }
  }

  isGPUEnabled(): boolean {
    return this.gpuEnabled;
  }

  getContextType(): 'webgpu' | 'webgl2' | 'webgl' | 'cpu-fallback' {
    return this.contextType;
  }

  getHybridGPU(): HybridGPUContext | null {
    return this.hybridGPUContext;
  }

  // Placeholder for NES color quantization
  async quantizeToNESPalette(
    imageData: Float32Array,
    width: number,
    height: number,
    options: any
  ): Promise<Float32Array> {
    console.log('GlobalGPUManager: Simulating NES quantization...');
    // In a real scenario, this would involve GPU compute shaders or WASM
    // For now, return the original data or a simple mock
    return new Promise(resolve => setTimeout(() => {
      // Simple mock: just return the input data
      resolve(imageData);
    }, 10));
  }

  // Placeholder for NES memory access
  getNESMemory(region: string): any {
    console.log(`GlobalGPUManager: Accessing mock NES memory region: ${region}`);
    // In a real scenario, this would be a shared buffer or a specific memory map
    return new Uint8Array(16 * 1024); // 16KB mock NES memory
  }
}

export const globalGPUManager = GlobalGPUManager.getInstance();
