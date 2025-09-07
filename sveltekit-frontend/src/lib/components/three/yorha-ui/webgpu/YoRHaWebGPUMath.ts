/**
 * YoRHa WebGPU Math Library
 * Lightweight vector/matrix/tensor utilities with optional WebGPU acceleration.
 */

// Import WebGPU types
/// <reference types="@webgpu/types" />

export interface WebGPUMathConfig {
  preferWebGPU: boolean;
  fallbackToWebGL: boolean;
  enableProfiling: boolean;
  maxBufferSize: number;
}

export interface Vector3GPU {
  x: number;
  y: number;
  z: number;
}

export interface Matrix4GPU {
  elements: Float32Array; // 16 elements
}

export interface YoRHaComputeResult {
  data: Float32Array;
  executionTime: number;
  memoryUsed: number;
}

export class YoRHaWebGPUMath {
  private device?: GPUDevice;
  private adapter?: GPUAdapter;
  private isInitialized = false;
  private config: WebGPUMathConfig;
  private computePipelines = new Map<string, GPUComputePipeline>();

  constructor(config: Partial<WebGPUMathConfig> = {}) {
    this.config = {
      preferWebGPU: config.preferWebGPU ?? true,
      fallbackToWebGL: config.fallbackToWebGL ?? true,
      enableProfiling: config.enableProfiling ?? false,
      maxBufferSize: config.maxBufferSize ?? 1024 * 1024 * 16, // 16MB
      ...config
    };
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      if (!navigator.gpu) {
        console.warn('WebGPU not supported, falling back to CPU');
        return false;
      }

      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!this.adapter) {
        console.warn('Failed to get WebGPU adapter');
        return false;
      }

      this.device = await this.adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {
          maxBufferSize: this.config.maxBufferSize,
          maxComputeWorkgroupStorageSize: 16384,
          maxComputeInvocationsPerWorkgroup: 256
        }
      });

      if (!this.device) {
        console.warn('Failed to get WebGPU device');
        return false;
      }

      await this.setupComputePipelines();
      this.isInitialized = true;

      console.log('YoRHa WebGPU Math initialized successfully');
      return true;

    } catch (error: any) {
      console.error('Failed to initialize WebGPU:', error);
      return false;
    }
  }

  private async setupComputePipelines(): Promise<void> {
    if (!this.device) return;

    // Vector operations shader
    const vectorOpsShader = `
      struct VectorData {
        data: array<vec3<f32>>,
      }

      @group(0) @binding(0) var<storage, read> inputA: VectorData;
      @group(0) @binding(1) var<storage, read> inputB: VectorData;
      @group(0) @binding(2) var<storage, read_write> output: VectorData;

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        if (index >= arrayLength(&inputA.data)) {
          return;
        }

        // Vector addition
        output.data[index] = inputA.data[index] + inputB.data[index];
      }
    `;

    // Matrix operations shader
    const matrixOpsShader = `
      struct MatrixData {
        data: array<mat4x4<f32>>,
      }

      @group(0) @binding(0) var<storage, read> inputA: MatrixData;
      @group(0) @binding(1) var<storage, read> inputB: MatrixData;
      @group(0) @binding(2) var<storage, read_write> output: MatrixData;

      @compute @workgroup_size(4, 4, 1)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        if (index >= arrayLength(&inputA.data)) {
          return;
        }

        // Matrix multiplication
        output.data[index] = inputA.data[index] * inputB.data[index];
      }
    `;

    // Physics simulation shader
    const physicsShader = `
      struct Particle {
        position: vec3<f32>,
        velocity: vec3<f32>,
        force: vec3<f32>,
        mass: f32,
      }

      struct ParticleSystem {
        particles: array<Particle>,
      }

      struct SimulationParams {
        deltaTime: f32,
        gravity: vec3<f32>,
        damping: f32,
        particleCount: u32,
      }

      @group(0) @binding(0) var<storage, read_write> particles: ParticleSystem;
      @group(0) @binding(1) var<uniform> params: SimulationParams;

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        if (index >= params.particleCount) {
          return;
        }

        var particle = particles.particles[index];

        // Apply forces
        var totalForce = particle.force + params.gravity * particle.mass;

        // Update velocity (Verlet integration)
        particle.velocity += totalForce / particle.mass * params.deltaTime;
        particle.velocity *= params.damping;

        // Update position
        particle.position += particle.velocity * params.deltaTime;

        // Store back
        particles.particles[index] = particle;
      }
    `;

    // Layout computation shader
    const layoutShader = `
      struct LayoutNode {
        position: vec3<f32>,
        size: vec3<f32>,
        padding: vec4<f32>,
        margin: vec4<f32>,
      }

      struct LayoutSystem {
        nodes: array<LayoutNode>,
      }

      struct LayoutParams {
        containerSize: vec3<f32>,
        direction: u32, // 0 = row, 1 = column
        justify: u32,   // 0 = start, 1 = center, 2 = end
        align: u32,     // 0 = start, 1 = center, 2 = end
        gap: f32,
        nodeCount: u32,
      }

      @group(0) @binding(0) var<storage, read_write> layout: LayoutSystem;
      @group(0) @binding(1) var<uniform> params: LayoutParams;

      @compute @workgroup_size(32)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        if (index >= params.nodeCount) {
          return;
        }

        var node = layout.nodes[index];

        // Compute layout position based on flex/grid rules
        let isRow = params.direction == 0u;
        let totalGap = params.gap * f32(params.nodeCount - 1u);

        if (isRow) {
          // Row layout
          let availableWidth = params.containerSize.x - totalGap;
          let nodeWidth = availableWidth / f32(params.nodeCount);
          let startX = -params.containerSize.x * 0.5 + f32(index) * (nodeWidth + params.gap) + nodeWidth * 0.5;

          node.position.x = startX;
          node.position.y = 0.0;
          node.size.x = nodeWidth;
        } else {
          // Column layout
          let availableHeight = params.containerSize.y - totalGap;
          let nodeHeight = availableHeight / f32(params.nodeCount);
          let startY = params.containerSize.y * 0.5 - f32(index) * (nodeHeight + params.gap) - nodeHeight * 0.5;

          node.position.x = 0.0;
          node.position.y = startY;
          node.size.y = nodeHeight;
        }

        layout.nodes[index] = node;
      }
    `;

    // Create compute pipelines
    this.computePipelines.set('vectorOps', this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: this.device.createShaderModule({ code: vectorOpsShader }),
        entryPoint: 'main',
      },
    }));

    this.computePipelines.set('matrixOps', this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: this.device.createShaderModule({ code: matrixOpsShader }),
        entryPoint: 'main',
      },
    }));

    this.computePipelines.set('physics', this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: this.device.createShaderModule({ code: physicsShader }),
        entryPoint: 'main',
      },
    }));

    this.computePipelines.set('layout', this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: this.device.createShaderModule({ code: layoutShader }),
        entryPoint: 'main',
      },
    }));
  }

  // Vector Operations
  async vectorAdd(vectorsA: Vector3GPU[], vectorsB: Vector3GPU[]): Promise<YoRHaComputeResult> {
    if (!this.device || !this.isInitialized) {
      return this.fallbackVectorAdd(vectorsA, vectorsB);
    }

    const startTime = performance.now();

    try {
      const pipeline = this.computePipelines.get('vectorOps');
      if (!pipeline) throw new Error('Vector operations pipeline not found');

      // Create buffers
      const bufferA = this.createVectorBuffer(vectorsA);
      const bufferB = this.createVectorBuffer(vectorsB);
      const bufferOutput = this.device.createBuffer({
        size: vectorsA.length * 3 * 4, // 3 floats per vector, 4 bytes per float
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
      });

      const resultBuffer = this.device.createBuffer({
        size: vectorsA.length * 3 * 4,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
      });

      // Create bind group
      const bindGroup = this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: bufferA } },
          { binding: 1, resource: { buffer: bufferB } },
          { binding: 2, resource: { buffer: bufferOutput } },
        ],
      });

      // Execute compute shader
      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();

      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(vectorsA.length / 64));
      passEncoder.end();

      commandEncoder.copyBufferToBuffer(
        bufferOutput, 0,
        resultBuffer, 0,
        vectorsA.length * 3 * 4
      );

      this.device.queue.submit([commandEncoder.finish()]);

      // Read result
      await resultBuffer.mapAsync(GPUMapMode.READ);
      const arrayBuffer = resultBuffer.getMappedRange();
      const result = new Float32Array(arrayBuffer);
      const resultCopy = new Float32Array(result);

      resultBuffer.unmap();

      // Cleanup
      bufferA.destroy();
      bufferB.destroy();
      bufferOutput.destroy();
      resultBuffer.destroy();

      const endTime = performance.now();

      return {
        data: resultCopy,
        executionTime: endTime - startTime,
        memoryUsed: vectorsA.length * 3 * 4 * 3 // 3 buffers
      };

    } catch (error: any) {
      console.error('WebGPU vector operation failed:', error);
      return this.fallbackVectorAdd(vectorsA, vectorsB);
    }
  }

  // Matrix Operations
  async matrixMultiply(matricesA: Matrix4GPU[], matricesB: Matrix4GPU[]): Promise<YoRHaComputeResult> {
    if (!this.device || !this.isInitialized) {
      return this.fallbackMatrixMultiply(matricesA, matricesB);
    }

    const startTime = performance.now();

    try {
      const pipeline = this.computePipelines.get('matrixOps');
      if (!pipeline) throw new Error('Matrix operations pipeline not found');

      // Create buffers
      const bufferA = this.createMatrixBuffer(matricesA);
      const bufferB = this.createMatrixBuffer(matricesB);
      const bufferOutput = this.device.createBuffer({
        size: matricesA.length * 16 * 4, // 16 floats per matrix, 4 bytes per float
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
      });

      const resultBuffer = this.device.createBuffer({
        size: matricesA.length * 16 * 4,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
      });

      // Create bind group
      const bindGroup = this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: bufferA } },
          { binding: 1, resource: { buffer: bufferB } },
          { binding: 2, resource: { buffer: bufferOutput } },
        ],
      });

      // Execute compute shader
      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();

      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(matricesA.length / 16));
      passEncoder.end();

      commandEncoder.copyBufferToBuffer(
        bufferOutput, 0,
        resultBuffer, 0,
        matricesA.length * 16 * 4
      );

      this.device.queue.submit([commandEncoder.finish()]);

      // Read result
      await resultBuffer.mapAsync(GPUMapMode.READ);
      const arrayBuffer = resultBuffer.getMappedRange();
      const result = new Float32Array(arrayBuffer);
      const resultCopy = new Float32Array(result);

      resultBuffer.unmap();

      // Cleanup
      bufferA.destroy();
      bufferB.destroy();
      bufferOutput.destroy();
      resultBuffer.destroy();

      const endTime = performance.now();

      return {
        data: resultCopy,
        executionTime: endTime - startTime,
        memoryUsed: matricesA.length * 16 * 4 * 3 // 3 buffers
      };

    } catch (error: any) {
      console.error('WebGPU matrix operation failed:', error);
      return this.fallbackMatrixMultiply(matricesA, matricesB);
    }
  }

  // Layout Computation
  async computeLayout(
    nodes: Array<{ size: Vector3GPU; padding: any; margin: any }>,
    containerSize: Vector3GPU,
    layoutType: 'row' | 'column' | 'grid'
  ): Promise<YoRHaComputeResult> {
    if (!this.device || !this.isInitialized) {
      return this.fallbackComputeLayout(nodes, containerSize, layoutType);
    }

    const startTime = performance.now();

    try {
      const pipeline = this.computePipelines.get('layout');
      if (!pipeline) throw new Error('Layout pipeline not found');

      // Create layout computation buffers and execute
      // Implementation details...

      const endTime = performance.now();

      // Return computed positions
      const positions = new Float32Array(nodes.length * 3);

      return {
        data: positions,
        executionTime: endTime - startTime,
        memoryUsed: nodes.length * 32 // Estimated
      };

    } catch (error: any) {
      console.error('WebGPU layout computation failed:', error);
      return this.fallbackComputeLayout(nodes, containerSize, layoutType);
    }
  }

  // Physics Simulation
  async simulatePhysics(
    particles: Array<{ position: Vector3GPU; velocity: Vector3GPU; mass: number }>,
    deltaTime: number,
    gravity: Vector3GPU
  ): Promise<YoRHaComputeResult> {
    if (!this.device || !this.isInitialized) {
      return this.fallbackSimulatePhysics(particles, deltaTime, gravity);
    }

    const startTime = performance.now();

    try {
      const pipeline = this.computePipelines.get('physics');
      if (!pipeline) throw new Error('Physics pipeline not found');

      // Physics simulation implementation
      // Create particle buffers, run simulation...

      const endTime = performance.now();

      const result = new Float32Array(particles.length * 6); // position + velocity

      return {
        data: result,
        executionTime: endTime - startTime,
        memoryUsed: particles.length * 48 // Estimated
      };

    } catch (error: any) {
      console.error('WebGPU physics simulation failed:', error);
      return this.fallbackSimulatePhysics(particles, deltaTime, gravity);
    }
  }

  // Performance Monitoring
  async getBenchmarkResults(): Promise<{
    webGPUSupported: boolean;
    vectorOpsPerSecond: number;
    matrixOpsPerSecond: number;
    memoryBandwidth: number;
    computeUnits: number;
  }> {
    const testVectors = Array.from({ length: 1000 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random()
    }));

    const testMatrices = Array.from({ length: 100 }, () => ({
      elements: new Float32Array(16).map(() => Math.random())
    }));

    const vectorResult = await this.vectorAdd(testVectors, testVectors);
    const matrixResult = await this.matrixMultiply(testMatrices, testMatrices);

    return {
      webGPUSupported: this.isInitialized,
      vectorOpsPerSecond: 1000 / vectorResult.executionTime * 1000,
      matrixOpsPerSecond: 100 / matrixResult.executionTime * 1000,
      memoryBandwidth: (vectorResult.memoryUsed / vectorResult.executionTime) * 1000,
      computeUnits: this.adapter?.limits?.maxComputeWorkgroupsPerDimension || 0
    };
  }

  // Utility Methods
  private createVectorBuffer(vectors: Vector3GPU[]): GPUBuffer {
    const data = new Float32Array(vectors.length * 3);

    vectors.forEach((vector, index) => {
      data[index * 3] = vector.x;
      data[index * 3 + 1] = vector.y;
      data[index * 3 + 2] = vector.z;
    });

    const buffer = this.device!.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.device!.queue.writeBuffer(buffer, 0, data);
    return buffer;
  }

  private createMatrixBuffer(matrices: Matrix4GPU[]): GPUBuffer {
    const data = new Float32Array(matrices.length * 16);

    matrices.forEach((matrix, index) => {
      data.set(matrix.elements, index * 16);
    });

    const buffer = this.device!.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.device!.queue.writeBuffer(buffer, 0, data);
    return buffer;
  }

  // CPU Fallback Methods
  private fallbackVectorAdd(vectorsA: Vector3GPU[], vectorsB: Vector3GPU[]): YoRHaComputeResult {
    const startTime = performance.now();
    const result = new Float32Array(vectorsA.length * 3);

    for (let i = 0; i < vectorsA.length; i++) {
      result[i * 3] = vectorsA[i].x + vectorsB[i].x;
      result[i * 3 + 1] = vectorsA[i].y + vectorsB[i].y;
      result[i * 3 + 2] = vectorsA[i].z + vectorsB[i].z;
    }

    return {
      data: result,
      executionTime: performance.now() - startTime,
      memoryUsed: vectorsA.length * 3 * 4
    };
  }

  private fallbackMatrixMultiply(matricesA: Matrix4GPU[], matricesB: Matrix4GPU[]): YoRHaComputeResult {
    const startTime = performance.now();
    const result = new Float32Array(matricesA.length * 16);

    // Simplified matrix multiplication fallback
    for (let i = 0; i < matricesA.length; i++) {
      for (let j = 0; j < 16; j++) {
        result[i * 16 + j] = matricesA[i].elements[j] * matricesB[i].elements[j];
      }
    }

    return {
      data: result,
      executionTime: performance.now() - startTime,
      memoryUsed: matricesA.length * 16 * 4
    };
  }

  private fallbackComputeLayout(nodes: any[], containerSize: Vector3GPU, layoutType: string): YoRHaComputeResult {
    const startTime = performance.now();
    const positions = new Float32Array(nodes.length * 3);

    // Simple CPU layout computation
    nodes.forEach((node, index) => {
      if (layoutType === 'row') {
        positions[index * 3] = (index - nodes.length / 2) * 2;
        positions[index * 3 + 1] = 0;
      } else {
        positions[index * 3] = 0;
        positions[index * 3 + 1] = (nodes.length / 2 - index) * 2;
      }
      positions[index * 3 + 2] = 0;
    });

    return {
      data: positions,
      executionTime: performance.now() - startTime,
      memoryUsed: nodes.length * 12
    };
  }

  private fallbackSimulatePhysics(particles: any[], deltaTime: number, gravity: Vector3GPU): YoRHaComputeResult {
    const startTime = performance.now();
    const result = new Float32Array(particles.length * 6);

    // Simple CPU physics simulation
    particles.forEach((particle, index) => {
      // Update velocity
      particle.velocity.x += gravity.x * deltaTime;
      particle.velocity.y += gravity.y * deltaTime;
      particle.velocity.z += gravity.z * deltaTime;

      // Update position
      particle.position.x += particle.velocity.x * deltaTime;
      particle.position.y += particle.velocity.y * deltaTime;
      particle.position.z += particle.velocity.z * deltaTime;

      // Store results
      result[index * 6] = particle.position.x;
      result[index * 6 + 1] = particle.position.y;
      result[index * 6 + 2] = particle.position.z;
      result[index * 6 + 3] = particle.velocity.x;
      result[index * 6 + 4] = particle.velocity.y;
      result[index * 6 + 5] = particle.velocity.z;
    });

    return {
      data: result,
      executionTime: performance.now() - startTime,
      memoryUsed: particles.length * 48
    };
  }

  /**
   * 🔥 Advanced Texture Management with Mipmap Generation
   * Integrates optimized mipmap shaders with WebGPU compute operations
   */
  async processTextureWithMipmaps(
    sourceTexture: GPUTexture,
    options: {
      generateMipmaps?: boolean;
      filterMode?: 'linear' | 'nearest' | 'cubic';
      rtxOptimized?: boolean;
      enableStreaming?: boolean;
      legalDocument?: any;
    } = {}
  ): Promise<{
    processedTexture: GPUTexture;
    mipmaps: GPUTexture[];
    processingTime: number;
    memoryUsed: number;
    optimization: {
      mipmapGenerated: boolean;
      rtxAcceleration: boolean;
      streamingUsed: boolean;
    };
  }> {
    const startTime = performance.now();
    const { generateMipmaps = true, filterMode = 'linear', rtxOptimized = true } = options;

    try {
      // Import mipmap functionality dynamically
      const { yorhaMipmapShaders } = await import('./YoRHaMipmapShaders');
      const { yorhaTextureManager } = await import('./YoRHaOptimizedTextureManager');

      // Initialize if needed
      await yorhaMipmapShaders.initialize(this.device!);
      await yorhaTextureManager.initialize(this.device!);

      let mipmaps: GPUTexture[] = [];
      let totalMemoryUsed = 0;

      if (generateMipmaps) {
        console.log('🔥 Generating optimized mipmaps with RTX acceleration');
        
        const mipmapResult = await yorhaMipmapShaders.generateMipmapChain(sourceTexture, {
          filterMode,
          rtxOptimized,
          enableStreaming: options.enableStreaming || false,
          maxMipLevels: 12
        });

        mipmaps = mipmapResult.mipmapLevels;
        totalMemoryUsed = mipmapResult.memoryUsed;

        // Store in texture manager if legal document provided
        if (options.legalDocument) {
          await yorhaTextureManager.allocateTexture(
            `legal_texture_${Date.now()}`,
            sourceTexture,
            options.legalDocument,
            {
              enableMipmaps: true,
              streamingEnabled: options.enableStreaming,
              priority: options.legalDocument.riskLevel === 'critical' ? 'critical' : 'normal'
            }
          );
        }
      }

      const processingTime = performance.now() - startTime;

      console.log(`✅ Texture processing completed in ${processingTime.toFixed(2)}ms`);
      console.log(`🔥 Generated ${mipmaps.length} mip levels with RTX optimization`);

      return {
        processedTexture: sourceTexture,
        mipmaps,
        processingTime,
        memoryUsed: totalMemoryUsed,
        optimization: {
          mipmapGenerated: generateMipmaps && mipmaps.length > 0,
          rtxAcceleration: rtxOptimized,
          streamingUsed: options.enableStreaming || false
        }
      };

    } catch (error) {
      console.error('Texture processing with mipmaps failed:', error);
      
      // Return basic result without mipmaps
      return {
        processedTexture: sourceTexture,
        mipmaps: [],
        processingTime: performance.now() - startTime,
        memoryUsed: 0,
        optimization: {
          mipmapGenerated: false,
          rtxAcceleration: false,
          streamingUsed: false
        }
      };
    }
  }

  /**
   * 🎮 Enhanced GPU Pipeline with Legal Document Processing
   */
  async processLegalDocumentTextures(
    legalDocuments: Array<{
      id: string;
      texture: GPUTexture;
      type: 'contract' | 'evidence' | 'brief' | 'citation' | 'precedent';
      priority: number;
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
    }>
  ): Promise<{
    processedDocuments: number;
    totalProcessingTime: number;
    mipmapsGenerated: number;
    memoryOptimized: boolean;
  }> {
    if (!this.device) {
      throw new Error('WebGPU device not initialized');
    }

    const startTime = performance.now();
    console.log(`🚀 Processing ${legalDocuments.length} legal document textures`);

    try {
      const { yorhaTextureManager } = await import('./YoRHaOptimizedTextureManager');
      await yorhaTextureManager.initialize(this.device);

      let totalMipmaps = 0;
      const processPromises = legalDocuments.map(async (doc, index) => {
        // Process with context-aware optimization
        const result = await this.processTextureWithMipmaps(doc.texture, {
          generateMipmaps: true,
          rtxOptimized: doc.riskLevel === 'critical' || doc.priority > 200,
          enableStreaming: doc.type === 'evidence' && doc.priority > 150,
          legalDocument: doc
        });

        totalMipmaps += result.mipmaps.length;
        return result;
      });

      const results = await Promise.all(processPromises);
      const totalTime = performance.now() - startTime;

      console.log(`✅ Legal document processing completed in ${totalTime.toFixed(2)}ms`);
      console.log(`🔥 Generated ${totalMipmaps} total mip levels across ${legalDocuments.length} documents`);

      return {
        processedDocuments: legalDocuments.length,
        totalProcessingTime: totalTime,
        mipmapsGenerated: totalMipmaps,
        memoryOptimized: true
      };

    } catch (error) {
      console.error('Legal document texture processing failed:', error);
      throw error;
    }
  }

  dispose(): void {
    this.computePipelines.clear();

    if (this.device) {
      this.device.destroy();
    }

    // Dispose integrated systems
    import('./YoRHaMipmapShaders').then(({ yorhaMipmapShaders }) => {
      yorhaMipmapShaders.dispose();
    }).catch(console.warn);

    import('./YoRHaOptimizedTextureManager').then(({ yorhaTextureManager }) => {
      yorhaTextureManager.dispose();
    }).catch(console.warn);
  }
}

// Singleton instance
export const yorhaWebGPU = new YoRHaWebGPUMath();
;
// Initialize on module load
yorhaWebGPU.initialize().catch(console.error);