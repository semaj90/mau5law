<!--
  WebGPU + WebAssembly Integration Demo
  Comprehensive showcase of GPU acceleration + client-side AI processing
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import WebGPUWebAssemblyBridge from '$lib/components/webgpu/WebGPUWebAssemblyBridge.svelte';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';;
  import { Badge } from '$lib/components/ui/badge';

  let pageTitle = 'WebGPU + WebAssembly Integration';
  let pageDescription = 'Real-time demonstration of GPU-accelerated WebAssembly AI processing with Gemma 3 270M model';
  
  // Example prompts for different use cases
  let examplePrompts = [
    {
      category: 'Legal Analysis',
      prompt: 'Analyze this non-disclosure agreement for potential risks: "The receiving party agrees to keep confidential all proprietary information disclosed by the disclosing party for a period of 5 years."',
      icon: '⚖️'
    },
    {
      category: 'Document Summary',
      prompt: 'Summarize the key points of this contract clause: "Either party may terminate this agreement with 30 days written notice, provided that all outstanding obligations are fulfilled and confidential information is returned."',
      icon: '📄'
    },
    {
      category: 'Risk Assessment',
      prompt: 'Identify potential compliance issues in this policy: "Employees may work from home up to 3 days per week with manager approval, provided they maintain productivity metrics and attend required meetings."',
      icon: '🔍'
    },
    {
      category: 'Code Generation',
      prompt: 'Generate a simple WebGPU compute shader for vector addition: Create WGSL code that adds two arrays of floats using GPU parallel processing.',
      icon: '💻'
    }
  ];
  
  // Technical specifications
  let technicalSpecs = [
    {
      component: 'WebGPU Client',
      specs: [
        'Gemma 3 270M quantized model (~100MB)',
        'WebGPU compute shaders for parallel processing',
        'Hardware-accelerated tensor operations',
        'Automatic CPU fallback when GPU unavailable'
      ]
    },
    {
      component: 'WebAssembly Service',
      specs: [
        'llama.cpp WASM runtime with SIMD support',
        'Multi-threaded processing with Web Workers',
        'Intelligent caching with LRU eviction',
        'Ollama API integration for server-side models'
      ]
    },
    {
      component: 'Hybrid Architecture',
      specs: [
        'Automatic method selection (GPU → WASM → CPU)',
        'Load balancing across processing units',
        'Real-time performance monitoring',
        'Graceful degradation with error recovery'
      ]
    }
  ];

  let performanceBenchmarks = [
    { metric: 'Initialization Time', target: '< 2 seconds', description: 'Cold start with model loading' },
    { metric: 'Processing Latency', target: '< 500ms', description: 'Average response time for 100-token input' },
    { metric: 'Throughput', target: '> 1000 tokens/sec', description: 'With GPU acceleration enabled' },
    { metric: 'Memory Usage', target: '< 200MB', description: 'Total browser memory footprint' },
    { metric: 'CPU Utilization', target: '< 30%', description: 'When using WebGPU acceleration' },
    { metric: 'Cache Hit Rate', target: '> 80%', description: 'For repeated similar queries' }
  ];

  onMount(() => {
    document.title = `${pageTitle} | Legal AI System`;
  });
</script>

<svelte:head>
  <title>{pageTitle} | Legal AI System</title>
  <meta name="description" content={pageDescription} />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="{$page.url}" />
  <meta property="og:title" content={pageTitle} />
  <meta property="og:description" content={pageDescription} />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
  <!-- Navigation -->
  <nav class="bg-white shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center">
          <a href="/" class="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
            ⚖️ Legal AI
          </a>
          <span class="mx-2 text-gray-400">/</span>
          <span class="text-gray-600">WebGPU + WebAssembly</span>
        </div>
        
        <div class="flex items-center space-x-4">
          <a href="/demo/semantic-3d" class="text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium">
            🎯 3D Semantic
          </a>
          <a href="/demo/gpu-acceleration" class="text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium">
            🚀 GPU Demo
          </a>
          <a href="/docs" class="text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium">
            📚 Docs
          </a>
        </div>
      </div>
    </div>
  </nav>

  <!-- Main Content -->
  <main class="py-8">
    <!-- Hero Section -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">
          🔗 WebGPU + WebAssembly Integration
        </h1>
        <p class="text-xl text-gray-600 max-w-3xl mx-auto">
          Real-time AI processing combining GPU acceleration with WebAssembly efficiency. 
          Experience client-side inference with the Gemma 3 270M model running at 60+ FPS.
        </p>
      </div>
    </div>

    <!-- Main Integration Component -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
      <WebGPUWebAssemblyBridge 
        enableGPU={true}
        enableWebAssembly={true}
        modelSize="270m"
        maxConcurrent={4}
        enableDemo={true}
      />
    </div>

    <!-- Example Prompts -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
      <Card>
        <CardHeader>
          <CardTitle>💡 Try These Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each examplePrompts as example}
              <div class="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-2xl">{example.icon}</span>
                  <h3 class="font-semibold">{example.category}</h3>
                </div>
                <p class="text-sm text-gray-600 italic">"{example.prompt}"</p>
                <button 
                  class="mt-2 text-xs text-blue-600 hover:text-blue-800"
                  onclick={() => {
                    // Copy to clipboard and scroll to demo
                    navigator.clipboard?.writeText(example.prompt);
                    document.querySelector('textarea')?.focus();
                  }}
                >
                  Copy & Try →
                </button>
              </div>
            {/each}
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Technical Specifications -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
      <Card>
        <CardHeader>
          <CardTitle>🔧 Technical Architecture</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {#each technicalSpecs as spec}
              <div class="space-y-3">
                <h3 class="font-semibold text-lg">{spec.component}</h3>
                <ul class="space-y-2">
                  {#each spec.specs as item}
                    <li class="text-sm text-gray-600 flex items-start gap-2">
                      <span class="text-green-500 mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  {/each}
                </ul>
              </div>
            {/each}
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Performance Benchmarks -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
      <Card>
        <CardHeader>
          <CardTitle>📊 Performance Targets</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each performanceBenchmarks as benchmark}
              <div class="text-center p-4 border rounded-lg bg-gray-50">
                <div class="text-lg font-bold text-blue-600 mb-1">{benchmark.target}</div>
                <div class="font-medium text-gray-900 mb-1">{benchmark.metric}</div>
                <div class="text-sm text-gray-600">{benchmark.description}</div>
              </div>
            {/each}
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Architecture Flow Diagram -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>🏗️ Processing Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="overflow-x-auto">
            <div class="flex items-center space-x-4 min-w-max p-4">
              <!-- Input -->
              <div class="flex flex-col items-center p-4 border rounded-lg bg-blue-50 min-w-32">
                <div class="text-3xl mb-2">📝</div>
                <div class="font-semibold">User Input</div>
                <div class="text-xs text-gray-600">Text/Prompt</div>
              </div>
              
              <div class="text-2xl">→</div>
              
              <!-- Method Selection -->
              <div class="flex flex-col items-center p-4 border rounded-lg bg-yellow-50 min-w-32">
                <div class="text-3xl mb-2">🎯</div>
                <div class="font-semibold">Auto Select</div>
                <div class="text-xs text-gray-600">GPU/WASM/CPU</div>
              </div>
              
              <div class="text-2xl">→</div>
              
              <!-- WebGPU Processing -->
              <div class="flex flex-col items-center p-4 border rounded-lg bg-green-50 min-w-32">
                <div class="text-3xl mb-2">🎮</div>
                <div class="font-semibold">WebGPU</div>
                <div class="text-xs text-gray-600">GPU Shaders</div>
              </div>
              
              <div class="text-lg">↕</div>
              
              <!-- WebAssembly Processing -->
              <div class="flex flex-col items-center p-4 border rounded-lg bg-purple-50 min-w-32">
                <div class="text-3xl mb-2">⚡</div>
                <div class="font-semibold">WebAssembly</div>
                <div class="text-xs text-gray-600">WASM Runtime</div>
              </div>
              
              <div class="text-2xl">→</div>
              
              <!-- Caching -->
              <div class="flex flex-col items-center p-4 border rounded-lg bg-orange-50 min-w-32">
                <div class="text-3xl mb-2">🗄️</div>
                <div class="font-semibold">Smart Cache</div>
                <div class="text-xs text-gray-600">LRU + Vector</div>
              </div>
              
              <div class="text-2xl">→</div>
              
              <!-- Output -->
              <div class="flex flex-col items-center p-4 border rounded-lg bg-red-50 min-w-32">
                <div class="text-3xl mb-2">📤</div>
                <div class="font-semibold">Response</div>
                <div class="text-xs text-gray-600">AI Generated</div>
              </div>
            </div>
          </div>
          
          <div class="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 class="font-semibold mb-2">🚀 Key Features:</h4>
            <ul class="text-sm text-gray-700 space-y-1 grid grid-cols-1 md:grid-cols-2 gap-2">
              <li>• <strong>Automatic Fallbacks:</strong> GPU → WASM → CPU</li>
              <li>• <strong>Real-time Switching:</strong> Adaptive method selection</li>
              <li>• <strong>Memory Efficient:</strong> &lt; 200MB total footprint</li>
              <li>• <strong>Error Recovery:</strong> Graceful degradation</li>
              <li>• <strong>Performance Monitoring:</strong> Live metrics</li>
              <li>• <strong>Cache Intelligence:</strong> Semantic similarity</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  </main>

  <!-- Footer -->
  <footer class="bg-white border-t mt-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="text-center">
        <div class="text-sm text-gray-500 mb-4">
          © 2024 Legal AI System. Advanced WebGPU + WebAssembly Integration with Real-time Processing.
        </div>
        <div class="flex justify-center space-x-6 text-sm">
          <a href="/docs/webgpu" class="text-gray-500 hover:text-blue-600 transition-colors">
            WebGPU Guide
          </a>
          <a href="/docs/webassembly" class="text-gray-500 hover:text-blue-600 transition-colors">
            WebAssembly API
          </a>
          <a href="/docs/performance" class="text-gray-500 hover:text-blue-600 transition-colors">
            Performance Tuning
          </a>
          <a href="/support" class="text-gray-500 hover:text-blue-600 transition-colors">
            Technical Support
          </a>
        </div>
      </div>
    </div>
  </footer>
</div>
