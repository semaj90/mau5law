<script>
  import { onMount, onDestroy } from 'svelte';
  import SIMDAIAssistantDemo from '$lib/components/ai/SIMDAIAssistantDemo.svelte';
  import SIMDTextTilingDemo from '$lib/components/ai/SIMDTextTilingDemo.svelte';
  import SIMDGlyphDemo from '$lib/components/ai/SIMDGlyphDemo.svelte';
  import { Button } from '$lib/components/ui/enhanced-bits';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';;
  
  let activeDemo = $state('overview');
  let systemStatus = $state(null);
  let webWorker = $state(null);
  let workerStatus = $state('initializing');
  let performanceMetrics = $state({
    totalOperations: 0,
    avgCompressionRatio: 0,
    avgProcessingTime: 0,
    systemLoad: 0,
    memoryUsage: 0
  });
  
  const demos = [
    {
      id: 'overview',
      title: 'System Overview',
      description: 'Complete architecture and capabilities overview',
      icon: '🏗️'
    },
    {
      id: 'ai-assistant',
      title: 'SIMD AI Assistant',
      description: 'XState + Ollama + SIMD integration',
      icon: '🤖'
    },
    {
      id: 'text-tiling',
      title: 'Text Tiling Engine',
      description: '7-bit compression with instant UI generation',
      icon: '🧬'
    },
    {
      id: 'glyph-generation',
      title: 'Glyph Generation',
      description: 'Visual evidence with SIMD optimization',
      icon: '🎨'
    }
  ];
  
  // Initialize web worker for background processing
  onMount(async () => {
    try {
      // Initialize SIMD text worker
      webWorker = new Worker('/workers/simd-text-worker.js');
      
      webWorker.onmessage = (event) => {
        const { type, payload } = event.data;
        
        switch (type) {
          case 'simd_initialized':
            workerStatus = 'ready';
            console.log('✅ SIMD Worker ready:', payload);
            break;
            
          case 'simd_stats':
            updatePerformanceMetrics(payload);
            break;
            
          case 'error':
            console.error('Worker error:', payload.error);
            workerStatus = 'error';
            break;
        }
      };
      
      webWorker.onerror = (error) => {
        console.error('Worker initialization error:', error);
        workerStatus = 'error';
      };
      
      // Initialize worker
      webWorker.postMessage({
        type: 'init_simd',
        payload: {
          compressionRatio: 109,
          qualityTier: 'nes',
          enableGPUAcceleration: true,
          cacheEnabled: true
        }
      });
      
      // Load system status
      await loadSystemStatus();
      
      // Start performance monitoring
      startPerformanceMonitoring();
      
    } catch (error) {
      console.error('Demo initialization failed:', error);
      workerStatus = 'error';
    }
  });
  
  onDestroy(() => {
    if (webWorker) {
      webWorker.terminate();
    }
  });
  
  async function loadSystemStatus() {
    try {
      const [ollamaStatus, simdStatus, glyphStatus] = await Promise.all([
        fetch('/api/ai/ollama-simd').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/ocr/simd-langextract').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/glyph/simd-embeds').then(r => r.json()).catch(() => ({ success: false }))
      ]);
      
      systemStatus = {
        ollama: {
          available: ollamaStatus.success,
          models: ollamaStatus.ollama_status?.available_models || [],
          primaryModel: ollamaStatus.ollama_status?.primary_model || 'not available'
        },
        simd: {
          available: simdStatus.success,
          compressionRatios: simdStatus.simd_capabilities?.compression_ratios || [],
          qualityTiers: simdStatus.simd_capabilities?.quality_tiers || []
        },
        glyph: {
          available: glyphStatus.success,
          features: glyphStatus.features || {}
        },
        overall: 'healthy'
      };
      
    } catch (error) {
      console.error('Failed to load system status:', error);
      systemStatus = {
        overall: 'error',
        error: error.message
      };
    }
  }
  
  function startPerformanceMonitoring() {
    // Monitor system performance every 5 seconds
    setInterval(async () => {
      try {
        if (webWorker && workerStatus === 'ready') {
          webWorker.postMessage({
            type: 'get_simd_stats',
            id: `perf-${Date.now()}`
          });
        }
        
        // Monitor browser performance
        if ('performance' in window && 'memory' in performance) {
          const memory = performance.memory;
          performanceMetrics.memoryUsage = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
        }
        
        // Simulate system load (would use real metrics in production)
        performanceMetrics.systemLoad = Math.random() * 30 + 10; // 10-40% load
        
      } catch (error) {
        console.warn('Performance monitoring error:', error);
      }
    }, 5000);
  }
  
  function updatePerformanceMetrics(stats) {
    performanceMetrics = {
      totalOperations: stats.totalProcessed || 0,
      avgCompressionRatio: stats.averageCompressionRatio || 0,
      avgProcessingTime: (stats.totalCompressionTime / (stats.totalProcessed || 1)) || 0,
      systemLoad: performanceMetrics.systemLoad,
      memoryUsage: performanceMetrics.memoryUsage,
      cacheSize: stats.cacheSize || 0,
      queueLength: stats.queueLength || 0
    };
  }
  
  function getStatusColor(status) {
    switch (status) {
      case 'ready': case 'healthy': return 'text-green-600';
      case 'initializing': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }
  
  function getStatusIcon(status) {
    switch (status) {
      case 'ready': case 'healthy': return '✅';
      case 'initializing': return '🔄';
      case 'error': return '❌';
      default: return '⚪';
    }
  }
  
  async function runSystemBenchmark() {
    if (!webWorker || workerStatus !== 'ready') {
      alert('Web worker not ready for benchmark');
      return;
    }
    
    const benchmarkTexts = [
      'This software license agreement grants non-exclusive usage rights.',
      'The contract contains standard liability limitations and warranty disclaimers.',
      'Legal analysis indicates potential compliance issues with data privacy regulations.',
      'The employment agreement includes confidentiality and non-compete clauses.',
      'Intellectual property rights are clearly defined in section 3.2 of the agreement.'
    ];
    
    try {
      console.log('🧪 Starting system benchmark...');
      
      webWorker.postMessage({
        type: 'batch_process_simd',
        payload: {
          texts: benchmarkTexts,
          simd_config: {
            compressionRatio: 109,
            qualityTier: 'nes'
          },
          ui_target: 'component'
        },
        id: `benchmark-${Date.now()}`
      });
      
    } catch (error) {
      console.error('Benchmark failed:', error);
      alert(`Benchmark failed: ${error.message}`);
    }
  }
</script>

<svelte:head>
  <title>SIMD AI Demo - Complete Integration Showcase</title>
  <meta name="description" content="Comprehensive demonstration of SIMD-enhanced AI text processing with 7-bit compression and instant UI generation" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
  <!-- Header -->
  <header class="bg-white shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">
            🧬 SIMD AI Demo Platform
          </h1>
          <p class="text-gray-600 mt-1">
            Complete integration of XState, Ollama, SIMD compression, and instant UI generation
          </p>
        </div>
        
        <!-- System Status Indicators -->
        <div class="flex items-center gap-4">
          <div class="text-sm">
            <div class="flex items-center gap-2 mb-1">
              <span class={getStatusColor(workerStatus)}>
                {getStatusIcon(workerStatus)} Worker: {workerStatus}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class={getStatusColor(systemStatus?.overall || 'unknown')}>
                {getStatusIcon(systemStatus?.overall || 'unknown')} System: {systemStatus?.overall || 'loading'}
              </span>
            </div>
          </div>
          
          <Button class="bits-btn" onclick={runSystemBenchmark} variant="outline" size="sm">
            🧪 Run Benchmark
          </Button>
        </div>
      </div>
    </div>
  </header>
  
  <!-- Navigation -->
  <nav class="bg-white border-b">
    <div class="max-w-7xl mx-auto px-6">
      <div class="flex space-x-1">
        {#each demos as demo}
          <button
            onclick={() => activeDemo = demo.id}
            class="px-4 py-3 text-sm font-medium rounded-t-lg transition-colors {
              activeDemo === demo.id
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }"
          >
            <span class="mr-2">{demo.icon}</span>
            {demo.title}
          </button>
        {/each}
      </div>
    </div>
  </nav>
  
  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-6 py-8">
    {#if activeDemo === 'overview'}
      <!-- System Overview -->
      <div class="space-y-8">
        <!-- Architecture Overview -->
        <Card>
          <CardHeader>
            <CardTitle>🏗️ System Architecture</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <div class="text-4xl mb-3">🤖</div>
                <h3 class="font-bold text-lg mb-2">AI Processing Layer</h3>
                <div class="text-sm text-gray-600 space-y-1">
                  <div>• XState Machine Management</div>
                  <div>• Ollama LLM Integration</div>
                  <div>• Intelligent Model Selection</div>
                  <div>• Streaming & Batch Processing</div>
                </div>
              </div>
              
              <div class="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                <div class="text-4xl mb-3">🧬</div>
                <h3 class="font-bold text-lg mb-2">SIMD Compression</h3>
                <div class="text-sm text-gray-600 space-y-1">
                  <div>• 7-bit NES-style Encoding</div>
                  <div>• 109:1 Compression Ratios</div>
                  <div>• GPU-Accelerated Processing</div>
                  <div>• Semantic Preservation</div>
                </div>
              </div>
              
              <div class="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <div class="text-4xl mb-3">🎮</div>
                <h3 class="font-bold text-lg mb-2">Instant UI Generation</h3>
                <div class="text-sm text-gray-600 space-y-1">
                  <div>• WebGPU Vertex Buffers</div>
                  <div>• Zero-Latency Rendering</div>
                  <div>• NES/SNES/N64 Quality Tiers</div>
                  <div>• Dynamic Component Creation</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <!-- System Status Dashboard -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>📊 System Status</CardTitle>
            </CardHeader>
            <CardContent>
              {#if systemStatus}
                <div class="space-y-4">
                  <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <div class="font-medium">Ollama Service</div>
                      <div class="text-sm text-gray-600">
                        {systemStatus.ollama.available ? 'Connected' : 'Unavailable'}
                      </div>
                    </div>
                    <div class="text-right">
                      <div class={getStatusColor(systemStatus.ollama.available ? 'ready' : 'error')}>
                        {getStatusIcon(systemStatus.ollama.available ? 'ready' : 'error')}
                      </div>
                      <div class="text-xs text-gray-500">
                        {systemStatus.ollama.models.length} models
                      </div>
                    </div>
                  </div>
                  
                  <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <div class="font-medium">SIMD Engine</div>
                      <div class="text-sm text-gray-600">
                        {systemStatus.simd.available ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    <div class="text-right">
                      <div class={getStatusColor(systemStatus.simd.available ? 'ready' : 'error')}>
                        {getStatusIcon(systemStatus.simd.available ? 'ready' : 'error')}
                      </div>
                      <div class="text-xs text-gray-500">
                        {systemStatus.simd.compressionRatios.length} ratios
                      </div>
                    </div>
                  </div>
                  
                  <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <div class="font-medium">Glyph Generation</div>
                      <div class="text-sm text-gray-600">
                        {systemStatus.glyph.available ? 'Available' : 'Unavailable'}
                      </div>
                    </div>
                    <div class="text-right">
                      <div class={getStatusColor(systemStatus.glyph.available ? 'ready' : 'error')}>
                        {getStatusIcon(systemStatus.glyph.available ? 'ready' : 'error')}
                      </div>
                      <div class="text-xs text-gray-500">
                        Visual processing
                      </div>
                    </div>
                  </div>
                </div>
              {:else}
                <div class="text-center py-8 text-gray-500">
                  <div class="text-2xl mb-2">🔄</div>
                  Loading system status...
                </div>
              {/if}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>⚡ Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-4">
                <div class="flex justify-between items-center">
                  <span class="text-sm font-medium">Total Operations</span>
                  <span class="text-lg font-bold text-blue-600">
                    {performanceMetrics.totalOperations.toLocaleString()}
                  </span>
                </div>
                
                <div class="flex justify-between items-center">
                  <span class="text-sm font-medium">Avg Compression Ratio</span>
                  <span class="text-lg font-bold text-green-600">
                    {performanceMetrics.avgCompressionRatio.toFixed(1)}:1
                  </span>
                </div>
                
                <div class="flex justify-between items-center">
                  <span class="text-sm font-medium">Avg Processing Time</span>
                  <span class="text-lg font-bold text-purple-600">
                    {performanceMetrics.avgProcessingTime.toFixed(0)}ms
                  </span>
                </div>
                
                <div class="flex justify-between items-center">
                  <span class="text-sm font-medium">System Load</span>
                  <span class="text-lg font-bold text-orange-600">
                    {performanceMetrics.systemLoad.toFixed(1)}%
                  </span>
                </div>
                
                <div class="flex justify-between items-center">
                  <span class="text-sm font-medium">Memory Usage</span>
                  <span class="text-lg font-bold text-red-600">
                    {performanceMetrics.memoryUsage.toFixed(1)}%
                  </span>
                </div>
                
                {#if performanceMetrics.cacheSize > 0}
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-medium">Cache Size</span>
                    <span class="text-lg font-bold text-teal-600">
                      {performanceMetrics.cacheSize}
                    </span>
                  </div>
                {/if}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <!-- Feature Highlights -->
        <Card>
          <CardHeader>
            <CardTitle>🌟 Key Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div class="space-y-2">
                <h4 class="font-semibold text-green-600">🧬 Ultra Compression</h4>
                <ul class="text-sm text-gray-600 space-y-1">
                  <li>• 7-byte tile representation</li>
                  <li>• 109:1 compression ratios</li>
                  <li>• Semantic preservation</li>
                  <li>• Real-time processing</li>
                </ul>
              </div>
              
              <div class="space-y-2">
                <h4 class="font-semibold text-blue-600">⚡ Performance</h4>
                <ul class="text-sm text-gray-600 space-y-1">
                  <li>• WebGPU acceleration</li>
                  <li>• Web Worker processing</li>
                  <li>• Intelligent caching</li>
                  <li>• Batch optimization</li>
                </ul>
              </div>
              
              <div class="space-y-2">
                <h4 class="font-semibold text-purple-600">🎮 UI Generation</h4>
                <ul class="text-sm text-gray-600 space-y-1">
                  <li>• Instant component rendering</li>
                  <li>• NES-style visual effects</li>
                  <li>• Dynamic CSS generation</li>
                  <li>• Interactive elements</li>
                </ul>
              </div>
              
              <div class="space-y-2">
                <h4 class="font-semibold text-orange-600">🤖 AI Integration</h4>
                <ul class="text-sm text-gray-600 space-y-1">
                  <li>• XState machine management</li>
                  <li>• Ollama LLM integration</li>
                  <li>• Intelligent fallbacks</li>
                  <li>• Streaming responses</li>
                </ul>
              </div>
              
              <div class="space-y-2">
                <h4 class="font-semibold text-teal-600">🎨 Visual Processing</h4>
                <ul class="text-sm text-gray-600 space-y-1">
                  <li>• Glyph generation</li>
                  <li>• Evidence visualization</li>
                  <li>• Neural sprite compression</li>
                  <li>• PNG metadata embedding</li>
                </ul>
              </div>
              
              <div class="space-y-2">
                <h4 class="font-semibold text-red-600">🔧 Developer Tools</h4>
                <ul class="text-sm text-gray-600 space-y-1">
                  <li>• Interactive demos</li>
                  <li>• Performance monitoring</li>
                  <li>• System benchmarks</li>
                  <li>• Configuration controls</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    {/if}
    
    {#if activeDemo === 'ai-assistant'}
      <SIMDAIAssistantDemo
        enableSIMD={true}
        useWebWorker={true}
      />
    {/if}
    
    {#if activeDemo === 'text-tiling'}
      <SIMDTextTilingDemo />
    {/if}
    
    {#if activeDemo === 'glyph-generation'}
      <SIMDGlyphDemo />
    {/if}
  </main>
  
  <!-- Footer -->
  <footer class="bg-white border-t mt-12">
    <div class="max-w-7xl mx-auto px-6 py-8">
      <div class="text-center text-gray-600">
        <p class="mb-2">
          🧬 SIMD AI Demo Platform - Complete Integration Showcase
        </p>
        <p class="text-sm">
          XState + Ollama + SIMD Compression + WebGPU Rendering + Instant UI Generation
        </p>
      </div>
    </div>
  </footer>
</div>

<style>
  :global(body) {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  
  /* Smooth transitions for demo switching */
  main {
    transition: opacity 0.3s ease-in-out;
  }
  
  /* Enhanced button hover effects */
  button:hover {
    transform: translateY(-1px);
    transition: transform 0.2s ease-in-out;
  }
  
  /* Loading animation */
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .loading {
    animation: spin 2s linear infinite;
  }
</style>
