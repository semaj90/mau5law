/**
 * Universal GPU Runtime Wrapper
 * Detects and initializes the best available compute backend:
 * WebGPU → WebGL2 → WASM SIMD → CPU JavaScript
 *
 * Provides a unified API for tensor operations across all backends
 * with automatic fallback and performance optimization.
 */;
}
export interface TensorShape {
  rows: number;
  cols: number;
  batch?: number;
}
export interface Tensor {
  data: Float32Array | any | WebGLTexture; // GPUBuffer | WebGLTexture for runtime flexibility,
  shape: TensorShape;
  backend: BackendType;
  id: string;
}
export type BackendType = 'tensorrt' | 'webgpu' | 'webgl2' | 'wasm-simd' | 'cpu-js';
}
export interface ComputeBackend {
  type: BackendType;
  initialized: boolean;
  initialize(): Promise<void>;
  allocate(shape: TensorShape, data?: Float32Array): Promise<Tensor>;
  free(tensor: Tensor): Promise<void>;
  matMul(a: Tensor, b: Tensor): Promise<Tensor>;
  batchMatMul(a: Tensor, b: Tensor): Promise<Tensor>;
  toTensor(data: Float32Array, shape: TensorShape): Promise<Tensor>;
  readback(tensor: Tensor): Promise<Float32Array>;
  dispose(): Promise<void>;
}
// Backend capability detection utilities
class BackendDetector {
  static async detectBestBackend(): Promise<BackendType> {
    // Check TensorRT support (highest priority)
    if (await this.checkTensorRTSupport()) {
      console.log('✅ TensorRT available');
      return 'tensorrt';
    }
    // Check WebGPU support
    if ('gpu' in navigator) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          const device = await adapter.requestDevice();
          device.destroy(); // Clean up test device
          console.log('✅ WebGPU available');
          return 'webgpu';
        }
      } catch (e) {
        console.warn('WebGPU not available:', e);
      }
    }
    // Check WebGL2 support
    if (typeof WebGL2RenderingContext !== 'undefined') {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      if (gl) {
        console.log('✅ WebGL2 available');
        return 'webgl2';
      }
    }
    // Check WASM SIMD support
    if (typeof WebAssembly !== 'undefined') {
      try {
        // Check for SIMD support via feature detection
        const simdSupported = WebAssembly.validate(
          new Uint8Array([
            0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
            0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b, 0x03,
            0x02, 0x01, 0x00, 0x0a, 0x0a, 0x01, 0x08, 0x00,
            0x41, 0x00, 0xfd, 0x0f, 0x0b
          ])
        );
        if (simdSupported) {
          console.log('✅ WASM SIMD available');
          return 'wasm-simd';
        }
      } catch (e) {
        console.warn('WASM SIMD not available:', e);
      }
    }
    // Fallback to CPU JavaScript
    console.log('⚠️ Using CPU JavaScript fallback');
    return 'cpu-js';
  }
  static async checkTensorRTSupport(): Promise<boolean> {
    try {
      // Check if CUDA service is available
      const response = await fetch('/api/cuda/health', {
        method: 'GET',
        signal: AbortSignal.timeout(1000)
      });
      if (response.ok) {
        const health = await response.json();
        return health.tensorrt_available === true;
      }
    } catch (e) {
      // CUDA service not available or TensorRT not supported
    }
    return false;
  }
  static getRequirements(backend: BackendType): string[] {
    switch (backend) {
      case 'tensorrt':
        return [
          'CUDA service must be running',
          'TensorRT engines must be built',
          'RTX 3060 Ti or better GPU required',
          'CUDA 11.8+ and TensorRT 8.5+ installed'
        ];
      case 'webgpu':
        return [
          'Requires Chrome 113+ or Edge 113+',
          'GPU hardware acceleration enabled',
          'No cross-origin restrictions'
        ];
      case 'webgl2':
        return [
          'Requires modern browser with WebGL2',
          'GPU hardware acceleration recommended',
          'May have texture size limitations'
        ];
      case 'wasm-simd':
        return [
          'Requires WASM SIMD support',
          'Cross-Origin-Opener-Policy: same-origin',
          'Cross-Origin-Embedder-Policy: require-corp',
          'SharedArrayBuffer support for threading'
        ];
      case 'cpu-js':
        return [
          'Works in all JavaScript environments',
          'Performance limited by single-threaded execution',
          'Suitable for small models only'
        ];
    }
  }
}
// Abstract base class for compute backends
abstract class BaseBackend implements ComputeBackend {
  abstract type: BackendType;
  initialized = false;
  protected tensorCount = 0;
  protected tensors = new Map<string, any>();
  protected generateId(): string {
    return `tensor_${this.type}_${Date.now()}_${this.tensorCount++}`;
  }
  abstract initialize(): Promise<void>;
  abstract allocate(shape: TensorShape, data?: Float32Array): Promise<Tensor>;
  abstract free(tensor: Tensor): Promise<void>;
  abstract matMul(a: Tensor, b: Tensor): Promise<Tensor>;
  abstract batchMatMul(a: Tensor, b: Tensor): Promise<Tensor>;
  abstract toTensor(data: Float32Array, shape: TensorShape): Promise<Tensor>;
  abstract readback(tensor: Tensor): Promise<Float32Array>;
  abstract dispose(): Promise<void>;
}
// WebGPU Backend Implementation
class WebGPUBackend extends BaseBackend {
  type: BackendType = 'webgpu';
  private device: any | null = null; // GPUDevice
  private matMulPipeline: any | null = null; // GPUComputePipeline
  private batchMatMulPipeline: any | null = null; // GPUComputePipeline
  async initialize(): Promise<void> {
    if (this.initialized) return;
    const adapter = await (navigator as any).gpu.requestAdapter();
    if (!adapter) throw new Error('No GPU adapter found');
    this.device = await adapter.requestDevice();
    // Create compute shader for matrix multiplication
    const matMulShader = `;
      struct Matrix {
        data: array<f32>
      }
      @group(0) @binding(0) var<storage, read> a: Matrix;
      @group(0) @binding(1) var<storage, read> b: Matrix;
      @group(0) @binding(2) var<storage, read_write> result: Matrix;
      @group(0) @binding(3) var<uniform> dims: vec3<u32>; // M, K, N
      @compute @workgroup_size(8, 8, 1);
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let M = dims.x;
        let K = dims.y;
        let N = dims.z;
        let row = global_id.x;
        let col = global_id.y;
        if (row >= M || col >= N) {
          return;
        }
        var sum = 0.0;
        for (var i = 0u; i < K; i = i + 1u) {
          sum = sum + a.data[row * K + i] * b.data[i * N + col];
        }
        result.data[row * N + col] = sum;
      }
    `;
    const shaderModule = this.device.createShaderModule({
      code: matMulShader
    });
    // Create pipeline for matrix multiplication
    this.matMulPipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: shaderModule
        entryPoint: 'main'
      }
    });
    // Create batch matrix multiplication shader
    const batchMatMulShader = `;
      struct BatchMatrix {
        data: array<f32>
      }
      @group(0) @binding(0) var<storage, read> a: BatchMatrix;
      @group(0) @binding(1) var<storage, read> b: BatchMatrix;
      @group(0) @binding(2) var<storage, read_write> result: BatchMatrix;
      @group(0) @binding(3) var<uniform> dims: vec4<u32>; // batch, M, K, N
      @compute @workgroup_size(8, 8, 1);
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let batch = global_id.z;
        let row = global_id.x;
        let col = global_id.y;
        let B = dims.x;
        let M = dims.y;
        let K = dims.z;
        let N = dims.w;
        if (batch >= B || row >= M || col >= N) {
          return;
        }
        let a_offset = batch * M * K;
        let b_offset = batch * K * N;
        let result_offset = batch * M * N;
        var sum = 0.0;
        for (var i = 0u; i < K; i = i + 1u) {
          sum = sum + a.data[a_offset + row * K + i] * b.data[b_offset + i * N + col];
        }
        result.data[result_offset + row * N + col] = sum;
      }
    `;
    const batchShaderModule = this.device.createShaderModule({
      code: batchMatMulShader
    });
    this.batchMatMulPipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: batchShaderModule
        entryPoint: 'main'
      }
    });
    this.initialized = true;
    console.log('✅ WebGPU backend initialized');
  }
  async allocate(shape: TensorShape, data?: Float32Array): Promise<Tensor> {
    if (!this.initialized) await this.initialize();
    if (!this.device) throw new Error('WebGPU device not initialized');
    const size = shape.rows * shape.cols * (shape.batch || 1);
    const buffer = this.device.createBuffer({
      size: size * 4, // Float32 is 4 bytes
      usage: 0x80 | 0x4 | 0x8, // STORAGE | COPY_DST | COPY_SRC
      mappedAtCreation: !!data
    });
    if (data) {
      new Float32Array(buffer.getMappedRange()).set(data);
      buffer.unmap();
    }
    const tensor: Tensor = {
      data: buffer
      shape,
      backend: 'webgpu',
      id: this.generateId()
    }
    this.tensors.set(tensor.id, tensor);
    return tensor;
  }
  async free(tensor: Tensor): Promise<void> {
    if (tensor.backend !== 'webgpu') {
      throw new Error('Tensor is not from WebGPU backend');
    }
    const buffer = tensor.data as any; // GPUBuffer
    buffer.destroy();
    this.tensors.delete(tensor.id);
  }
  async matMul(a: Tensor, b: Tensor): Promise<Tensor> {
    if (!this.device || !this.matMulPipeline) {
      throw new Error('WebGPU not initialized');
    }
    // Validate dimensions: a(M,K) @ b(K,N) = result(M,N)
    if (a.shape.cols !== b.shape.rows) {
      throw new Error(`Incompatible shapes for matmul: ${a.shape.rows}x${a.shape.cols} @ ${b.shape.rows}x${b.shape.cols}`);
    }
    const M = a.shape.rows;
    const K = a.shape.cols;
    const N = b.shape.cols;
    // Create output tensor
    const result = await this.allocate({ rows: M, cols: N });
    // Create uniform buffer for dimensions
    const uniformBuffer = this.device.createBuffer({
      size: 16, // 3 u32 + padding
      usage: 0x40 | 0x4, // UNIFORM | COPY_DST
      mappedAtCreation: true
    });
    new Uint32Array(uniformBuffer.getMappedRange()).set([M, K, N, 0]);
    uniformBuffer.unmap();
    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: this.matMulPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: a.data as any } },
        { binding: 1, resource: { buffer: b.data as any } },
        { binding: 2, resource: { buffer: result.data as any } },
        { binding: 3, resource: { buffer: uniformBuffer } }
      ]
    });
    // Encode and submit compute pass
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.matMulPipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(M / 8), Math.ceil(N / 8), 1);
    passEncoder.end();
    this.device.queue.submit([commandEncoder.finish()]);
    await this.device.queue.onSubmittedWorkDone();
    uniformBuffer.destroy();
    return result;
  }
  async batchMatMul(a: Tensor, b: Tensor): Promise<Tensor> {
    if (!this.device || !this.batchMatMulPipeline) {
      throw new Error('WebGPU not initialized');
    }
    if (!a.shape.batch || !b.shape.batch || a.shape.batch !== b.shape.batch) {
      throw new Error('Batch dimensions must match');
    }
    const batch = a.shape.batch;
    const M = a.shape.rows;
    const K = a.shape.cols;
    const N = b.shape.cols;
    const result = await this.allocate({ rows: M, cols: N, batch });
    const uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: 0x40 | 0x4, // UNIFORM | COPY_DST
      mappedAtCreation: true
    });
    new Uint32Array(uniformBuffer.getMappedRange()).set([batch, M, K, N]);
    uniformBuffer.unmap();
    const bindGroup = this.device.createBindGroup({
      layout: this.batchMatMulPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: a.data as any } },
        { binding: 1, resource: { buffer: b.data as any } },
        { binding: 2, resource: { buffer: result.data as any } },
        { binding: 3, resource: { buffer: uniformBuffer } }
      ]
    });
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.batchMatMulPipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(
      Math.ceil(M / 8),
      Math.ceil(N / 8),
      batch
    );
    passEncoder.end();
    this.device.queue.submit([commandEncoder.finish()]);
    await this.device.queue.onSubmittedWorkDone();
    uniformBuffer.destroy();
    return result;
  }
  async toTensor(data: Float32Array, shape: TensorShape): Promise<Tensor> {
    return this.allocate(shape, data);
  }
  async readback(tensor: Tensor): Promise<Float32Array> {
    if (!this.device) throw new Error('WebGPU not initialized');
    if (tensor.backend !== 'webgpu') {
      throw new Error('Tensor is not from WebGPU backend');
    }
    const buffer = tensor.data as any; // GPUBuffer
    const size = tensor.shape.rows * tensor.shape.cols * (tensor.shape.batch || 1);
    // Create staging buffer for readback
    const stagingBuffer = this.device.createBuffer({
      size: size * 4,
      usage: 0x4 | 0x1 // COPY_DST | MAP_READ
    });
    // Copy from GPU buffer to staging buffer
    const commandEncoder = this.device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(buffer, 0, stagingBuffer, 0, size * 4);
    this.device.queue.submit([commandEncoder.finish()]);
    // Wait for GPU to finish
    await this.device.queue.onSubmittedWorkDone();
    // Map and read data
    await stagingBuffer.mapAsync(0x0001); // READ mode
    const mappedRange = stagingBuffer.getMappedRange();
    const result = new Float32Array(mappedRange.slice(0);
    stagingBuffer.unmap();
    stagingBuffer.destroy();
    return result;
  }
  async dispose(): Promise<void> {
    // Free all tensors
    const tensorList = Array.from(this.tensors.values();
    for (const tensor of tensorList) {
      await this.free(tensor);
    }
    this.tensors.clear();
    // Destroy device
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    this.initialized = false;
    console.log('WebGPU backend disposed');
  }
}
// WebGL2 Backend Implementation (Fragment Shader Compute)
class WebGL2Backend extends BaseBackend {
  type: BackendType = 'webgl2';
  private gl: WebGL2RenderingContext | null = null;
  private matMulProgram: WebGLProgram | null = null;
  private canvas: HTMLCanvasElement | null = null;
  async initialize(): Promise<void> {
    if (this.initialized) return;
    // Create offscreen canvas for compute
    this.canvas = document.createElement('canvas');
    this.gl = this.canvas.getContext('webgl2', {
      antialias: false
      preserveDrawingBuffer: true
    });
    if (!this.gl) {
      throw new Error('WebGL2 not available');
    }
    // Enable required extensions
    const ext = this.gl.getExtension('EXT_color_buffer_float');
    if (!ext) {
      throw new Error('Float textures not supported');
    }
    // Create matrix multiplication shader program
    const vertexShader = this.createShader(
      this.gl.VERTEX_SHADER,
      `#version 300 es
      in vec2 position;
      out vec2 texCoord;
      void main() {
        texCoord = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }`
    );
    const fragmentShader = this.createShader(
      this.gl.FRAGMENT_SHADER,
      `#version 300 es
      precision highp float;
      uniform sampler2D matrixA;
      uniform sampler2D matrixB;
      uniform int M, K, N;
      in vec2 texCoord;
      out vec4 result;
      void main() {
        int row = int(texCoord.y * float(M);
        int col = int(texCoord.x * float(N);
        float sum = 0.0;
        for (int i = 0; i < K; i++) {
          float a_val = texelFetch(matrixA, ivec2(i, row), 0).r;
          float b_val = texelFetch(matrixB, ivec2(col, i), 0).r;
          sum += a_val * b_val;
        }
        result = vec4(sum, 0.0, 0.0, 1.0);
      }`
    );
    this.matMulProgram = this.createProgram(vertexShader, fragmentShader);
    // Create quad for rendering
    const quadBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, quadBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      this.gl.STATIC_DRAW
    );
    this.initialized = true;
    console.log('✅ WebGL2 backend initialized');
  }
  private createShader(type: number, source: string): WebGLShader {
    if (!this.gl) throw new Error('WebGL2 not initialized');
    const shader = this.gl.createShader(type);
    if (!shader) throw new Error('Failed to create shader');
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compilation error: ${error}`);
    }
    return shader;
  }
  private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    if (!this.gl) throw new Error('WebGL2 not initialized');
    const program = this.gl.createProgram();
    if (!program) throw new Error('Failed to create program');
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const error = this.gl.getProgramInfoLog(program);
      this.gl.deleteProgram(program);
      throw new Error(`Program linking error: ${error}`);
    }
    return program;
  }
  private createTexture(width: number, height: number, data?: Float32Array): WebGLTexture {
    if (!this.gl) throw new Error('WebGL2 not initialized');
    const texture = this.gl.createTexture();
    if (!texture) throw new Error('Failed to create texture');
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.R32F,
      width,
      height,
      0,
      this.gl.RED,
      this.gl.FLOAT,
      data || null
    );
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    return texture;
  }
  async allocate(shape: TensorShape, data?: Float32Array): Promise<Tensor> {
    if (!this.initialized) await this.initialize();
    const texture = this.createTexture(
      shape.cols,
      shape.rows * (shape.batch || 1),
      data
    );
    const tensor: Tensor = {
      data: texture
      shape,
      backend: 'webgl2',
      id: this.generateId()
    }
    this.tensors.set(tensor.id, tensor);
    return tensor;
  }
  async free(tensor: Tensor): Promise<void> {
    if (!this.gl) throw new Error('WebGL2 not initialized');
    if (tensor.backend !== 'webgl2') {
      throw new Error('Tensor is not from WebGL2 backend');
    }
    this.gl.deleteTexture(tensor.data as WebGLTexture);
    this.tensors.delete(tensor.id);
  }
  async matMul(a: Tensor, b: Tensor): Promise<Tensor> {
    if (!this.gl || !this.matMulProgram || !this.canvas) {
      throw new Error('WebGL2 not initialized');
    }
    if (a.shape.cols !== b.shape.rows) {
      throw new Error(`Incompatible shapes for matmul`);
    }
    const M = a.shape.rows;
    const K = a.shape.cols;
    const N = b.shape.cols;
    // Create output texture
    const resultTexture = this.createTexture(N, M);
    // Create framebuffer for rendering to texture
    const framebuffer = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT0,
      this.gl.TEXTURE_2D,
      resultTexture,
      0
    );
    // Set viewport
    this.canvas.width = N;
    this.canvas.height = M;
    this.gl.viewport(0, 0, N, M);
    // Use program and set uniforms
    this.gl.useProgram(this.matMulProgram);
    const matrixALoc = this.gl.getUniformLocation(this.matMulProgram, 'matrixA');
    const matrixBLoc = this.gl.getUniformLocation(this.matMulProgram, 'matrixB');
    const MLoc = this.gl.getUniformLocation(this.matMulProgram, 'M');
    const KLoc = this.gl.getUniformLocation(this.matMulProgram, 'K');
    const NLoc = this.gl.getUniformLocation(this.matMulProgram, 'N');
    this.gl.uniform1i(MLoc, M);
    this.gl.uniform1i(KLoc, K);
    this.gl.uniform1i(NLoc, N);
    // Bind textures
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, a.data as WebGLTexture);
    this.gl.uniform1i(matrixALoc, 0);
    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, b.data as WebGLTexture);
    this.gl.uniform1i(matrixBLoc, 1);
    // Draw quad
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    // Clean up
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.deleteFramebuffer(framebuffer);
    const result: Tensor = {
      data: resultTexture
      shape: { rows: M, cols: N },
      backend: 'webgl2',
      id: this.generateId()
    }
    this.tensors.set(result.id, result);
    return result;
  }
  async batchMatMul(a: Tensor, b: Tensor): Promise<Tensor> {
    // Simplified: process each batch sequentially
    // In production, use instanced rendering for parallel batch processing
    if (!a.shape.batch || !b.shape.batch) {
      throw new Error('Batch dimension required');
    }
    const results: Tensor[] = [];
    const batchSize = a.shape.batch;
    for (let i = 0; i < batchSize; i++) {
      // Extract batch slices (simplified)
      const sliceA: Tensor = {
        data: a.data,
        shape: { rows: a.shape.rows, cols: a.shape.cols },
        backend: 'webgl2',
        id: `${a.id}_batch_${i}`
      }
      const sliceB: Tensor = {
        data: b.data,
        shape: { rows: b.shape.rows, cols: b.shape.cols },
        backend: 'webgl2',
        id: `${b.id}_batch_${i}`
      }
      results.push(await this.matMul(sliceA, sliceB);
    }
    // Combine results (simplified)
    return results[0]; // In production, properly combine batch results
  }
  async toTensor(data: Float32Array, shape: TensorShape): Promise<Tensor> {
    return this.allocate(shape, data);
  }
  async readback(tensor: Tensor): Promise<Float32Array> {
    if (!this.gl) throw new Error('WebGL2 not initialized');
    if (tensor.backend !== 'webgl2') {
      throw new Error('Tensor is not from WebGL2 backend');
    }
    const texture = tensor.data as WebGLTexture;
    const width = tensor.shape.cols;
    const height = tensor.shape.rows * (tensor.shape.batch || 1);
    // Create framebuffer to read from texture
    const framebuffer = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT0,
      this.gl.TEXTURE_2D,
      texture,
      0
    );
    // Read pixels
    const pixels = new Float32Array(width * height);
    this.gl.readPixels(0, 0, width, height, this.gl.RED, this.gl.FLOAT, pixels);
    // Clean up
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.deleteFramebuffer(framebuffer);
    return pixels;
  }
  async dispose(): Promise<void> {
    const tensorList = Array.from(this.tensors.values();
    for (const tensor of tensorList) {
      await this.free(tensor);
    }
    this.tensors.clear();
    if (this.gl) {
      // Clean up WebGL resources
      if (this.matMulProgram) {
        this.gl.deleteProgram(this.matMulProgram);
      }
      this.gl = null;
    }
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }
    this.initialized = false;
    console.log('WebGL2 backend disposed');
  }
}
// WASM SIMD Backend Implementation
class WASMSIMDBackend extends BaseBackend {
  type: BackendType = 'wasm-simd';
  private wasmModule: WebAssembly.Module | null = null;
  private wasmInstance: WebAssembly.Instance | null = null;
  private memory: WebAssembly.Memory | null = null;
  private exports: any = null;
  async initialize(): Promise<void> {
    if (this.initialized) return;
    // Initialize WASM module with SIMD support
    // This example shows how to wire a prebuilt WASM module
    // In production, compile from C++ with emscripten:
    // emcc -O3 -msimd128 matmul.cpp -o matmul.wasm
    try {
      // Create memory for WASM module
      this.memory = new WebAssembly.Memory({
        initial: 256, // 16MB initial
        maximum: 4096, // 256MB maximum
        shared: typeof SharedArrayBuffer !== 'undefined' // Enable threading if available
      });
      // Example WASM module with SIMD operations
      // This is a minimal example - replace with actual compiled WASM
      const wasmCode = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, // WASM magic number
        0x01, 0x00, 0x00, 0x00, // Version 1
        // ... actual WASM bytecode would go here
      ]);
      // For demonstration, we'll use a mock implementation
      // In production, load actual WASM file:
      // const response = await fetch('/wasm/matmul-simd.wasm')
      // const wasmBuffer = await response.arrayBuffer()
      // this.wasmModule = await WebAssembly.compile(wasmBuffer)
      // Mock WASM exports for demonstration
      this.exports = {
        memory: this.memory,
        allocate: (size: number) => {
          // Allocate memory in WASM heap
          const ptr = this.tensorCount * 1024 * 1024; // Simple allocation
          this.tensorCount++;
          return ptr;
        },
        free: (ptr: number) => {
          // Free memory in WASM heap
        },
        matmul_simd: (aPtr: number, bPtr: number, resultPtr: number, M: number, K: number, N: number) => {
          // SIMD-accelerated matrix multiplication
          // In real WASM, this would use v128 SIMD instructions
          const memory = new Float32Array((this.memory as WebAssembly.Memory).buffer);
          for (let i = 0; i < M; i++) {
            for (let j = 0; j < N; j++) {
              let sum = 0;
              // SIMD would process 4 elements at once
              for (let k = 0; k < K; k++) {
                const aIdx = (aPtr / 4) + i * K + k;
                const bIdx = (bPtr / 4) + k * N + j;
                sum += memory[aIdx] * memory[bIdx];
              }
              const resultIdx = (resultPtr / 4) + i * N + j;
              memory[resultIdx] = sum;
            }
          }
        },
        batch_matmul_simd: (aPtr: number, bPtr: number, resultPtr: number, batch: number, M: number, K: number, N: number) => {
          const memory = new Float32Array((this.memory as WebAssembly.Memory).buffer);
          const matrixSizeA = M * K;
          const matrixSizeB = K * N;
          const matrixSizeResult = M * N;
          for (let b = 0; b < batch; b++) {
            const aOffset = (aPtr / 4) + b * matrixSizeA;
            const bOffset = (bPtr / 4) + b * matrixSizeB;
            const resultOffset = (resultPtr / 4) + b * matrixSizeResult;
            for (let i = 0; i < M; i++) {
              for (let j = 0; j < N; j++) {
                let sum = 0;
                for (let k = 0; k < K; k++) {
                  sum += memory[aOffset + i * K + k] * memory[bOffset + k * N + j];
                }
                memory[resultOffset + i * N + j] = sum;
              }
            }
          }
        }
      }
      this.initialized = true;
      console.log('✅ WASM SIMD backend initialized');
    } catch (error) {
      throw new Error(`Failed to initialize WASM SIMD: ${error}`);
    }
  }
  async allocate(shape: TensorShape, data?: Float32Array): Promise<Tensor> {
    if (!this.initialized) await this.initialize();
    const size = shape.rows * shape.cols * (shape.batch || 1);
    const ptr = this.exports.allocate(size * 4); // 4 bytes per float32
    if (data && this.memory) {
      const memory = new Float32Array(this.memory.buffer);
      memory.set(data, ptr / 4);
    }
    const tensor: Tensor = {
      data: ptr as any, // Store pointer as data
      shape,
      backend: 'wasm-simd',
      id: this.generateId()
    }
    this.tensors.set(tensor.id, { ...tensor, ptr });
    return tensor;
  }
  async free(tensor: Tensor): Promise<void> {
    if (tensor.backend !== 'wasm-simd') {
      throw new Error('Tensor is not from WASM SIMD backend');
    }
    const storedTensor = this.tensors.get(tensor.id) as any;
    if (storedTensor?.ptr !== undefined) {
      this.exports.free(storedTensor.ptr);
    }
    this.tensors.delete(tensor.id);
  }
  async matMul(a: Tensor, b: Tensor): Promise<Tensor> {
    if (!this.initialized || !this.exports) {
      throw new Error('WASM SIMD not initialized');
    }
    if (a.shape.cols !== b.shape.rows) {
      throw new Error(`Incompatible shapes for matmul`);
    }
    const M = a.shape.rows;
    const K = a.shape.cols;
    const N = b.shape.cols;
    // Allocate result tensor
    const result = await this.allocate({ rows: M, cols: N });
    // Get pointers
    const aPtr = (this.tensors.get(a.id) as any).ptr;
    const bPtr = (this.tensors.get(b.id) as any).ptr;
    const resultPtr = (this.tensors.get(result.id) as any).ptr;
    // Call WASM SIMD matmul
    this.exports.matmul_simd(aPtr, bPtr, resultPtr, M, K, N);
    return result;
  }
  async batchMatMul(a: Tensor, b: Tensor): Promise<Tensor> {
    if (!this.initialized || !this.exports) {
      throw new Error('WASM SIMD not initialized');
    }
    if (!a.shape.batch || !b.shape.batch || a.shape.batch !== b.shape.batch) {
      throw new Error('Batch dimensions must match');
    }
    const batch = a.shape.batch;
    const M = a.shape.rows;
    const K = a.shape.cols;
    const N = b.shape.cols;
    const result = await this.allocate({ rows: M, cols: N, batch });
    const aPtr = (this.tensors.get(a.id) as any).ptr;
    const bPtr = (this.tensors.get(b.id) as any).ptr;
    const resultPtr = (this.tensors.get(result.id) as any).ptr;
    this.exports.batch_matmul_simd(aPtr, bPtr, resultPtr, batch, M, K, N);
    return result;
  }
  async toTensor(data: Float32Array, shape: TensorShape): Promise<Tensor> {
    return this.allocate(shape, data);
  }
  async readback(tensor: Tensor): Promise<Float32Array> {
    if (tensor.backend !== 'wasm-simd') {
      throw new Error('Tensor is not from WASM SIMD backend');
    }
    if (!this.memory) {
      throw new Error('WASM memory not initialized');
    }
    const storedTensor = this.tensors.get(tensor.id) as any;
    const ptr = storedTensor.ptr;
    const size = tensor.shape.rows * tensor.shape.cols * (tensor.shape.batch || 1);
    const memory = new Float32Array(this.memory.buffer);
    const result = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      result[i] = memory[ptr / 4 + i];
    }
    return result;
  }
  async dispose(): Promise<void> {
    const tensorList = Array.from(this.tensors.values();
    for (const tensor of tensorList) {
      await this.free(tensor as Tensor);
    }
    this.tensors.clear();
    this.wasmModule = null;
    this.wasmInstance = null;
    this.memory = null;
    this.exports = null;
    this.initialized = false;
    console.log('WASM SIMD backend disposed');
  }
}
// TensorRT Backend Implementation (Server-side GPU acceleration)
class TensorRTBackend extends BaseBackend {
  type: BackendType = 'tensorrt';
  private cudaServiceUrl: string = 'http://localhost:8097'
  private sessionId: string | null = null;
  private availableEngines = new Map<string, any>();
  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      console.log('🚀 Initializing TensorRT backend...');
      // Check CUDA service health
      const healthResponse = await fetch(`${this.cudaServiceUrl}/api/v1/health`);
      if (!healthResponse.ok) {
        throw new Error('CUDA service not available');
      }
      const health = await healthResponse.json();
      if (!health.tensorrt_available) {
        throw new Error('TensorRT not available in CUDA service');
      }
      // Initialize TensorRT session
      const sessionResponse = await fetch(`${this.cudaServiceUrl}/api/v1/tensorrt/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({,
          device_id: 0, // RTX 3060 Ti
          max_batch_size: 8,
          workspace_size: 1024 * 1024 * 1024 // 1GB workspace
        })
      });
      if (!sessionResponse.ok) {
        throw new Error('Failed to create TensorRT session');
      }
      const session = await sessionResponse.json();
      this.sessionId = session.session_id;
      // Load available TensorRT engines
      await this.loadAvailableEngines();
      this.initialized = true;
      console.log('✅ TensorRT backend initialized');
      console.log(`📊 Available engines: ${Array.from(this.availableEngines.keys()).join(', ')}`);
    } catch (error) {
      throw new Error(`TensorRT initialization failed: ${error}`);
    }
  }
  private async loadAvailableEngines(): Promise<void> {
    try {
      // removed unused response assignment
      if (response.ok) {
        const engines = await response.json();
        for (const engine of engines.available_engines) {
          this.availableEngines.set(engine.name, {
            path: engine.path,
            inputShape: engine.input_shape,
            outputShape: engine.output_shape,
            dataType: engine.data_type,
            maxBatchSize: engine.max_batch_size
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load TensorRT engines:', error);
    }
  }
  async allocate(shape: TensorShape, data?: Float32Array): Promise<Tensor> {
    if (!this.initialized || !this.sessionId) {
      throw new Error('TensorRT backend not initialized');
    }
    // For TensorRT, we store tensor metadata locally and data on server
    const tensorId = this.generateId();
    let serverTensorId: string | null = null;
    if (data) {
      // Upload tensor data to CUDA service
      const uploadResponse = await fetch(`${this.cudaServiceUrl}/api/v1/tensorrt/tensor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({,
          session_id: this.sessionId,
          tensor_id: tensorId
          shape: [shape.batch || 1, shape.rows, shape.cols],
          data: Array.from(data),
          data_type: 'float32'
        })
      });
      if (uploadResponse.ok) {
        const result = await uploadResponse.json();
        serverTensorId = result.server_tensor_id;
      }
    }
    const tensor: Tensor = {
      data: { tensorId, serverTensorId, uploaded: !!serverTensorId },
      shape,
      backend: 'tensorrt',
      id: tensorId
    }
    this.tensors.set(tensor.id, tensor);
    return tensor;
  }
  async free(tensor: Tensor): Promise<void> {
    if (tensor.backend !== 'tensorrt') {
      throw new Error('Tensor is not from TensorRT backend');
    }
    const tensorData = tensor.data as any;
    if (tensorData.serverTensorId) {
      // Free tensor on server
      try {
        await fetch(`${this.cudaServiceUrl}/api/v1/tensorrt/tensor/${tensorData.serverTensorId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: this.sessionId })
        });
      } catch (error) {
        console.warn('Failed to free server tensor:', error);
      }
    }
    this.tensors.delete(tensor.id);
  }
  async matMul(a: Tensor, b: Tensor): Promise<Tensor> {
    if (!this.initialized || !this.sessionId) {
      throw new Error('TensorRT backend not initialized');
    }
    if (a.shape.cols !== b.shape.rows) {
      throw new Error(`Incompatible shapes for matmul: ${a.shape.rows}x${a.shape.cols} @ ${b.shape.rows}x${b.shape.cols}`);
    }
    // Use TensorRT matmul engine
    const engineName = 'matmul_fp16'; // Assuming we have a matmul engine
    if (!this.availableEngines.has(engineName)) {
      throw new Error(`TensorRT engine ${engineName} not available`);
    }
    const M = a.shape.rows;
    const N = b.shape.cols;
    try {
      const response = await fetch(`${this.cudaServiceUrl}/api/v1/tensorrt/inference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({,
          session_id: this.sessionId,
          engine_name: engineName
          inputs: {
            input_a: (a.data as any).serverTensorId,
            input_b: (b.data as any).serverTensorId
          },
          output_shape: [M, N]
        })
      });
      if (!response.ok) {
        throw new Error(`TensorRT inference failed: ${response.statusText}`);
      }
      const result = await response.json();
      // Create result tensor with server reference
      const resultTensor: Tensor = {
        data: {
          tensorId: this.generateId(),
          serverTensorId: result.output_tensor_id,
          uploaded: true
        },
        shape: { rows: M, cols: N },
        backend: 'tensorrt',
        id: this.generateId()
      }
      this.tensors.set(resultTensor.id, resultTensor);
      return resultTensor;
    } catch (error) {
      throw new Error(`TensorRT matmul failed: ${error}`);
    }
  }
  async batchMatMul(a: Tensor, b: Tensor): Promise<Tensor> {
    if (!a.shape.batch || !b.shape.batch || a.shape.batch !== b.shape.batch) {
      throw new Error('Batch dimensions must match');
    }
    // Use TensorRT batch matmul engine
    const engineName = 'batch_matmul_fp16';
    if (!this.availableEngines.has(engineName)) {
      // Fallback to sequential matmul
      return this.matMul(a, b);
    }
    const batch = a.shape.batch;
    const M = a.shape.rows;
    const N = b.shape.cols;
    try {
      const response = await fetch(`${this.cudaServiceUrl}/api/v1/tensorrt/inference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({,
          session_id: this.sessionId,
          engine_name: engineName
          inputs: {
            input_a: (a.data as any).serverTensorId,
            input_b: (b.data as any).serverTensorId
          },
          output_shape: [batch, M, N]
        })
      });
      if (!response.ok) {
        throw new Error(`TensorRT batch inference failed: ${response.statusText}`);
      }
      const result = await response.json();
      const resultTensor: Tensor = {
        data: {
          tensorId: this.generateId(),
          serverTensorId: result.output_tensor_id,
          uploaded: true
        },
        shape: { rows: M, cols: N, batch },
        backend: 'tensorrt',
        id: this.generateId()
      }
      this.tensors.set(resultTensor.id, resultTensor);
      return resultTensor;
    } catch (error) {
      throw new Error(`TensorRT batch matmul failed: ${error}`);
    }
  }
  async toTensor(data: Float32Array, shape: TensorShape): Promise<Tensor> {
    return this.allocate(shape, data);
  }
  async readback(tensor: Tensor): Promise<Float32Array> {
    if (tensor.backend !== 'tensorrt') {
      throw new Error('Tensor is not from TensorRT backend');
    }
    const tensorData = tensor.data as any;
    if (!tensorData.serverTensorId) {
      throw new Error('Tensor not uploaded to server');
    }
    try {
      const response = await fetch(`${this.cudaServiceUrl}/api/v1/tensorrt/tensor/${tensorData.serverTensorId}/data`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`Failed to read tensor data: ${response.statusText}`);
      }
      const result = await response.json();
      return new Float32Array(result.data);
    } catch (error) {
      throw new Error(`TensorRT readback failed: ${error}`);
    }
  }
  async dispose(): Promise<void> {
    // Free all tensors
    const tensorList = Array.from(this.tensors.values();
    for (const tensor of tensorList) {
      await this.free(tensor);
    }
    this.tensors.clear();
    // Close TensorRT session
    if (this.sessionId) {
      try {
        await fetch(`${this.cudaServiceUrl}/api/v1/tensorrt/session/${this.sessionId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.warn('Failed to close TensorRT session:', error);
      }
      this.sessionId = null;
    }
    this.availableEngines.clear();
    this.initialized = false;
    console.log('TensorRT backend disposed');
  }
}
// CPU JavaScript Fallback Backend
class CPUJSBackend extends BaseBackend {
  type: BackendType = 'cpu-js';
  async initialize(): Promise<void> {
    this.initialized = true;
    console.log('✅ CPU JS backend initialized');
  }
  async allocate(shape: TensorShape, data?: Float32Array): Promise<Tensor> {
    if (!this.initialized) await this.initialize();
    const size = shape.rows * shape.cols * (shape.batch || 1);
    const tensorData = data ? new Float32Array(data) : new Float32Array(size);
    const tensor: Tensor = {
      data: tensorData
      shape,
      backend: 'cpu-js',
      id: this.generateId()
    }
    this.tensors.set(tensor.id, tensor);
    return tensor;
  }
  async free(tensor: Tensor): Promise<void> {
    if (tensor.backend !== 'cpu-js') {
      throw new Error('Tensor is not from CPU JS backend');
    }
    this.tensors.delete(tensor.id);
  }
  async matMul(a: Tensor, b: Tensor): Promise<Tensor> {
    if (a.shape.cols !== b.shape.rows) {
      throw new Error(`Incompatible shapes for matmul`);
    }
    const M = a.shape.rows;
    const K = a.shape.cols;
    const N = b.shape.cols;
    const aData = a.data as Float32Array;
    const bData = b.data as Float32Array;
    const resultData = new Float32Array(M * N);
    // Standard matrix multiplication (not optimized)
    for (let i = 0; i < M; i++) {
      for (let j = 0; j < N; j++) {
        let sum = 0;
        for (let k = 0; k < K; k++) {
          sum += aData[i * K + k] * bData[k * N + j];
        }
        resultData[i * N + j] = sum;
      }
    }
    return this.allocate({ rows: M, cols: N }, resultData);
  }
  async batchMatMul(a: Tensor, b: Tensor): Promise<Tensor> {
    if (!a.shape.batch || !b.shape.batch || a.shape.batch !== b.shape.batch) {
      throw new Error('Batch dimensions must match');
    }
    const batch = a.shape.batch;
    const M = a.shape.rows;
    const K = a.shape.cols;
    const N = b.shape.cols;
    const aData = a.data as Float32Array;
    const bData = b.data as Float32Array;
    const resultData = new Float32Array(batch * M * N);
    const matrixSizeA = M * K;
    const matrixSizeB = K * N;
    const matrixSizeResult = M * N;
    for (let b = 0; b < batch; b++) {
      const aOffset = b * matrixSizeA;
      const bOffset = b * matrixSizeB;
      const resultOffset = b * matrixSizeResult;
      for (let i = 0; i < M; i++) {
        for (let j = 0; j < N; j++) {
          let sum = 0;
          for (let k = 0; k < K; k++) {
            sum += aData[aOffset + i * K + k] * bData[bOffset + k * N + j];
          }
          resultData[resultOffset + i * N + j] = sum;
        }
      }
    }
    return this.allocate({ rows: M, cols: N, batch }, resultData);
  }
  async toTensor(data: Float32Array, shape: TensorShape): Promise<Tensor> {
    return this.allocate(shape, data);
  }
  async readback(tensor: Tensor): Promise<Float32Array> {
    if (tensor.backend !== 'cpu-js') {
      throw new Error('Tensor is not from CPU JS backend');
    }
    return new Float32Array(tensor.data as Float32Array);
  }
  async dispose(): Promise<void> {
    this.tensors.clear();
    this.initialized = false;
    console.log('CPU JS backend disposed');
  }
}
// Main Universal Runtime Class
export class UniversalGPURuntime {
  private backend: ComputeBackend | null = null;
  private backendType: BackendType | null = null;
  /**
   * Initialize the runtime with automatic backend detection
   */;
  async initialize(preferredBackend?: BackendType): Promise<BackendType> {
    // Detect best available backend
    const detectedBackend = preferredBackend || await BackendDetector.detectBestBackend();
    // Create appropriate backend instance
    switch (detectedBackend) {
      case 'tensorrt':
        this.backend = new TensorRTBackend();
        break;
      case 'webgpu':
        this.backend = new WebGPUBackend();
        break;
      case 'webgl2':
        this.backend = new WebGL2Backend();
        break;
      case 'wasm-simd':
        this.backend = new WASMSIMDBackend();
        break;
      case 'cpu-js':
      default:
        this.backend = new CPUJSBackend();
        break;
    }
    // Initialize backend
    try {
      await this.backend.initialize();
      this.backendType = detectedBackend;
      console.log(`🎯 Universal GPU Runtime initialized with ${detectedBackend} backend`);
      return detectedBackend;
    } catch (error) {
      console.error(`Failed to initialize ${detectedBackend}:`, error);
      // Fallback to CPU if preferred backend fails
      if (detectedBackend !== 'cpu-js') {
        console.log('Falling back to CPU JavaScript backend...');
        this.backend = new CPUJSBackend();
        await this.backend.initialize();
        this.backendType = 'cpu-js';
        return 'cpu-js';
      }
      throw error;
    }
  }
  /**
   * Get current backend type
   */;
  getBackendType(): BackendType | null {
    return this.backendType;
  }
  /**
   * Get backend requirements and limitations
   */;
  getRequirements(): string[] {
    if (!this.backendType) return [];
    return BackendDetector.getRequirements(this.backendType);
  }
  /**
   * Allocate a new tensor
   */;
  async allocate(shape: TensorShape, data?: Float32Array): Promise<Tensor> {
    if (!this.backend) throw new Error('Runtime not initialized');
    return this.backend.allocate(shape, data);
  }
  /**
   * Free a tensor from memory
   */;
  async free(tensor: Tensor): Promise<void> {
    if (!this.backend) throw new Error('Runtime not initialized');
    return this.backend.free(tensor);
  }
  /**
   * Perform matrix multiplication
   */;
  async matMul(a: Tensor, b: Tensor): Promise<Tensor> {
    if (!this.backend) throw new Error('Runtime not initialized');
    return this.backend.matMul(a, b);
  }
  /**
   * Perform batch matrix multiplication
   */;
  async batchMatMul(a: Tensor, b: Tensor): Promise<Tensor> {
    if (!this.backend) throw new Error('Runtime not initialized');
    return this.backend.batchMatMul(a, b);
  }
  /**
   * Convert Float32Array to tensor
   */;
  async toTensor(data: Float32Array, shape: TensorShape): Promise<Tensor> {
    if (!this.backend) throw new Error('Runtime not initialized');
    return this.backend.toTensor(data, shape);
  }
  /**
   * Read tensor data back to CPU
   */;
  async readback(tensor: Tensor): Promise<Float32Array> {
    if (!this.backend) throw new Error('Runtime not initialized');
    return this.backend.readback(tensor);
  }
  /**
   * Dispose of all resources
   */;
  async dispose(): Promise<void> {
    if (this.backend) {
      await this.backend.dispose();
      this.backend = null;
      this.backendType = null;
    }
  }
  /**
   * Benchmark matrix multiplication performance
   */;
  async benchmark(size: number = 512): Promise<{,
    backend,: BackendType;
    matmulTime: number;
    throughput: number;
  }> {
    if (!this.backend || !this.backendTyp,e) {
      throw new Error('Runtime not initialized');
    }
    // Create random matrices
    const a = new Float32Array(size * size).map(() => Math.random();
    const b = new Float32Array(size * size).map(() => Math.random();
    const tensorA = await this.toTensor(a, { rows: size, cols: size });
    const tensorB = await this.toTensor(b, { rows: size, cols: size });
    // Warmup
    const warmup = await this.matMul(tensorA, tensorB);
    await this.free(warmup);
    // Benchmark
    const iterations = 10;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const result = await this.matMul(tensorA, tensorB);
      await this.free(result);
    }
    const elapsed = performance.now() - start;
    const avgTime = elapsed / iterations;
    const flops = 2 * size * size * size; // 2N^3 FLOPs for NxN matrix multiply
    const throughput = (flops * iterations) / (elapsed / 1000) / 1e9; // GFLOPs
    await this.free(tensorA);
    await this.free(tensorB);
    return {
      backend: this.backendType,
      matmulTime: avgTime
      throughput
    }
  }
}
// Export singleton instance for convenience
export const gpuRuntime = new UniversalGPURuntime();
// Cross-origin isolation requirements message
export const CROSS_ORIGIN_MESSAGE = `
🔒 Cross-Origin Isolation Requirements:
For optimal performance with WASM SIMD and SharedArrayBuffer:
1. Add these headers to your server:
   Cross-Origin-Opener-Policy: same-origin
   Cross-Origin-Embedder-Policy: require-corp
2. In SvelteKit, add to app.html: <meta http-equiv="origin-trial" content="your-token">
3. For development, use:
   npm run dev -- --host --https
4. Check isolation status:
   console.log(crossOriginIsolated); // Should be true
`;
// Export all types and classes
export {
  TensorRTBackend,
  WebGPUBackend,
  WebGL2Backend,
  WASMSIMDBackend,
  CPUJSBackend,
  BackendDetector
}