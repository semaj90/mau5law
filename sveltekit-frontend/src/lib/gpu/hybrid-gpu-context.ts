export interface HybridGPUContext {
  type: 'webgpu' | 'webgl2' | 'webgl' | 'cpu-fallback';
  device?: GPUDevice; // For WebGPU
  gl?: WebGL2RenderingContext | WebGLRenderingContext; // For WebGL
  // Add other context-specific properties as needed
}
