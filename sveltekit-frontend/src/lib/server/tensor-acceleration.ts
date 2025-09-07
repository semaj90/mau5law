/**
 * WebGPU Tensor Acceleration Module
 * GPU-accelerated tensor operations with tiled compute kernels
 * Supports image analysis, similarity operations, and embedding transforms
 */

import { webgpuTextureStreamer } from '../gpu/texture-streaming-service.js';

interface GPUTensorConfig {
  tileSize: number;
  workgroupSize: [number, number, number];
  precision: 'fp16' | 'fp32';
  memoryOptimized: boolean;
}

interface GPUTensorMeta {
  gpuProcessed: boolean;
  tileSize: number;
  computeTime: number;
  memoryUsage: number;
  kernelType: string;
  precision: string;
}

export interface TensorAccelerationOptions {
  gpuTile?: boolean;
  tileSize?: number;
  operation?: 'similarity' | 'transform' | 'analyze' | 'compress';
  precision?: 'fp16' | 'fp32';
  batchSize?: number;
}

export class TensorAccelerator {
  private device: GPUDevice | null = null;
  private initialized: boolean = false;
  private computePipelines: Map<string, GPUComputePipeline> = new Map();
  private config: GPUTensorConfig;

  constructor() {
    this.config = {
      tileSize: 16, // 16x16 tiles optimal for RTX 3060 Ti
      workgroupSize: [16, 16, 1],
      precision: 'fp16',
      memoryOptimized: true
    };
  }

  /**
   * Lazy initialization of WebGPU device
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    
    try {
      if (!navigator.gpu) {
        console.warn('WebGPU not available for tensor acceleration');
        return false;
      }

      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
      });

      if (!adapter) {
        console.warn('No WebGPU adapter found');
        return false;
      }

      this.device = await adapter.requestDevice({
        requiredFeatures: ['shader-f16'] as GPUFeatureName[],
        requiredLimits: {
          maxComputeWorkgroupSizeX: 256,
          maxComputeWorkgroupSizeY: 256,
          maxComputeInvocationsPerWorkgroup: 256,
          maxBufferSize: 2 * 1024 * 1024 * 1024 // 2GB
        }
      });

      await this.createComputePipelines();
      this.initialized = true;
      
      console.log('🚀 WebGPU Tensor Accelerator initialized');
      return true;
      
    } catch (error) {
      console.error('Failed to initialize WebGPU Tensor Accelerator:', error);
      return false;
    }
  }

  /**
   * Create specialized compute pipelines for different operations
   */
  private async createComputePipelines(): Promise<void> {
    if (!this.device) return;

    // Similarity computation pipeline
    const similarityShader = `
      @group(0) @binding(0) var<storage, read> vectorA: array<f32>;
      @group(0) @binding(1) var<storage, read> vectorB: array<f32>;
      @group(0) @binding(2) var<storage, read_write> result: array<f32>;
      @group(0) @binding(3) var<uniform> params: vec4<u32>; // [length, tile_size, 0, 0]
      
      @compute @workgroup_size(16, 16, 1)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        let length = params.x;
        let tile_size = params.y;
        
        if (index >= length) { return; }
        
        // Tiled dot product computation
        var sum = 0.0;
        let tile_start = (index / tile_size) * tile_size;
        let tile_end = min(tile_start + tile_size, length);
        
        for (var i = tile_start; i < tile_end; i++) {
          sum += vectorA[i] * vectorB[i];
        }
        
        // Atomic add for partial results
        result[index / tile_size] += sum;
      }
    `;

    // Transform pipeline for embedding processing
    const transformShader = `
      @group(0) @binding(0) var<storage, read> input: array<f32>;
      @group(0) @binding(1) var<storage, read_write> output: array<f32>;
      @group(0) @binding(2) var<uniform> params: vec4<u32>; // [length, transform_type, scale, offset]
      
      @compute @workgroup_size(64, 1, 1)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        let length = params.x;
        let transform_type = params.y;
        
        if (index >= length) { return; }
        
        let value = input[index];
        var result_value = value;
        
        // L2 normalization
        if (transform_type == 0u) {
          result_value = value * f32(params.z) / 1000.0; // Scale factor
        }
        // Quantization
        else if (transform_type == 1u) {
          result_value = round(value * f32(params.z)) / f32(params.z);
        }
        // Activation function (ReLU)
        else if (transform_type == 2u) {
          result_value = max(0.0, value);
        }
        
        output[index] = result_value;
      }
    `;

    // Image analysis pipeline for visual document processing
    const imageAnalysisShader = `
      @group(0) @binding(0) var<storage, read> image_data: array<u32>;
      @group(0) @binding(1) var<storage, read_write> features: array<f32>;
      @group(0) @binding(2) var<uniform> params: vec4<u32>; // [width, height, channels, tile_size]
      
      @compute @workgroup_size(16, 16, 1)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let x = global_id.x;
        let y = global_id.y;
        let width = params.x;
        let height = params.y;
        let tile_size = params.w;
        
        if (x >= width || y >= height) { return; }
        
        // Tiled feature extraction
        let tile_x = x / tile_size;
        let tile_y = y / tile_size;
        let tile_index = tile_y * (width / tile_size) + tile_x;
        
        let pixel_index = y * width + x;
        let pixel_value = image_data[pixel_index];
        
        // Extract RGB components
        let r = f32((pixel_value >> 16u) & 0xFFu) / 255.0;
        let g = f32((pixel_value >> 8u) & 0xFFu) / 255.0;
        let b = f32(pixel_value & 0xFFu) / 255.0;
        
        // Compute luminance for this pixel
        let luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Accumulate features for this tile
        atomicAdd(&features[tile_index * 4u], r);     // Avg R
        atomicAdd(&features[tile_index * 4u + 1u], g); // Avg G
        atomicAdd(&features[tile_index * 4u + 2u], b); // Avg B
        atomicAdd(&features[tile_index * 4u + 3u], luminance); // Avg luminance
      }
    `;

    // Create compute pipelines
    const similarityModule = this.device.createShaderModule({ code: similarityShader });
    const transformModule = this.device.createShaderModule({ code: transformShader });
    const imageModule = this.device.createShaderModule({ code: imageAnalysisShader });

    this.computePipelines.set('similarity', this.device.createComputePipeline({
      layout: 'auto',
      compute: { module: similarityModule, entryPoint: 'main' }
    }));

    this.computePipelines.set('transform', this.device.createComputePipeline({
      layout: 'auto',
      compute: { module: transformModule, entryPoint: 'main' }
    }));

    this.computePipelines.set('image', this.device.createComputePipeline({
      layout: 'auto',
      compute: { module: imageModule, entryPoint: 'main' }
    }));
  }

  /**
   * GPU-accelerated similarity computation between embeddings
   */
  async computeSimilarity(
    vectorA: Float32Array, 
    vectorB: Float32Array,
    options: TensorAccelerationOptions = {}
  ): Promise<{ similarity: number; gpuMeta: GPUTensorMeta }> {
    const startTime = performance.now();
    
    if (!this.initialized && !(await this.initialize())) {
      throw new Error('WebGPU tensor acceleration not available');
    }
    
    if (!this.device) {
      throw new Error('WebGPU device not initialized');
    }

    const tileSize = options.tileSize || this.config.tileSize;
    const numTiles = Math.ceil(vectorA.length / tileSize);
    
    try {
      // Create buffers
      const bufferA = this.device.createBuffer({
        size: vectorA.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
      });
      new Float32Array(bufferA.getMappedRange()).set(vectorA);
      bufferA.unmap();

      const bufferB = this.device.createBuffer({
        size: vectorB.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
      });
      new Float32Array(bufferB.getMappedRange()).set(vectorB);
      bufferB.unmap();

      const resultBuffer = this.device.createBuffer({
        size: numTiles * 4, // f32 per tile
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
      });

      const uniformBuffer = this.device.createBuffer({
        size: 16, // vec4<u32>
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });

      // Set uniforms
      this.device.queue.writeBuffer(
        uniformBuffer, 0,
        new Uint32Array([vectorA.length, tileSize, 0, 0])
      );

      // Create bind group
      const pipeline = this.computePipelines.get('similarity')!;
      const bindGroup = this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: bufferA } },
          { binding: 1, resource: { buffer: bufferB } },
          { binding: 2, resource: { buffer: resultBuffer } },
          { binding: 3, resource: { buffer: uniformBuffer } }
        ]
      });

      // Execute compute shader
      const commandEncoder = this.device.createCommandEncoder();
      const computePass = commandEncoder.beginComputePass();
      
      computePass.setPipeline(pipeline);
      computePass.setBindGroup(0, bindGroup);
      computePass.dispatchWorkgroups(Math.ceil(vectorA.length / 16));
      computePass.end();

      // Read results
      const stagingBuffer = this.device.createBuffer({
        size: numTiles * 4,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
      });

      commandEncoder.copyBufferToBuffer(resultBuffer, 0, stagingBuffer, 0, numTiles * 4);
      this.device.queue.submit([commandEncoder.finish()]);

      await stagingBuffer.mapAsync(GPUMapMode.READ);
      const results = new Float32Array(stagingBuffer.getMappedRange());
      
      // Sum partial results
      let similarity = 0;
      for (let i = 0; i < results.length; i++) {
        similarity += results[i];
      }
      
      // Normalize by vector magnitudes
      const magnitudeA = Math.sqrt(vectorA.reduce((sum, val) => sum + val * val, 0));
      const magnitudeB = Math.sqrt(vectorB.reduce((sum, val) => sum + val * val, 0));
      similarity = similarity / (magnitudeA * magnitudeB);

      // Cleanup
      stagingBuffer.unmap();
      [bufferA, bufferB, resultBuffer, uniformBuffer, stagingBuffer].forEach(b => b.destroy());

      const computeTime = performance.now() - startTime;

      return {
        similarity,
        gpuMeta: {
          gpuProcessed: true,
          tileSize,
          computeTime,
          memoryUsage: vectorA.byteLength + vectorB.byteLength + numTiles * 4,
          kernelType: 'tiled-similarity',
          precision: options.precision || 'fp32'
        }
      };

    } catch (error) {
      console.error('GPU similarity computation failed:', error);
      throw error;
    }
  }

  /**
   * GPU-accelerated embedding transformation
   */
  async transformEmbedding(
    embedding: Float32Array,
    operation: 'normalize' | 'quantize' | 'activate',
    options: TensorAccelerationOptions = {}
  ): Promise<{ transformed: Float32Array; gpuMeta: GPUTensorMeta }> {
    const startTime = performance.now();
    
    if (!this.initialized && !(await this.initialize())) {
      throw new Error('WebGPU tensor acceleration not available');
    }
    
    if (!this.device) {
      throw new Error('WebGPU device not initialized');
    }

    try {
      // Create buffers
      const inputBuffer = this.device.createBuffer({
        size: embedding.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
      });
      new Float32Array(inputBuffer.getMappedRange()).set(embedding);
      inputBuffer.unmap();

      const outputBuffer = this.device.createBuffer({
        size: embedding.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
      });

      const uniformBuffer = this.device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });

      // Set operation parameters
      const transformType = operation === 'normalize' ? 0 : operation === 'quantize' ? 1 : 2;
      const scale = operation === 'quantize' ? 127 : 1000; // Quantization or normalization scale
      
      this.device.queue.writeBuffer(
        uniformBuffer, 0,
        new Uint32Array([embedding.length, transformType, scale, 0])
      );

      // Execute transform
      const pipeline = this.computePipelines.get('transform')!;
      const bindGroup = this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: inputBuffer } },
          { binding: 1, resource: { buffer: outputBuffer } },
          { binding: 2, resource: { buffer: uniformBuffer } }
        ]
      });

      const commandEncoder = this.device.createCommandEncoder();
      const computePass = commandEncoder.beginComputePass();
      
      computePass.setPipeline(pipeline);
      computePass.setBindGroup(0, bindGroup);
      computePass.dispatchWorkgroups(Math.ceil(embedding.length / 64));
      computePass.end();

      // Read results
      const stagingBuffer = this.device.createBuffer({
        size: embedding.byteLength,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
      });

      commandEncoder.copyBufferToBuffer(outputBuffer, 0, stagingBuffer, 0, embedding.byteLength);
      this.device.queue.submit([commandEncoder.finish()]);

      await stagingBuffer.mapAsync(GPUMapMode.READ);
      const transformed = new Float32Array(stagingBuffer.getMappedRange().slice(0));

      stagingBuffer.unmap();
      [inputBuffer, outputBuffer, uniformBuffer, stagingBuffer].forEach(b => b.destroy());

      const computeTime = performance.now() - startTime;

      return {
        transformed,
        gpuMeta: {
          gpuProcessed: true,
          tileSize: options.tileSize || this.config.tileSize,
          computeTime,
          memoryUsage: embedding.byteLength * 2,
          kernelType: `transform-${operation}`,
          precision: options.precision || 'fp32'
        }
      };

    } catch (error) {
      console.error('GPU embedding transformation failed:', error);
      throw error;
    }
  }

  /**
   * GPU-accelerated image analysis for visual documents
   */
  async analyzeImage(
    imageData: Uint32Array,
    width: number,
    height: number,
    options: TensorAccelerationOptions = {}
  ): Promise<{ features: Float32Array; gpuMeta: GPUTensorMeta }> {
    const startTime = performance.now();
    
    if (!this.initialized && !(await this.initialize())) {
      throw new Error('WebGPU tensor acceleration not available');
    }
    
    if (!this.device) {
      throw new Error('WebGPU device not initialized');
    }

    const tileSize = options.tileSize || 16;
    const tilesX = Math.ceil(width / tileSize);
    const tilesY = Math.ceil(height / tileSize);
    const numFeatures = tilesX * tilesY * 4; // 4 features per tile (R,G,B,Luminance)

    try {
      // Create buffers
      const imageBuffer = this.device.createBuffer({
        size: imageData.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
      });
      new Uint32Array(imageBuffer.getMappedRange()).set(imageData);
      imageBuffer.unmap();

      const featureBuffer = this.device.createBuffer({
        size: numFeatures * 4, // f32 per feature
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
      });

      const uniformBuffer = this.device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });

      this.device.queue.writeBuffer(
        uniformBuffer, 0,
        new Uint32Array([width, height, 4, tileSize])
      );

      // Execute image analysis
      const pipeline = this.computePipelines.get('image')!;
      const bindGroup = this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: imageBuffer } },
          { binding: 1, resource: { buffer: featureBuffer } },
          { binding: 2, resource: { buffer: uniformBuffer } }
        ]
      });

      const commandEncoder = this.device.createCommandEncoder();
      const computePass = commandEncoder.beginComputePass();
      
      computePass.setPipeline(pipeline);
      computePass.setBindGroup(0, bindGroup);
      computePass.dispatchWorkgroups(tilesX, tilesY);
      computePass.end();

      // Read results
      const stagingBuffer = this.device.createBuffer({
        size: numFeatures * 4,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
      });

      commandEncoder.copyBufferToBuffer(featureBuffer, 0, stagingBuffer, 0, numFeatures * 4);
      this.device.queue.submit([commandEncoder.finish()]);

      await stagingBuffer.mapAsync(GPUMapMode.READ);
      const features = new Float32Array(stagingBuffer.getMappedRange().slice(0));

      // Normalize features by pixels per tile
      const pixelsPerTile = tileSize * tileSize;
      for (let i = 0; i < features.length; i++) {
        features[i] /= pixelsPerTile;
      }

      stagingBuffer.unmap();
      [imageBuffer, featureBuffer, uniformBuffer, stagingBuffer].forEach(b => b.destroy());

      const computeTime = performance.now() - startTime;

      return {
        features,
        gpuMeta: {
          gpuProcessed: true,
          tileSize,
          computeTime,
          memoryUsage: imageData.byteLength + numFeatures * 4,
          kernelType: 'tiled-image-analysis',
          precision: options.precision || 'fp32'
        }
      };

    } catch (error) {
      console.error('GPU image analysis failed:', error);
      throw error;
    }
  }

  /**
   * Check if WebGPU is available
   */
  static isAvailable(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.gpu;
  }

  /**
   * Get device capabilities
   */
  async getCapabilities() {
    if (!this.initialized && !(await this.initialize())) {
      return null;
    }

    return this.device ? {
      maxBufferSize: this.device.limits.maxBufferSize,
      maxComputeWorkgroupSizeX: this.device.limits.maxComputeWorkgroupSizeX,
      maxComputeInvocationsPerWorkgroup: this.device.limits.maxComputeInvocationsPerWorkgroup,
      features: Array.from(this.device.features)
    } : null;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    this.computePipelines.clear();
    this.initialized = false;
  }
}

// Singleton instance
export const tensorAccelerator = new TensorAccelerator();

// Convenience functions with opt-in GPU tiling
export async function acceleratedSimilarity(
  vectorA: Float32Array,
  vectorB: Float32Array,
  options: TensorAccelerationOptions = {}
) {
  if (options.gpuTile && TensorAccelerator.isAvailable()) {
    return await tensorAccelerator.computeSimilarity(vectorA, vectorB, options);
  }
  
  // CPU fallback
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }
  
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  
  return {
    similarity,
    gpuMeta: {
      gpuProcessed: false,
      tileSize: 0,
      computeTime: 0,
      memoryUsage: 0,
      kernelType: 'cpu-similarity',
      precision: 'fp64'
    }
  };
}

export async function acceleratedTransform(
  embedding: Float32Array,
  operation: 'normalize' | 'quantize' | 'activate',
  options: TensorAccelerationOptions = {}
) {
  if (options.gpuTile && TensorAccelerator.isAvailable()) {
    return await tensorAccelerator.transformEmbedding(embedding, operation, options);
  }
  
  // CPU fallback
  const transformed = new Float32Array(embedding.length);
  
  if (operation === 'normalize') {
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    for (let i = 0; i < embedding.length; i++) {
      transformed[i] = embedding[i] / norm;
    }
  } else if (operation === 'quantize') {
    const scale = 127;
    for (let i = 0; i < embedding.length; i++) {
      transformed[i] = Math.round(embedding[i] * scale) / scale;
    }
  } else if (operation === 'activate') {
    for (let i = 0; i < embedding.length; i++) {
      transformed[i] = Math.max(0, embedding[i]);
    }
  }
  
  return {
    transformed,
    gpuMeta: {
      gpuProcessed: false,
      tileSize: 0,
      computeTime: 0,
      memoryUsage: 0,
      kernelType: `cpu-${operation}`,
      precision: 'fp64'
    }
  };
}

export { TensorAccelerator, type TensorAccelerationOptions, type GPUTensorMeta };