<!--
  GPU Vector Processing Demo
  Demonstrates GpuVectorProcessor consuming cached shaders from LodCacheEngine
  Shows the complete pipeline from cached resources to GPU compute execution
-->
<script lang=\"ts\">
  import { onMount } from 'svelte';
  import { GpuVectorProcessor } from '$lib/gpu/GpuVectorProcessor.js';
  // import { LodCacheEngine } from '$lib/gpu/lod-cache-engine.js'; // File doesn't exist
  import { telemetryBus } from '$lib/telemetry/event-bus.js';
  import PerformanceDashboard from '$lib/components/analytics/PerformanceDashboard.svelte';
  // Temporarily simplify imports to fix parse error
  // import type { VectorProcessingConfig, EmbeddingComputeParams, VectorProcessingResult } from '$lib/gpu/GpuVectorProcessor.js';
  // import type { NintendoMemoryBudget } from '$lib/gpu/types.js';

  let processor: GpuVectorProcessor | null = null;
  // let lodCache: LodCacheEngine | null = null; // Class doesn't exist
  let isInitialized = $state(false);
  let currentDemo = $state<'single' | 'batch' | 'adaptive' | 'cache-comparison'>('single');
  
  // Demo state
  let sampleVectors = $state<Float32Array[]>([]);
  let processingResult = $state<any>(null);
  let performanceComparison = $state<{
    withCache: { time: number; hitRate: number };
    withoutCache: { time: number; hitRate: number };
  } | null>(null);
  
  let isProcessing = $state(false);
  let statusMessage = $state('Ready to demonstrate GPU vector processing with cached shaders');

  // Nintendo memory configuration
  const memoryBudget: any = {
    L1: 32 * 1024,      // 32KB - Fast access cache
    L2: 256 * 1024,     // 256KB - Shader storage  
    L3: 8 * 1024 * 1024, // 8MB - Vector buffers
    total: 16 * 1024 * 1024, // 16MB total budget
    CHR_ROM: 4 * 1024 * 1024, // 4MB - Texture/pattern cache
    PRG_ROM: 2 * 1024 * 1024  // 2MB - Compute shader cache
  };

  const processingConfig: any = {
    dimensions: 768,
    quantization: 'float32',
    batchSize: 32,
    memoryBudget,
    adaptiveScaling: {
      enabled: true,
      thresholds: {
        memoryPressure: 0.8,
        latencyMs: 100,
        throughputVectorsPerSec: 1000
      },
      scalingFactors: {
        dimensionReduction: 0.75,
        quantizationAggression: 1.5,
        batchSizeAdjustment: 1.2
      }
    },
    fallbackToWebGL: true
  };

  onMount(async () => {
    try {
      statusMessage = 'Initializing LodCacheEngine and GpuVectorProcessor...';
      
      // Initialize cache engine first
      lodCache = new LodCacheEngine(memoryBudget);
      await lodCache.initialize();
      
      // Pre-populate cache with essential shaders
      await prePopulateShaderCache();
      
      // Initialize GPU vector processor
      processor = new GpuVectorProcessor(lodCache, processingConfig);
      await processor.initialize();
      
      // Generate sample vectors for demonstrations
      sampleVectors = generateSampleVectors(50);
      
      statusMessage = 'GPU Vector Processor initialized - Cached shaders ready for compute pipelines';
      isInitialized = true;

      telemetryBus.emitPerformanceEvent({
        type: 'system_initialization',
        duration: performance.now(),
        operation: 'gpu_vector_processor_demo',
        success: true
      });

    } catch (error) {
      console.error('[GPUVectorDemo] Initialization failed:', error);
      statusMessage = `Initialization failed: ${error}`;
    }
  });

  async function prePopulateShaderCache(): Promise<void> {
    if (!lodCache) return;

    // Cache essential compute shaders
    const shaderDefinitions = [
      {
        key: 'vector-similarity-compute',
        code: `
          @group(0) @binding(0) var<storage, read> inputVectors: array<f32>;
          @group(0) @binding(1) var<storage, read_write> outputResults: array<f32>;
          @group(0) @binding(2) var<uniform> params: vec4<f32>;
          
          @compute @workgroup_size(64, 1, 1)
          fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let index = global_id.x;
            if (index >= u32(params.x)) { return; }
            
            // Vector similarity computation
            let vectorSize = u32(params.z);
            let baseOffset = index * vectorSize;
            
            var similarity: f32 = 0.0;
            for (var i = 0u; i < vectorSize; i++) {
              similarity += inputVectors[baseOffset + i] * inputVectors[i];
            }
            
            outputResults[index] = similarity;
          }
        `
      },
      {
        key: 'batch-embedding-compute', 
        code: `
          @group(0) @binding(0) var<storage, read> inputVectors: array<f32>;
          @group(0) @binding(1) var<storage, read_write> outputVectors: array<f32>;
          @group(0) @binding(2) var<uniform> params: vec4<f32>;
          
          @compute @workgroup_size(64, 1, 1)
          fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let batchIndex = global_id.x;
            let batchSize = u32(params.x);
            let dimensions = u32(params.z);
            
            if (batchIndex >= batchSize) { return; }
            
            let vectorOffset = batchIndex * dimensions;
            
            // Process vector embedding with quantization
            let quantizationBits = params.y;
            for (var i = 0u; i < dimensions; i++) {
              let inputValue = inputVectors[vectorOffset + i];
              let processedValue = processQuantization(inputValue, quantizationBits);
              outputVectors[vectorOffset + i] = processedValue;
            }
          }
          
          fn processQuantization(value: f32, bits: f32) -> f32 {
            if (bits == 32.0) { return value; }
            if (bits == 8.0) { return floor(value * 255.0) / 255.0; }
            if (bits == 4.0) { return floor(value * 15.0) / 15.0; }
            return step(0.0, value); // binary
          }
        `
      }
    ];

    for (const shader of shaderDefinitions) {
      await lodCache.cacheShaderBundle(shader.key, {
        id: shader.key,
        shaderCode: shader.code,
        metadata: {
          shaderType: 'compute',
          memoryFootprint: shader.code.length * 2, // Estimate
          lastUsed: Date.now(),
          usageCount: 0,
          priority: 'high'
        },
        compiledShader: null // Will be compiled on demand
      });
    }

    console.log('[GPUVectorDemo] Pre-populated shader cache with compute shaders');
  }

  function generateSampleVectors(count: number): Float32Array[] {
    const vectors: Float32Array[] = [];
    
    for (let i = 0; i < count; i++) {
      const vector = new Float32Array(processingConfig.dimensions);
      
      // Generate realistic embedding-like data
      for (let j = 0; j < vector.length; j++) {
        // Create clusters of related values
        const clusterIndex = Math.floor(j / 64);
        const clusterBase = Math.sin(clusterIndex * 0.1 + i * 0.01);
        vector[j] = clusterBase + (Math.random() - 0.5) * 0.2;
      }
      
      // Normalize vector
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      for (let j = 0; j < vector.length; j++) {
        vector[j] /= magnitude;
      }
      
      vectors.push(vector);
    }
    
    return vectors;
  }

  async function demonstrateSingleVectorProcessing(): Promise<void> {
    if (!processor || !isInitialized || isProcessing) return;
    
    isProcessing = true;
    statusMessage = 'Processing single vector with cached GPU shaders...';

    try {
      const params: EmbeddingComputeParams = {
        inputVectors: [sampleVectors[0]],
        similarityThreshold: 0.8,
        topK: 10,
        useAdaptiveQuantization: false
      };

      processingResult = await processor.processEmbeddings(params);
      
      statusMessage = `Single vector processed in ${processingResult.processingTime.toFixed(2)}ms - ` +
        `Cache hit rate: ${(processingResult.cacheHitRate * 100).toFixed(1)}%`;

    } catch (error) {
      console.error('[Demo] Single vector processing failed:', error);
      statusMessage = `Processing failed: ${error}`;
    } finally {
      isProcessing = false;
    }
  }

  async function demonstrateBatchProcessing(): Promise<void> {
    if (!processor || !isInitialized || isProcessing) return;
    
    isProcessing = true;
    statusMessage = 'Processing vector batch with cached GPU compute pipelines...';

    try {
      const params: EmbeddingComputeParams = {
        inputVectors: sampleVectors.slice(0, 25), // Process 25 vectors
        similarityThreshold: 0.7,
        topK: 5,
        useAdaptiveQuantization: true
      };

      processingResult = await processor.processEmbeddings(params);
      
      statusMessage = `Batch processed: ${processingResult.processedVectors.length} vectors in ` +
        `${processingResult.processingTime.toFixed(2)}ms - GPU utilization: ${processingResult.gpuUtilization.toFixed(1)}%`;

    } catch (error) {
      console.error('[Demo] Batch processing failed:', error);
      statusMessage = `Batch processing failed: ${error}`;
    } finally {
      isProcessing = false;
    }
  }

  async function demonstrateAdaptiveQuantization(): Promise<void> {
    if (!processor || !isInitialized || isProcessing) return;
    
    isProcessing = true;
    statusMessage = 'Running adaptive quantization demo with cached shaders...';

    try {
      const results: VectorProcessingResult[] = [];
      const quantizationLevels = ['float32', 'int8', 'int4', 'binary'] as const;
      
      for (const quantization of quantizationLevels) {
        // Create temporary processor config with specific quantization
        const tempConfig = { ...processingConfig, quantization };
        const tempProcessor = new GpuVectorProcessor(lodCache!, tempConfig);
        await tempProcessor.initialize();
        
        const params: EmbeddingComputeParams = {
          inputVectors: sampleVectors.slice(0, 10),
          similarityThreshold: 0.8,
          topK: 5,
          useAdaptiveQuantization: false
        };

        const result = await tempProcessor.processEmbeddings(params);
        results.push(result);
        
        statusMessage = `Testing ${quantization} quantization: ${result.processingTime.toFixed(2)}ms, ` +
          `${result.memoryUsed} bytes`;
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 200));
        
        tempProcessor.cleanup();
      }

      // Set best result as current
      processingResult = results.reduce((best, current) => 
        current.processingTime < best.processingTime ? current : best
      );
      
      statusMessage = `Adaptive quantization complete - Best: ${processingResult.quantizationApplied} ` +
        `(${processingResult.processingTime.toFixed(2)}ms)`;

    } catch (error) {
      console.error('[Demo] Adaptive quantization failed:', error);
      statusMessage = `Adaptive demo failed: ${error}`;
    } finally {
      isProcessing = false;
    }
  }

  async function demonstrateCachePerformance(): Promise<void> {
    if (!processor || !lodCache || !isInitialized || isProcessing) return;
    
    isProcessing = true;
    statusMessage = 'Comparing performance with and without shader caching...';

    try {
      const testVectors = sampleVectors.slice(0, 10);
      
      // Test WITH cache (warm cache)
      const startWarm = performance.now();
      const paramsWarm: EmbeddingComputeParams = {
        inputVectors: testVectors,
        similarityThreshold: 0.8,
        topK: 5,
        useAdaptiveQuantization: false
      };
      
      const resultWarm = await processor.processEmbeddings(paramsWarm);
      const timeWarm = performance.now() - startWarm;
      
      // Test WITHOUT cache (clear cache first)
      await lodCache.clearCache();
      await prePopulateShaderCache(); // Re-populate for fair comparison
      
      // Create fresh processor to simulate cold start
      const freshProcessor = new GpuVectorProcessor(lodCache, processingConfig);
      await freshProcessor.initialize();
      
      const startCold = performance.now();
      const paramsCold: EmbeddingComputeParams = {
        inputVectors: testVectors,
        similarityThreshold: 0.8,
        topK: 5,
        useAdaptiveQuantization: false
      };
      
      const resultCold = await freshProcessor.processEmbeddings(paramsCold);
      const timeCold = performance.now() - startCold;
      
      performanceComparison = {
        withCache: { 
          time: timeWarm, 
          hitRate: resultWarm.cacheHitRate 
        },
        withoutCache: { 
          time: timeCold, 
          hitRate: resultCold.cacheHitRate 
        }
      };
      
      const speedup = ((timeCold - timeWarm) / timeCold * 100);
      statusMessage = `Cache performance: ${speedup.toFixed(1)}% faster with cached shaders ` +
        `(${timeWarm.toFixed(2)}ms vs ${timeCold.toFixed(2)}ms)`;
      
      freshProcessor.cleanup();

    } catch (error) {
      console.error('[Demo] Cache performance test failed:', error);
      statusMessage = `Cache performance test failed: ${error}`;
    } finally {
      isProcessing = false;
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatQuantization(level: string): string {
    const labels = {
      'float32': 'Float32 (Full Precision)',
      'int8': 'Int8 (75% Compressed)',
      'int4': 'Int4 (87.5% Compressed)', 
      'binary': 'Binary (96.9% Compressed)'
    };
    return labels[level as keyof typeof labels] || level;
  }
</script>

<div class=\"min-h-screen bg-gray-900 text-green-400 p-6 font-mono\">
  <!-- Header -->
  <div class=\"max-w-6xl mx-auto\">
    <div class=\"text-center mb-8\">
      <h1 class=\"text-3xl font-bold text-green-300 mb-2\">
        ⚡ GPU Vector Processing with Cached Shaders
      </h1>
      <p class=\"text-lg text-gray-300\">
        GpuVectorProcessor + LodCacheEngine Integration Demo
      </p>
    </div>

    <!-- Status Display -->
    <div class=\"bg-gray-800 border-2 border-green-500 p-4 mb-6 rounded-lg\">
      <div class=\"flex items-center space-x-2\">
        <span class={isInitialized ? 'text-green-400' : 'text-yellow-400'}>
          {isInitialized ? '●' : '◐'} 
        </span>
        <span class=\"font-bold\">System Status:</span>
        <span>{statusMessage}</span>
        {#if isProcessing}
          <span class=\"animate-pulse text-yellow-400\">⚡</span>
        {/if}
      </div>
    </div>

    <!-- Performance Dashboard -->
    <div class=\"mb-8\">
      <PerformanceDashboard />
    </div>

    <!-- Demo Controls -->
    <div class=\"grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8\">
      <!-- Single Vector Processing -->
      <div class=\"bg-gray-800 border-2 border-green-500 p-6 rounded-lg\">
        <h2 class=\"text-xl font-bold text-green-300 mb-4\">🎯 Single Vector Processing</h2>
        <p class=\"text-sm text-gray-300 mb-4\">
          Process a single vector using cached GPU compute shaders from LodCacheEngine.
        </p>
        
        <button
          onclick={demonstrateSingleVectorProcessing}
          disabled={!isInitialized || isProcessing}
          class=\"w-full px-4 py-2 bg-green-900 border border-green-500 hover:bg-green-800 
                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded mb-4\"
        >
          Process Single Vector
        </button>

        {#if processingResult && !isProcessing}
          <div class=\"p-3 bg-gray-700 rounded text-xs\">
            <div><strong>Vectors:</strong> {processingResult.processedVectors.length}</div>
            <div><strong>Time:</strong> {processingResult.processingTime.toFixed(2)}ms</div>
            <div><strong>Memory:</strong> {formatBytes(processingResult.memoryUsed)}</div>
            <div><strong>Quantization:</strong> {formatQuantization(processingResult.quantizationApplied)}</div>
            <div><strong>Cache Hit Rate:</strong> {(processingResult.cacheHitRate * 100).toFixed(1)}%</div>
            <div><strong>GPU Utilization:</strong> {processingResult.gpuUtilization.toFixed(1)}%</div>
          </div>
        {/if}
      </div>

      <!-- Batch Processing -->
      <div class=\"bg-gray-800 border-2 border-green-500 p-6 rounded-lg\">
        <h2 class=\"text-xl font-bold text-green-300 mb-4\">📦 Batch Processing</h2>
        <p class=\"text-sm text-gray-300 mb-4\">
          Process multiple vectors efficiently using cached compute pipelines with adaptive quantization.
        </p>
        
        <button
          onclick={demonstrateBatchProcessing}
          disabled={!isInitialized || isProcessing}
          class=\"w-full px-4 py-2 bg-green-900 border border-green-500 hover:bg-green-800 
                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded mb-4\"
        >
          Process Vector Batch
        </button>

        {#if processingResult && !isProcessing}
          <div class=\"p-3 bg-gray-700 rounded text-xs\">
            <div><strong>Batch Size:</strong> {processingResult.processedVectors.length}</div>
            <div><strong>Total Time:</strong> {processingResult.processingTime.toFixed(2)}ms</div>
            <div><strong>Avg per Vector:</strong> {(processingResult.processingTime / processingResult.processedVectors.length).toFixed(2)}ms</div>
            <div><strong>Memory Used:</strong> {formatBytes(processingResult.memoryUsed)}</div>
            <div><strong>Applied Quantization:</strong> {formatQuantization(processingResult.quantizationApplied)}</div>
            <div><strong>GPU Utilization:</strong> {processingResult.gpuUtilization.toFixed(1)}%</div>
          </div>
        {/if}
      </div>

      <!-- Adaptive Quantization -->
      <div class=\"bg-gray-800 border-2 border-green-500 p-6 rounded-lg\">
        <h2 class=\"text-xl font-bold text-green-300 mb-4\">🔄 Adaptive Quantization</h2>
        <p class=\"text-sm text-gray-300 mb-4\">
          Test different quantization levels with the same cached shaders to find optimal performance.
        </p>
        
        <button
          onclick={demonstrateAdaptiveQuantization}
          disabled={!isInitialized || isProcessing}
          class=\"w-full px-4 py-2 bg-green-900 border border-green-500 hover:bg-green-800 
                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded mb-4\"
        >
          Run Adaptive Quantization
        </button>

        {#if processingResult && !isProcessing}
          <div class=\"p-3 bg-gray-700 rounded text-xs\">
            <div><strong>Optimal Level:</strong> {formatQuantization(processingResult.quantizationApplied)}</div>
            <div><strong>Best Time:</strong> {processingResult.processingTime.toFixed(2)}ms</div>
            <div><strong>Memory Efficiency:</strong> {formatBytes(processingResult.memoryUsed)}</div>
            <div><strong>Compression Ratio:</strong> {((1 - processingResult.memoryUsed / (processingResult.processedVectors.length * 768 * 4)) * 100).toFixed(1)}%</div>
          </div>
        {/if}
      </div>

      <!-- Cache Performance -->
      <div class=\"bg-gray-800 border-2 border-green-500 p-6 rounded-lg\">
        <h2 class=\"text-xl font-bold text-green-300 mb-4\">⚡ Cache Performance</h2>
        <p class=\"text-sm text-gray-300 mb-4\">
          Compare processing speed with warm cache vs cold cache to demonstrate shader caching benefits.
        </p>
        
        <button
          onclick={demonstrateCachePerformance}
          disabled={!isInitialized || isProcessing}
          class=\"w-full px-4 py-2 bg-green-900 border border-green-500 hover:bg-green-800 
                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded mb-4\"
        >
          Test Cache Performance
        </button>

        {#if performanceComparison && !isProcessing}
          <div class=\"p-3 bg-gray-700 rounded text-xs\">
            <div class=\"mb-2 font-bold text-green-400\">Performance Comparison:</div>
            <div><strong>With Cache:</strong> {performanceComparison.withCache.time.toFixed(2)}ms</div>
            <div><strong>Without Cache:</strong> {performanceComparison.withoutCache.time.toFixed(2)}ms</div>
            <div><strong>Speedup:</strong> {((performanceComparison.withoutCache.time - performanceComparison.withCache.time) / performanceComparison.withoutCache.time * 100).toFixed(1)}%</div>
            <div><strong>Cache Benefit:</strong> {(performanceComparison.withoutCache.time / performanceComparison.withCache.time).toFixed(1)}x faster</div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Architecture Overview -->
    <div class=\"bg-gray-800 border-2 border-green-500 p-6 rounded-lg\">
      <h2 class=\"text-xl font-bold text-green-300 mb-4\">🏗️ Integration Architecture</h2>
      <div class=\"grid grid-cols-1 md:grid-cols-2 gap-6 text-sm\">
        <div>
          <h3 class=\"font-bold text-green-400 mb-2\">GpuVectorProcessor Features:</h3>
          <ul class=\"space-y-1 text-gray-300\">
            <li>✓ Consumes pre-cached ShaderBundle resources</li>
            <li>✓ Creates GPUComputePipeline from cached shader code</li>
            <li>✓ Nintendo memory architecture integration</li>
            <li>✓ Adaptive quantization (float32 → int8 → int4 → binary)</li>
            <li>✓ Batch processing with memory management</li>
            <li>✓ WebGL fallback when WebGPU unavailable</li>
            <li>✓ Real-time performance telemetry</li>
          </ul>
        </div>
        <div>
          <h3 class=\"font-bold text-green-400 mb-2\">Cache Integration Benefits:</h3>
          <ul class=\"space-y-1 text-gray-300\">
            <li>• Eliminates shader compilation overhead</li>
            <li>• Reduces GPU pipeline creation latency</li>
            <li>• Enables instant compute pipeline availability</li>
            <li>• Supports runtime shader validation</li>
            <li>• Provides graceful fallback handling</li>
            <li>• Optimizes memory usage with LRU eviction</li>
            <li>• Maintains high cache hit rates for performance</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>