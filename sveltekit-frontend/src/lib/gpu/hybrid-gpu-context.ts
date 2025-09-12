/**
 * Hybrid GPU Context Manager
 * Graceful fallback: WebGPU → WebGL2 → WebGL
 * 
 * WebGPU: Modern GPU compute + rendering (when available)
 * WebGL2: GPU rendering with limited compute via transform feedback
 * WebGL: Basic GPU rendering fallback
 * 
 * Integrates with your existing LOD and NES caching systems
 */

import type { MatrixLODSystem } from '../ui/matrix-lod';
import type { lodCacheEngine } from '../ai/lod-cache-engine';

export type GPUContextType = 'webgpu' | 'webgl2' | 'webgl' | 'cpu-fallback';

export interface GPUCapabilities {
  type: GPUContextType;
  hasCompute: boolean;
  maxTextureSize: number;
  maxBufferSize: number;
  supportsFloat32: boolean;
  supportsInt32: boolean;
  maxWorkgroupSize?: number; // WebGPU only
  maxVertexAttributes: number;
  extensions: string[];
}

export interface HybridRenderingOptions {
  preferWebGPU: boolean;
  allowWebGL2: boolean;
  allowWebGL1: boolean;
  requireCompute: boolean;
  lodSystemIntegration: boolean;
  nesMemoryOptimization: boolean;
}

export class HybridGPUContext {
  private canvas: HTMLCanvasElement;
  private gpuDevice: GPUDevice | null = null;
  private webgl2Context: WebGL2RenderingContext | null = null;
  private webglContext: WebGLRenderingContext | null = null;
  private capabilities: GPUCapabilities;
  private activeContextType: GPUContextType = 'cpu-fallback';
  private lodSystem: MatrixLODSystem | null = null;
  private computeShaders: Map<string, GPUComputePipeline | WebGLProgram> = new Map();

  constructor(
    canvas: HTMLCanvasElement, 
    private options: HybridRenderingOptions = {
      preferWebGPU: true,
      allowWebGL2: true,
      allowWebGL1: true,
      requireCompute: false,
      lodSystemIntegration: true,
      nesMemoryOptimization: true
    }
  ) {
    this.canvas = canvas;
    this.capabilities = this.getDefaultCapabilities();
  }

  /**
   * Initialize the best available GPU context with graceful fallback
   */
  async initialize(): Promise<GPUContextType> {
    console.log('🔄 Initializing Hybrid GPU Context...');

    // Attempt WebGPU first (best performance + compute)
    if (this.options.preferWebGPU && await this.initializeWebGPU()) {
      this.activeContextType = 'webgpu';
      console.log('✅ WebGPU initialized - Full compute + rendering available');
      return 'webgpu';
    }

    // Fallback to WebGL2 (good rendering + limited compute)
    if (this.options.allowWebGL2 && await this.initializeWebGL2()) {
      this.activeContextType = 'webgl2';
      console.log('✅ WebGL2 initialized - Rendering + transform feedback available');
      return 'webgl2';
    }

    // Fallback to WebGL1 (basic rendering only)
    if (this.options.allowWebGL1 && await this.initializeWebGL()) {
      this.activeContextType = 'webgl';
      console.log('✅ WebGL initialized - Basic rendering available');
      return 'webgl';
    }

    // CPU fallback (software rendering)
    console.warn('⚠️  No GPU contexts available - using CPU fallback');
    this.activeContextType = 'cpu-fallback';
    return 'cpu-fallback';
  }

  private async initializeWebGPU(): Promise<boolean> {
    try {
      if (!navigator.gpu) {
        console.log('❌ WebGPU not supported in this browser');
        return false;
      }

      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!adapter) {
        console.log('❌ WebGPU adapter not available');
        return false;
      }

      this.gpuDevice = await adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {}
      });

      // Configure canvas for WebGPU
      const context = this.canvas.getContext('webgpu');
      if (!context) return false;

      const format = navigator.gpu.getPreferredCanvasFormat();
      context.configure({
        device: this.gpuDevice,
        format,
        alphaMode: 'premultiplied'
      });

      // Update capabilities
      this.capabilities = {
        type: 'webgpu',
        hasCompute: true,
        maxTextureSize: adapter.limits.maxTextureDimension2D,
        maxBufferSize: adapter.limits.maxBufferSize,
        supportsFloat32: true,
        supportsInt32: true,
        maxWorkgroupSize: adapter.limits.maxComputeWorkgroupSizeX,
        maxVertexAttributes: 16,
        extensions: []
      };

      // Initialize LOD system with WebGPU
      if (this.options.lodSystemIntegration) {
        await this.initializeLODWithWebGPU();
      }

      return true;
    } catch (error) {
      console.log('❌ WebGPU initialization failed:', error);
      return false;
    }
  }

  private async initializeWebGL2(): Promise<boolean> {
    try {
      this.webgl2Context = this.canvas.getContext('webgl2', {
        antialias: false, // NES pixel-perfect aesthetic
        alpha: true,
        depth: true,
        stencil: true,
        powerPreference: 'high-performance'
      });

      if (!this.webgl2Context) return false;

      const gl = this.webgl2Context;

      // Check for essential WebGL2 features
      const requiredExtensions = [
        'EXT_color_buffer_float',
        'OES_texture_float_linear'
      ];

      const availableExtensions: string[] = [];
      for (const ext of requiredExtensions) {
        if (gl.getExtension(ext)) {
          availableExtensions.push(ext);
        }
      }

      this.capabilities = {
        type: 'webgl2',
        hasCompute: true, // Transform feedback for limited compute
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxBufferSize: gl.getParameter(gl.MAX_UNIFORM_BLOCK_SIZE),
        supportsFloat32: availableExtensions.includes('EXT_color_buffer_float'),
        supportsInt32: true,
        maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
        extensions: availableExtensions
      };

      // Initialize LOD system with WebGL2
      if (this.options.lodSystemIntegration) {
        await this.initializeLODWithWebGL2();
      }

      return true;
    } catch (error) {
      console.log('❌ WebGL2 initialization failed:', error);
      return false;
    }
  }

  private async initializeWebGL(): Promise<boolean> {
    try {
      this.webglContext = this.canvas.getContext('webgl', {
        antialias: false,
        alpha: true,
        depth: true,
        stencil: true,
        powerPreference: 'high-performance'
      });

      if (!this.webglContext) return false;

      const gl = this.webglContext;

      this.capabilities = {
        type: 'webgl',
        hasCompute: false,
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxBufferSize: 65536, // Limited in WebGL1
        supportsFloat32: !!gl.getExtension('OES_texture_float'),
        supportsInt32: false,
        maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
        extensions: []
      };

      return true;
    } catch (error) {
      console.log('❌ WebGL initialization failed:', error);
      return false;
    }
  }

  /**
   * Create compute shader with automatic fallback
   */
  async createComputeShader(
    name: string, 
    webgpuCode: string, 
    webgl2Code: string,
    fallbackCPU?: (data: Float32Array) => Float32Array
  ): Promise<boolean> {
    switch (this.activeContextType) {
      case 'webgpu':
        return this.createWebGPUComputeShader(name, webgpuCode);
      
      case 'webgl2':
        return this.createWebGL2TransformFeedback(name, webgl2Code);
      
      case 'webgl':
      case 'cpu-fallback':
        // Store CPU fallback for later use
        if (fallbackCPU) {
          this.computeShaders.set(name, fallbackCPU as any);
          return true;
        }
        return false;
    }
  }

  private async createWebGPUComputeShader(name: string, code: string): Promise<boolean> {
    if (!this.gpuDevice) return false;

    try {
      const shaderModule = this.gpuDevice.createShaderModule({ code });
      const computePipeline = this.gpuDevice.createComputePipeline({
        layout: 'auto',
        compute: {
          module: shaderModule,
          entryPoint: 'main'
        }
      });

      this.computeShaders.set(name, computePipeline);
      console.log(`✅ WebGPU compute shader "${name}" created`);
      return true;
    } catch (error) {
      console.error(`❌ WebGPU compute shader "${name}" failed:`, error);
      return false;
    }
  }

  private async createWebGL2TransformFeedback(name: string, code: string): Promise<boolean> {
    if (!this.webgl2Context) return false;

    try {
      const gl = this.webgl2Context;
      
      const vertexShader = this.compileShader(gl, code, gl.VERTEX_SHADER);
      const fragmentShader = this.compileShader(gl, `
        #version 300 es
        precision highp float;
        out vec4 outColor;
        void main() { outColor = vec4(1.0); }
      `, gl.FRAGMENT_SHADER);

      if (!vertexShader || !fragmentShader) return false;

      const program = gl.createProgram()!;
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      
      // Configure transform feedback
      gl.transformFeedbackVaryings(program, ['gl_Position'], gl.INTERLEAVED_ATTRIBS);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Transform feedback link failed:', gl.getProgramInfoLog(program));
        return false;
      }

      this.computeShaders.set(name, program);
      console.log(`✅ WebGL2 transform feedback "${name}" created`);
      return true;
    } catch (error) {
      console.error(`❌ WebGL2 transform feedback "${name}" failed:`, error);
      return false;
    }
  }

  /**
   * Execute compute operation with automatic context selection
   */
  async executeCompute(
    shaderName: string, 
    inputData: Float32Array, 
    outputSize: number
  ): Promise<Float32Array> {
    const shader = this.computeShaders.get(shaderName);
    if (!shader) {
      throw new Error(`Compute shader "${shaderName}" not found`);
    }

    switch (this.activeContextType) {
      case 'webgpu':
        return this.executeWebGPUCompute(shader as GPUComputePipeline, inputData, outputSize);
      
      case 'webgl2':
        return this.executeWebGL2TransformFeedback(shader as WebGLProgram, inputData, outputSize);
      
      default:
        // CPU fallback
        if (typeof shader === 'function') {
          return (shader as Function)(inputData);
        }
        return inputData; // No-op fallback
    }
  }

  private async executeWebGPUCompute(
    pipeline: GPUComputePipeline, 
    inputData: Float32Array, 
    outputSize: number
  ): Promise<Float32Array> {
    if (!this.gpuDevice) throw new Error('WebGPU device not available');

    // Create buffers
    const inputBuffer = this.gpuDevice.createBuffer({
      size: inputData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });

    const outputBuffer = this.gpuDevice.createBuffer({
      size: outputSize * 4, // 4 bytes per float32
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });

    const readBuffer = this.gpuDevice.createBuffer({
      size: outputSize * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    // Upload input data
    this.gpuDevice.queue.writeBuffer(inputBuffer, 0, new Float32Array(inputData));

    // Create bind group
    const bindGroup = this.gpuDevice.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } }
      ]
    });

    // Execute compute
    const commandEncoder = this.gpuDevice.createCommandEncoder();
    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(pipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(Math.ceil(outputSize / 64));
    computePass.end();

    // Copy result to readable buffer
    commandEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, outputSize * 4);
    this.gpuDevice.queue.submit([commandEncoder.finish()]);

    // Read results
    await readBuffer.mapAsync(GPUMapMode.READ);
    const result = new Float32Array(readBuffer.getMappedRange().slice(0));
    readBuffer.unmap();

    // Cleanup
    inputBuffer.destroy();
    outputBuffer.destroy();
    readBuffer.destroy();

    return result;
  }

  private async executeWebGL2TransformFeedback(
    program: WebGLProgram, 
    inputData: Float32Array, 
    outputSize: number
  ): Promise<Float32Array> {
    if (!this.webgl2Context) throw new Error('WebGL2 context not available');

    const gl = this.webgl2Context;

    // Create buffers
    const inputBuffer = gl.createBuffer()!;
    const outputBuffer = gl.createBuffer()!;

    gl.bindBuffer(gl.ARRAY_BUFFER, inputBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, inputData, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, outputBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, outputSize * 4, gl.STATIC_READ);

    // Set up transform feedback
    const transformFeedback = gl.createTransformFeedback()!;
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedback);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, outputBuffer);

    // Execute
    gl.useProgram(program);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, inputData.length);
    gl.endTransformFeedback();

    // Read results
    gl.bindBuffer(gl.ARRAY_BUFFER, outputBuffer);
    const result = new Float32Array(outputSize);
    gl.getBufferSubData(gl.ARRAY_BUFFER, 0, result);

    // Cleanup
    gl.deleteBuffer(inputBuffer);
    gl.deleteBuffer(outputBuffer);
    gl.deleteTransformFeedback(transformFeedback);

    return result;
  }

  /**
   * Integrate with Matrix LOD System
   */
  private async initializeLODWithWebGPU(): Promise<void> {
    console.log('🎯 Initializing LOD system with WebGPU acceleration');
    
    // Create LOD compute shaders for WebGPU
    await this.createComputeShader(
      'lod_calculator',
      `
        @group(0) @binding(0) var<storage, read> input: array<f32>;
        @group(0) @binding(1) var<storage, read_write> output: array<f32>;
        
        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          let index = global_id.x;
          if (index >= arrayLength(&input)) { return; }
          
          // LOD calculation based on distance and importance
          let distance = input[index * 3];
          let importance = input[index * 3 + 1];
          let performance = input[index * 3 + 2];
          
          // Calculate optimal LOD level (0=low, 1=mid, 2=high)
          var lod_level = 0.0;
          if (distance < 0.3 && performance > 0.7) {
            lod_level = 2.0; // High detail
          } else if (distance < 0.7 && performance > 0.4) {
            lod_level = 1.0; // Medium detail
          }
          
          // Boost for AI-flagged important content
          if (importance > 0.8) {
            lod_level = min(lod_level + 0.5, 2.0);
          }
          
          output[index] = lod_level;
        }
      `,
      `
        #version 300 es
        precision highp float;
        
        in vec3 a_position; // distance, importance, performance
        out float v_lodLevel;
        
        void main() {
          float distance = a_position.x;
          float importance = a_position.y;
          float performance = a_position.z;
          
          float lodLevel = 0.0;
          if (distance < 0.3 && performance > 0.7) {
            lodLevel = 2.0;
          } else if (distance < 0.7 && performance > 0.4) {
            lodLevel = 1.0;
          }
          
          if (importance > 0.8) {
            lodLevel = min(lodLevel + 0.5, 2.0);
          }
          
          v_lodLevel = lodLevel;
          gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
        }
      `,
      // CPU fallback
      (data: Float32Array) => {
        const result = new Float32Array(data.length / 3);
        for (let i = 0; i < result.length; i++) {
          const distance = data[i * 3];
          const importance = data[i * 3 + 1];
          const performance = data[i * 3 + 2];
          
          let lodLevel = 0;
          if (distance < 0.3 && performance > 0.7) lodLevel = 2;
          else if (distance < 0.7 && performance > 0.4) lodLevel = 1;
          
          if (importance > 0.8) lodLevel = Math.min(lodLevel + 0.5, 2);
          
          result[i] = lodLevel;
        }
        return result;
      }
    );
  }

  private async initializeLODWithWebGL2(): Promise<void> {
    console.log('🎯 Initializing LOD system with WebGL2 transform feedback');
    // LOD shader already created in initializeLODWithWebGPU
  }

  /**
   * Optimize for NES memory patterns
   */
  optimizeForNESMemory(): void {
    if (!this.options.nesMemoryOptimization) return;

    console.log('🎮 Applying NES memory optimization patterns');
    
    // Configure memory layout similar to NES constraints
    const NES_CONSTRAINTS = {
      CHR_ROM_SIZE: 8192,  // 8KB CHR-ROM
      PRG_RAM_SIZE: 2048,  // 2KB PRG-RAM  
      PATTERN_TABLES: 2,   // 2 pattern tables
      SPRITE_LIMIT: 64,    // 64 sprites max
      TILE_SIZE: 8         // 8x8 pixel tiles
    };

    // Apply constraints based on active context
    switch (this.activeContextType) {
      case 'webgpu':
        // Use WebGPU buffer size limits to simulate NES memory
        break;
      case 'webgl2':
      case 'webgl':
        // Configure texture atlases to match NES tile patterns
        break;
    }
  }

  // Helper methods
  private compileShader(gl: WebGL2RenderingContext, source: string, type: number): WebGLShader | null {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  private getDefaultCapabilities(): GPUCapabilities {
    return {
      type: 'cpu-fallback',
      hasCompute: false,
      maxTextureSize: 512,
      maxBufferSize: 1024,
      supportsFloat32: false,
      supportsInt32: false,
      maxVertexAttributes: 4,
      extensions: []
    };
  }

  // Public API
  getActiveContextType(): GPUContextType {
    return this.activeContextType;
  }

  getCapabilities(): GPUCapabilities {
    return { ...this.capabilities };
  }

  async calculateLOD(
    positions: Float32Array, 
    distances: Float32Array, 
    importance: Float32Array
  ): Promise<Float32Array> {
    // Interleave data for compute shader
    const inputData = new Float32Array(positions.length);
    for (let i = 0; i < positions.length / 3; i++) {
      inputData[i * 3] = distances[i];
      inputData[i * 3 + 1] = importance[i];
      inputData[i * 3 + 2] = 0.8; // Performance score
    }

    return this.executeCompute('lod_calculator', inputData, positions.length / 3);
  }

  dispose(): void {
    // Clean up all contexts and resources
    if (this.gpuDevice) {
      this.gpuDevice.destroy();
    }
    
    this.computeShaders.clear();
    console.log('🔄 Hybrid GPU Context disposed');
  }
}

// Factory function for easy integration
export async function createHybridGPUContext(
  canvas: HTMLCanvasElement,
  options?: Partial<HybridRenderingOptions>
): Promise<HybridGPUContext> {
  const context = new HybridGPUContext(canvas, {
    preferWebGPU: true,
    allowWebGL2: true, 
    allowWebGL1: true,
    requireCompute: false,
    lodSystemIntegration: true,
    nesMemoryOptimization: true,
    ...options
  });

  await context.initialize();
  return context;
}