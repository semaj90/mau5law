/**
 * Advanced GPU Context Provider with Type Narrowing
 * Provides stable architectural abstraction for WebGPU/WebGL backends
 * Implements proper type narrowing for shader loading and resource management
 */

import type { HybridGPUContext } from './hybrid-gpu-context.js';
import { GPU_CONFIG, CLIENT_ENV } from '../config/env.js';
import type { GPUBackend, BackendCapabilities, MemoryUsageTracker, TrackedBuffer } from './types.js';

export type GPUBackendType = GPUBackend;

export interface GPUCapabilities extends BackendCapabilities {}

export interface ShaderResources {
  compute?: string;
  vertex?: string;
  fragment?: string;
  uniforms?: Record<string, any>;
  buffers?: Record<string, ArrayBufferView>;
}

export interface GPUContextOptions {
  preferredBackend?: GPUBackendType;
  requireCompute?: boolean;
  memoryLimit?: number;
  debug?: boolean;
}

/**
 * GPU Context Provider with type-safe backend detection
 */
export class GPUContextProvider {
  private static instance: GPUContextProvider;
  private hybridContext: HybridGPUContext | null = null;
  private capabilities: GPUCapabilities | null = null;
  private canvas: HTMLCanvasElement;
  private initialized = false;
  private memory: MemoryUsageTracker = { allocatedBytes: 0, peakBytes: 0, allocations: 0, deallocations: 0 };
  private buffers: Map<string, TrackedBuffer> = new Map();
  private reinitLock = false;

  private constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1;
    this.canvas.height = 1;
  }

  static getInstance(): GPUContextProvider {
    if (!GPUContextProvider.instance) {
      GPUContextProvider.instance = new GPUContextProvider();
    }
    return GPUContextProvider.instance;
  }

  /**
   * Initialize GPU context with environment-based configuration
   */
  async initialize(options: GPUContextOptions = {}): Promise<boolean> {
    if (this.initialized) return this.capabilities !== null;

    try {
      // Use environment configuration as defaults
      const config = {
  preferWebGPU: options.preferredBackend === 'webgpu' ? true : GPU_CONFIG.preferWebGPU,
        allowWebGL2: options.preferredBackend !== 'webgpu' || GPU_CONFIG.allowWebGL2,
        allowWebGL1: options.preferredBackend !== 'webgpu' && options.preferredBackend !== 'webgl2' || GPU_CONFIG.allowWebGL1,
        requireCompute: options.requireCompute ?? GPU_CONFIG.requireCompute,
        lodSystemIntegration: GPU_CONFIG.lodSystemIntegration,
        nesMemoryOptimization: GPU_CONFIG.nesMemoryOptimization
      };

      const { createHybridGPUContext } = await import('./hybrid-gpu-context.js');
      this.hybridContext = await createHybridGPUContext(this.canvas, config);

      // Detect capabilities
  this.capabilities = await this.detectCapabilities();

      this.initialized = true;

      if (CLIENT_ENV.GPU_DEBUG) {
        console.log('🎮 GPU Context Provider initialized:', {
          backend: this.capabilities.backend,
          capabilities: this.capabilities
        });
      }

      return true;

    } catch (error) {
      console.warn('⚠️ GPU Context Provider initialization failed:', error);

      // CPU fallback
      this.capabilities = {
        backend: 'cpu',
        supportsCompute: false,
        supportsFloat32: true,
        supportsInteger: true,
        maxTextureSize: 2048,
        maxBufferSize: 16 * 1024 * 1024, // 16MB
        memoryBudget: 64 * 1024 * 1024 // 64MB
      };

      this.initialized = true;
      return false;
    }
  }

  /**
   * Force reinitialization with a (potentially) different preferred backend.
   * Used by manual override / promotion tooling.
   */
  async reinitialize(options: GPUContextOptions = {}): Promise<boolean> {
    // Dispose prior context explicitly
    try {
      (this.hybridContext as any)?.dispose?.();
    } catch {}
    this.hybridContext = null;
    this.capabilities = null;
    this.initialized = false;
    return this.initialize(options);
  }

  /** Force switch backend best-effort (does not guarantee chosen backend if unsupported). */
  async forceBackend(preferred: GPUBackendType): Promise<{ success: boolean; active: GPUBackendType }> {
    const ok = await this.reinitialize({ preferredBackend: preferred, requireCompute: false, debug: false });
    return { success: ok, active: this.getActiveBackend() };
  }

  /**
   * Get active backend type for type narrowing
   */
  getActiveBackend(): GPUBackendType {
    const b = this.capabilities?.backend || 'cpu';
    return (b as any) === 'webgl' ? 'webgl1' : b;
  }

  /**
   * Get GPU capabilities for resource optimization
   */
  getCapabilities(): GPUCapabilities | null {
    return this.capabilities;
  }

  /**
   * Type-narrowed resource loading based on backend
   */
  async loadShaderResources(
    name: string,
    resources: {
      webgpu?: ShaderResources;
      webgl2?: ShaderResources;
      webgl1?: ShaderResources;
      cpu?: ShaderResources;
    }
  ): Promise<ShaderResources | null> {
    const backend = this.getActiveBackend();

    // Type narrowing: load appropriate resources for active backend
    switch (backend) {
      case 'webgpu':
        if (resources.webgpu) {
          if (CLIENT_ENV.SHADER_DEBUG) {
            console.log(`🔧 Loading WebGPU shaders for ${name}`);
          }
          return resources.webgpu;
        }
        break;

      case 'webgl2':
        if (resources.webgl2) {
          if (CLIENT_ENV.SHADER_DEBUG) {
            console.log(`🔧 Loading WebGL2 shaders for ${name}`);
          }
          return resources.webgl2;
        }
        // Fallback to WebGL1 if WebGL2 not available
        if (resources.webgl1) {
          if (CLIENT_ENV.SHADER_DEBUG) {
            console.log(`🔧 Loading WebGL1 shaders for ${name} (WebGL2 fallback)`);
          }
          return resources.webgl1;
        }
        break;

      case 'webgl1':
        if (resources.webgl1) {
          if (CLIENT_ENV.SHADER_DEBUG) {
            console.log(`🔧 Loading WebGL1 shaders for ${name}`);
          }
          return resources.webgl1;
        }
        break;

      case 'cpu':
        if (resources.cpu) {
          if (CLIENT_ENV.SHADER_DEBUG) {
            console.log(`🔧 Loading CPU implementation for ${name}`);
          }
          return resources.cpu;
        }
        break;
    }

    console.warn(`❌ No shader resources available for ${name} on ${backend}`);
    return null;
  }

  /**
   * Execute compute operation with backend-specific optimization
   */
  async runComputeOperation(
    shaderCode: string,
    data: Record<string, ArrayBufferView>,
    options: {
      workgroupSize?: number;
      outputSize?: number;
    } = {}
  ): Promise<Record<string, ArrayBufferView> | null> {
    if (!this.hybridContext || !this.capabilities) {
      return null;
    }

    const backend = this.getActiveBackend();

    try {
      switch (backend) {
        case 'webgpu':
          // Placeholder: HybridGPUContext missing direct compute helper; return null until integrated
          console.warn('⚠️ WebGPU compute path not wired via provider yet');
          return null;

        case 'webgl2':
          // Use WebGL2 transform feedback or texture-based compute
          return await this.runWebGL2Compute(shaderCode, data, options);

        case 'webgl1': // map to 'webgl'
          // Use WebGL1 texture-based compute simulation
          return await this.runWebGL1Compute(shaderCode, data, options);

        case 'cpu':
          // CPU fallback
          return await this.runCPUCompute(shaderCode, data, options);

        default:
          console.warn(`❌ Unsupported backend for compute: ${backend}`);
          return null;
      }
    } catch (error) {
      console.error(`❌ Compute operation failed on ${backend}:`, error);
      return null;
    }
  }

  /**
   * Create optimized buffer for active backend
   */
  createBuffer(
    data: ArrayBufferView,
    usage: 'uniform' | 'storage' | 'vertex' | 'index'
  ): any | null {
    if (!this.hybridContext) return null;

    const backend = this.getActiveBackend();
  const contextType = this.hybridContext.getActiveContextType();
  const context = (this.hybridContext as any)[contextType === 'webgl2' ? 'webgl2Context' : contextType === 'webgl' ? 'webglContext' : 'gpuDevice'];
    const id = `${backend}-buf-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
    const size = data.byteLength;
    const trackAllocation = (resource: unknown) => {
      this.memory.allocatedBytes += size;
      this.memory.peakBytes = Math.max(this.memory.peakBytes, this.memory.allocatedBytes);
      this.memory.allocations++;
      this.buffers.set(id, { id, size, backend, resource });
      return resource;
    };

    switch (backend) {
      case 'webgpu':
        const device = context as GPUDevice;
        const gpuUsage = this.mapWebGPUUsage(usage);
        const buffer = device.createBuffer({
          size: data.byteLength,
          usage: gpuUsage,
          mappedAtCreation: true
        });
        trackAllocation(buffer);
        return buffer;

      case 'webgl2':
      case 'webgl1':
        const gl = context as WebGL2RenderingContext | WebGLRenderingContext;
        const glBuffer = gl.createBuffer();
        const target = this.mapWebGLTarget(usage);
        gl.bindBuffer(target, glBuffer);
        gl.bufferData(target, data, gl.STATIC_DRAW);
        trackAllocation(glBuffer);
        return glBuffer;

      case 'cpu':
        // Return the data itself for CPU processing
        trackAllocation(data);
        return data;

      default:
        return null;
    }
  }

  releaseBuffer(id: string): void {
    const tracked = this.buffers.get(id);
    if (!tracked) return;
    this.memory.allocatedBytes -= tracked.size;
    this.memory.deallocations++;
    this.buffers.delete(id);
  }

  getMemoryUsage(): MemoryUsageTracker {
    return { ...this.memory };
  }

  /**
   * Detect GPU capabilities for the active backend
   */
  private async detectCapabilities(): Promise<GPUCapabilities> {
    if (!this.hybridContext) {
      throw new Error('Hybrid context not initialized');
    }

  const backend = this.hybridContext.getActiveContextType();
  const context = (this.hybridContext as any)[backend === 'webgl2' ? 'webgl2Context' : backend === 'webgl' ? 'webglContext' : 'gpuDevice'];

    switch (backend) {
      case 'webgpu':
        return this.detectWebGPUCapabilities(context as GPUDevice);

      case 'webgl2':
        return this.detectWebGL2Capabilities(context as WebGL2RenderingContext);

      case 'webgl':
        return this.detectWebGL1Capabilities(context as WebGLRenderingContext);

      default:
        throw new Error(`Unknown backend: ${backend}`);
    }
  }

  private detectWebGPUCapabilities(device: GPUDevice): GPUCapabilities {
    return {
      backend: 'webgpu',
      supportsCompute: true,
      supportsFloat32: true,
      supportsInteger: true,
      maxTextureSize: 8192, // WebGPU typical limit
      maxBufferSize: 256 * 1024 * 1024, // 256MB
      maxWorkgroupSize: 256,
      memoryBudget: GPU_CONFIG.memoryLimit
    };
  }

  private detectWebGL2Capabilities(gl: WebGL2RenderingContext): GPUCapabilities {
    return {
      backend: 'webgl2',
      supportsCompute: false, // Simulated via transform feedback
      supportsFloat32: !!gl.getExtension('EXT_color_buffer_float'),
      supportsInteger: true,
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxBufferSize: 64 * 1024 * 1024, // 64MB typical
      memoryBudget: GPU_CONFIG.memoryLimit * 0.75 // Leave some headroom
    };
  }

  private detectWebGL1Capabilities(gl: WebGLRenderingContext): GPUCapabilities {
    return {
      backend: 'webgl1',
      supportsCompute: false,
      supportsFloat32: !!gl.getExtension('OES_texture_float'),
      supportsInteger: false,
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxBufferSize: 32 * 1024 * 1024, // 32MB typical
      memoryBudget: GPU_CONFIG.memoryLimit * 0.5 // Conservative limit
    };
  }

  // Backend-specific compute implementations
  private async runWebGL2Compute(
    shaderCode: string,
    data: Record<string, ArrayBufferView>,
    options: any
  ): Promise<Record<string, ArrayBufferView>> {
    // Simplified transform feedback based compute simulation
  if (!this.hybridContext) return {};
  const gl = (this.hybridContext as any).webgl2Context as WebGL2RenderingContext;
  if (!gl) return {};

    // Expect pseudo shaderCode formatted with /*VERTEX*/ and /*FRAGMENT*/ separators when passed from processor.
    const vertexSourceMatch = /\/\*VERTEX\*\/[\s\S]*?\/\*FRAGMENT\*\//.exec(shaderCode);
    let vertexSource = '';
    if (vertexSourceMatch) {
      vertexSource = vertexSourceMatch[0]
        .replace('/*VERTEX*/', '')
        .replace('/*FRAGMENT*/', '')
        .trim();
    } else {
      // Fallback: treat entire code as vertex passthrough
      vertexSource = `#version 300 es\nlayout(location=0) in float a_index; void main(){ gl_Position=vec4( (a_index/10.0)-0.5,0.0,0.0,1.0); }`;
    }

    const varyings = ['v_out0'];
    const tfVertex = `#version 300 es\nlayout(location=0) in float a_index; out float v_out0; void main(){ v_out0 = a_index; gl_Position=vec4(0,0,0,1); }`;

    // Compile helper
    const compile = (type: number, source: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, source);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(sh) || 'compile failure';
        gl.deleteShader(sh);
        throw new Error('Shader compile: ' + info);
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, tfVertex);
    const fs = compile(gl.FRAGMENT_SHADER, `#version 300 es\nprecision mediump float; out vec4 fragColor; void main(){ fragColor=vec4(0); }`);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.transformFeedbackVaryings(program, varyings, gl.INTERLEAVED_ATTRIBS);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program) || 'link failure';
      gl.deleteProgram(program);
      throw new Error('Program link: ' + info);
    }

    const count = (data.indexes?.byteLength || 0) / 4 || 1;

    // Setup input buffer (indices or synthetic)
    const input = new Float32Array(count);
    for (let i = 0; i < count; i++) input[i] = i;
    const inBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, inBuf);
    gl.bufferData(gl.ARRAY_BUFFER, input, gl.STATIC_DRAW);

    // Output buffer via transform feedback
    const outBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, outBuf);
    gl.bufferData(gl.ARRAY_BUFFER, input.byteLength, gl.DYNAMIC_COPY);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, inBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);

    const tf = gl.createTransformFeedback();
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, outBuf);

    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, count);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);

    // Read back
    const result = new Float32Array(count);
    gl.bindBuffer(gl.ARRAY_BUFFER, outBuf);
    gl.getBufferSubData(gl.ARRAY_BUFFER, 0, result);

    // Cleanup minimal
    gl.deleteTransformFeedback(tf);
    gl.deleteBuffer(inBuf);
    gl.deleteBuffer(outBuf);
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    return { transform: result };
  }

  private async runWebGL1Compute(
    shaderCode: string,
    data: Record<string, ArrayBufferView>,
    options: any
  ): Promise<Record<string, ArrayBufferView>> {
    // Simulate compute using texture-based processing
    console.log('🔄 Simulating compute with WebGL1 texture processing');
    return {}; // Placeholder
  }

  private async runCPUCompute(
    shaderCode: string,
    data: Record<string, ArrayBufferView>,
    options: any
  ): Promise<Record<string, ArrayBufferView>> {
    // CPU fallback implementation
    console.log('🔄 Running compute on CPU fallback');
    return {}; // Placeholder
  }

  // Helper methods for buffer creation
  private mapWebGPUUsage(usage: string): number {
    const GPUBufferUsage = {
      UNIFORM: 0x40,
      STORAGE: 0x80,
      VERTEX: 0x20,
      INDEX: 0x10,
      COPY_SRC: 0x04,
      COPY_DST: 0x08
    };

    switch (usage) {
      case 'uniform': return GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
      case 'storage': return GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
      case 'vertex': return GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
      case 'index': return GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST;
      default: return GPUBufferUsage.COPY_DST;
    }
  }

  private mapWebGLTarget(usage: string): number {
    switch (usage) {
  case 'uniform': return (WebGL2RenderingContext as any).UNIFORM_BUFFER || WebGLRenderingContext.ARRAY_BUFFER;
      case 'storage': return WebGLRenderingContext.ARRAY_BUFFER;
      case 'vertex': return WebGLRenderingContext.ARRAY_BUFFER;
      case 'index': return WebGLRenderingContext.ELEMENT_ARRAY_BUFFER;
      default: return WebGLRenderingContext.ARRAY_BUFFER;
    }
  }

  /**
   * Get hybrid context for direct access (use sparingly)
   */
  getHybridContext(): HybridGPUContext | null {
    return this.hybridContext;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.hybridContext = null;
    this.capabilities = null;
    this.initialized = false;
    this.buffers.clear();
    this.memory = { allocatedBytes: 0, peakBytes: 0, allocations: 0, deallocations: 0 };
  }

  /**
   * Demote backend to next available tier (webgpu -> webgl2 -> webgl1 -> cpu)
   * Ensures only one reinitialization occurs at a time.
   */
  async demoteBackend(reason: string = 'unspecified'): Promise<boolean> {
    if (this.reinitLock) return false;
    const current = this.getActiveBackend();
    if (current === 'cpu' || current === 'webgl1') return false; // Cannot demote further
    this.reinitLock = true;
    let target: GPUBackendType = 'cpu';
    try {
      if (current === 'webgpu') {
        if (GPU_CONFIG.allowWebGL2) target = 'webgl2';
        else if (GPU_CONFIG.allowWebGL1) target = 'webgl1';
      } else if (current === 'webgl2') {
        if (GPU_CONFIG.allowWebGL1) target = 'webgl1';
      }

      if (CLIENT_ENV.GPU_DEBUG) {
        console.warn(`⚠️ Demoting GPU backend from ${current} -> ${target} (reason: ${reason})`);
      }

      // Dispose current context & reinitialize with target preference
      this.dispose();
      await this.initialize({ preferredBackend: target, requireCompute: false, debug: CLIENT_ENV.GPU_DEBUG });
      const newBackend = this.getActiveBackend();
      return newBackend !== current;
    } catch (e) {
      console.error('❌ Backend demotion failed, forcing CPU fallback:', e);
      this.dispose();
      this.capabilities = {
        backend: 'cpu',
        supportsCompute: false,
        supportsFloat32: true,
        supportsInteger: true,
        maxTextureSize: 2048,
        maxBufferSize: 16 * 1024 * 1024,
        memoryBudget: 64 * 1024 * 1024
      } as GPUCapabilities;
      this.initialized = true;
      return true; // treated as success (demoted to cpu)
    } finally {
      this.reinitLock = false;
    }
  }
}

// Export singleton instance
export const gpuContextProvider = GPUContextProvider.getInstance();

// Factory helper to ensure initialization before use
export async function ensureGPUContext(options?: GPUContextOptions) {
  const ok = await gpuContextProvider.initialize(options);
  return { provider: gpuContextProvider, ok };
}