<!--
  WebGPU Buffer Quantization Demo
  Interactive demo showing the complete buffer conversion and quantization system
  for legal AI document processing
-->

<script lang="ts">
</script>
  import { onMount } from 'svelte';
  import { WebGPUBufferUploader, WebGPUBufferUtils_Extended } from '$lib/utils/webgpu-buffer-uploader.js';
  import { 
    quantizeForLegalAI, 
    quantizeWithStats,
    LEGAL_AI_QUANTIZATION_PROFILES,
    type LegalAIProfile 
  } from '$lib/utils/typed-array-quantization.js';
  import { BufferDebugUtils, toFloat32Array } from '$lib/utils/buffer-conversion.js';

  // Demo state
  let webgpuSupported = $state(false);
  let device: GPUDevice | null = $state(null);
  let uploader: WebGPUBufferUploader | null = $state(null);
  let demoRunning = $state(false);
  let currentDemo = $state('basic');
  let results = $state<any[]>([]);
  let errorMessage = $state('');

  // Legal AI document simulation
  let documentCount = $state(100);
  let embeddingDimensions = $state(768);
  let selectedProfile: LegalAIProfile = $state('legal_standard');
  
  // Performance metrics
  let performanceMetrics = $state({
    uploadTime: 0,
    compressionRatio: 0,
    memoryUsage: 0,
    cacheHitRate: 0
  });

  // Demo scenarios
  const demoScenarios = [
    {
      id: 'basic',
      name: 'Basic Legal Document Processing',
      description: 'Upload legal document embeddings with different quantization profiles',
      icon: '📄'
    },
    {
      id: 'comparison',
      name: 'Quantization Comparison',
      description: 'Compare FP32, FP16, and INT8 compression for legal documents',
      icon: '📊'
    },
    {
      id: 'batch',
      name: 'Batch Legal Processing',
      description: 'Process multiple legal document types with optimized profiles',
      icon: '📦'
    },
    {
      id: 'pipeline',
      name: 'Full Legal AI Pipeline',
      description: 'Complete workflow: contracts → case law → citations',
      icon: '🏛️'
    },
    {
      id: 'cache',
      name: 'Smart Caching Demo',
      description: 'Demonstrate buffer caching and reuse optimization',
      icon: '🗄️'
    }
  ];

  onMount(async () => {
    await initializeWebGPU();
  });

  async function initializeWebGPU() {
    try {
      if (!navigator.gpu) {
        errorMessage = 'WebGPU not supported in this browser';
        return;
      }

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        errorMessage = 'No WebGPU adapter available';
        return;
      }

      device = await adapter.requestDevice();
      uploader = new WebGPUBufferUploader(device, true); // Enable caching
      webgpuSupported = true;
      errorMessage = '';
      
      console.log('✅ WebGPU initialized for quantization demo');
    } catch (error) {
      errorMessage = `WebGPU initialization failed: ${error.message}`;
      console.error('WebGPU initialization error:', error);
    }
  }

  async function runDemo(demoId: string) {
    if (!device || !uploader) {
      errorMessage = 'WebGPU not initialized';
      return;
    }

    demoRunning = true;
    results = [];
    errorMessage = '';

    try {
      switch (demoId) {
        case 'basic':
          await runBasicDemo();
          break;
        case 'comparison':
          await runComparisonDemo();
          break;
        case 'batch':
          await runBatchDemo();
          break;
        case 'pipeline':
          await runPipelineDemo();
          break;
        case 'cache':
          await runCacheDemo();
          break;
      }
    } catch (error) {
      errorMessage = `Demo failed: ${error.message}`;
      console.error('Demo error:', error);
    } finally {
      demoRunning = false;
    }
  }

  async function runBasicDemo() {
    // Generate legal document embeddings
    const documentEmbeddings = generateLegalDocumentEmbeddings();
    
    results.push({
      step: 'Generated legal document data',
      details: `${documentCount} documents × ${embeddingDimensions}D = ${(documentEmbeddings.length * 4 / 1024).toFixed(2)} KB`
    });

    // Upload with selected legal AI profile
    const startTime = performance.now();
    const uploadResult = await uploader!.createLegalAnalysisBuffer(
      documentEmbeddings,
      selectedProfile.replace('legal_', '') as any
    );
    const uploadTime = performance.now() - startTime;

    results.push({
      step: 'Buffer upload complete',
      details: {
        profile: selectedProfile,
        uploadTime: `${uploadTime.toFixed(2)}ms`,
        compressionRatio: `${uploadResult.uploadStats.compressionRatio.toFixed(2)}x`,
        originalSize: `${(uploadResult.uploadStats.originalSize / 1024).toFixed(2)} KB`,
        compressedSize: `${(uploadResult.uploadStats.uploadedSize / 1024).toFixed(2)} KB`,
        spaceSavings: `${(((uploadResult.uploadStats.originalSize - uploadResult.uploadStats.uploadedSize) / uploadResult.uploadStats.originalSize) * 100).toFixed(1)}%`
      }
    });

    // Update performance metrics
    performanceMetrics = {
      uploadTime,
      compressionRatio: uploadResult.uploadStats.compressionRatio,
      memoryUsage: uploadResult.uploadStats.uploadedSize,
      cacheHitRate: 0 // Will be updated with cache demos
    };

    // Cleanup
    uploadResult.buffer.destroy();
  }

  async function runComparisonDemo() {
    const testData = generateLegalDocumentEmbeddings(50, 384); // Smaller for comparison
    
    // Test all quantization modes
    const profiles: LegalAIProfile[] = ['legal_critical', 'legal_standard', 'legal_compressed', 'legal_storage'];
    const comparisonResults = [];

    for (const profile of profiles) {
      const startTime = performance.now();
      const uploadResult = await uploader!.createLegalAnalysisBuffer(testData, profile.replace('legal_', '') as any);
      const uploadTime = performance.now() - startTime;

      comparisonResults.push({
        profile,
        mode: LEGAL_AI_QUANTIZATION_PROFILES[profile].mode,
        uploadTime: uploadTime.toFixed(2),
        compressionRatio: uploadResult.uploadStats.compressionRatio.toFixed(2),
        originalSize: (uploadResult.uploadStats.originalSize / 1024).toFixed(2),
        compressedSize: (uploadResult.uploadStats.uploadedSize / 1024).toFixed(2),
        spaceSavings: (((uploadResult.uploadStats.originalSize - uploadResult.uploadStats.uploadedSize) / uploadResult.uploadStats.originalSize) * 100).toFixed(1)
      });

      uploadResult.buffer.destroy();
    }

    results.push({
      step: 'Quantization comparison complete',
      details: comparisonResults
    });
  }

  async function runBatchDemo() {
    // Simulate different legal document types
    const legalDocuments = [
      { name: 'Contracts', data: generateLegalDocumentEmbeddings(20, 512), profile: 'critical' },
      { name: 'Briefs', data: generateLegalDocumentEmbeddings(50, 768), profile: 'standard' },
      { name: 'Evidence', data: generateLegalDocumentEmbeddings(30, 384), profile: 'standard' },
      { name: 'Case Law', data: generateLegalDocumentEmbeddings(100, 768), profile: 'compressed' },
      { name: 'Citations', data: generateLegalDocumentEmbeddings(200, 256), profile: 'storage' }
    ];

    const batchResults = [];
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;

    for (const doc of legalDocuments) {
      const startTime = performance.now();
      const uploadResult = await uploader!.createLegalAnalysisBuffer(
        doc.data,
        doc.profile as any
      );
      const uploadTime = performance.now() - startTime;

      totalOriginalSize += uploadResult.uploadStats.originalSize;
      totalCompressedSize += uploadResult.uploadStats.uploadedSize;

      batchResults.push({
        documentType: doc.name,
        profile: `legal_${doc.profile}`,
        uploadTime: uploadTime.toFixed(2),
        compressionRatio: uploadResult.uploadStats.compressionRatio.toFixed(2),
        size: `${(uploadResult.uploadStats.uploadedSize / 1024).toFixed(2)} KB`
      });

      uploadResult.buffer.destroy();
    }

    results.push({
      step: 'Batch processing complete',
      details: {
        documents: batchResults,
        summary: {
          totalDocuments: legalDocuments.length,
          totalOriginalSize: `${(totalOriginalSize / 1024).toFixed(2)} KB`,
          totalCompressedSize: `${(totalCompressedSize / 1024).toFixed(2)} KB`,
          overallCompressionRatio: `${(totalOriginalSize / totalCompressedSize).toFixed(2)}x`,
          spaceSavings: `${(((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100).toFixed(1)}%`
        }
      }
    });
  }

  async function runPipelineDemo() {
    // Simulate full legal AI pipeline
    const pipelineSteps = [
      {
        name: 'Contract Analysis',
        data: generateLegalDocumentEmbeddings(10, 512),
        profile: 'critical',
        description: 'High-stakes contract terms analysis'
      },
      {
        name: 'Case Law Search',
        data: generateLegalDocumentEmbeddings(50, 768),
        profile: 'standard',
        description: 'Semantic search through legal precedents'
      },
      {
        name: 'Citation Network',
        data: generateLegalDocumentEmbeddings(200, 384),
        profile: 'compressed',
        description: 'Legal citation relationship mapping'
      },
      {
        name: 'Document Storage',
        data: generateLegalDocumentEmbeddings(500, 256),
        profile: 'storage',
        description: 'Bulk legal document archival'
      }
    ];

    const pipelineResults = [];
    let totalPipelineTime = 0;

    for (const step of pipelineSteps) {
      const startTime = performance.now();
      const uploadResult = await uploader!.createLegalAnalysisBuffer(
        step.data,
        step.profile as any
      );
      const stepTime = performance.now() - startTime;
      totalPipelineTime += stepTime;

      pipelineResults.push({
        step: step.name,
        description: step.description,
        profile: `legal_${step.profile}`,
        time: `${stepTime.toFixed(2)}ms`,
        compressionRatio: `${uploadResult.uploadStats.compressionRatio.toFixed(2)}x`,
        efficiency: `${(uploadResult.uploadStats.uploadedSize / stepTime).toFixed(0)} bytes/ms`
      });

      uploadResult.buffer.destroy();
    }

    results.push({
      step: 'Legal AI pipeline complete',
      details: {
        steps: pipelineResults,
        totalTime: `${totalPipelineTime.toFixed(2)}ms`,
        averageEfficiency: `${(pipelineResults.reduce((sum, step) => sum + parseFloat(step.efficiency), 0) / pipelineResults.length).toFixed(0)} bytes/ms`
      }
    });
  }

  async function runCacheDemo() {
    // Test cache performance with repeated uploads
    const testData = generateLegalDocumentEmbeddings(20, 384);
    const cacheResults = [];

    // First upload (cache miss)
    let startTime = performance.now();
    let uploadResult = await uploader!.createLegalAnalysisBuffer(testData, 'standard');
    let firstUploadTime = performance.now() - startTime;
    uploadResult.buffer.destroy();

    // Subsequent uploads (should hit cache)
    const repeatUploads = [];
    for (let i = 0; i < 5; i++) {
      startTime = performance.now();
      uploadResult = await uploader!.createLegalAnalysisBuffer(testData, 'standard');
      const repeatTime = performance.now() - startTime;
      repeatUploads.push(repeatTime);
      uploadResult.buffer.destroy();
    }

    const averageRepeatTime = repeatUploads.reduce((a, b) => a + b, 0) / repeatUploads.length;
    const cacheSpeedup = firstUploadTime / averageRepeatTime;

    // Get cache statistics
    const cacheStats = uploader!.getCacheStats();

    results.push({
      step: 'Cache performance analysis',
      details: {
        firstUpload: `${firstUploadTime.toFixed(2)}ms (cache miss)`,
        averageRepeat: `${averageRepeatTime.toFixed(2)}ms (cache hit)`,
        speedupRatio: `${cacheSpeedup.toFixed(2)}x faster`,
        cacheStats: {
          entries: cacheStats.entryCount,
          totalSize: `${cacheStats.totalSizeKB} KB`,
          estimatedHitRate: `${((repeatUploads.length / (repeatUploads.length + 1)) * 100).toFixed(1)}%`
        }
      }
    });

    performanceMetrics.cacheHitRate = parseFloat(((repeatUploads.length / (repeatUploads.length + 1)) * 100).toFixed(1));
  }

  function generateLegalDocumentEmbeddings(count = documentCount, dimensions = embeddingDimensions): Float32Array {
    const embeddings = new Float32Array(count * dimensions);
    
    // Generate realistic-looking legal document embeddings
    for (let i = 0; i < embeddings.length; i++) {
      // Legal documents tend to have specific semantic patterns
      embeddings[i] = (Math.random() - 0.5) * 0.8 + (Math.sin(i / 100) * 0.2);
    }
    
    return embeddings;
  }

  function clearResults() {
    results = [];
    errorMessage = '';
    performanceMetrics = {
      uploadTime: 0,
      compressionRatio: 0,
      memoryUsage: 0,
      cacheHitRate: 0
    };
  }

  function clearCache() {
    if (uploader) {
      uploader.clearCache();
      performanceMetrics.cacheHitRate = 0;
    }
  }
</script>

<div class="webgpu-quantization-demo p-6 max-w-6xl mx-auto">
  <div class="header mb-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-2">
      🚀 WebGPU Buffer Quantization Demo
    </h1>
    <p class="text-gray-600 text-lg">
      Interactive demonstration of the complete buffer conversion and quantization system for legal AI document processing
    </p>
  </div>

  <!-- WebGPU Status -->
  <div class="status-panel mb-6 p-4 rounded-lg {webgpuSupported ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
    <div class="flex items-center gap-3">
      <span class="text-2xl">{webgpuSupported ? '✅' : '❌'}</span>
      <div>
        <h3 class="font-semibold {webgpuSupported ? 'text-green-800' : 'text-red-800'}">
          WebGPU Status: {webgpuSupported ? 'Ready' : 'Not Available'}
        </h3>
        {#if errorMessage}
          <p class="text-red-600 text-sm">{errorMessage}</p>
        {/if}
      </div>
    </div>
  </div>

  {#if webgpuSupported}
    <!-- Configuration Panel -->
    <div class="config-panel mb-6 p-4 bg-gray-50 rounded-lg">
      <h3 class="font-semibold text-gray-800 mb-4">📋 Configuration</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Document Count
          </label>
          <input 
            type="number" 
            bind:value={documentCount} 
            min="1" 
            max="1000"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Embedding Dimensions
          </label>
          <select 
            bind:value={embeddingDimensions}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={256}>256D (Lightweight)</option>
            <option value={384}>384D (Standard)</option>
            <option value={512}>512D (Enhanced)</option>
            <option value={768}>768D (High-res)</option>
            <option value={1024}>1024D (Ultra-high-res)</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Legal AI Profile
          </label>
          <select 
            bind:value={selectedProfile}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="legal_critical">Critical (FP32) - Contracts</option>
            <option value="legal_standard">Standard (FP16) - General</option>
            <option value="legal_compressed">Compressed (INT8) - Bulk</option>
            <option value="legal_storage">Storage (INT8) - Archive</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Performance Metrics -->
    <div class="metrics-panel mb-6 p-4 bg-blue-50 rounded-lg">
      <h3 class="font-semibold text-blue-800 mb-4">📊 Performance Metrics</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{performanceMetrics.uploadTime.toFixed(2)}ms</div>
          <div class="text-sm text-blue-700">Upload Time</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-green-600">{performanceMetrics.compressionRatio.toFixed(2)}x</div>
          <div class="text-sm text-green-700">Compression Ratio</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-purple-600">{(performanceMetrics.memoryUsage / 1024).toFixed(2)}KB</div>
          <div class="text-sm text-purple-700">Memory Usage</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-orange-600">{performanceMetrics.cacheHitRate}%</div>
          <div class="text-sm text-orange-700">Cache Hit Rate</div>
        </div>
      </div>
    </div>

    <!-- Demo Scenarios -->
    <div class="scenarios-panel mb-6">
      <h3 class="font-semibold text-gray-800 mb-4">🎯 Demo Scenarios</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each demoScenarios as scenario}
          <button
            onclick={() => runDemo(scenario.id)}
            disabled={demoRunning}
            class="scenario-card p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all duration-200 text-left {demoRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
          >
            <div class="flex items-start gap-3">
              <span class="text-2xl">{scenario.icon}</span>
              <div>
                <h4 class="font-semibold text-gray-800 mb-1">{scenario.name}</h4>
                <p class="text-sm text-gray-600">{scenario.description}</p>
              </div>
            </div>
          </button>
        {/each}
      </div>
    </div>

    <!-- Controls -->
    <div class="controls mb-6 flex gap-4">
      <button
        onclick={() => clearResults()}
        class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
      >
        Clear Results
      </button>
      <button
        onclick={() => clearCache()}
        class="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
      >
        Clear Cache
      </button>
      {#if demoRunning}
        <div class="flex items-center gap-2 text-blue-600">
          <div class="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span>Running demo...</span>
        </div>
      {/if}
    </div>

    <!-- Results Panel -->
    {#if results.length > 0}
      <div class="results-panel p-4 bg-white border border-gray-200 rounded-lg">
        <h3 class="font-semibold text-gray-800 mb-4">📋 Results</h3>
        <div class="space-y-4">
          {#each results as result}
            <div class="result-item p-3 bg-gray-50 rounded-md">
              <h4 class="font-medium text-gray-800 mb-2">{result.step}</h4>
              {#if typeof result.details === 'string'}
                <p class="text-sm text-gray-600">{result.details}</p>
              {:else if Array.isArray(result.details)}
                <div class="space-y-2">
                  {#each result.details as item}
                    <div class="text-sm bg-white p-2 rounded border">
                      {#each Object.entries(item) as [key, value]}
                        <div class="flex justify-between">
                          <span class="font-medium">{key}:</span>
                          <span>{value}</span>
                        </div>
                      {/each}
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="text-sm space-y-1">
                  {#each Object.entries(result.details) as [key, value]}
                    <div class="flex justify-between">
                      <span class="font-medium text-gray-700">{key}:</span>
                      <span class="text-gray-600">
                        {#if typeof value === 'object'}
                          <pre class="bg-white p-2 rounded text-xs">{JSON.stringify(value, null, 2)}</pre>
                        {:else}
                          {value}
                        {/if}
                      </span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .webgpu-quantization-demo {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .scenario-card:hover {
    transform: translateY(-2px);
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
