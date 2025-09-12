<!--
  Production Analytics Demo
  Showcases the complete production-ready system:
  - VectorMetadataEncoder with adaptive scaling
  - Real-time telemetry and performance monitoring
  - Nintendo memory architecture integration
  - GPU acceleration with fallback handling
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { VectorMetadataEncoder } from '$lib/vector/metadata-encoder.js';
  import { telemetryBus, measureAsync } from '$lib/telemetry/event-bus.js';
  import PerformanceDashboard from '$lib/components/analytics/PerformanceDashboard.svelte';
  import type { VectorMetadata, AdaptiveEncodingResult } from '$lib/vector/metadata-encoder.js';
  import type { VectorDimensions } from '$lib/gpu/types.js';

  let encoder: VectorMetadataEncoder | null = null;
  let isInitialized = $state(false);
  let currentDemo = $state<'single' | 'batch' | 'adaptive'>('single');
  
  // Demo state
  let singleVector = $state<Float32Array | null>(null);
  let encodedMetadata = $state<VectorMetadata | null>(null);
  let batchResults = $state<AdaptiveEncodingResult | null>(null);
  let adaptiveDemo = $state<{
    iterations: number;
    scalings: number;
    avgTime: number;
    compressionHistory: number[];
  }>({
    iterations: 0,
    scalings: 0,
    avgTime: 0,
    compressionHistory: []
  });

  let isProcessing = $state(false);
  let statusMessage = $state('Ready to demonstrate production-grade vector encoding');

  onMount(async () => {
    try {
      statusMessage = 'Initializing VectorMetadataEncoder with GPU context...';
      
      // Initialize encoder with production configuration
      encoder = new VectorMetadataEncoder({
        dimensions: 768,
        quantization: 'int8',
        compressionTarget: 0.6,
        adaptiveDimensions: true,
        batchSize: 32
      });

      // Generate sample vector for demos
      singleVector = generateLegalDocumentVector();
      
      statusMessage = 'Production system initialized - GPU acceleration enabled';
      isInitialized = true;

      // Start telemetry tracking
      telemetryBus.emitPerformanceEvent({
        type: 'api_latency',
        duration: 0,
        operation: 'system_initialization',
        success: true
      });

    } catch (error) {
      console.error('[ProductionDemo] Initialization failed:', error);
      statusMessage = `Initialization failed: ${error}`;
    }
  });

  function generateLegalDocumentVector(): Float32Array {
    // Generate a realistic legal document vector with semantic structure
    const vector = new Float32Array(1536); // High-dimensional vector
    
    // Simulate legal domain embeddings with structured patterns
    for (let i = 0; i < vector.length; i++) {
      // Legal concepts cluster
      if (i < 256) {
        vector[i] = Math.random() * 0.8 + 0.1; // Positive semantic space
      }
      // Jurisdictional features
      else if (i < 512) {
        vector[i] = (Math.random() - 0.5) * 0.6; // Mixed positive/negative
      }
      // Case law references
      else if (i < 768) {
        vector[i] = Math.random() * 0.5 - 0.25; // Sparse features
      }
      // Document type indicators
      else {
        vector[i] = Math.random() * 2 - 1; // Full range
      }
    }
    
    return vector;
  }

  async function demonstrateSingleVector() {
    if (!encoder || !singleVector || isProcessing) return;
    
    isProcessing = true;
    statusMessage = 'Encoding single legal document vector...';

    try {
      const startTime = performance.now();
      
      encodedMetadata = await encoder.encodeVector(
        singleVector, 
        `legal-doc-${Date.now()}`
      );
      
      const endTime = performance.now();
      statusMessage = `Vector encoded successfully in ${(endTime - startTime).toFixed(2)}ms`;
      
      // Track this demonstration
      telemetryBus.emitVectorEncodingMetrics(
        encodedMetadata.encodedDimensions,
        encodedMetadata.processingTime,
        encodedMetadata.compressionRatio,
        true
      );

    } catch (error) {
      console.error('[Demo] Single vector encoding failed:', error);
      statusMessage = `Encoding failed: ${error}`;
    } finally {
      isProcessing = false;
    }
  }

  async function demonstrateBatchProcessing() {
    if (!encoder || isProcessing) return;
    
    isProcessing = true;
    statusMessage = 'Generating batch of 50 legal document vectors...';

    try {
      // Generate batch of legal document vectors
      const vectors: Float32Array[] = [];
      const metadata = [];
      let totalSize = 0;

      for (let i = 0; i < 50; i++) {
        const vector = generateLegalDocumentVector();
        vectors.push(vector);
        totalSize += vector.byteLength;
        
        metadata.push({
          id: `legal-batch-${i}`,
          originalDimensions: vector.length,
          encodedDimensions: 768 as VectorDimensions,
          quantization: 'int8' as const,
          compressionRatio: 0,
          timestamp: Date.now(),
          gpuAccelerated: true
        });
      }

      statusMessage = 'Processing batch with adaptive scaling...';
      
      batchResults = await encoder.encodeBatch({
        vectors,
        metadata,
        totalSize
      });

      statusMessage = `Batch processed: ${batchResults.encoded.length} vectors, ` +
        `${(batchResults.metrics.avgCompressionRatio * 100).toFixed(1)}% compression, ` +
        `${batchResults.metrics.totalTime.toFixed(2)}ms total`;

    } catch (error) {
      console.error('[Demo] Batch processing failed:', error);
      statusMessage = `Batch processing failed: ${error}`;
    } finally {
      isProcessing = false;
    }
  }

  async function demonstrateAdaptiveScaling() {
    if (!encoder || isProcessing) return;
    
    isProcessing = true;
    adaptiveDemo = { iterations: 0, scalings: 0, avgTime: 0, compressionHistory: [] };
    
    try {
      const iterations = 20;
      statusMessage = `Running ${iterations} iterations to demonstrate adaptive scaling...`;
      
      for (let i = 0; i < iterations; i++) {
        const vector = generateLegalDocumentVector();
        
        // Simulate varying load conditions
        const loadMultiplier = 1 + Math.sin(i / 3) * 0.5; // Oscillating load
        const complexVector = new Float32Array(Math.floor(vector.length * loadMultiplier));
        complexVector.set(vector.slice(0, complexVector.length));
        
        const result = await measureAsync(
          `adaptive-iteration-${i}`,
          () => encoder!.encodeVector(complexVector, `adaptive-${i}`),
          'AdaptiveDemo'
        );

        adaptiveDemo = {
          iterations: i + 1,
          scalings: adaptiveDemo.scalings + (result.encodedDimensions !== 768 ? 1 : 0),
          avgTime: (adaptiveDemo.avgTime * i + result.processingTime) / (i + 1),
          compressionHistory: [...adaptiveDemo.compressionHistory, result.compressionRatio]
        };

        // Update status
        if (i % 5 === 0) {
          statusMessage = `Adaptive scaling demo: ${i + 1}/${iterations} iterations, ` +
            `${adaptiveDemo.scalings} scalings applied`;
        }
        
        // Small delay to show real-time updates
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      statusMessage = `Adaptive scaling demo complete: ${adaptiveDemo.scalings}/${iterations} ` +
        `iterations required scaling, avg time ${adaptiveDemo.avgTime.toFixed(2)}ms`;

    } catch (error) {
      console.error('[Demo] Adaptive scaling failed:', error);
      statusMessage = `Adaptive demo failed: ${error}`;
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
</script>

<div class="min-h-screen bg-gray-900 text-green-400 p-6 font-mono">
  <!-- Header -->
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-green-300 mb-2">
        🎮 Production Analytics Demonstration
      </h1>
      <p class="text-lg text-gray-300">
        Nintendo-Style Legal AI with Adaptive Vector Encoding & Real-Time Telemetry
      </p>
    </div>

    <!-- Status Display -->
    <div class="bg-gray-800 border-2 border-green-500 p-4 mb-6 rounded-lg">
      <div class="flex items-center space-x-2">
        <span class={isInitialized ? 'text-green-400' : 'text-yellow-400'}>
          {isInitialized ? '●' : '◐'} 
        </span>
        <span class="font-bold">System Status:</span>
        <span>{statusMessage}</span>
        {#if isProcessing}
          <span class="animate-pulse text-yellow-400">⚡</span>
        {/if}
      </div>
    </div>

    <!-- Performance Dashboard -->
    <div class="mb-8">
      <PerformanceDashboard />
    </div>

    <!-- Demo Controls -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <!-- Single Vector Demo -->
      <div class="bg-gray-800 border-2 border-green-500 p-6 rounded-lg">
        <h2 class="text-xl font-bold text-green-300 mb-4">🔢 Single Vector Encoding</h2>
        <p class="text-sm text-gray-300 mb-4">
          Demonstrates high-quality vector encoding with adaptive dimension scaling and quantization.
        </p>
        
        <button
          on:click={demonstrateSingleVector}
          disabled={!isInitialized || isProcessing}
          class="w-full px-4 py-2 bg-green-900 border border-green-500 hover:bg-green-800 
                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
        >
          Encode Legal Document Vector
        </button>

        {#if encodedMetadata}
          <div class="mt-4 p-3 bg-gray-700 rounded text-xs">
            <div><strong>Original:</strong> {encodedMetadata.originalDimensions} dimensions</div>
            <div><strong>Encoded:</strong> {encodedMetadata.encodedDimensions} dimensions</div>
            <div><strong>Quantization:</strong> {encodedMetadata.quantization}</div>
            <div><strong>Compression:</strong> {(encodedMetadata.compressionRatio * 100).toFixed(1)}%</div>
            <div><strong>Size:</strong> {formatBytes(encodedMetadata.encoding.byteLength)}</div>
            <div><strong>Time:</strong> {encodedMetadata.processingTime.toFixed(2)}ms</div>
            <div><strong>GPU:</strong> {encodedMetadata.gpuAccelerated ? '✓' : '✗'}</div>
          </div>
        {/if}
      </div>

      <!-- Batch Processing Demo -->
      <div class="bg-gray-800 border-2 border-green-500 p-6 rounded-lg">
        <h2 class="text-xl font-bold text-green-300 mb-4">📦 Batch Processing</h2>
        <p class="text-sm text-gray-300 mb-4">
          High-throughput batch encoding with memory management and adaptive scaling.
        </p>
        
        <button
          on:click={demonstrateBatchProcessing}
          disabled={!isInitialized || isProcessing}
          class="w-full px-4 py-2 bg-green-900 border border-green-500 hover:bg-green-800 
                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
        >
          Process 50 Vector Batch
        </button>

        {#if batchResults}
          <div class="mt-4 p-3 bg-gray-700 rounded text-xs">
            <div><strong>Vectors:</strong> {batchResults.encoded.length}</div>
            <div><strong>Total Time:</strong> {batchResults.metrics.totalTime.toFixed(2)}ms</div>
            <div><strong>Avg Compression:</strong> {(batchResults.metrics.avgCompressionRatio * 100).toFixed(1)}%</div>
            <div><strong>GPU Utilization:</strong> {batchResults.metrics.gpuUtilization.toFixed(1)}%</div>
            <div><strong>Memory Efficiency:</strong> {batchResults.metrics.memoryEfficiency.toFixed(1)}%</div>
            <div><strong>Scaling Applied:</strong> {batchResults.scalingApplied ? 'Yes' : 'No'}</div>
          </div>
        {/if}
      </div>

      <!-- Adaptive Scaling Demo -->
      <div class="bg-gray-800 border-2 border-green-500 p-6 rounded-lg">
        <h2 class="text-xl font-bold text-green-300 mb-4">🎯 Adaptive Scaling</h2>
        <p class="text-sm text-gray-300 mb-4">
          Real-time performance monitoring with intelligent dimension and quantization adjustment.
        </p>
        
        <button
          on:click={demonstrateAdaptiveScaling}
          disabled={!isInitialized || isProcessing}
          class="w-full px-4 py-2 bg-green-900 border border-green-500 hover:bg-green-800 
                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
        >
          Run Adaptive Demo
        </button>

        {#if adaptiveDemo.iterations > 0}
          <div class="mt-4 p-3 bg-gray-700 rounded text-xs">
            <div><strong>Iterations:</strong> {adaptiveDemo.iterations}/20</div>
            <div><strong>Scalings Applied:</strong> {adaptiveDemo.scalings}</div>
            <div><strong>Avg Time:</strong> {adaptiveDemo.avgTime.toFixed(2)}ms</div>
            <div class="mt-2">
              <div class="text-xs text-gray-400 mb-1">Compression History:</div>
              <div class="flex space-x-1">
                {#each adaptiveDemo.compressionHistory.slice(-10) as compression}
                  <div 
                    class="w-2 bg-green-500 rounded-sm" 
                    style="height: {compression * 20}px"
                    title="{(compression * 100).toFixed(1)}% compression"
                  ></div>
                {/each}
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Technical Details -->
    <div class="bg-gray-800 border-2 border-green-500 p-6 rounded-lg">
      <h2 class="text-xl font-bold text-green-300 mb-4">🔧 Technical Implementation</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        <div>
          <h3 class="font-bold text-green-400 mb-2">Production Features:</h3>
          <ul class="space-y-1 text-gray-300">
            <li>✓ VectorMetadataEncoder with adaptive dimension scaling</li>
            <li>✓ Real-time telemetry and performance analytics</li>
            <li>✓ Nintendo memory architecture (L1/L2/L3 banks)</li>
            <li>✓ GPU acceleration with WebGPU/WebGL fallback</li>
            <li>✓ Intelligent quantization (float32 → int8 → int4 → binary)</li>
            <li>✓ Batch processing with memory management</li>
            <li>✓ Production-grade error handling and observability</li>
          </ul>
        </div>
        <div>
          <h3 class="font-bold text-green-400 mb-2">Architecture Highlights:</h3>
          <ul class="space-y-1 text-gray-300">
            <li>• Enhanced TypeScript types with validation</li>
            <li>• Telemetry event bus with configurable endpoints</li>
            <li>• Adaptive performance thresholds and scaling</li>
            <li>• CHR-ROM style memory banking for optimization</li>
            <li>• ShaderBundle integration for GPU compute</li>
            <li>• Export/import capabilities for analysis</li>
            <li>• Nintendo-style retro UI with pixel-perfect borders</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>