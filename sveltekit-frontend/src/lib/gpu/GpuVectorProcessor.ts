/**
 * GPU Vector Processor - Nintendo-Style Memory Architecture
 * Consumes cached shader resources from LodCacheEngine for GPU compute pipelines
 * Implements vector processing with adaptive quantization and fallback handling
 */

import type { 
  ShaderBundle, 
  NintendoMemoryBudget, 
  VectorDimensions, 
  QuantizationLevel,
  AdaptiveScalingConfig 
} from './types.js';
import { LodCacheEngine } from './lod-cache-engine.js';
import { telemetryBus } from '$lib/telemetry/event-bus.js';
import { validateMemoryBudget, calculateOptimalDimensions } from './types.js';

export interface VectorProcessingConfig {
  dimensions: VectorDimensions;
  quantization: QuantizationLevel;
  batchSize: number;
  memoryBudget: NintendoMemoryBudget;
  adaptiveScaling: AdaptiveScalingConfig;
  fallbackToWebGL?: boolean;
}

export interface VectorProcessingResult {
  processedVectors: Float32Array[];
  processingTime: number;
  memoryUsed: number;
  quantizationApplied: QuantizationLevel;
  gpuUtilization: number;
  cacheHitRate: number;
}

export interface EmbeddingComputeParams {
  inputVectors: Float32Array[];
  similarityThreshold: number;
  topK: number;
  useAdaptiveQuantization: boolean;
}

export class GpuVectorProcessor {
  private device?: GPUDevice;
  private lodCache: LodCacheEngine;
  private config: VectorProcessingConfig;
  private isInitialized = false;
  
  // Cached GPU resources
  private computePipelines: Map<string, GPUComputePipeline> = new Map();
  private shaderModules: Map<string, GPUShaderModule> = new Map();
  private bufferPool: Map<string, GPUBuffer> = new Map();
  
  // Performance tracking
  private cacheHits = 0;
  private cacheMisses = 0;
  private totalOperations = 0;
  
  // Stability tracking for upscale-after-stability policy
  private stabilityTracker = {
    stableOperationsCount: 0,
    lastStabilityCheck: 0,
    targetStabilityDuration: 30000, // 30 seconds of stability required
    minStableOperations: 20, // Minimum operations to consider for upscaling
    maxConsecutiveFailures: 3,
    consecutiveFailures: 0,
    currentPerformanceLevel: 'optimal' as 'degraded' | 'normal' | 'optimal',
    lastUpscaleAttempt: 0,
    upscaleBackoffPeriod: 60000 // 1 minute backoff between upscale attempts
  };

  constructor(
    lodCache: LodCacheEngine,
    config: VectorProcessingConfig
  ) {
    this.lodCache = lodCache;
    this.config = config;
    
    // Validate memory budget
    if (!validateMemoryBudget(config.memoryBudget)) {
      throw new Error('Invalid Nintendo memory budget configuration');
    }
  }

  async initialize(device?: GPUDevice): Promise<void> {
    try {
      this.device = device || await this.initializeWebGPUDevice();
      
      if (!this.device) {
        if (this.config.fallbackToWebGL) {
          console.warn('[GpuVectorProcessor] WebGPU unavailable, falling back to WebGL');
          await this.initializeWebGLFallback();
        } else {
          throw new Error('WebGPU device unavailable and WebGL fallback disabled');
        }
      }

      // Pre-cache essential shaders from LodCacheEngine
      await this.loadEssentialShaders();
      
      this.isInitialized = true;
      
      telemetryBus.emitPerformanceEvent({
        type: 'gpu_initialization',
        duration: performance.now(),
        operation: 'vector_processor_init',
        success: true
      });

    } catch (error) {
      console.error('[GpuVectorProcessor] Initialization failed:', error);
      throw error;
    }
  }

  private async initializeWebGPUDevice(): Promise<GPUDevice | undefined> {
    if (typeof navigator === 'undefined' || !navigator.gpu) {
      return undefined;
    }

    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance'
    });
    
    if (!adapter) return undefined;

    return await adapter.requestDevice({
      requiredLimits: {
        maxBufferSize: this.config.memoryBudget.L3,
        maxComputeWorkgroupStorageSize: 32768,
        maxComputeInvocationsPerWorkgroup: 1024
      }
    });
  }

  private async initializeWebGLFallback(): Promise<void> {
    // WebGL fallback implementation for vector processing
    console.log('[GpuVectorProcessor] WebGL fallback initialized');
    // TODO: Implement WebGL compute shader fallback using transform feedback
  }

  private async loadEssentialShaders(): Promise<void> {
    const essentialShaderKeys = [
      'vector-similarity-compute',
      'quantization-float32-int8',
      'quantization-int8-int4', 
      'adaptive-dimension-scaling',
      'batch-embedding-compute'
    ];

    for (const shaderKey of essentialShaderKeys) {
      try {
        await this.loadShaderFromCache(shaderKey);
      } catch (error) {
        console.warn(`[GpuVectorProcessor] Failed to load shader ${shaderKey}:`, error);
        this.cacheMisses++;
      }
    }
  }

  private async loadShaderFromCache(shaderKey: string): Promise<GPUComputePipeline> {
    // Check if pipeline already exists
    if (this.computePipelines.has(shaderKey)) {
      this.cacheHits++;
      return this.computePipelines.get(shaderKey)!;
    }

    try {
      // Fetch shader bundle from LodCacheEngine
      const shaderBundle = await this.lodCache.getShaderBundle(
        shaderKey, 
        this.config.memoryBudget.L2 // Use L2 for shader storage
      );

      if (!shaderBundle) {
        throw new Error(`Shader bundle ${shaderKey} not found in cache`);
      }

      // Validate shader bundle
      if (!this.validateShaderBundle(shaderBundle)) {
        throw new Error(`Invalid shader bundle ${shaderKey}`);
      }

      // Create GPU shader module from cached code
      const shaderModule = await this.createShaderModule(shaderBundle);
      this.shaderModules.set(shaderKey, shaderModule);

      // Create compute pipeline
      const computePipeline = await this.createComputePipeline(shaderKey, shaderModule);
      this.computePipelines.set(shaderKey, computePipeline);

      this.cacheHits++;
      
      telemetryBus.emitNintendoMemoryEvent('L2', 'shader_loaded', {
        shaderKey,
        codeSize: shaderBundle.shaderCode.length,
        memoryUsed: shaderBundle.metadata.memoryFootprint
      });

      return computePipeline;

    } catch (error) {
      this.cacheMisses++;
      console.error(`[GpuVectorProcessor] Failed to load shader ${shaderKey}:`, error);
      throw error;
    }
  }

  private validateShaderBundle(bundle: ShaderBundle): boolean {
    return (
      bundle &&
      typeof bundle.shaderCode === 'string' &&
      bundle.shaderCode.trim().length > 0 &&
      bundle.metadata &&
      typeof bundle.metadata.memoryFootprint === 'number' &&
      bundle.metadata.memoryFootprint > 0
    );
  }

  private async createShaderModule(bundle: ShaderBundle): Promise<GPUShaderModule> {
    if (!this.device) {
      throw new Error('WebGPU device not initialized');
    }

    try {
      const shaderModule = this.device.createShaderModule({
        label: `shader-${bundle.metadata.shaderType}`,
        code: bundle.shaderCode
      });

      // Validate shader compilation
      const compilationInfo = await shaderModule.getCompilationInfo();
      for (const message of compilationInfo.messages) {
        if (message.type === 'error') {
          throw new Error(`Shader compilation error: ${message.message}`);
        }
      }

      return shaderModule;

    } catch (error) {
      console.error('[GpuVectorProcessor] Shader module creation failed:', error);
      throw error;
    }
  }

  private async createComputePipeline(
    shaderKey: string, 
    shaderModule: GPUShaderModule
  ): Promise<GPUComputePipeline> {
    if (!this.device) {
      throw new Error('WebGPU device not initialized');
    }

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: `bgl-${shaderKey}`,
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' as const }
        },
        {
          binding: 1, 
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' as const }
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE, 
          buffer: { type: 'uniform' as const }
        }
      ]
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: `pipeline-layout-${shaderKey}`,
      bindGroupLayouts: [bindGroupLayout]
    });

    return this.device.createComputePipeline({
      label: `compute-pipeline-${shaderKey}`,
      layout: pipelineLayout,
      compute: {
        module: shaderModule,
        entryPoint: 'main'
      }
    });
  }

  /**
   * Process vector embeddings using cached GPU compute shaders
   */
  async processEmbeddings(params: EmbeddingComputeParams): Promise<VectorProcessingResult> {
    if (!this.isInitialized) {
      throw new Error('GpuVectorProcessor not initialized');
    }

    const startTime = performance.now();
    this.totalOperations++;

    try {
      // Determine optimal quantization based on adaptive scaling
      const quantization = params.useAdaptiveQuantization 
        ? this.determineOptimalQuantization(params.inputVectors.length)
        : this.config.quantization;

      // Load appropriate compute pipeline
      const computePipeline = await this.loadShaderFromCache('batch-embedding-compute');
      
      // Process vectors in batches to respect memory budget
      const batchSize = Math.min(this.config.batchSize, params.inputVectors.length);
      const results: Float32Array[] = [];
      let totalMemoryUsed = 0;

      for (let i = 0; i < params.inputVectors.length; i += batchSize) {
        const batch = params.inputVectors.slice(i, i + batchSize);
        const batchResult = await this.processBatch(batch, computePipeline, quantization);
        
        results.push(...batchResult.vectors);
        totalMemoryUsed += batchResult.memoryUsed;
      }

      const processingTime = performance.now() - startTime;
      const cacheHitRate = this.totalOperations > 0 
        ? this.cacheHits / this.totalOperations 
        : 0;

      // Track operation success for stability monitoring
      this.trackOperationSuccess(processingTime, totalMemoryUsed);
      
      // Emit telemetry with stability information
      telemetryBus.emitVectorEncodingMetrics(
        this.config.dimensions,
        processingTime,
        this.calculateCompressionRatio(quantization),
        true
      );
      
      // Emit stability metrics
      telemetryBus.emitPerformanceEvent({
        type: 'stability_tracking',
        duration: processingTime,
        operation: 'vector_processing_stability',
        success: true,
        metadata: {
          performanceLevel: this.stabilityTracker.currentPerformanceLevel,
          stableOperations: this.stabilityTracker.stableOperationsCount,
          consecutiveFailures: this.stabilityTracker.consecutiveFailures,
          quantizationLevel: quantization,
          memoryPressure: this.calculateMemoryPressure(params.inputVectors.length)
        }
      });

      return {
        processedVectors: results,
        processingTime,
        memoryUsed: totalMemoryUsed,
        quantizationApplied: quantization,
        gpuUtilization: this.calculateGpuUtilization(totalMemoryUsed),
        cacheHitRate
      };

    } catch (error) {
      // Track operation failure for stability monitoring
      this.trackOperationFailure();
      
      console.error('[GpuVectorProcessor] Embedding processing failed:', error);
      throw error;
    }
  }

  private async processBatch(
    vectors: Float32Array[],
    computePipeline: GPUComputePipeline,
    quantization: QuantizationLevel
  ): Promise<{ vectors: Float32Array[]; memoryUsed: number }> {
    if (!this.device) {
      throw new Error('WebGPU device not initialized');
    }

    // Create buffers for batch processing
    const inputBuffer = this.createVectorBuffer(vectors, 'input');
    const outputBuffer = this.createOutputBuffer(vectors.length);
    const uniformBuffer = this.createUniformBuffer({ quantization, batchSize: vectors.length });

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } },
        { binding: 2, resource: { buffer: uniformBuffer } }
      ]
    });

    // Execute compute pass
    const commandEncoder = this.device.createCommandEncoder();
    const computePass = commandEncoder.beginComputePass();
    
    computePass.setPipeline(computePipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(Math.ceil(vectors.length / 64)); // 64 vectors per workgroup
    computePass.end();

    this.device.queue.submit([commandEncoder.finish()]);

    // Read back results
    const results = await this.readBufferResults(outputBuffer, vectors.length);
    
    // Cleanup buffers
    inputBuffer.destroy();
    outputBuffer.destroy();
    uniformBuffer.destroy();

    const memoryUsed = this.calculateBatchMemoryUsage(vectors);

    return { 
      vectors: results, 
      memoryUsed 
    };
  }

  private createVectorBuffer(vectors: Float32Array[], usage: string): GPUBuffer {
    if (!this.device) throw new Error('WebGPU device not initialized');

    const totalSize = vectors.reduce((sum, v) => sum + v.byteLength, 0);
    
    const buffer = this.device.createBuffer({
      label: `vector-buffer-${usage}`,
      size: totalSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });

    // Write vector data
    let offset = 0;
    for (const vector of vectors) {
      this.device.queue.writeBuffer(buffer, offset, vector.buffer);
      offset += vector.byteLength;
    }

    return buffer;
  }

  private createOutputBuffer(vectorCount: number): GPUBuffer {
    if (!this.device) throw new Error('WebGPU device not initialized');

    const size = vectorCount * this.config.dimensions * 4; // 4 bytes per float32

    return this.device.createBuffer({
      label: 'vector-output-buffer',
      size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });
  }

  private createUniformBuffer(params: { quantization: QuantizationLevel; batchSize: number }): GPUBuffer {
    if (!this.device) throw new Error('WebGPU device not initialized');

    const uniformData = new Float32Array([
      params.batchSize,
      this.quantizationToFloat(params.quantization),
      this.config.dimensions,
      0 // padding
    ]);

    const buffer = this.device.createBuffer({
      label: 'uniform-buffer',
      size: uniformData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    this.device.queue.writeBuffer(buffer, 0, uniformData.buffer);
    return buffer;
  }

  private async readBufferResults(buffer: GPUBuffer, vectorCount: number): Promise<Float32Array[]> {
    if (!this.device) throw new Error('WebGPU device not initialized');

    const size = vectorCount * this.config.dimensions * 4;
    const readBuffer = this.device.createBuffer({
      size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    const commandEncoder = this.device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(buffer, 0, readBuffer, 0, size);
    this.device.queue.submit([commandEncoder.finish()]);

    await readBuffer.mapAsync(GPUMapMode.READ);
    const arrayBuffer = readBuffer.getMappedRange();
    const data = new Float32Array(arrayBuffer);

    const results: Float32Array[] = [];
    for (let i = 0; i < vectorCount; i++) {
      const start = i * this.config.dimensions;
      const end = start + this.config.dimensions;
      results.push(new Float32Array(data.slice(start, end)));
    }

    readBuffer.unmap();
    readBuffer.destroy();

    return results;
  }

  private determineOptimalQuantization(vectorCount: number): QuantizationLevel {
    const memoryPressure = this.calculateMemoryPressure(vectorCount);
    
    // Apply upscale-after-stability policy
    const shouldUpscale = this.shouldAttemptUpscale();
    const shouldMaintainDegradedMode = this.stabilityTracker.consecutiveFailures >= this.stabilityTracker.maxConsecutiveFailures;
    
    // If in degraded mode due to failures, maintain conservative quantization
    if (shouldMaintainDegradedMode) {
      this.stabilityTracker.currentPerformanceLevel = 'degraded';
      if (memoryPressure > 0.6) return 'binary';
      if (memoryPressure > 0.4) return 'int4';
      return 'int8';
    }
    
    // If stable and conditions allow, attempt to upscale performance
    if (shouldUpscale && memoryPressure < 0.6) {
      this.stabilityTracker.currentPerformanceLevel = 'optimal';
      this.stabilityTracker.lastUpscaleAttempt = Date.now();
      
      // Aggressive upscaling when stable
      if (memoryPressure < 0.3) return 'float32';
      if (memoryPressure < 0.5) return 'int8';
      return 'int4';
    }
    
    // Standard adaptive behavior
    this.stabilityTracker.currentPerformanceLevel = 'normal';
    if (memoryPressure > 0.8) return 'binary';
    if (memoryPressure > 0.6) return 'int4';
    if (memoryPressure > 0.4) return 'int8';
    return 'float32';
  }

  private calculateMemoryPressure(vectorCount: number): number {
    const requiredMemory = vectorCount * this.config.dimensions * 4; // bytes
    return requiredMemory / this.config.memoryBudget.total;
  }

  private calculateBatchMemoryUsage(vectors: Float32Array[]): number {
    return vectors.reduce((sum, v) => sum + v.byteLength, 0);
  }

  private calculateGpuUtilization(memoryUsed: number): number {
    return Math.min(100, (memoryUsed / this.config.memoryBudget.total) * 100);
  }

  private calculateCompressionRatio(quantization: QuantizationLevel): number {
    const compressionRatios = {
      'float32': 1.0,
      'int8': 0.25,
      'int4': 0.125,
      'binary': 0.03125
    };
    return compressionRatios[quantization];
  }

  private quantizationToFloat(quantization: QuantizationLevel): number {
    const mapping = { 'float32': 32, 'int8': 8, 'int4': 4, 'binary': 1 };
    return mapping[quantization];
  }
  
  /**
   * Determines if system should attempt performance upscaling
   */
  private shouldAttemptUpscale(): boolean {
    const now = Date.now();
    
    // Check if we're in backoff period after last upscale attempt
    const timeSinceLastUpscale = now - this.stabilityTracker.lastUpscaleAttempt;
    if (timeSinceLastUpscale < this.stabilityTracker.upscaleBackoffPeriod) {
      return false;
    }
    
    // Must have sufficient stable operations
    if (this.stabilityTracker.stableOperationsCount < this.stabilityTracker.minStableOperations) {
      return false;
    }
    
    // Must not have recent consecutive failures
    if (this.stabilityTracker.consecutiveFailures > 0) {
      return false;
    }
    
    // Check if we've been stable for the required duration
    const stabilityDuration = now - this.stabilityTracker.lastStabilityCheck;
    return stabilityDuration >= this.stabilityTracker.targetStabilityDuration;
  }
  
  /**
   * Track successful operation for stability monitoring
   */
  private trackOperationSuccess(processingTime: number, memoryUsed: number): void {
    const now = Date.now();
    
    // Reset consecutive failures on success
    this.stabilityTracker.consecutiveFailures = 0;
    
    // Increment stable operations count
    this.stabilityTracker.stableOperationsCount++;
    
    // Update last stability check timestamp
    if (this.stabilityTracker.lastStabilityCheck === 0) {
      this.stabilityTracker.lastStabilityCheck = now;
    }
    
    // Define success criteria (fast processing, low memory pressure)
    const isPerformant = processingTime < 100; // Under 100ms is good
    const isMemoryEfficient = (memoryUsed / this.config.memoryBudget.total) < 0.7; // Under 70% memory usage
    
    if (!isPerformant || !isMemoryEfficient) {
      // Reset stability counter if performance degrades
      this.resetStabilityTracking();
    }
  }
  
  /**
   * Track failed operation for stability monitoring
   */
  private trackOperationFailure(): void {
    this.stabilityTracker.consecutiveFailures++;
    this.resetStabilityTracking();
    
    // Emit failure telemetry
    telemetryBus.emitPerformanceEvent({
      type: 'stability_failure',
      duration: 0,
      operation: 'vector_processing_failure',
      success: false,
      metadata: {
        consecutiveFailures: this.stabilityTracker.consecutiveFailures,
        performanceLevel: this.stabilityTracker.currentPerformanceLevel
      }
    });
  }
  
  /**
   * Reset stability tracking counters
   */
  private resetStabilityTracking(): void {
    this.stabilityTracker.stableOperationsCount = 0;
    this.stabilityTracker.lastStabilityCheck = Date.now();
  }

  /**
   * Get performance statistics including stability metrics
   */
  getPerformanceStats() {
    return {
      cacheHitRate: this.totalOperations > 0 ? this.cacheHits / this.totalOperations : 0,
      totalOperations: this.totalOperations,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cachedPipelines: this.computePipelines.size,
      cachedShaderModules: this.shaderModules.size,
      stability: {
        currentPerformanceLevel: this.stabilityTracker.currentPerformanceLevel,
        stableOperationsCount: this.stabilityTracker.stableOperationsCount,
        consecutiveFailures: this.stabilityTracker.consecutiveFailures,
        timeSinceLastUpscale: Date.now() - this.stabilityTracker.lastUpscaleAttempt,
        canUpscale: this.shouldAttemptUpscale(),
        stabilityDuration: Date.now() - this.stabilityTracker.lastStabilityCheck
      }
    };
  }

  /**
   * Cleanup GPU resources
   */
  cleanup(): void {
    // Destroy compute pipelines
    this.computePipelines.clear();
    
    // Destroy shader modules  
    this.shaderModules.clear();
    
    // Destroy buffer pool
    for (const buffer of this.bufferPool.values()) {
      buffer.destroy();
    }
    this.bufferPool.clear();
    
    this.isInitialized = false;
    
    telemetryBus.emitPerformanceEvent({
      type: 'gpu_cleanup',
      duration: 0,
      operation: 'vector_processor_cleanup',
      success: true
    });
  }
}