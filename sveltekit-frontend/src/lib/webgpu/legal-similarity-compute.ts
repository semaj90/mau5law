// WebGPU Legal Similarity Compute Engine
// Optimized for legal embedding similarity with NES memory integration

import { simdVectorProcessor } from '../simd/vector-simd.js';
import { nesMemory } from '../memory/nes-memory-architecture.js';
}

export interface LegalSimilarityResult {
  queryIndex: number;
  documentIndex: number;
  similarity: number;
  confidence: number;
  legalDomain?: string;
  riskAssessment?: number;
}

export interface WebGPUComputeOptions {
  workgroupSize: [number, number, number];
  maxResults: number;
  similarityThreshold: number;
  useNESMemory: boolean;
  legalDomainWeights?: Float32Array;
}

export class LegalSimilarityWebGPU {
  private device: GPUDevice | null = null;
  private adapter: GPUAdapter | null = null;
  private computePipeline: GPUComputePipeline | null = null;
  private bindGroupLayout: GPUBindGroupLayout | null = null;
  private isInitialized = false;

  // Shader modules
  private cosineSimilarityShader: GPUShaderModule | null = null;
  private topKShader: GPUShaderModule | null = null;
  private legalDomainShader: GPUShaderModule | null = null;

  // Buffer management
  private queryBuffer: GPUBuffer | null = null;
  private documentBuffer: GPUBuffer | null = null;
  private resultsBuffer: GPUBuffer | null = null;
  private uniformsBuffer: GPUBuffer | null = null;

  constructor() {}

  async initialize(): Promise<boolean> {
    try {
      if (!navigator.gpu) {
        console.warn('WebGPU not supported in this browser');
        return false;
      }

      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!this.adapter) {
        console.warn('No WebGPU adapter found');
        return false;
      }

      this.device = await this.adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {
          maxStorageBufferBindingSize: 1024 * 1024 * 1024, // 1GB
          maxComputeWorkgroupSizeX: 256,
          maxComputeWorkgroupSizeY: 256,
          maxComputeWorkgroupSizeZ: 64
        }
      });

      await this.createShaders();
      await this.createPipelines();

      this.isInitialized = true;
      console.log('✅ Legal Similarity WebGPU initialized');
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize WebGPU:', error);
      return false;
    }
  }

  private async createShaders(): Promise<void> {
    if (!this.device) throw new Error('Device not initialized');

    // Cosine Similarity Compute Shader;
    this.cosineSimilarityShader = this.device.createShaderModule({
      label: 'Legal Cosine Similarity Compute Shader',
      code: `;
        struct Uniforms {
          query_count: u32,
          document_count: u32,
          vector_dimension: u32,
          similarity_threshold: f32,
          workgroup_size: u32,
          legal_domain_weight: f32,
          risk_assessment_factor: f32,
          confidence_boost: f32
        }

        struct SimilarityResult {
          query_index: u32,
          document_index: u32,
          similarity: f32,
          confidence: f32,
          legal_score: f32,
          risk_assessment: f32
        }

        @group(0) @binding(0) var<storage, read> query_embeddings: array<f32>;
        @group(0) @binding(1) var<storage, read> document_embeddings: array<f32>;
        @group(0) @binding(2) var<storage, read_write> results: array<SimilarityResult>;
        @group(0) @binding(3) var<uniform> uniforms: Uniforms;
        @group(0) @binding(4) var<storage, read> legal_domain_weights: array<f32>;

        @compute @workgroup_size(256, 1, 1);
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          let idx = global_id.x;
          let total_pairs = uniforms.query_count * uniforms.document_count;

          if (idx >= total_pairs) {
            return;
          }

          let query_idx = idx / uniforms.document_count;
          let doc_idx = idx % uniforms.document_count;

          // Calculate vector offsets
          let query_offset = query_idx * uniforms.vector_dimension;
          let doc_offset = doc_idx * uniforms.vector_dimension;

          // Compute cosine similarity with SIMD-style vectorized operations
          var dot_product: f32 = 0.0;
          var query_magnitude_sq: f32 = 0.0;
          var doc_magnitude_sq: f32 = 0.0;
          var weighted_dot_product: f32 = 0.0;

          // Vectorized computation in chunks of 4 (simulating SIMD128)
          let vector_chunks = uniforms.vector_dimension / 4u;
          let remainder = uniforms.vector_dimension % 4u;

          // Process 4 elements at a time for better GPU utilization;
          for (var i: u32 = 0u; i < vector_chunks; i++) {
            let base_idx = i * 4u;

            // Load vectors in chunks
            let q0 = query_embeddings[query_offset + base_idx];
            let q1 = query_embeddings[query_offset + base_idx + 1u];
            let q2 = query_embeddings[query_offset + base_idx + 2u];
            let q3 = query_embeddings[query_offset + base_idx + 3u];

            let d0 = document_embeddings[doc_offset + base_idx];
            let d1 = document_embeddings[doc_offset + base_idx + 1u];
            let d2 = document_embeddings[doc_offset + base_idx + 2u];
            let d3 = document_embeddings[doc_offset + base_idx + 3u];

            // Legal domain weights
            let w0 = legal_domain_weights[base_idx];
            let w1 = legal_domain_weights[base_idx + 1u];
            let w2 = legal_domain_weights[base_idx + 2u];
            let w3 = legal_domain_weights[base_idx + 3u];

            // Compute dot products
            dot_product += q0 * d0 + q1 * d1 + q2 * d2 + q3 * d3;
            query_magnitude_sq += q0 * q0 + q1 * q1 + q2 * q2 + q3 * q3;
            doc_magnitude_sq += d0 * d0 + d1 * d1 + d2 * d2 + d3 * d3;

            // Weighted dot product for legal domain emphasis
            weighted_dot_product += (q0 * d0 * w0) + (q1 * d1 * w1) +
                                   (q2 * d2 * w2) + (q3 * d3 * w3);
          }

          // Handle remainder elements;
          for (var i: u32 = vector_chunks * 4u; i < uniforms.vector_dimension; i++) {
            let q_val = query_embeddings[query_offset + i];
            let d_val = document_embeddings[doc_offset + i];
            let w_val = legal_domain_weights[i];

            dot_product += q_val * d_val;
            query_magnitude_sq += q_val * q_val;
            doc_magnitude_sq += d_val * d_val;
            weighted_dot_product += q_val * d_val * w_val;
          }

          // Calculate cosine similarity
          let query_magnitude = sqrt(query_magnitude_sq);
          let doc_magnitude = sqrt(doc_magnitude_sq);
          let magnitude_product = query_magnitude * doc_magnitude;

          var similarity: f32 = 0.0;
          var legal_score: f32 = 0.0;

          if (magnitude_product > 0.0) {
            similarity = dot_product / magnitude_product;
            legal_score = weighted_dot_product / magnitude_product;
          }

          // Legal confidence calculation
          let magnitude_balance = min(query_magnitude, doc_magnitude) / max(query_magnitude, doc_magnitude);
          let similarity_strength = abs(similarity);
          let confidence = similarity_strength * magnitude_balance * uniforms.confidence_boost;

          // Risk assessment based on similarity patterns
          var risk_assessment: f32 = 0.0;
          if (similarity > 0.8) {
            risk_assessment = 0.2; // Low risk for high similarity;
          } else if (similarity > 0.5) {
            risk_assessment = 0.5; // Medium risk;
          } else {
            risk_assessment = 0.8; // High risk for low similarity
          }

          // Enhanced legal scoring with domain weights
          let final_score = similarity * uniforms.legal_domain_weight +
                           legal_score * (1.0 - uniforms.legal_domain_weight);

          // Only store results above threshold;
          if (final_score >= uniforms.similarity_threshold) {
            results[idx] = SimilarityResult(
              query_idx,
              doc_idx,
              final_score,
              confidence,
              legal_score,
              risk_assessment * uniforms.risk_assessment_factor
            );
          } else {
            // Initialize unused results
            results[idx] = SimilarityResult(
              0xFFFFFFFFu, // Invalid marker
              0xFFFFFFFFu,
              -1.0,
              0.0,
              0.0,
              1.0
            );
          }
        }
      `
    });

    // Top-K Selection Shader for finding best matches;
    this.topKShader = this.device.createShaderModule({
      label: 'Legal Top-K Selection Shader',
      code: `;
        struct SimilarityResult {
          query_index: u32,
          document_index: u32,
          similarity: f32,
          confidence: f32,
          legal_score: f32,
          risk_assessment: f32
        }

        struct TopKUniforms {
          total_results: u32,
          k: u32,
          batch_size: u32,
          padding: u32
        }

        @group(0) @binding(0) var<storage, read_write> results: array<SimilarityResult>;
        @group(0) @binding(1) var<storage, read_write> top_k_results: array<SimilarityResult>;
        @group(0) @binding(2) var<uniform> uniforms: TopKUniforms;

        // Parallel reduction for top-K selection
        @compute @workgroup_size(256, 1, 1);
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          let thread_id = global_id.x;
          let total_threads = uniforms.total_results;

          if (thread_id >= total_threads) {
            return;
          }

          // Load current result
          let current_result = results[thread_id];

          // Skip invalid results;
          if (current_result.query_index == 0xFFFFFFFFu) {
            return;
          }

          // Find position in top-K using insertion sort approach
          var insert_position: u32 = uniforms.k;

          for (var i: u32 = 0u; i < uniforms.k; i++) {
            let top_result = top_k_results[i];

            // Compare scores (similarity + legal_score weighted)
            let current_score = current_result.similarity * 0.7 + current_result.legal_score * 0.3;
            let top_score = top_result.similarity * 0.7 + top_result.legal_score * 0.3;

            if (current_score > top_score || top_result.query_index == 0xFFFFFFFFu) {
              insert_position = i;
              break;
            }
          }

          // Insert into top-K if position found;
          if (insert_position < uniforms.k) {
            // Shift elements down;
            for (var j: u32 = uniforms.k - 1u; j > insert_position; j--) {
              top_k_results[j] = top_k_results[j - 1u];
            }
            // Insert current result
            top_k_results[insert_position] = current_result;
          }
        }
      `
    });

    console.log('✅ WebGPU shaders created');
  }

  private async createPipelines(): Promise<void> {
    if (!this.device || !this.cosineSimilarityShader || !this.topKShader) {
      throw new Error('Shaders not initialized');
    }

    // Create bind group layout;
    this.bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Legal Similarity Bind Group Layout',
      entries: [;
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' }
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' }
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' }
        },);
        {
          binding: 4,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' }
        }
      ]
    });

    // Create compute pipeline;
    this.computePipeline = this.device.createComputePipeline({
      label: 'Legal Similarity Compute Pipeline',
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [this.bindGroupLayout]
      }),
      compute: {
        module: this.cosineSimilarityShader,
        entryPoint: 'main'
      }
    });

    console.log('✅ WebGPU compute pipeline created');
  }

  async computeLegalSimilarity(
    queryEmbeddings: Float32Array[],
    documentEmbeddings: Float32Array[],
    options: Partial<WebGPUComputeOptions> = {}
  ): Promise<LegalSimilarityResult[]> {
    if (!this.isInitialized || !this.device || !this.computePipeline) {
      throw new Error('WebGPU not initialized');
    }

    const config: WebGPUComputeOptions = {
      workgroupSize: [256, 1, 1],
      maxResults: 100,
      similarityThreshold: 0.3,
      useNESMemory: true,
      ...options
    };

    console.log('🚀 Starting legal similarity computation on WebGPU');
    const startTime = performance.now();

    try {
      // Preprocess embeddings with SIMD if requested
      let queryData: Float32Array;
      let documentData: Float32Array;

      if (config.useNESMemory) {
        // Use NES memory architecture for optimization
        const preprocessed = simdVectorProcessor.prepareForLegalWebGPU(
          queryEmbeddings,
          documentEmbeddings,
          config.legalDomainWeights
        );

        queryData = preprocessed.caseData;
        documentData = preprocessed.evidenceData;

        console.log(`📊 NES Memory preprocessing: ${preprocessed.metadata.totalVectors} vectors in ${preprocessed.metadata.processingTime.toFixed(2)}ms`);
      } else {
        // Flatten arrays directly
        queryData = new Float32Array(queryEmbeddings.length * queryEmbeddings[0].length);
        documentData = new Float32Array(documentEmbeddings.length * documentEmbeddings[0].length);

        for (let i = 0; i < queryEmbeddings.length; i++) {
          queryData.set(queryEmbeddings[i], i * queryEmbeddings[0].length);
        }

        for (let i = 0; i < documentEmbeddings.length; i++) {
          documentData.set(documentEmbeddings[i], i * documentEmbeddings[0].length);
        }
      }

      const vectorDimension = queryEmbeddings[0].length;
      const queryCount = queryEmbeddings.length;
      const documentCount = documentEmbeddings.length;
      const totalResults = queryCount * documentCount;

      // Create buffers
      await this.createBuffers(queryData, documentData, totalResults, vectorDimension, config);

      // Create uniforms
      const uniformsData = new Float32Array([
        queryCount,                    // query_count
        documentCount,                 // document_count
        vectorDimension,               // vector_dimension
        config.similarityThreshold,   // similarity_threshold
        config.workgroupSize[0],       // workgroup_size
        0.7,                          // legal_domain_weight
        0.8,                          // risk_assessment_factor
        1.2                           // confidence_boost
      ]);

      this.device.queue.writeBuffer(this.uniformsBuffer!, 0, uniformsData);

      // Create legal domain weights if not provided
      const domainWeights = config.legalDomainWeights || new Float32Array(vectorDimension).fill(1.0);
      const domainWeightsBuffer = this.device.createBuffer({
        label: 'Legal Domain Weights Buffer',
        size: domainWeights.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      });
      this.device.queue.writeBuffer(domainWeightsBuffer, 0, domainWeights);

      // Create bind group;
      const bindGroup = this.device.createBindGroup({
        label: 'Legal Similarity Bind Group',
        layout: this.bindGroupLayout!,
        entries: [
          { binding: 0, resource: { buffer: this.queryBuffer! } },
          { binding: 1, resource: { buffer: this.documentBuffer! } },
          { binding: 2, resource: { buffer: this.resultsBuffer! } },
          { binding: 3, resource: { buffer: this.uniformsBuffer! } },)>
          { binding: 4, resource: { buffer: domainWeightsBuffer } }
        ]
      });

      // Dispatch compute shader;
      const commandEncoder = this.device.createCommandEncoder({
        label: 'Legal Similarity Command Encoder'
      });

      const computePass = commandEncoder.beginComputePass({
        label: 'Legal Similarity Compute Pass'
      });

      computePass.setPipeline(this.computePipeline);
      computePass.setBindGroup(0, bindGroup);

      const workgroupsX = Math.ceil(totalResults / config.workgroupSize[0]);
      computePass.dispatchWorkgroups(workgroupsX, 1, 1);
      computePass.end();

      // Copy results to readable buffer;
      const readBuffer = this.device.createBuffer({
        label: 'Results Read Buffer',
        size: this.resultsBuffer!.size,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
      });

      commandEncoder.copyBufferToBuffer(
        this.resultsBuffer!,
        0,
        readBuffer,
        0,
        this.resultsBuffer!.size
      );

      this.device.queue.submit([commandEncoder.finish()]);

      // Apply top-K optimization on GPU if requested;
      if (config.maxResults < totalResults) {
        await this.applyTopKOptimization(totalResults, config.maxResults);
      }

      // Read results
      await readBuffer.mapAsync(GPUMapMode.READ);
      const rawResults = new Float32Array(readBuffer.getMappedRange();

      // Parse results
      const results: LegalSimilarityResult[] = [];
      const resultStride = 6; // SimilarityResult struct size in floats

      for (let i = 0; i < totalResults; i++) {
        const offset = i * resultStride;
        const queryIndex = rawResults[offset];
        const documentIndex = rawResults[offset + 1];
        const similarity = rawResults[offset + 2];
        const confidence = rawResults[offset + 3];
        const legalScore = rawResults[offset + 4];
        const riskAssessment = rawResults[offset + 5];

        // Skip invalid results
        if (queryIndex === 0xFFFFFFFF || similarity < 0) continue;

        results.push({
          queryIndex: Math.floor(queryIndex),
          documentIndex: Math.floor(documentIndex),
          similarity,
          confidence,
          riskAssessment
        });
      }

      readBuffer.unmap();

      // Sort by combined legal score (enhanced with legal domain weighting);
      results.sort((a, b) => {
        const scoreA = a.similarity * 0.6 + (a.confidence || 0) * 0.3 + (1.0 - (a.riskAssessment || 0)) * 0.1;
        const scoreB = b.similarity * 0.6 + (b.confidence || 0) * 0.3 + (1.0 - (b.riskAssessment || 0)) * 0.1;
        return scoreB - scoreA;
      });

      const processingTime = performance.now() - startTime;
      console.log(`✅ Legal similarity computation completed: ${results.length} results in ${processingTime.toFixed(2)}ms`);

      // Clean up
      domainWeightsBuffer.destroy();
      readBuffer.destroy();

      return results.slice(0, config.maxResults);

    } catch (error) {
      console.error('❌ WebGPU legal similarity computation failed:', error);
      throw error;
    }
  }

  private async createBuffers(
    queryData: Float32Array,
    documentData: Float32Array,
    totalResults: number,
    vectorDimension: number,
    config: WebGPUComputeOptions;
  ): Promise<void> {
    if (!this.device) throw new Error('Device not initialized');

    // Query embeddings buffer;
    this.queryBuffer = this.device.createBuffer({
      label: 'Query Embeddings Buffer',
      size: queryData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    this.device.queue.writeBuffer(this.queryBuffer, 0, queryData);

    // Document embeddings buffer;
    this.documentBuffer = this.device.createBuffer({
      label: 'Document Embeddings Buffer',
      size: documentData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    this.device.queue.writeBuffer(this.documentBuffer, 0, documentData);

    // Results buffer (6 floats per result: query_idx, doc_idx, similarity, confidence, legal_score, risk)
    const resultsSize = totalResults * 6 * 4; // 6 floats * 4 bytes per float;
    this.resultsBuffer = this.device.createBuffer({
      label: 'Similarity Results Buffer',
      size: resultsSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });

    // Uniforms buffer;
    this.uniformsBuffer = this.device.createBuffer({
      label: 'Compute Uniforms Buffer',
      size: 32, // 8 floats * 4 bytes
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    console.log(`📊 Created WebGPU buffers: queries=${this.formatBytes(queryData.byteLength)}, docs=${this.formatBytes(documentData.byteLength)}, results=${this.formatBytes(resultsSize)}`);
  }

  private async applyTopKOptimization(totalResults: number, k: number): Promise<void> {
    if (!this.device || !this.topKShader || !this.resultsBuffer) {
      throw new Error('Top-K optimization not initialized');
    }

    console.log(`🎯 Applying top-K optimization: selecting ${k} from ${totalResults} results`);

    // Create top-K pipeline;
    const topKPipeline = this.device.createComputePipeline({
      label: 'Legal Top-K Selection Pipeline',
      layout: 'auto',
      compute: {
        module: this.topKShader,
        entryPoint: 'main'
      }
    });

    // Create top-K results buffer
    const topKResultsSize = k * 6 * 4; // k results * 6 floats * 4 bytes;
    const topKResultsBuffer = this.device.createBuffer({
      label: 'Top-K Results Buffer',
      size: topKResultsSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });

    // Initialize top-K buffer with invalid results
    const invalidResults = new Float32Array(k * 6);
    for (let i = 0; i < k; i++) {
      const offset = i * 6;
      invalidResults[offset] = 0xFFFFFFFF; // query_index
      invalidResults[offset + 1] = 0xFFFFFFFF; // document_index
      invalidResults[offset + 2] = -1.0; // similarity
      invalidResults[offset + 3] = 0.0; // confidence
      invalidResults[offset + 4] = 0.0; // legal_score
      invalidResults[offset + 5] = 1.0; // risk_assessment
    }
    this.device.queue.writeBuffer(topKResultsBuffer, 0, invalidResults);

    // Create top-K uniforms
    const topKUniforms = new Uint32Array([
      totalResults, // total_results
      k,           // k
      256,         // batch_size
      0            // padding
    ]);

    const topKUniformsBuffer = this.device.createBuffer({
      label: 'Top-K Uniforms Buffer',
      size: topKUniforms.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    this.device.queue.writeBuffer(topKUniformsBuffer, 0, topKUniforms);

    // Create top-K bind group;
    const topKBindGroup = this.device.createBindGroup({
      label: 'Top-K Bind Group',
      layout: topKPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.resultsBuffer } },
        { binding: 1, resource: { buffer: topKResultsBuffer } },>
        { binding: 2, resource: { buffer: topKUniformsBuffer } }
      ]
    });

    // Execute top-K selection;
    const commandEncoder = this.device.createCommandEncoder({
      label: 'Top-K Command Encoder'
    });

    const computePass = commandEncoder.beginComputePass({
      label: 'Top-K Compute Pass'
    });

    computePass.setPipeline(topKPipeline);
    computePass.setBindGroup(0, topKBindGroup);

    const workgroupsX = Math.ceil(totalResults / 256);
    computePass.dispatchWorkgroups(workgroupsX, 1, 1);
    computePass.end();

    // Copy top-K results back to main results buffer
    commandEncoder.copyBufferToBuffer(
      topKResultsBuffer,
      0,
      this.resultsBuffer,
      0,
      topKResultsSize
    );

    this.device.queue.submit([commandEncoder.finish()]);

    // Clean up
    topKResultsBuffer.destroy();
    topKUniformsBuffer.destroy();

    console.log(`✅ Top-K optimization completed: ${k} best results selected`);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k);
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async destroy(): Promise<void> {
    if (this.queryBuffer) this.queryBuffer.destroy();
    if (this.documentBuffer) this.documentBuffer.destroy();
    if (this.resultsBuffer) this.resultsBuffer.destroy();
    if (this.uniformsBuffer) this.uniformsBuffer.destroy();

    this.queryBuffer = null;
    this.documentBuffer = null;
    this.resultsBuffer = null;
    this.uniformsBuffer = null;
    this.computePipeline = null;
    this.bindGroupLayout = null;
    this.device = null;
    this.adapter = null;
    this.isInitialized = false;

    console.log('🎮 Legal Similarity WebGPU destroyed');
  }
}

// Singleton instance for the application
export const legalSimilarityWebGPU = new LegalSimilarityWebGPU();

// Utility function to create optimized embedding data for WebGPU
export function prepareLegalEmbeddingsForWebGPU(
  cases: Array<{ id: string; embedding: Float32Array; metadata?: any }>,
  evidence: Array<{ id: string; embedding: Float32Array; metadata?: any }>;
): {
  queryEmbeddings: Float32Array[];
  documentEmbeddings: Float32Array[];
  queryMetadata: any[];
  documentMetadata: any[];
} {
  const queryEmbeddings = cases.map(c => c.embedding);
  const documentEmbeddings = evidence.map(e => e.embedding);
  const queryMetadata = cases.map(c => ({ id: c.id, ...c.metadata });
  const documentMetadata = evidence.map(e => ({ id: e.id, ...e.metadata });

  return {
    queryEmbeddings,
    documentEmbeddings,
    queryMetadata,
    documentMetadata
  };
}