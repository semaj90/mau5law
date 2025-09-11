<script lang="ts">
</script>
  import { onMount, onDestroy } from 'svelte';
  import { webLlamaService } from '$lib/ai/webasm-llamacpp';
  import { webAssemblyAIAdapter } from '$lib/adapters/webasm-ai-adapter';
  import WebGPUGemmaClient from '$lib/webgpu/webgpu-gemma-client.js';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';;
  import { Badge } from '$lib/components/ui/badge';

  // Props
  interface Props {
    enableGPU?: boolean;
    enableWebAssembly?: boolean;
    modelSize?: '270m' | '2b' | '9b';
    maxConcurrent?: number;
    enableDemo?: boolean;
  }

  let {
    enableGPU = true,
    enableWebAssembly = true,
    modelSize = '270m',
    maxConcurrent = 4,
    enableDemo = true
  }: Props = $props();

  // State
  let initialized = $state(false);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let webgpuClient: WebGPUGemmaClient | null = $state(null);
  let capabilities = $state<string[]>([]);
  let processingModes = $state<string[]>([]);
  let systemInfo = $state<any>(null);
  
  // Demo state
  let demoText = $state('Analyze this legal contract for potential risks and compliance issues.');
  let demoResult = $state<string | null>(null);
  let demoProcessing = $state(false);
  
  // Performance metrics
  let metrics = $state({
    initTime: 0,
    webgpuSupport: false,
    webAssemblySupport: false,
    modelLoaded: false,
    lastProcessingTime: 0,
    throughput: 0
  });

  async function initializeWebGPUWebAssembly() {
    loading = true;
    error = null;
    const startTime = performance.now();

    try {
      console.log('🚀 Initializing WebGPU + WebAssembly integration...');

      // 1. Initialize WebGPU client
      if (enableGPU) {
        try {
          webgpuClient = new WebGPUGemmaClient();
          await webgpuClient.initialize();
          metrics.webgpuSupport = true;
          capabilities.push('webgpu_acceleration');
          processingModes.push('webgpu');
          console.log('✅ WebGPU client initialized');
        } catch (gpuError) {
          console.warn('⚠️ WebGPU initialization failed:', gpuError);
          metrics.webgpuSupport = false;
        }
      }

      // 2. Initialize WebAssembly service
      if (enableWebAssembly) {
        try {
          const wasmLoaded = await webLlamaService.loadModel();
          if (wasmLoaded) {
            metrics.webAssemblySupport = true;
            metrics.modelLoaded = true;
            capabilities.push('webassembly_fallback', 'cpu_processing', 'basic_vector_operations');
            processingModes.push('webassembly', 'cpu');
            console.log('✅ WebAssembly service initialized');
          }
        } catch (wasmError) {
          console.warn('⚠️ WebAssembly initialization failed:', wasmError);
          metrics.webAssemblySupport = false;
        }
      }

      // 3. Initialize AI adapter with fallbacks
      try {
        const adapterInitialized = await webAssemblyAIAdapter.initialize();
        if (adapterInitialized) {
          capabilities.push('hybrid_inference', 'ollama_integration', 'python_fallback');
          console.log('✅ AI adapter initialized');
        }
      } catch (adapterError) {
        console.warn('⚠️ AI adapter initialization failed:', adapterError);
      }

      // 4. Gather system information
      systemInfo = {
        webGPU: {
          supported: !!navigator.gpu,
          initialized: metrics.webgpuSupport,
          info: webgpuClient?.getModelInfo() || null
        },
        webAssembly: {
          supported: typeof WebAssembly !== 'undefined',
          initialized: metrics.webAssemblySupport,
          health: webLlamaService.getHealthStatus()
        },
        adapter: {
          initialized: true,
          health: webAssemblyAIAdapter.getHealthStatus(),
          supportedMethods: processingModes
        },
        performance: {
          hardwareConcurrency: navigator.hardwareConcurrency,
          maxConcurrent,
          memoryEstimate: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 'unknown'
        }
      };

      metrics.initTime = performance.now() - startTime;
      initialized = true;
      
      console.log(`🎉 WebGPU + WebAssembly integration initialized in ${metrics.initTime.toFixed(2)}ms`);
      console.log(`📊 Capabilities: [${capabilities.join(', ')}]`);
      console.log(`🔧 Processing modes: [${processingModes.join(', ')}]`);

    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown initialization error';
      console.error('❌ Initialization failed:', err);
    } finally {
      loading = false;
    }
  }

  async function runDemo() {
    if (!initialized || !demoText.trim()) return;
    
    demoProcessing = true;
    demoResult = null;
    
    try {
      const startTime = performance.now();
      
      // Try WebAssembly first, then fallback
      let result: string;
      let method: string;
      
      if (metrics.webAssemblySupport) {
        try {
          const wasmResponse = await webAssemblyAIAdapter.sendMessage(demoText, {
            maxTokens: 512,
            temperature: 0.1,
            useGPUAcceleration: metrics.webgpuSupport
          });
          result = wasmResponse.content;
          method = `WebAssembly (${wasmResponse.metadata.method})`;
          
          if (wasmResponse.metadata.gpuAccelerated) {
            method += ' + GPU';
          }
        } catch (wasmError) {
          console.warn('WebAssembly processing failed:', wasmError);
          throw wasmError;
        }
      } else if (webgpuClient && metrics.webgpuSupport) {
        try {
          const gpuResponse = await webgpuClient.generateText(demoText, {
            maxTokens: 512,
            temperature: 0.1
          });
          result = gpuResponse.text;
          method = 'WebGPU Client';
        } catch (gpuError) {
          console.warn('WebGPU processing failed:', gpuError);
          throw gpuError;
        }
      } else {
        throw new Error('No processing methods available');
      }
      
      const processingTime = performance.now() - startTime;
      metrics.lastProcessingTime = processingTime;
      metrics.throughput = (demoText.length / processingTime * 1000); // chars/sec
      
      demoResult = `**Method:** ${method}\n**Processing Time:** ${processingTime.toFixed(2)}ms\n**Throughput:** ${metrics.throughput.toFixed(0)} chars/sec\n\n**Result:**\n${result}`;
      
    } catch (err) {
      demoResult = `❌ Demo failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
    } finally {
      demoProcessing = false;
    }
  }

  function getStatusColor(status: boolean): string {
    return status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }

  onMount(() => {
    initializeWebGPUWebAssembly();
  });

  onDestroy(() => {
    if (webgpuClient) {
      webgpuClient.unload();
    }
    if (webAssemblyAIAdapter) {
      webAssemblyAIAdapter.dispose();
    }
  });
</script>

<div class="space-y-6">
  <!-- Header -->
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        🔗 WebGPU + WebAssembly Integration Bridge
        {#if loading}
          <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">Initializing...</span>
        {:else if initialized}
          <Badge class="bg-green-100 text-green-800">Ready</Badge>
        {:else if error}
          <Badge class="bg-red-100 text-red-800">Error</Badge>
        {/if}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {#if error}
        <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-red-800 font-medium">❌ Initialization Error</p>
          <p class="text-red-600 text-sm mt-1">{error}</p>
          <button 
            onclick={initializeWebGPUWebAssembly}
            class="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      {:else if loading}
        <div class="flex items-center gap-2 text-blue-600">
          <div class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Initializing WebGPU and WebAssembly services...</span>
        </div>
      {:else if initialized}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 class="font-semibold mb-2">🎮 Capabilities</h4>
            <div class="flex flex-wrap gap-1">
              {#each capabilities as capability}
                <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">{capability}</span>
              {/each}
            </div>
          </div>
          <div>
            <h4 class="font-semibold mb-2">⚡ Processing Modes</h4>
            <div class="flex flex-wrap gap-1">
              {#each processingModes as mode}
                <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">{mode}</span>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    </CardContent>
  </Card>

  <!-- System Status -->
  {#if initialized && systemInfo}
    <Card>
      <CardHeader>
        <CardTitle>🔍 System Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- WebGPU Status -->
          <div class="space-y-2">
            <h4 class="font-semibold">WebGPU</h4>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span>Supported:</span>
                <Badge class={getStatusColor(systemInfo.webGPU.supported)}>
                  {systemInfo.webGPU.supported ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div class="flex justify-between">
                <span>Initialized:</span>
                <Badge class={getStatusColor(systemInfo.webGPU.initialized)}>
                  {systemInfo.webGPU.initialized ? 'Yes' : 'No'}
                </Badge>
              </div>
              {#if systemInfo.webGPU.info}
                <div class="text-xs text-gray-600">
                  Model: {systemInfo.webGPU.info.name}<br>
                  Memory: {systemInfo.webGPU.info.memoryUsage}<br>
                  WebGPU: {systemInfo.webGPU.info.webgpuAccelerated ? 'Yes' : 'No'}
                </div>
              {/if}
            </div>
          </div>

          <!-- WebAssembly Status -->
          <div class="space-y-2">
            <h4 class="font-semibold">WebAssembly</h4>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span>Supported:</span>
                <Badge class={getStatusColor(systemInfo.webAssembly.supported)}>
                  {systemInfo.webAssembly.supported ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div class="flex justify-between">
                <span>Model Loaded:</span>
                <Badge class={getStatusColor(systemInfo.webAssembly.health?.modelLoaded)}>
                  {systemInfo.webAssembly.health?.modelLoaded ? 'Yes' : 'No'}
                </Badge>
              </div>
              {#if systemInfo.webAssembly.health}
                <div class="text-xs text-gray-600">
                  Cache: {systemInfo.webAssembly.health.cacheSize} entries<br>
                  Threads: {systemInfo.webAssembly.health.threadsCount}<br>
                  Worker: {systemInfo.webAssembly.health.workerEnabled ? 'Yes' : 'No'}
                </div>
              {/if}
            </div>
          </div>

          <!-- Performance Metrics -->
          <div class="space-y-2">
            <h4 class="font-semibold">Performance</h4>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span>Init Time:</span>
                <span class="text-gray-600">{metrics.initTime.toFixed(2)}ms</span>
              </div>
              <div class="flex justify-between">
                <span>CPU Cores:</span>
                <span class="text-gray-600">{systemInfo.performance.hardwareConcurrency}</span>
              </div>
              <div class="flex justify-between">
                <span>Memory:</span>
                <span class="text-gray-600">{systemInfo.performance.memoryEstimate}MB</span>
              </div>
              {#if metrics.lastProcessingTime > 0}
                <div class="flex justify-between">
                  <span>Last Process:</span>
                  <span class="text-gray-600">{metrics.lastProcessingTime.toFixed(2)}ms</span>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  {/if}

  <!-- Interactive Demo -->
  {#if initialized && enableDemo}
    <Card>
      <CardHeader>
        <CardTitle>🧪 Live Demo</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2" for="input-text">Input Text:</label><textarea id="input-text" 
              bind:value={demoText}
              class="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Enter text to process with WebGPU/WebAssembly..."
            ></textarea>
          </div>
          
          <button
            onclick={runDemo}
            disabled={!demoText.trim() || demoProcessing}
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {demoProcessing ? 'Processing...' : 'Run WebGPU/WebAssembly Demo'}
          </button>

          {#if demoResult}
            <div class="mt-4 p-4 bg-gray-50 border rounded-md">
              <h4 class="font-semibold mb-2">📊 Result:</h4>
              <pre class="text-sm text-gray-800 whitespace-pre-wrap">{demoResult}</pre>
            </div>
          {/if}
        </div>
      </CardContent>
    </Card>
  {/if}
</div>

<style>
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
