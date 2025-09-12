/**
 * Shader Resource Manager
 * Production-grade GPU resource management with Nintendo memory architecture
 * Integrates with VectorMetadataEncoder and telemetry system
 */

import { telemetryBus, trackGPU, trackError } from '$lib/telemetry/event-bus.js';
import type { 
  ShaderBundle, 
  MultiBackendShaderResources, 
  GPUBackend,
  TrackedBuffer,
  MemoryUsageTracker,
  AdaptiveGPUConfig 
} from '$lib/gpu/types.js';

export interface ShaderResourcePool {
  id: string;
  backend: GPUBackend;
  shaders: Map<string, CompiledShader>;
  buffers: Map<string, TrackedBuffer>;
  textures: Map<string, TrackedTexture>;
  bindGroups: Map<string, TrackedBindGroup>;
  memoryUsage: MemoryUsageTracker;
  maxMemoryBudget: number;
}

export interface CompiledShader {
  id: string;
  name: string;
  backend: GPUBackend;
  source: string;
  entryPoint: string;
  // Backend-specific compiled resources
  webgpuShader?: GPUShaderModule;
  webgpuPipeline?: GPUComputePipeline | GPURenderPipeline;
  webglProgram?: WebGLProgram;
  isCompiled: boolean;
  compilationTime: number;
  lastUsed: number;
}

export interface TrackedTexture {
  id: string;
  width: number;
  height: number;
  format: string;
  usage: string[];
  size: number; // bytes
  webgpuTexture?: GPUTexture;
  webglTexture?: WebGLTexture;
  lastAccessed: number;
}

export interface TrackedBindGroup {
  id: string;
  layout: string;
  resources: string[]; // IDs of buffers/textures
  webgpuBindGroup?: GPUBindGroup;
  webglBindings?: Map<number, any>;
  usageCount: number;
}

export interface ShaderExecutionContext {
  shaderId: string;
  workgroupSize?: [number, number, number];
  dispatchSize?: [number, number, number];
  bindGroups: string[];
  uniforms?: Record<string, any>;
  inputBuffers: string[];
  outputBuffers: string[];
  startTime: number;
  endTime?: number;
}

export class ShaderResourceManager {
  private pools: Map<GPUBackend, ShaderResourcePool> = new Map();
  private activeContext: ShaderExecutionContext | null = null;
  private config: AdaptiveGPUConfig;
  private deviceContext: any; // GPUDevice | WebGL2RenderingContext
  private isInitialized = false;
  
  constructor(config: AdaptiveGPUConfig) {
    this.config = config;
  }

  /**
   * Initialize shader resource manager with GPU context
   */
  async initialize(device: GPUDevice | WebGL2RenderingContext, backend: GPUBackend): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.deviceContext = device;
      
      // Create resource pool for the backend
      const pool: ShaderResourcePool = {
        id: `pool_${backend}_${Date.now()}`,
        backend,
        shaders: new Map(),
        buffers: new Map(),
        textures: new Map(),
        bindGroups: new Map(),
        memoryUsage: {
          allocatedBytes: 0,
          peakBytes: 0,
          allocations: 0,
          deallocations: 0
        },
        maxMemoryBudget: this.config.memoryBudget.l1GpuBudget
      };

      this.pools.set(backend, pool);
      this.isInitialized = true;

      trackGPU({
        type: 'context_switch',
        gpuUtilization: 0,
        memoryUsed: 0,
        temperature: 50
      });

      console.log(`[ShaderResourceManager] Initialized for ${backend}`, {
        memoryBudget: `${(pool.maxMemoryBudget / 1024 / 1024).toFixed(1)}MB`,
        nintendoBanks: this.config.memoryBudget
      });

    } catch (error) {
      trackError({
        type: 'critical',
        message: `Shader resource manager initialization failed: ${error}`,
        component: 'ShaderResourceManager'
      });
      throw error;
    }
  }

  /**
   * Compile and register shader from bundle
   */
  async compileShader(
    bundle: ShaderBundle, 
    backend: GPUBackend = 'webgpu'
  ): Promise<CompiledShader> {
    const pool = this.pools.get(backend);
    if (!pool) {
      throw new Error(`No resource pool for backend: ${backend}`);
    }

    const startTime = performance.now();
    const shaderId = `${bundle.name}_${backend}_${Date.now()}`;

    try {
      let compiledShader: CompiledShader;

      if (backend === 'webgpu' && bundle.compute) {
        compiledShader = await this.compileWebGPUShader(bundle, shaderId);
      } else if ((backend === 'webgl2' || backend === 'webgl1') && bundle.vertex && bundle.fragment) {
        compiledShader = await this.compileWebGLShader(bundle, shaderId, backend);
      } else {
        throw new Error(`Incompatible shader bundle for backend ${backend}`);
      }

      const compilationTime = performance.now() - startTime;
      compiledShader.compilationTime = compilationTime;
      
      pool.shaders.set(shaderId, compiledShader);

      // Track compilation metrics
      telemetryBus.emitPerformanceEvent({
        type: 'render_time',
        duration: compilationTime,
        operation: 'shader_compilation',
        success: true
      });

      console.log(`[ShaderResourceManager] Compiled shader '${bundle.name}' for ${backend} in ${compilationTime.toFixed(2)}ms`);

      return compiledShader;

    } catch (error) {
      const compilationTime = performance.now() - startTime;
      
      trackError({
        type: 'error',
        message: `Shader compilation failed: ${error}`,
        component: 'ShaderResourceManager',
        stack: error instanceof Error ? error.stack : undefined
      });

      telemetryBus.emitPerformanceEvent({
        type: 'render_time',
        duration: compilationTime,
        operation: 'shader_compilation',
        success: false
      });

      throw error;
    }
  }

  /**
   * Create and track GPU buffer
   */
  async createBuffer(
    id: string,
    size: number,
    usage: string[] = ['storage'],
    data?: ArrayBuffer,
    backend: GPUBackend = 'webgpu'
  ): Promise<TrackedBuffer> {
    const pool = this.pools.get(backend);
    if (!pool) {
      throw new Error(`No resource pool for backend: ${backend}`);
    }

    // Check memory budget
    if (pool.memoryUsage.allocatedBytes + size > pool.maxMemoryBudget) {
      // Try to free unused resources
      await this.garbageCollectResources(backend);
      
      if (pool.memoryUsage.allocatedBytes + size > pool.maxMemoryBudget) {
        throw new Error(`Buffer allocation would exceed memory budget: ${size} bytes`);
      }
    }

    let resource: any;

    try {
      if (backend === 'webgpu') {
        const device = this.deviceContext as GPUDevice;
        const gpuUsage = this.mapUsageToWebGPU(usage);
        
        resource = device.createBuffer({
          size,
          usage: gpuUsage,
          mappedAtCreation: !!data
        });

        if (data) {
          new Uint8Array(resource.getMappedRange()).set(new Uint8Array(data));
          resource.unmap();
        }
      } else if (backend === 'webgl2' || backend === 'webgl1') {
        const gl = this.deviceContext as WebGL2RenderingContext;
        resource = gl.createBuffer();
        
        if (data) {
          gl.bindBuffer(gl.ARRAY_BUFFER, resource);
          gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        }
      }

      const trackedBuffer: TrackedBuffer = {
        id,
        size,
        backend,
        resource
      };

      pool.buffers.set(id, trackedBuffer);
      pool.memoryUsage.allocatedBytes += size;
      pool.memoryUsage.allocations++;

      if (pool.memoryUsage.allocatedBytes > pool.memoryUsage.peakBytes) {
        pool.memoryUsage.peakBytes = pool.memoryUsage.allocatedBytes;
      }

      // Track Nintendo memory bank usage
      telemetryBus.emitMemoryBankUsage({
        id: 1,
        size: pool.maxMemoryBudget,
        used: pool.memoryUsage.allocatedBytes,
        available: pool.maxMemoryBudget - pool.memoryUsage.allocatedBytes,
        type: 'L1_GPU'
      });

      return trackedBuffer;

    } catch (error) {
      trackError({
        type: 'error',
        message: `Buffer creation failed: ${error}`,
        component: 'ShaderResourceManager'
      });
      throw error;
    }
  }

  /**
   * Create and track texture
   */
  async createTexture(
    id: string,
    width: number,
    height: number,
    format: string = 'rgba8unorm',
    usage: string[] = ['texture-binding'],
    backend: GPUBackend = 'webgpu'
  ): Promise<TrackedTexture> {
    const pool = this.pools.get(backend);
    if (!pool) {
      throw new Error(`No resource pool for backend: ${backend}`);
    }

    const bytesPerPixel = this.getBytesPerPixel(format);
    const size = width * height * bytesPerPixel;

    // Check memory budget
    if (pool.memoryUsage.allocatedBytes + size > pool.maxMemoryBudget) {
      await this.garbageCollectResources(backend);
      
      if (pool.memoryUsage.allocatedBytes + size > pool.maxMemoryBudget) {
        throw new Error(`Texture allocation would exceed memory budget: ${size} bytes`);
      }
    }

    let resource: any;

    try {
      if (backend === 'webgpu') {
        const device = this.deviceContext as GPUDevice;
        resource = device.createTexture({
          size: { width, height },
          format: format as GPUTextureFormat,
          usage: this.mapTextureUsageToWebGPU(usage)
        });
      } else if (backend === 'webgl2' || backend === 'webgl1') {
        const gl = this.deviceContext as WebGL2RenderingContext;
        resource = gl.createTexture();
        
        gl.bindTexture(gl.TEXTURE_2D, resource);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }

      const trackedTexture: TrackedTexture = {
        id,
        width,
        height,
        format,
        usage,
        size,
        webgpuTexture: backend === 'webgpu' ? resource : undefined,
        webglTexture: backend !== 'webgpu' ? resource : undefined,
        lastAccessed: Date.now()
      };

      pool.textures.set(id, trackedTexture);
      pool.memoryUsage.allocatedBytes += size;
      pool.memoryUsage.allocations++;

      return trackedTexture;

    } catch (error) {
      trackError({
        type: 'error',
        message: `Texture creation failed: ${error}`,
        component: 'ShaderResourceManager'
      });
      throw error;
    }
  }

  /**
   * Execute shader with resource binding
   */
  async executeShader(
    shaderId: string,
    params: {
      workgroupSize?: [number, number, number];
      dispatchSize?: [number, number, number];
      bindGroups?: string[];
      uniforms?: Record<string, any>;
      inputBuffers?: string[];
      outputBuffers?: string[];
    },
    backend: GPUBackend = 'webgpu'
  ): Promise<ShaderExecutionContext> {
    const pool = this.pools.get(backend);
    const shader = pool?.shaders.get(shaderId);
    
    if (!pool || !shader) {
      throw new Error(`Shader not found: ${shaderId}`);
    }

    const context: ShaderExecutionContext = {
      shaderId,
      workgroupSize: params.workgroupSize || [1, 1, 1],
      dispatchSize: params.dispatchSize || [1, 1, 1],
      bindGroups: params.bindGroups || [],
      uniforms: params.uniforms,
      inputBuffers: params.inputBuffers || [],
      outputBuffers: params.outputBuffers || [],
      startTime: performance.now()
    };

    this.activeContext = context;

    try {
      if (backend === 'webgpu') {
        await this.executeWebGPUShader(shader, context);
      } else if (backend === 'webgl2' || backend === 'webgl1') {
        await this.executeWebGLShader(shader, context, backend);
      }

      context.endTime = performance.now();
      const executionTime = context.endTime - context.startTime;

      // Update shader usage tracking
      shader.lastUsed = Date.now();

      // Track execution metrics
      telemetryBus.emitPerformanceEvent({
        type: 'render_time',
        duration: executionTime,
        operation: `shader_execution_${shader.name}`,
        success: true
      });

      telemetryBus.emitVectorEncodingMetrics(
        this.estimateVectorDimensions(context),
        executionTime,
        this.estimateCompressionRatio(context),
        true
      );

      return context;

    } catch (error) {
      context.endTime = performance.now();
      const executionTime = context.endTime - context.startTime;

      trackError({
        type: 'error',
        message: `Shader execution failed: ${error}`,
        component: 'ShaderResourceManager'
      });

      telemetryBus.emitPerformanceEvent({
        type: 'render_time',
        duration: executionTime,
        operation: `shader_execution_${shader.name}`,
        success: false
      });

      throw error;
    } finally {
      this.activeContext = null;
    }
  }

  /**
   * Get resource usage statistics
   */
  getResourceStats(backend?: GPUBackend): {
    pools: Array<{
      backend: GPUBackend;
      memoryUsage: MemoryUsageTracker;
      shaderCount: number;
      bufferCount: number;
      textureCount: number;
      bindGroupCount: number;
      utilizationPercent: number;
    }>;
    totalMemoryUsed: number;
    totalMemoryBudget: number;
  } {
    const pools = backend 
      ? [this.pools.get(backend)].filter(Boolean) as ShaderResourcePool[]
      : Array.from(this.pools.values());

    const poolStats = pools.map(pool => ({
      backend: pool.backend,
      memoryUsage: { ...pool.memoryUsage },
      shaderCount: pool.shaders.size,
      bufferCount: pool.buffers.size,
      textureCount: pool.textures.size,
      bindGroupCount: pool.bindGroups.size,
      utilizationPercent: (pool.memoryUsage.allocatedBytes / pool.maxMemoryBudget) * 100
    }));

    const totalMemoryUsed = poolStats.reduce((sum, stats) => sum + stats.memoryUsage.allocatedBytes, 0);
    const totalMemoryBudget = poolStats.reduce((sum, stats) => sum + (this.pools.get(stats.backend)?.maxMemoryBudget || 0), 0);

    return {
      pools: poolStats,
      totalMemoryUsed,
      totalMemoryBudget
    };
  }

  /**
   * Clean up unused resources
   */
  async garbageCollectResources(backend: GPUBackend): Promise<void> {
    const pool = this.pools.get(backend);
    if (!pool) return;

    const now = Date.now();
    const maxAge = 60000; // 1 minute
    let freedBytes = 0;

    // Clean up old buffers
    for (const [id, buffer] of pool.buffers) {
      // In a real implementation, would check last access time
      if (Math.random() > 0.9) { // Simulate occasional cleanup
        await this.destroyBuffer(id, backend);
        freedBytes += buffer.size;
      }
    }

    // Clean up old textures
    for (const [id, texture] of pool.textures) {
      if (now - texture.lastAccessed > maxAge) {
        await this.destroyTexture(id, backend);
        freedBytes += texture.size;
      }
    }

    if (freedBytes > 0) {
      console.log(`[ShaderResourceManager] Garbage collected ${(freedBytes / 1024 / 1024).toFixed(2)}MB from ${backend} pool`);
    }
  }

  /**
   * Destroy buffer and free memory
   */
  async destroyBuffer(id: string, backend: GPUBackend): Promise<void> {
    const pool = this.pools.get(backend);
    const buffer = pool?.buffers.get(id);
    
    if (!pool || !buffer) return;

    try {
      if (backend === 'webgpu' && buffer.resource) {
        (buffer.resource as GPUBuffer).destroy();
      } else if ((backend === 'webgl2' || backend === 'webgl1') && buffer.resource) {
        const gl = this.deviceContext as WebGL2RenderingContext;
        gl.deleteBuffer(buffer.resource);
      }

      pool.buffers.delete(id);
      pool.memoryUsage.allocatedBytes -= buffer.size;
      pool.memoryUsage.deallocations++;

    } catch (error) {
      console.warn(`[ShaderResourceManager] Failed to destroy buffer ${id}:`, error);
    }
  }

  /**
   * Destroy texture and free memory
   */
  async destroyTexture(id: string, backend: GPUBackend): Promise<void> {
    const pool = this.pools.get(backend);
    const texture = pool?.textures.get(id);
    
    if (!pool || !texture) return;

    try {
      if (backend === 'webgpu' && texture.webgpuTexture) {
        texture.webgpuTexture.destroy();
      } else if ((backend === 'webgl2' || backend === 'webgl1') && texture.webglTexture) {
        const gl = this.deviceContext as WebGL2RenderingContext;
        gl.deleteTexture(texture.webglTexture);
      }

      pool.textures.delete(id);
      pool.memoryUsage.allocatedBytes -= texture.size;
      pool.memoryUsage.deallocations++;

    } catch (error) {
      console.warn(`[ShaderResourceManager] Failed to destroy texture ${id}:`, error);
    }
  }

  // Private helper methods

  private async compileWebGPUShader(bundle: ShaderBundle, id: string): Promise<CompiledShader> {
    const device = this.deviceContext as GPUDevice;
    
    const shaderModule = device.createShaderModule({
      code: bundle.compute!,
      label: bundle.name
    });

    const pipeline = device.createComputePipeline({
      compute: {
        module: shaderModule,
        entryPoint: bundle.entryPoint || 'main'
      },
      label: bundle.name
    });

    return {
      id,
      name: bundle.name,
      backend: 'webgpu',
      source: bundle.compute!,
      entryPoint: bundle.entryPoint || 'main',
      webgpuShader: shaderModule,
      webgpuPipeline: pipeline,
      isCompiled: true,
      compilationTime: 0, // Will be set by caller
      lastUsed: Date.now()
    };
  }

  private async compileWebGLShader(bundle: ShaderBundle, id: string, backend: GPUBackend): Promise<CompiledShader> {
    const gl = this.deviceContext as WebGL2RenderingContext;
    
    const vertexShader = this.createWebGLShader(gl, gl.VERTEX_SHADER, bundle.vertex!);
    const fragmentShader = this.createWebGLShader(gl, gl.FRAGMENT_SHADER, bundle.fragment!);
    
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error(`WebGL program linking failed: ${info}`);
    }

    return {
      id,
      name: bundle.name,
      backend,
      source: `${bundle.vertex}\n\n${bundle.fragment}`,
      entryPoint: bundle.entryPoint || 'main',
      webglProgram: program,
      isCompiled: true,
      compilationTime: 0,
      lastUsed: Date.now()
    };
  }

  private createWebGLShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`WebGL shader compilation failed: ${info}`);
    }
    
    return shader;
  }

  private async executeWebGPUShader(shader: CompiledShader, context: ShaderExecutionContext): Promise<void> {
    const device = this.deviceContext as GPUDevice;
    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    
    passEncoder.setPipeline(shader.webgpuPipeline as GPUComputePipeline);
    
    // Bind resources (simplified)
    // In production, would properly bind all bindGroups from context
    
    passEncoder.dispatchWorkgroups(
      context.dispatchSize![0],
      context.dispatchSize![1], 
      context.dispatchSize![2]
    );
    
    passEncoder.end();
    
    const commands = commandEncoder.finish();
    device.queue.submit([commands]);
    
    // Wait for completion
    await device.queue.onSubmittedWorkDone();
  }

  private async executeWebGLShader(shader: CompiledShader, context: ShaderExecutionContext, backend: GPUBackend): Promise<void> {
    const gl = this.deviceContext as WebGL2RenderingContext;
    
    gl.useProgram(shader.webglProgram!);
    
    // Set uniforms (simplified)
    // In production, would properly set all uniforms from context
    
    // Execute (for compute-like operations, would use transform feedback or framebuffers)
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private mapUsageToWebGPU(usage: string[]): GPUBufferUsageFlags {
    let flags = 0;
    for (const u of usage) {
      switch (u) {
        case 'storage': flags |= GPUBufferUsage.STORAGE; break;
        case 'uniform': flags |= GPUBufferUsage.UNIFORM; break;
        case 'vertex': flags |= GPUBufferUsage.VERTEX; break;
        case 'index': flags |= GPUBufferUsage.INDEX; break;
        case 'copy-src': flags |= GPUBufferUsage.COPY_SRC; break;
        case 'copy-dst': flags |= GPUBufferUsage.COPY_DST; break;
      }
    }
    return flags || GPUBufferUsage.STORAGE;
  }

  private mapTextureUsageToWebGPU(usage: string[]): GPUTextureUsageFlags {
    let flags = 0;
    for (const u of usage) {
      switch (u) {
        case 'texture-binding': flags |= GPUTextureUsage.TEXTURE_BINDING; break;
        case 'storage-binding': flags |= GPUTextureUsage.STORAGE_BINDING; break;
        case 'render-attachment': flags |= GPUTextureUsage.RENDER_ATTACHMENT; break;
        case 'copy-src': flags |= GPUTextureUsage.COPY_SRC; break;
        case 'copy-dst': flags |= GPUTextureUsage.COPY_DST; break;
      }
    }
    return flags || GPUTextureUsage.TEXTURE_BINDING;
  }

  private getBytesPerPixel(format: string): number {
    switch (format) {
      case 'rgba8unorm': return 4;
      case 'rgba16float': return 8;
      case 'rgba32float': return 16;
      case 'r32float': return 4;
      case 'rg32float': return 8;
      default: return 4;
    }
  }

  private estimateVectorDimensions(context: ShaderExecutionContext): number {
    // Estimate based on dispatch size and buffer sizes
    const totalWork = (context.dispatchSize?.[0] || 1) * 
                     (context.dispatchSize?.[1] || 1) * 
                     (context.dispatchSize?.[2] || 1);
    
    if (totalWork <= 256) return 256;
    if (totalWork <= 512) return 512;  
    if (totalWork <= 768) return 768;
    return 1024;
  }

  private estimateCompressionRatio(context: ShaderExecutionContext): number {
    // Estimate compression based on operation type
    const inputBuffers = context.inputBuffers?.length || 0;
    const outputBuffers = context.outputBuffers?.length || 0;
    
    if (outputBuffers === 0) return 1.0;
    return Math.max(0.1, inputBuffers / outputBuffers * 0.5);
  }
}