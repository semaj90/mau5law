<!-- Legal AI Multi-Model Orchestrator Demo -->
<script>
  import { onMount } from 'svelte';
  import ExistingServicesOrchestrator from '$lib/components/ai/ExistingServicesOrchestrator.svelte';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

  let orchestratorReady = $state(false);
  let systemStatus = $state('Checking...');

  onMount(async () => {
    // Check existing services (no Docker downloads needed)
    try {
      const response = await fetch('/api/orchestrator/existing', {
        method: 'GET'
      });
      
      if (response.ok) {
        const healthData = await response.json();
        orchestratorReady = healthData.overall_status !== 'critical';
        systemStatus = healthData.overall_status === 'healthy' ? 'Ready - Using Existing Models' : 
                       healthData.overall_status === 'degraded' ? 'Partial - Some Services Down' : 
                       'Critical - Services Unavailable';
      } else {
        systemStatus = 'Services not responding';
      }
    } catch (error) {
      systemStatus = 'Connection failed';
    }
  });
</script>

<svelte:head>
  <title>Legal AI Orchestrator Demo - Nintendo-Style Multi-Model System</title>
  <meta name="description" content="Interactive demonstration of the Legal AI Orchestrator with Nintendo-inspired memory management and multi-model routing.">
</svelte:head>

<div class="orchestrator-demo-page min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">
        🎮 Legal AI Orchestrator
      </h1>
      <p class="text-xl text-gray-600 mb-2">
        Nintendo-Style Multi-Model AI System
      </p>
      <div class="flex items-center justify-center gap-2 text-lg">
        <span class="text-gray-500">Status:</span>
        <span class="font-semibold {systemStatus === 'Ready' ? 'text-green-600' : 'text-orange-600'}">
          {systemStatus}
        </span>
      </div>
    </div>

    <!-- Architecture Overview -->
    <Card class="mb-8">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          🏗️ System Architecture
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- Fast Router -->
          <div class="architecture-component p-4 border rounded-lg bg-yellow-50 border-yellow-200">
            <div class="text-2xl mb-2">🚀</div>
            <h3 class="font-semibold mb-2">Fast Router</h3>
            <p class="text-sm text-gray-600 mb-2">Gemma-3 270M Model</p>
            <ul class="text-xs text-gray-500 space-y-1">
              <li>• Query classification</li>
              <li>• Simple Q&A</li>
              <li>• Low latency responses</li>
            </ul>
            <div class="text-xs mt-2 font-mono text-yellow-700">:8001</div>
          </div>

          <!-- Legal Expert -->
          <div class="architecture-component p-4 border rounded-lg bg-blue-50 border-blue-200">
            <div class="text-2xl mb-2">⚖️</div>
            <h3 class="font-semibold mb-2">Legal Expert</h3>
            <p class="text-sm text-gray-600 mb-2">Gemma-3 Legal 2B Model</p>
            <ul class="text-xs text-gray-500 space-y-1">
              <li>• Complex legal analysis</li>
              <li>• Case law citations</li>
              <li>• Contract review</li>
            </ul>
            <div class="text-xs mt-2 font-mono text-blue-700">:8000</div>
          </div>

          <!-- Embedding Service -->
          <div class="architecture-component p-4 border rounded-lg bg-green-50 border-green-200">
            <div class="text-2xl mb-2">🔍</div>
            <h3 class="font-semibold mb-2">Embeddings</h3>
            <p class="text-sm text-gray-600 mb-2">EmbeddingGemma Model</p>
            <ul class="text-xs text-gray-500 space-y-1">
              <li>• Document similarity</li>
              <li>• Semantic search</li>
              <li>• Vector generation</li>
            </ul>
            <div class="text-xs mt-2 font-mono text-green-700">:11434</div>
          </div>

          <!-- Nintendo Memory System -->
          <div class="architecture-component p-4 border rounded-lg bg-purple-50 border-purple-200">
            <div class="text-2xl mb-2">🎮</div>
            <h3 class="font-semibold mb-2">Memory Banks</h3>
            <p class="text-sm text-gray-600 mb-2">Nintendo-Style Caching</p>
            <ul class="text-xs text-gray-500 space-y-1">
              <li>• L1: GPU VRAM</li>
              <li>• L2: System RAM</li>
              <li>• L3: Redis Cache</li>
            </ul>
            <div class="text-xs mt-2 font-mono text-purple-700">:6379</div>
          </div>
        </div>

        <!-- Data Flow -->
        <div class="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 class="font-semibold mb-3">🔄 Query Processing Flow</h4>
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <span class="px-2 py-1 bg-blue-100 rounded">1. Cache Check</span>
            <span class="text-gray-400">→</span>
            <span class="px-2 py-1 bg-yellow-100 rounded">2. Router Classification</span>
            <span class="text-gray-400">→</span>
            <span class="px-2 py-1 bg-green-100 rounded">3. Model Selection</span>
            <span class="text-gray-400">→</span>
            <span class="px-2 py-1 bg-purple-100 rounded">4. Memory Management</span>
            <span class="text-gray-400">→</span>
            <span class="px-2 py-1 bg-orange-100 rounded">5. Response & Cache</span>
          </div>
        </div>
      </CardContent>
    </Card>

    {#if !orchestratorReady}
      <!-- Setup Instructions -->
      <Card class="mb-8">
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-orange-600">
            🚧 Setup Required
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <p class="text-gray-600">
            The Legal AI Orchestrator requires Docker services to be running. Follow these steps to get started:
          </p>
          
          <div class="setup-steps space-y-3">
            <div class="step p-3 bg-green-50 rounded border-l-4 border-green-500">
              <span class="font-semibold">✅ Using Existing Services (No Downloads):</span>
              <pre class="mt-2 p-2 bg-gray-100 rounded text-sm overflow-x-auto"><code>npm run orchestrator:existing</code></pre>
              <p class="text-xs text-gray-600 mt-1">Uses your current Redis, PostgreSQL, and Ollama models</p>
            </div>
            
            <div class="step p-3 bg-blue-50 rounded border-l-4 border-blue-500">
              <span class="font-semibold">🔍 Available Models:</span>
              <div class="mt-2 text-sm space-y-1">
                <div>⚖️ <strong>gemma3-legal:latest</strong> (11.8B) - Legal analysis</div>
                <div>🔍 <strong>embeddinggemma:latest</strong> (307M) - Embeddings</div>
                <div>📄 <strong>nomic-embed-text:latest</strong> (137M) - Alt embeddings</div>
              </div>
            </div>
            
            <div class="step p-3 bg-purple-50 rounded border-l-4 border-purple-500">
              <span class="font-semibold">🎮 Nintendo Memory Management:</span>
              <div class="mt-2 text-sm text-gray-600">
                L1: Ollama GPU VRAM • L2: System RAM • L3: Redis Cache
              </div>
            </div>
          </div>

          <div class="mt-4 p-3 bg-green-50 border border-green-200 rounded">
            <p class="text-sm text-green-800">
              <strong>✅ Ready to Go:</strong> Using your existing services - no additional setup required!
            </p>
          </div>
        </CardContent>
      </Card>
    {/if}

    <!-- Main Interface -->
    {#if orchestratorReady}
      <ExistingServicesOrchestrator />
    {:else}
      <Card>
        <CardContent class="text-center py-12">
          <div class="text-6xl mb-4">🎮</div>
          <h3 class="text-xl font-semibold mb-2">Legal AI Orchestrator</h3>
          <p class="text-gray-600 mb-4">Waiting for services to start...</p>
          <button 
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            onclick={() => window.location.reload()}
          >
            🔄 Check Again
          </button>
        </CardContent>
      </Card>
    {/if}

    <!-- Documentation -->
    <Card class="mt-8">
      <CardHeader>
        <CardTitle>📚 Documentation</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="doc-section">
            <h4 class="font-semibold mb-2">🎮 Nintendo Memory Management</h4>
            <ul class="text-sm text-gray-600 space-y-1">
              <li>• L1 Cache: GPU VRAM for active model inference</li>
              <li>• L2 Cache: System RAM for frequently accessed data</li>
              <li>• L3 Cache: Redis for persistent query caching</li>
              <li>• Bank switching prevents memory overflow</li>
            </ul>
          </div>
          
          <div class="doc-section">
            <h4 class="font-semibold mb-2">⚡ Multi-Model Routing</h4>
            <ul class="text-sm text-gray-600 space-y-1">
              <li>• Fast router classifies queries automatically</li>
              <li>• Simple queries use lightweight 270M model</li>
              <li>• Complex legal analysis uses specialized 2B model</li>
              <li>• Embeddings handled by dedicated service</li>
            </ul>
          </div>
          
          <div class="doc-section">
            <h4 class="font-semibold mb-2">🔧 API Endpoints</h4>
            <ul class="text-sm text-gray-600 space-y-1">
              <li>• <code>/api/orchestrator/query</code> - Process queries</li>
              <li>• <code>/api/orchestrator/health</code> - System health</li>
              <li>• <code>/api/orchestrator/cache</code> - Cache management</li>
              <li>• <code>/api/orchestrator/metrics</code> - Performance stats</li>
            </ul>
          </div>
          
          <div class="doc-section">
            <h4 class="font-semibold mb-2">🚀 Performance Features</h4>
            <ul class="text-sm text-gray-600 space-y-1">
              <li>• Intelligent query caching reduces API calls</li>
              <li>• Memory bank optimization prevents crashes</li>
              <li>• Real-time health monitoring</li>
              <li>• Cost tracking for embedding generation</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</div>

<style>
  .orchestrator-demo-page {
    font-family: 'Inter', system-ui, sans-serif;
  }

  .architecture-component {
    transition: all 0.3s ease;
  }

  .architecture-component:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }

  .setup-steps .step {
    transition: all 0.2s ease;
  }

  .setup-steps .step:hover {
    transform: translateX(4px);
  }

  pre code {
    font-family: 'JetBrains Mono', 'Consolas', monospace;
  }

  .doc-section ul li code {
    background: #f1f5f9;
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 0.85em;
  }
</style>