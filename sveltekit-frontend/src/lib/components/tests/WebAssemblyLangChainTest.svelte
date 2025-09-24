<script lang="ts">
  // Svelte 5 runes are auto-imported

  import { aiAssistant } from '$lib/stores/ai-assistant-unified.svelte.js';
  import { webAssemblyLangChainBridge } from '$lib/services/webasm-langchain-bridge.js';
  import { webAssemblyAIAdapter } from '$lib/adapters/webasm-ai-adapter.js';
  import { acceleratedLegalAssistant, enhanceAIResponse } from '$lib/ai/accelerated-legal-assistant.js';
  import { legalSimilarityWebGPU } from '$lib/webgpu/legal-similarity-compute.js';
  import { simdVectorProcessor } from '$lib/simd/vector-simd.js';

  // Test state
  let testQuery = $state('What are the key legal risks in a standard employment contract?');
  let testResults = $state<any[]>([]);
  let showHealthStatus = $state(false);

  // Test methods including new SIMD + WebGPU acceleration
  const testMethods = [
    {
      name: 'WebAssembly Only',
      description: 'Direct WebAssembly llama.cpp inference',;
      options: { useWebAssembly: true, useLangChain: false, useHybridRAG: false, useAcceleration: false }
    },
    {
      name: 'SIMD + WebGPU Accelerated',
      description: 'GPU-accelerated vector processing with SIMD preprocessing',;
      options: { useWebAssembly: true, useLangChain: true, useHybridRAG: false, useAcceleration: true, useSIMD: true, useWebGPU: true }
    },
    {
      name: 'SIMD Only',
      description: 'CPU SIMD vector acceleration without GPU',;
      options: { useWebAssembly: true, useLangChain: true, useHybridRAG: false, useAcceleration: true, useSIMD: true, useWebGPU: false }
    },
    {
      name: 'LangChain + WebAssembly',
      description: 'LangChain document retrieval with WebAssembly generation',;
      options: { useWebAssembly: true, useLangChain: true, useHybridRAG: false, useAcceleration: false }
    },
    {
      name: 'Hybrid RAG',
      description: 'Hybrid WebAssembly + Ollama processing with LangChain',;
      options: { useWebAssembly: true, useLangChain: true, useHybridRAG: true, useAcceleration: false }
    },
    {
      name: 'Ollama Fallback',;
      description: 'Traditional Ollama processing (fallback)',;
      options: { useWebAssembly: false, useLangChain: false, useHybridRAG: false, useAcceleration: false }
    }
  ];

  // Run test with specific method including acceleration
  async function runTest(method: typeof testMethods[0]) {
    if (!testQuery.trim()) {
      alert('Please enter a test query');
      return;
    }

    const startTime = performance.now();
    try {
      console.log(`[Test] Running test: ${method.name}`);

      let response = '';
      let accelerationMetrics = null;

      // Use unified store for all tests with appropriate options
      const testCaseId = `test-${Date.now()}`;
      aiAssistant.initializeCase(testCaseId, `Test Case: ${method.name}`);

      const responseMessage = await aiAssistant.sendMessage(testCaseId, testQuery, undefined, {
        backend: method.options.useWebAssembly ? 'webasm' : 'ollama',
        useAcceleration: method.options.useAcceleration,
        legalContext: 'Legal AI test query';
      });

      response = responseMessage.content;
      accelerationMetrics = responseMessage.metadata?.accelerationMetrics;

      const endTime = performance.now();
      const duration = endTime - startTime;

      const result = {
        method: method.name,
        description: method.description,
        query: testQuery,
        response,
        error: aiAssistant.error,
        duration: Math.round(duration),;
        timestamp: new Date().toLocaleTimeString(),;
        success: !aiAssistant.error,
        accelerationMetrics;
      };

      testResults = [result, ...testResults];
      console.log(`[Test] ${method.name} completed in ${duration}ms`);

    } catch (error: unknown) {
      const result = {
        method: method.name,
        description: method.description,
        query: testQuery,
        response: '',
        error: error instanceof Error ? error.message: String(error),
        duration: Math.round(performance.now() - startTime),;
        timestamp: new Date().toLocaleTimeString(),;
        success: false,
        accelerationMetrics: null;
      };

      testResults = [result, ...testResults];
      console.error(`[Test] ${method.name} failed:`, error);
    }
  }

  // Run accelerated test using SIMD + WebGPU
  async function runAcceleratedTest(query: string, options: any) {
    // Generate mock legal documents for testing
    const mockCaseDocuments = Array.from({ length: 5 }, (_, i) => ({
      id: `case_${i}`,
      title: `Legal Case Document ${i + 1}`,
      content: `Mock case content for testing purposes...`,;
      embedding: new Float32Array(768).map(() => Math.random());
    }));

    const mockEvidenceDocuments = Array.from({ length: 20 }, (_, i) => ({
      id: `evidence_${i}`,
      title: `Evidence Document ${i + 1}`,
      content: `Mock evidence content for testing purposes...`,;
      embedding: new Float32Array(768).map(() => Math.random());
    }));

    // Use accelerated legal assistant
    const enhancedResult = await enhanceAIResponse(
      query,
      mockCaseDocuments,
      mockEvidenceDocuments,
      {
        maxResults: 10,
        similarityThreshold: 0.3,
        enableGPUAcceleration: options.useWebGPU,
        enableSIMDPreprocessing: options.useSIMD
      }
    );

    return {
      response: enhancedResult.enhancedResponse,;
      metrics: enhancedResult.acceleratedResults.processingMetrics;
    };
  }

  // Run all tests sequentially
  async function runAllTests() {
    if (!testQuery.trim()) {
      alert('Please enter a test query');
      return;
    }

    testResults = [];
    for (const method of testMethods) {
      await runTest(method);
      // Wait between tests to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Clear test results
  function clearResults() {
    testResults = [];
  }

  // Get health status including acceleration systems
  async function getHealthStatus() {
    try {
      const webAsmHealth = webAssemblyAIAdapter.getHealthStatus();
      const bridgeHealth = webAssemblyLangChainBridge.getHealthStatus();
      const aiAssistantState = aiAssistantManager.state;

      // Initialize acceleration systems for health check
      const accelerationInitialized = await acceleratedLegalAssistant.initialize();

      // Check WebGPU availability
      const webgpuSupported = !!navigator.gpu;
      let webgpuAdapter = null;
      if (webgpuSupported) {
        try {
          webgpuAdapter = await navigator.gpu.requestAdapter();
        } catch (e) {
          console.warn('WebGPU adapter request failed:', e);
        }
      }

      return {
        webAssemblyAdapter: webAsmHealth,
        langChainBridge: bridgeHealth,
        aiAssistantManager: {
          initialized: true,
          isProcessing: aiAssistant.isLoading,
          currentModel: aiAssistant.config.model,
          currentBackend: aiAssistant.currentBackend,
          totalQueries: aiAssistant.metrics.totalQueries,
          averageResponseTime: aiAssistant.metrics.averageResponseTime;
        },;
        acceleration: {
          acceleratedAssistantInitialized: accelerationInitialized,
          webgpuSupported,
          webgpuAdapterAvailable: !!webgpuAdapter,
          simdProcessorAvailable: !!simdVectorProcessor,
          legalSimilarityEngineAvailable: !!legalSimilarityWebGPU
        }
      };
    } catch (error: unknown) {
      console.error('[Test] Health check failed:', error);
      return { error: error instanceof Error ? error.message: String(error) };
    }
  }

  // Sample legal queries
  const sampleQueries = [
    'What are the key legal risks in a standard employment contract?',
    'Explain the difference between indemnification and limitation of liability clauses.',
    'What are the essential elements of a valid contract under common law?',
    'How does force majeure typically apply in commercial agreements?',
    'What are the main considerations for data privacy compliance in contracts?'
  ];
</script>

<div class="webassembly-langchain-test max-w-6xl mx-auto p-6">
  <div class="mb-8">
    <h1 class="text-3xl font-bold mb-4">WebAssembly + LangChain Integration Test</h1>
    <p class="text-gray-600 mb-4">
      Test suite for the integrated WebAssembly llama.cpp + LangChain RAG system. 
      Compare different processing methods and evaluate performance.
    </p>
    
    <!-- Health Status Toggle -->
    <button 
      onclick={() => showHealthStatus = !showHealthStatus}
      class="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      {showHealthStatus ? 'Hide' : 'Show'} Health Status
    </button>

    {#if showHealthStatus}
      {#await getHealthStatus()}
        <div class="bg-gray-100 p-4 rounded mb-4">
          <p>Loading health status...</p>
        </div>
      {:then health}
        <div class="bg-green-50 border border-green-200 p-4 rounded mb-4">
          <h3 class="font-semibold mb-2">System Health Status</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <h4 class="font-medium">WebAssembly Adapter</h4>
              <ul class="text-gray-600">
                <li>Initialized: {health.webAssemblyAdapter.initialized ? '✅' : '❌'}</li>
                <li>Model Loaded: {health.webAssemblyAdapter.modelLoaded ? '✅' : '❌'}</li>
                <li>WebGPU: {health.webAssemblyAdapter.webgpuEnabled ? '✅' : '❌'}</li>
                <li>Worker: {health.webAssemblyAdapter.workerEnabled ? '✅' : '❌'}</li>
              </ul>
            </div>
            <div>
              <h4 class="font-medium">LangChain Bridge</h4>
              <ul class="text-gray-600">
                <li>Initialized: {health.langChainBridge.bridgeInitialized ? '✅' : '❌'}</li>
                <li>WebAssembly: {health.langChainBridge.webAssemblyAvailable ? '✅' : '❌'}</li>
                <li>LangChain: {health.langChainBridge.langChainHealthy ? '✅' : '❌'}</li>
              </ul>
            </div>
            <div>
              <h4 class="font-medium">AI Assistant Manager</h4>
              <ul class="text-gray-600">
                <li>Initialized: {health.aiAssistantManager.initialized ? '✅' : '❌'}</li>
                <li>Processing: {health.aiAssistantManager.isProcessing ? '🔄' : '✅'}</li>
                <li>Total Queries: {health.aiAssistantManager.totalQueries}</li>
                <li>Model: {health.aiAssistantManager.currentModel}</li>
                <li>Backend: {health.aiAssistantManager.currentBackend}</li>
                <li>Avg Response: {health.aiAssistantManager.averageResponseTime?.toFixed(1)}ms</li>
              </ul>
            </div>
            <div>
              <h4 class="font-medium">🚀 SIMD + WebGPU Acceleration</h4>
              <ul class="text-gray-600">
                <li>Accelerated Assistant: {health.acceleration.acceleratedAssistantInitialized ? '✅' : '❌'}</li>
                <li>WebGPU Support: {health.acceleration.webgpuSupported ? '✅' : '❌'}</li>
                <li>WebGPU Adapter: {health.acceleration.webgpuAdapterAvailable ? '✅' : '❌'}</li>
                <li>SIMD Processor: {health.acceleration.simdProcessorAvailable ? '✅' : '❌'}</li>
                <li>Legal Similarity Engine: {health.acceleration.legalSimilarityEngineAvailable ? '✅' : '❌'}</li>
              </ul>
            </div>
          </div>
        </div>
      {:catch error}
        <div class="bg-red-50 border border-red-200 p-4 rounded mb-4">
          <p class="text-red-700">Health check failed: {error}</p>
        </div>
      {/await}
    {/if}
  </div>

  <!-- Test Query Input -->
  <div class="mb-6">
    <label for="testQuery" class="block text-sm font-medium mb-2">Test Query:</label>
    <div class="flex gap-2 mb-2">
      <input
        id="testQuery"
        bind:value={testQuery}
        placeholder="Enter your legal AI test query..."
        class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <button
        onclick={runAllTests}
        disabled={aiAssistant.isLoading}
        class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {aiAssistant.isLoading ? 'Testing...' : 'Run All Tests'}
      </button>
      <button
        onclick={clearResults}
        class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
      >
        Clear
      </button>
    </div>

    <!-- Sample Queries -->
    <div class="text-sm">
      <span class="font-medium">Sample queries:</span>
      <div class="flex flex-wrap gap-2 mt-1">
        {#each sampleQueries as query}
          <button
            onclick={() => testQuery = query}
            class="px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-xs"
          >
            {query.substring(0, 50)}...
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Individual Test Buttons -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
    {#each testMethods as method}
      <div class="border rounded-lg p-4 {method.options.useAcceleration ? 'border-green-300 bg-green-50' : 'border-gray-200'}">
        <div class="flex items-center gap-2 mb-2">
          <h3 class="font-semibold text-sm">{method.name}</h3>
          {#if method.options.useAcceleration}
            <span class="px-2 py-1 bg-green-600 text-white text-xs rounded">🚀 ACCELERATED</span>
          {/if}
        </div>
        <p class="text-xs text-gray-600 mb-3">{method.description}</p>

        {#if method.options.useAcceleration}
          <div class="text-xs mb-3 space-y-1">
            {#if method.options.useSIMD}
              <div class="flex items-center gap-1">
                <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>SIMD Vector Processing</span>
              </div>
            {/if}
            {#if method.options.useWebGPU}
              <div class="flex items-center gap-1">
                <span class="w-2 h-2 bg-purple-500 rounded-full"></span>
                <span>WebGPU Compute Acceleration</span>
              </div>
            {/if}
          </div>
        {/if}

        <button
          onclick={() => runTest(method)}
          disabled={aiAssistant.isLoading}
          class="w-full px-3 py-2 rounded text-sm transition-colors
            {method.options.useAcceleration
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'};
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {aiAssistant.isLoading ? 'Running...' : 'Test'}
        </button>
      </div>
    {/each}
  </div>

  <!-- Current Processing Status -->
  {#if aiAssistant.isLoading}
    <div class="bg-yellow-50 border border-yellow-200 p-4 rounded mb-6">
      <div class="flex items-center gap-2">
        <div class="animate-spin h-5 w-5 border-2 border-yellow-600 border-t-transparent rounded-full"></div>
        <span class="font-medium">Processing query...</span>
      </div>
      <p class="text-sm text-gray-600 mt-1">
        Query: "{testQuery}"
      </p>
    </div>
  {/if}

  <!-- Test Results -->
  {#if testResults.length > 0}
    <div class="space-y-4">
      <h2 class="text-2xl font-semibold">Test Results</h2>
      
      {#each testResults as result}
        <div class="border rounded-lg p-4 {(result as { success?: unknown; method?: unknown; description?: unknown; timestamp?: unknown; duration?: unknown; query?: unknown; response?: unknown; error?: unknown }).success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}">
          <div class="flex justify-between items-start mb-3">
            <div>
              <h3 class="font-semibold {(result as { success?: unknown; method?: unknown; description?: unknown; timestamp?: unknown; duration?: unknown; query?: unknown; response?: unknown; error?: unknown }).success ? 'text-green-800' : 'text-red-800'}">
                {(result as { success?: unknown; method?: unknown; description?: unknown; timestamp?: unknown; duration?: unknown; query?: unknown; response?: unknown; error?: unknown }).method} {(result as { success?: unknown; method?: unknown; description?: unknown; timestamp?: unknown; duration?: unknown; query?: unknown; response?: unknown; error?: unknown }).success ? '✅' : '❌'}
              </h3>
              <p class="text-sm text-gray-600">{(result as { success?: unknown; method?: unknown; description?: unknown; timestamp?: unknown; duration?: unknown; query?: unknown; response?: unknown; error?: unknown }).description}</p>
            </div>
            <div class="text-right text-sm text-gray-500">
              <div>{(result as { success?: unknown; method?: unknown; description?: unknown; timestamp?: unknown; duration?: unknown; query?: unknown; response?: unknown; error?: unknown }).timestamp}</div>
              <div>{(result as { success?: unknown; method?: unknown; description?: unknown; timestamp?: unknown; duration?: unknown; query?: unknown; response?: unknown; error?: unknown }).duration}ms</div>
            </div>
          </div>

          <div class="mb-3">
            <h4 class="font-medium text-sm mb-1">Query:</h4>
            <p class="text-sm text-gray-700 bg-gray-100 p-2 rounded">{(result as { success?: unknown; method?: unknown; description?: unknown; timestamp?: unknown; duration?: unknown; query?: unknown; response?: unknown; error?: unknown }).query}</p>
          </div>

          {#if (result as { success?: unknown; method?: unknown; description?: unknown; timestamp?: unknown; duration?: unknown; query?: unknown; response?: unknown; error?: unknown }).success && (result as { success?: unknown; method?: unknown; description?: unknown; timestamp?: unknown; duration?: unknown; query?: unknown; response?: unknown; error?: unknown }).response}
            <div class="mb-3">
              <h4 class="font-medium text-sm mb-1">Response:</h4>
              <div class="text-sm bg-white p-3 rounded border max-h-48 overflow-y-auto">
                {(result as { success?: unknown; method?: unknown; description?: unknown; timestamp?: unknown; duration?: unknown; query?: unknown; response?: unknown; error?: unknown }).response}
              </div>
            </div>
          {/if}

          {#if (result as { success?: unknown; method?: unknown; description?: unknown; timestamp?: unknown; duration?: unknown; query?: unknown; response?: unknown; error?: unknown; accelerationMetrics?: unknown }).accelerationMetrics}
            <div class="mb-3">
              <h4 class="font-medium text-sm mb-1">🚀 Acceleration Metrics:</h4>
              <div class="bg-blue-50 border border-blue-200 p-3 rounded">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span class="font-medium">Total Time:</span>
                    <br />
                    {((result as { accelerationMetrics?: { totalProcessingTime?: unknown } }).accelerationMetrics?.totalProcessingTime || 0).toFixed(1)}ms
                  </div>
                  <div>
                    <span class="font-medium">SIMD Time:</span>
                    <br />
                    {((result as { accelerationMetrics?: { simdPreprocessingTime?: unknown } }).accelerationMetrics?.simdPreprocessingTime || 0).toFixed(1)}ms
                  </div>
                  <div>
                    <span class="font-medium">GPU Time:</span>
                    <br />
                    {((result as { accelerationMetrics?: { webgpuComputeTime?: unknown } }).accelerationMetrics?.webgpuComputeTime || 0).toFixed(1)}ms
                  </div>
                  <div>
                    <span class="font-medium">Vectors:</span>
                    <br />
                    {(result as { accelerationMetrics?: { vectorsProcessed?: unknown } }).accelerationMetrics?.vectorsProcessed || 0}
                  </div>
                  <div>
                    <span class="font-medium">Acceleration:</span>
                    <br />
                    <span class="px-1 py-0.5 rounded text-white text-xs
                      {(result as { accelerationMetrics?: { accelerationUsed?: unknown } }).accelerationMetrics?.accelerationUsed === 'hybrid' ? 'bg-green-600' :
                        (result as { accelerationMetrics?: { accelerationUsed?: unknown } }).accelerationMetrics?.accelerationUsed === 'gpu' ? 'bg-blue-600' :
                        (result as { accelerationMetrics?: { accelerationUsed?: unknown } }).accelerationMetrics?.accelerationUsed === 'cpu' ? 'bg-orange-600' : 'bg-gray-600'}">
                      {(result as { accelerationMetrics?: { accelerationUsed?: unknown } }).accelerationMetrics?.accelerationUsed || 'none'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          {/if}

          {#if (result as { success?: unknown; method?: unknown; description?: unknown; timestamp?: unknown; duration?: unknown; query?: unknown; response?: unknown; error?: unknown }).error}
            <div>
              <h4 class="font-medium text-sm mb-1">Error:</h4>
              <p class="text-sm text-red-700 bg-red-100 p-2 rounded">{(result as { success?: unknown; method?: unknown; description?: unknown; timestamp?: unknown; duration?: unknown; query?: unknown; response?: unknown; error?: unknown }).error}</p>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <div class="text-center py-12 text-gray-500">
      <p>No test results yet. Run some tests to see the comparison!</p>
    </div>
  {/if}
</div>

<style>
  .webassembly-langchain-test {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
</style>
