<!-- @migration-task Error while migrating Svelte code: Expected token }
https://svelte.dev/e/expected_token -->
<!-- @migration-task Error while migrating Svelte code: Expected token } -->
<!--
  WebGPU Array Utils Demo Component
  Demonstrates Float32Array vs ArrayBuffer handling and quantization
  Author: Claude Code Integration
-->
<script lang="ts">
  import 'nes.css/css/nes.min.css';
</script>
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/enhanced-bits';
  // Card components removed - using native HTML elements
  import {
    ensureFloat32Array,
    quantizeToFP16,
    quantizeToINT8,
    analyzeMemoryUsage,
    type ArrayConversionResult,
    type SupportedArrayTypes
  } from '$lib/utils/webgpu-array-utils';
  import { webgpuRAGService } from '$lib/webgpu/webgpu-rag-service';

  // Component state
  let webgpuSupported = $state(false);
  let isProcessing = $state(false);
  let results: {
    original?: { type: string; size: number; };
    normalized?: { type: string; size: number; };
    fp16?: ArrayConversionResult;
    int8?: ArrayConversionResult;
    memoryAnalysis?: Array({});

  // Sample data demonstrating the mismatch problem
  const sampleData = {
    arrayBuffer: new ArrayBuffer(1024 * 4), // 4KB raw buffer
    float32Array: new Float32Array(1024),   // 4KB typed array
    numberArray: Array.from({ length: 1024 }, (_, i) => Math.random() * 2 - 1), // Plain JS array
    mixedPrecision: new Float64Array(512)   // 8-byte doubles
  };

  // Initialize sample data
  onMount(() => {
    // Fill ArrayBuffer with random data (simulating buffer from another system)
    const view = new Float32Array(sampleData.arrayBuffer);
    for (let i = 0; i < view.length; i++) {
      view[i] = Math.random() * 2 - 1;
    }

    // Fill Float32Array
    for (let i = 0; i < sampleData.float32Array.length; i++) {
      sampleData.float32Array[i] = Math.random() * 2 - 1;
    }

    // Fill Float64Array
    for (let i = 0; i < sampleData.mixedPrecision.length; i++) {
      sampleData.mixedPrecision[i] = Math.random() * 2 - 1;
    }

    // Check WebGPU support
    webgpuSupported = typeof navigator !== 'undefined' && !!navigator.gpu;
    console.log('🔍 WebGPU supported:', webgpuSupported);
  });

  async function demonstrateArrayHandling(dataType: keyof typeof sampleData) {
    isProcessing = true;
    results = {};

    try {
      console.log(`🔧 Demonstrating array handling for: ${dataType}`);
      
      const sourceData = sampleData[dataType] as SupportedArrayTypes;
      
      // Step 1: Show original data info
      results.original = {
        type: sourceData.constructor.name,
        size: sourceData.byteLength || (sourceData as any).length * 4
      };

      // Step 2: Normalize to Float32Array (fixes the mismatch!)
      const normalized = ensureFloat32Array(sourceData);
      results.normalized = {
        type: normalized.constructor.name,
        size: normalized.byteLength
      };

      // Step 3: Demonstrate quantization options
      results.fp16 = quantizeToFP16(normalized);
      results.int8 = quantizeToINT8(normalized);

      // Step 4: Memory analysis
      results.memoryAnalysis = analyzeMemoryUsage(normalized);

      // Step 5: Test with WebGPU service if available
      if (webgpuSupported) {
        results.webgpuTest = await webgpuRAGService.processEmbeddings([normalized]);
      }

      console.log('✅ Array handling demonstration complete');
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
    } finally {
      isProcessing = false;
    }
  }

  async function testWebGPUIntegration() {
    isProcessing = true;
    
    try {
      console.log('🚀 Testing WebGPU RAG service integration...');
      
      const testEmbedding = new Float32Array(768);
      for (let i = 0; i < testEmbedding.length; i++) {
        testEmbedding[i] = Math.random() * 2 - 1;
      }

      const ragResult = await webgpuRAGService.processQuery('Test legal document analysis', {
        embeddings: testEmbedding,
        memoryBudgetMB: 256,
        quantization: { precision: 'fp16' }
      });

      results.webgpuTest = ragResult;
      console.log('✅ WebGPU integration test complete');
      
    } catch (error) {
      console.error('❌ WebGPU test failed:', error);
    } finally {
      isProcessing = false;
    }
  }
</script>

<div class="webgpu-array-demo p-6 space-y-6">
  <!-- Header -->
  <div class="text-center mb-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
      WebGPU Array Utils Demo
    </h1>
    <p class="text-lg text-gray-600 dark:text-gray-400">
      Solving Float32Array vs ArrayBuffer mismatches with quantization
    </p>
    <div class="mt-4 flex justify-center items-center gap-2">
      <div class="w-3 h-3 rounded-full {webgpuSupported ? 'bg-green-500' : 'bg-red-500'}"></div>
      <span class="text-sm font-medium">
        WebGPU {webgpuSupported ? 'Supported' : 'Not Available'}
      </span>
    </div>
  </div>

  <!-- Data Type Testing Buttons -->
  <div.Root>
    <div.Header>
      <div.Title>🧪 Test Different Array Types</div.Title>
      <div.Description>
        Demonstrate how the utility handles various input formats that commonly cause WebGPU mismatches
      </div.Description>
    </div.Header>
    <div.Content>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button class="nes-btn" 
          on:click={() => demonstrateArrayHandling('arrayBuffer')}
          disabled={isProcessing}
          class="flex flex-col items-center p-4 h-auto"
        >
          <div class="text-2xl mb-2">🔢</div>
          <span class="text-sm">ArrayBuffer</span>
          <span class="text-xs text-gray-500">Raw binary</span>
        </button>
        
        <button class="nes-btn" 
          on:click={() => demonstrateArrayHandling('float32Array')}
          disabled={isProcessing}
          class="flex flex-col items-center p-4 h-auto"
        >
          <div class="text-2xl mb-2">📊</div>
          <span class="text-sm">Float32Array</span>
          <span class="text-xs text-gray-500">Typed view</span>
        </button>
        
        <button class="nes-btn" 
          on:click={() => demonstrateArrayHandling('numberArray')}
          disabled={isProcessing}
          class="flex flex-col items-center p-4 h-auto"
        >
          <div class="text-2xl mb-2">📝</div>
          <span class="text-sm">number[]</span>
          <span class="text-xs text-gray-500">Plain JS</span>
        </button>
        
        <button class="nes-btn" 
          on:click={() => demonstrateArrayHandling('mixedPrecision')}
          disabled={isProcessing}
          class="flex flex-col items-center p-4 h-auto"
        >
          <div class="text-2xl mb-2">🔄</div>
          <span class="text-sm">Float64Array</span>
          <span class="text-xs text-gray-500">Double precision</span>
        </button>
      </div>
    </div.Content>
  </div.Root>

  <!-- WebGPU Integration Test -->
  {#if webgpuSupported}
    <div.Root>
      <div.Header>
        <div.Title>⚡ WebGPU Integration Test</div.Title>
        <div.Description>
          Test the array utilities with the actual WebGPU RAG service
        </div.Description>
      </div.Header>
      <div.Content>
        <Button 
          on:click={testWebGPUIntegration}
          disabled={isProcessing}
          class="w-full"
        >
{isProcessing ? 'Testing...' : '🚀 Test WebGPU RAG Service'}

      </div.Content>
    </div.Root>
  {/if}

  <!-- Results Display -->
  {#if Object.keys(results).length > 0}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Type Conversion Results -->
      {#if results.original && results.normalized}
        <div.Root>
          <div.Header>
            <div.Title>🔧 Type Normalization</div.Title>
          </div.Header>
          <div.Content class="space-y-4">
            <div class="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div>
                <div class="font-medium text-red-900 dark:text-red-100">Original</div>
                <div class="text-sm text-red-700 dark:text-red-300">{results.original.type}</div>
              </div>
              <div class="text-right">
                <div class="font-mono text-sm">{(results.original.size / 1024).toFixed(1)}KB</div>
              </div>
            </div>
            
            <div class="flex justify-center">
              <div class="text-2xl">⬇️</div>
            </div>
            
            <div class="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div>
                <div class="font-medium text-green-900 dark:text-green-100">Normalized</div>
                <div class="text-sm text-green-700 dark:text-green-300">{results.normalized.type}</div>
              </div>
              <div class="text-right">
                <div class="font-mono text-sm">{(results.normalized.size / 1024).toFixed(1)}KB</div>
              </div>
            </div>
          </div.Content>
        </div.Root>
      {/if}

      <!-- Quantization Results -->
      {#if results.fp16 && results.int8}
        <div.Root>
          <div.Header>
            <div.Title>🗜️ Quantization Results</div.Title>
          </div.Header>
          <div.Content class="space-y-4">
            <div class="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div>
                <div class="font-medium text-blue-900 dark:text-blue-100">FP16 Quantization</div>
                <div class="text-sm text-blue-700 dark:text-blue-300">Half precision</div>
              </div>
              <div class="text-right">
                <div class="font-mono text-sm">{results.fp16.compressionRatio}x smaller</div>
                <div class="text-xs text-blue-600">{(results.fp16.compressedSize / 1024).toFixed(1)}KB</div>
              </div>
            </div>
            
            <div class="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div>
                <div class="font-medium text-purple-900 dark:text-purple-100">INT8 Quantization</div>
                <div class="text-sm text-purple-700 dark:text-purple-300">8-bit integers</div>
              </div>
              <div class="text-right">
                <div class="font-mono text-sm">{results.int8.compressionRatio}x smaller</div>
                <div class="text-xs text-purple-600">{(results.int8.compressedSize / 1024).toFixed(1)}KB</div>
              </div>
            </div>
          </div.Content>
        </div.Root>
      {/if}

      <!-- Memory Analysis -->
      {#if results.memoryAnalysis}
        <div.Root class="lg:col-span-2">
          <div.Header>
            <div.Title>📊 Memory Usage Analysis</div.Title>
          </div.Header>
          <div.Content>
            <div class="grid grid-cols-4 gap-4">
              {#each results.memoryAnalysis as analysis}
                <div class="text-center p-4 border rounded-lg">
                  <div class="font-bold text-lg text-gray-900 dark:text-gray-100">
                    {analysis.precision.toUpperCase()}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {(analysis.sizeBytes / 1024).toFixed(1)}KB
                  </div>
                  <div class="text-xs mt-2 font-mono">
                    {analysis.compressionRatio.toFixed(1)}x
                  </div>
                </div>
              {/each}
            </div>
          </div.Content>
        </div.Root>
      {/if}

      <!-- WebGPU Test Results -->
      {#if results.webgpuTest}
        <div.Root class="lg:col-span-2">
          <div.Header>
            <div.Title>🚀 WebGPU Service Results</div.Title>
          </div.Header>
          <div.Content>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div class="font-medium text-gray-900 dark:text-gray-100">Buffers Created</div>
                <div class="text-gray-600 dark:text-gray-400">{results.webgpuTest.buffersCreated || 'N/A'}</div>
              </div>
              <div>
                <div class="font-medium text-gray-900 dark:text-gray-100">Average Compression</div>
                <div class="text-gray-600 dark:text-gray-400">{results.webgpuTest.averageCompression?.toFixed(1) || 'N/A'}x</div>
              </div>
              <div>
                <div class="font-medium text-gray-900 dark:text-gray-100">Memory Optimized</div>
                <div class="text-gray-600 dark:text-gray-400">{results.webgpuTest.memoryOptimized ? '✅ Yes' : '❌ No'}</div>
              </div>
              <div>
                <div class="font-medium text-gray-900 dark:text-gray-100">WebGPU Accelerated</div>
                <div class="text-gray-600 dark:text-gray-400">{results.webgpuTest.webgpuAccelerated ? '⚡ Yes' : '🐌 No'}</div>
              </div>
            </div>
            
            {#if results.webgpuTest.quantizationApplied}
              <div class="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div class="font-medium text-yellow-900 dark:text-yellow-100 mb-2">Quantization Applied</div>
                <div class="text-sm text-yellow-700 dark:text-yellow-300">
                  Precision: {results.webgpuTest.quantizationApplied.precision} • 
                  Compression: {results.webgpuTest.quantizationApplied.compressionRatio}x • 
                  Memory Saved: {results.webgpuTest.quantizationApplied.memorySavedMB.toFixed(2)}MB
                </div>
              </div>
            {/if}
          </div.Content>
        </div.Root>
      {/if}
    </div>
  {/if}

  <!-- Usage Guide -->
  <div.Root class="bg-gray-50 dark:bg-gray-800">
    <div.Header>
      <div.Title>💡 Integration Guide</div.Title>
    </div.Header>
    <div.Content class="text-sm space-y-3">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">The Problem</h4>
          <ul class="space-y-1 text-gray-600 dark:text-gray-400">
            <li>• ArrayBuffer vs Float32Array mismatches</li>
            <li>• Different data sources (APIs, files, workers)</li>
            <li>• Memory usage with large embeddings</li>
            <li>• WebGPU buffer creation failures</li>
          </ul>
        </div>
        
        <div>
          <h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">The Solution</h4>
          <ul class="space-y-1 text-gray-600 dark:text-gray-400">
            <li>• ensureFloat32Array() normalizes types</li>
            <li>• Quantization reduces memory by 50-75%</li>
            <li>• Adaptive precision based on GPU memory</li>
            <li>• Direct WebGPU buffer creation</li>
          </ul>
        </div>
      </div>
      
      <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <code class="text-xs">
          import {{ ensureFloat32Array, createWebGPUBuffer }} from '$lib/utils/webgpu-array-utils';<br/>
          const safeArray = ensureFloat32Array(anyArrayType);<br/>
          const {{ buffer }} = createWebGPUBuffer(device, safeArray, usage, {{ precision: 'fp16' }});
        </code>
      </div>
    </div.Content>
  </div.Root>
</div>

<style>
  .webgpu-array-demo {
    max-width: 1200px;
    margin: 0 auto;
  }
</style>
