declare module '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/server/webgpu-redis-optimizer.js' {
  export class WebGPURedisOptimizer {
    constructor();
    setOptimized(
      key: string,
      data: Float32Array,
      options: { compress: boolean; priority: string; parallel: boolean }
    ): Promise<unknown>;
    getOptimizationStats(): Promise<{
      gpuMetrics: { tensorCoreLoad: number; thermalStatus: string };
    }>;
  }
}
