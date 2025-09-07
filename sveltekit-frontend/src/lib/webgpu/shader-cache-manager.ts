/**
 * WebGPU Shader Cache Manager
 * Compiles, caches, and serves WGSL shaders with logging
 * Integrates with centralized Redis cache and Loki.js logging
 */

import { cache, cacheShader, getCachedShader } from '$lib/server/cache/redis.js';
import { browser } from '$app/environment';

export interface ShaderConfig {
  type: 'compute' | 'vertex' | 'fragment';
  entryPoint: string;
  workgroupSize?: [number, number, number];
  bindingLayout?: GPUBindGroupLayoutDescriptor[];
}

export interface CompiledShader {
  id: string;
  wgsl: string;
  shaderModule?: GPUShaderModule;
  pipeline?: GPUComputePipeline | GPURenderPipeline;
  bindGroupLayout?: GPUBindGroupLayout;
  config: ShaderConfig;
  metadata: {
    compiledAt: number;
    lastUsed: number;
    compileTime: number;
    cacheHit: boolean;
    usageCount: number;
    averageExecutionTime: number;
    description: string;
    tags: string[];
    operation: string;
  };
  embedding?: number[]; // Semantic embedding for search
}

export interface ShaderSearchQuery {
  text?: string;
  operation?: string;
  shaderType?: 'webgpu' | 'webgl' | 'all';
  tags?: string[];
  sortBy?: 'relevance' | 'performance' | 'usage' | 'recent';
  limit?: number;
}

export interface ShaderSearchResult extends CompiledShader {
  relevanceScore?: number;
  embeddingSimilarity?: number;
}

export class ShaderCacheManager {
  private device: GPUDevice | null = null;
  private shaders = new Map<string, CompiledShader>();
  private compileQueue = new Map<string, Promise<CompiledShader>>();
  private readonly SHADER_CACHE_PREFIX = 'webgpu_shader:';
  private readonly EMBEDDING_CACHE_PREFIX = 'shader_embed:';

  async initialize(device: GPUDevice): Promise<void> {
    this.device = device;
    console.log('✅ WebGPU Shader Cache Manager initialized');
  }

  /**
   * Compile or retrieve cached shader
   */
  async getShader(id: string, wgsl: string, config: ShaderConfig): Promise<CompiledShader> {
    const startTime = performance.now();
    
    // Check memory cache first
    if (this.shaders.has(id)) {
      const cached = this.shaders.get(id)!;
      cached.metadata.lastUsed = Date.now();
      this.logShaderUsage(id, 'memory_hit', performance.now() - startTime);
      return cached;
    }

    // Check if already compiling
    if (this.compileQueue.has(id)) {
      return await this.compileQueue.get(id)!;
    }

    // Start compilation
    const compilationPromise = this.compileShader(id, wgsl, config, startTime);
    this.compileQueue.set(id, compilationPromise);

    try {
      const result = await compilationPromise;
      this.compileQueue.delete(id);
      return result;
    } catch (error) {
      this.compileQueue.delete(id);
      throw error;
    }
  }

  private async compileShader(
    id: string, 
    wgsl: string, 
    config: ShaderConfig, 
    startTime: number
  ): Promise<CompiledShader> {
    if (!this.device) {
      throw new Error('WebGPU device not initialized');
    }

    let cacheHit = false;

    try {
      // Check server-side cache
      if (!browser) {
        const cached = await getCachedShader(id);
        if (cached && cached === wgsl) {
          cacheHit = true;
          this.logShaderUsage(id, 'redis_hit', performance.now() - startTime);
        }
      }

      // Compile shader module
      const shaderModule = this.device.createShaderModule({
        label: `shader_${id}`,
        code: wgsl
      });

      // Create pipeline based on shader type
      let pipeline: GPUComputePipeline | GPURenderPipeline;
      let bindGroupLayout: GPUBindGroupLayout | undefined;

      if (config.type === 'compute') {
        pipeline = this.device.createComputePipeline({
          label: `compute_pipeline_${id}`,
          layout: 'auto',
          compute: {
            module: shaderModule,
            entryPoint: config.entryPoint
          }
        });
        bindGroupLayout = (pipeline as GPUComputePipeline).getBindGroupLayout(0);
      } else {
        // For vertex/fragment shaders, create render pipeline
        pipeline = this.device.createRenderPipeline({
          label: `render_pipeline_${id}`,
          layout: 'auto',
          vertex: {
            module: shaderModule,
            entryPoint: config.type === 'vertex' ? config.entryPoint : 'main'
          },
          fragment: config.type === 'fragment' ? {
            module: shaderModule,
            entryPoint: config.entryPoint,
            targets: [{ format: 'bgra8unorm' }]
          } : undefined,
          primitive: {
            topology: 'triangle-list'
          }
        });
        bindGroupLayout = (pipeline as GPURenderPipeline).getBindGroupLayout(0);
      }

      const compileTime = performance.now() - startTime;
      const compiled: CompiledShader = {
        id,
        wgsl,
        shaderModule,
        pipeline,
        bindGroupLayout,
        config,
        metadata: {
          compiledAt: Date.now(),
          lastUsed: Date.now(),
          compileTime,
          cacheHit
        }
      };

      // Store in memory cache
      this.shaders.set(id, compiled);

      // Cache on server-side
      if (!browser && !cacheHit) {
        try {
          await cacheShader(id, wgsl, 6 * 60 * 60 * 1000); // 6 hours
        } catch (error) {
          console.warn('Failed to cache shader:', error);
        }
      }

      this.logShaderUsage(id, cacheHit ? 'cache_hit' : 'compiled', compileTime);
      return compiled;

    } catch (error) {
      this.logShaderError(id, error as Error);
      throw error;
    }
  }

  /**
   * Create specialized compute shader for tensor operations
   */
  async createTensorShader(
    operation: 'embedding' | 'similarity' | 'quantize' | 'simd_parse',
    dimensions: number
  ): Promise<CompiledShader> {
    const id = `tensor_${operation}_${dimensions}`;
    const wgsl = this.generateTensorWGSL(operation, dimensions);
    
    return this.getShader(id, wgsl, {
      type: 'compute',
      entryPoint: 'main',
      workgroupSize: [64, 1, 1]
    });
  }

  /**
   * Generate optimized tensor operation WGSL
   */
  private generateTensorWGSL(operation: string, dimensions: number): string {
    const workgroupSize = 64;
    
    switch (operation) {
      case 'embedding':
        return `
@group(0) @binding(0) var<storage, read> input: array<f32>;
@group(0) @binding(1) var<storage, read_write> output: array<f32>;
@group(0) @binding(2) var<uniform> params: vec4<u32>; // dimensions, batch_size, etc.

@compute @workgroup_size(${workgroupSize}, 1, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  let total = params.x * params.y;
  
  if (index >= total) { return; }
  
  let batch_idx = index / params.x;
  let dim_idx = index % params.x;
  
  // Embedding computation with optimized memory access
  let input_val = input[index];
  let normalized = tanh(input_val * 0.1); // Activation
  
  output[index] = normalized;
}`;

      case 'similarity':
        return `
@group(0) @binding(0) var<storage, read> embeddings_a: array<f32>;
@group(0) @binding(1) var<storage, read> embeddings_b: array<f32>;
@group(0) @binding(2) var<storage, read_write> similarities: array<f32>;
@group(0) @binding(3) var<uniform> params: vec4<u32>;

@compute @workgroup_size(${workgroupSize}, 1, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let pair_idx = global_id.x;
  let num_pairs = params.x;
  let dimensions = params.y;
  
  if (pair_idx >= num_pairs) { return; }
  
  var dot_product = 0.0;
  var norm_a = 0.0;
  var norm_b = 0.0;
  
  let offset_a = pair_idx * dimensions;
  let offset_b = pair_idx * dimensions;
  
  for (var i = 0u; i < dimensions; i = i + 1u) {
    let a_val = embeddings_a[offset_a + i];
    let b_val = embeddings_b[offset_b + i];
    
    dot_product += a_val * b_val;
    norm_a += a_val * a_val;
    norm_b += b_val * b_val;
  }
  
  let cosine_sim = dot_product / (sqrt(norm_a) * sqrt(norm_b));
  similarities[pair_idx] = cosine_sim;
}`;

      case 'simd_parse':
        return `
@group(0) @binding(0) var<storage, read> raw_data: array<u32>;
@group(0) @binding(1) var<storage, read_write> parsed_tensors: array<f32>;
@group(0) @binding(2) var<uniform> params: vec4<u32>;

@compute @workgroup_size(${workgroupSize}, 1, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  let total_elements = params.x;
  
  if (index >= total_elements) { return; }
  
  // SIMD-style parallel parsing
  let raw_val = raw_data[index];
  
  // Unpack 4 bytes into floats
  let byte0 = f32((raw_val >> 0u) & 0xFFu) / 255.0;
  let byte1 = f32((raw_val >> 8u) & 0xFFu) / 255.0;
  let byte2 = f32((raw_val >> 16u) & 0xFFu) / 255.0;
  let byte3 = f32((raw_val >> 24u) & 0xFFu) / 255.0;
  
  let base_idx = index * 4u;
  parsed_tensors[base_idx + 0u] = byte0;
  parsed_tensors[base_idx + 1u] = byte1;
  parsed_tensors[base_idx + 2u] = byte2;
  parsed_tensors[base_idx + 3u] = byte3;
}`;

      default:
        throw new Error(`Unknown tensor operation: ${operation}`);
    }
  }

  /**
   * Execute tensor operation on GPU
   */
  async executeTensorOperation(
    shader: CompiledShader,
    inputs: GPUBuffer[],
    outputSize: number
  ): Promise<GPUBuffer> {
    if (!this.device || !shader.pipeline || !shader.bindGroupLayout) {
      throw new Error('Shader not properly compiled');
    }

    // Create output buffer
    const outputBuffer = this.device.createBuffer({
      size: outputSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: shader.bindGroupLayout,
      entries: [
        ...inputs.map((buffer, index) => ({
          binding: index,
          resource: { buffer }
        })),
        {
          binding: inputs.length,
          resource: { buffer: outputBuffer }
        }
      ]
    });

    // Execute compute shader
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    
    passEncoder.setPipeline(shader.pipeline as GPUComputePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(outputSize / (4 * 64))); // Workgroup size
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);

    return outputBuffer;
  }

  /**
   * Log shader usage for observability
   */
  private logShaderUsage(id: string, type: string, duration: number): void {
    const logData = {
      shader_id: id,
      cache_type: type,
      compile_time_ms: duration,
      timestamp: Date.now()
    };
    
    // Send to Loki.js for observability
    if (typeof window !== 'undefined') {
      console.log('🔧 Shader:', logData);
      // TODO: Send to actual Loki.js endpoint
    }
  }

  /**
   * Log shader compilation errors
   */
  private logShaderError(id: string, error: Error): void {
    const errorData = {
      shader_id: id,
      error_message: error.message,
      error_stack: error.stack,
      timestamp: Date.now()
    };
    
    console.error('❌ Shader compilation failed:', errorData);
    // TODO: Send to actual Loki.js endpoint
  }

  /**
   * Generate semantic embedding for shader code
   */
  private async generateShaderEmbedding(wgsl: string, metadata: CompiledShader['metadata']): Promise<number[]> {
    try {
      // Create comprehensive text for embedding
      const embeddingText = [
        wgsl,
        metadata.description,
        metadata.operation,
        ...metadata.tags
      ].filter(Boolean).join(' ');

      // Use existing embedding service
      const response = await fetch('/api/ocr/langextract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: embeddingText,
          model: 'nomic-embed-text',
          tags: ['shader', 'webgpu', ...metadata.tags],
          type: 'shader'
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.embedding || data.tensor || [];
      } else {
        return this.generateFallbackEmbedding(wgsl);
      }
    } catch (error) {
      console.warn('Failed to generate shader embedding:', error);
      return this.generateFallbackEmbedding(wgsl);
    }
  }

  /**
   * Generate fallback embedding based on shader characteristics
   */
  private generateFallbackEmbedding(wgsl: string): number[] {
    const features = new Array(384).fill(0);
    const lines = wgsl.split('\n');
    
    lines.forEach((line, index) => {
      const hash = this.simpleHash(line);
      const featureIndex = hash % features.length;
      features[featureIndex] += 1 / (index + 1);
    });

    // Normalize
    const magnitude = Math.sqrt(features.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? features.map(val => val / magnitude) : features;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Search cached shaders using semantic similarity
   */
  async searchShaders(query: ShaderSearchQuery): Promise<ShaderSearchResult[]> {
    try {
      // Get all shader IDs from cache index
      const shaderIndex = await cache.get<string[]>('webgpu_shader_index') || [];
      const results: ShaderSearchResult[] = [];

      for (const shaderId of shaderIndex) {
        const shaderData = await cache.get<CompiledShader>(`${this.SHADER_CACHE_PREFIX}${shaderId}`);
        if (!shaderData) continue;

        let relevanceScore = 0;
        let embeddingSimilarity = 0;

        // Apply filters
        if (query.operation && shaderData.metadata.operation !== query.operation) continue;
        
        if (query.tags && query.tags.length > 0) {
          const matchingTags = shaderData.metadata.tags.filter(tag => 
            query.tags!.some(queryTag => tag.toLowerCase().includes(queryTag.toLowerCase()))
          );
          if (matchingTags.length === 0) continue;
          relevanceScore += matchingTags.length * 0.2;
        }

        // Text search
        if (query.text) {
          const searchText = query.text.toLowerCase();
          const shaderText = [
            shaderData.wgsl,
            shaderData.metadata.description,
            shaderData.metadata.operation,
            ...shaderData.metadata.tags
          ].join(' ').toLowerCase();

          if (shaderText.includes(searchText)) {
            relevanceScore += 0.5;
          }

          // Semantic similarity using embeddings
          if (shaderData.embedding && shaderData.embedding.length > 0) {
            try {
              const queryEmbedding = await this.generateShaderEmbedding(query.text, {
                compiledAt: Date.now(),
                lastUsed: Date.now(),
                compileTime: 0,
                cacheHit: false,
                usageCount: 0,
                averageExecutionTime: 0,
                description: query.text,
                tags: query.tags || [],
                operation: 'query'
              });

              embeddingSimilarity = this.calculateCosineSimilarity(shaderData.embedding, queryEmbedding);
              relevanceScore += embeddingSimilarity * 0.7;
            } catch (error) {
              console.warn('Error calculating embedding similarity:', error);
            }
          }
        }

        // Performance and usage scoring
        if (shaderData.metadata.usageCount > 0) {
          relevanceScore += Math.log(shaderData.metadata.usageCount + 1) * 0.1;
        }

        if (shaderData.metadata.averageExecutionTime > 0) {
          const performanceScore = Math.min(shaderData.metadata.averageExecutionTime / 100, 1);
          relevanceScore += (1 - performanceScore) * 0.1;
        }

        results.push({
          ...shaderData,
          relevanceScore,
          embeddingSimilarity
        });
      }

      // Sort results
      results.sort((a, b) => {
        switch (query.sortBy) {
          case 'performance':
            return (a.metadata.averageExecutionTime || Number.MAX_VALUE) - 
                   (b.metadata.averageExecutionTime || Number.MAX_VALUE);
          case 'usage':
            return b.metadata.usageCount - a.metadata.usageCount;
          case 'recent':
            return b.metadata.lastUsed - a.metadata.lastUsed;
          case 'relevance':
          default:
            return (b.relevanceScore || 0) - (a.relevanceScore || 0);
        }
      });

      return results.slice(0, query.limit || 20);

    } catch (error) {
      console.error('Error searching shaders:', error);
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Enhanced shader caching with embeddings
   */
  async cacheShaderWithEmbedding(
    shader: CompiledShader,
    description: string,
    operation: string,
    tags: string[] = []
  ): Promise<void> {
    try {
      // Update metadata
      shader.metadata.description = description;
      shader.metadata.operation = operation;
      shader.metadata.tags = tags;
      shader.metadata.usageCount = shader.metadata.usageCount || 0;
      shader.metadata.averageExecutionTime = shader.metadata.averageExecutionTime || 0;

      // Generate embedding
      shader.embedding = await this.generateShaderEmbedding(shader.wgsl, shader.metadata);

      // Cache the shader
      await cache.set(`${this.SHADER_CACHE_PREFIX}${shader.id}`, shader, 24 * 60 * 60 * 1000);
      
      // Update search index
      const index = await cache.get<string[]>('webgpu_shader_index') || [];
      if (!index.includes(shader.id)) {
        index.push(shader.id);
        await cache.set('webgpu_shader_index', index, 24 * 60 * 60 * 1000);
      }

      console.log(`✅ Cached shader with embedding: ${shader.id}`);
    } catch (error) {
      console.error('Failed to cache shader with embedding:', error);
    }
  }

  /**
   * Record shader performance metrics
   */
  async recordShaderPerformance(shaderId: string, executionTime: number): Promise<void> {
    const shader = this.shaders.get(shaderId);
    if (!shader) return;

    shader.metadata.usageCount++;
    const prevAvg = shader.metadata.averageExecutionTime;
    shader.metadata.averageExecutionTime = 
      (prevAvg * (shader.metadata.usageCount - 1) + executionTime) / shader.metadata.usageCount;
    shader.metadata.lastUsed = Date.now();

    // Update in cache
    try {
      await cache.set(`${this.SHADER_CACHE_PREFIX}${shaderId}`, shader, 24 * 60 * 60 * 1000);
    } catch (error) {
      console.warn('Failed to update shader performance:', error);
    }
  }

  /**
   * Get shader cache statistics
   */
  async getShaderStats(): Promise<{
    totalShaders: number;
    memoryCount: number;
    topOperations: Array<{ operation: string; count: number }>;
    averagePerformance: number;
    totalUsage: number;
  }> {
    const shaderIndex = await cache.get<string[]>('webgpu_shader_index') || [];
    const operations: Record<string, number> = {};
    let totalPerformance = 0;
    let totalUsage = 0;
    let performanceCount = 0;

    for (const shaderId of shaderIndex) {
      const shader = await cache.get<CompiledShader>(`${this.SHADER_CACHE_PREFIX}${shaderId}`);
      if (shader) {
        operations[shader.metadata.operation] = (operations[shader.metadata.operation] || 0) + 1;
        totalUsage += shader.metadata.usageCount;
        if (shader.metadata.averageExecutionTime > 0) {
          totalPerformance += shader.metadata.averageExecutionTime;
          performanceCount++;
        }
      }
    }

    const topOperations = Object.entries(operations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([operation, count]) => ({ operation, count }));

    return {
      totalShaders: shaderIndex.length,
      memoryCount: this.shaders.size,
      topOperations,
      averagePerformance: performanceCount > 0 ? totalPerformance / performanceCount : 0,
      totalUsage
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.shaders.clear();
    this.compileQueue.clear();
    this.device = null;
  }
}

// Singleton instance
export const shaderCacheManager = new ShaderCacheManager();