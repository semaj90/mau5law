<!--
  Unified Vector Demo Page
  Complete demonstration of all integrated vector systems
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import UnifiedVectorInterface from '$lib/components/unified/UnifiedVectorInterface.svelte';
  import { browser } from '$app/environment';

  let showDocumentation = $state(false);
  let systemStats = $state({
    totalComponents: 8,
    activeServices: 0,
    processingCapacity: '100,000+ streams',
    gpuAcceleration: 'RTX 3060 Ti (8GB)',
    compressionRatio: '8:1 QUIC streaming'
  });

  async function checkSystemStatus() {
    if (!browser) return;
    try {
      const response = await fetch('/api/unified-vector?action=health');
      const data = await response.json();
      if (data.success && data.health) {
        systemStats.activeServices = Object.values(data.health).filter(Boolean).length;
      }
    } catch (error) {
      console.error('Failed to check system status:', error);
    }
  }

  onMount(() => {
    checkSystemStatus();
  });
</script>

<svelte:head>
  <title>Unified Vector Systems - Legal AI Platform</title>
  <meta name="description" content="Complete integration of WebGPU SOM, WebAssembly RAG, PageRank, Glyph Diffusion, and Neural Networks for legal AI processing." />
</svelte:head>

<div class="min-h-screen bg-black text-green-400">
  <!-- Navigation Header -->
  <nav class="border-b border-green-400 p-4 bg-black">
    <div class="max-w-7xl mx-auto flex justify-between items-center">
      <div class="flex items-center space-x-4">
        <h1 class="text-xl font-mono">UNIFIED VECTOR SYSTEMS</h1>
        <div class="text-sm text-green-600">
          {systemStats.activeServices}/{systemStats.totalComponents} Services Active
        </div>
      </div>
      
      <div class="flex space-x-4 text-sm">
        <button 
          onclick={() => showDocumentation = !showDocumentation}
          class="border border-green-400 px-3 py-1 hover:bg-green-900 transition-colors"
        >
          {showDocumentation ? 'HIDE DOCS' : 'SHOW DOCS'}
        </button>
        <a 
          href="/api/unified-vector?action=health" 
          target="_blank"
          class="border border-blue-400 text-blue-400 px-3 py-1 hover:bg-blue-900 transition-colors"
        >
          HEALTH API
        </a>
        <a 
          href="/api/unified-vector?action=analytics" 
          target="_blank"
          class="border border-purple-400 text-purple-400 px-3 py-1 hover:bg-purple-900 transition-colors"
        >
          ANALYTICS API
        </a>
      </div>
    </div>
  </nav>

  <!-- Documentation Panel -->
  {#if showDocumentation}
    <div class="border-b border-green-400 bg-green-950 bg-opacity-10 p-6">
      <div class="max-w-7xl mx-auto">
        <h2 class="text-lg font-mono mb-4 text-green-300">SYSTEM ARCHITECTURE</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="border border-green-600 p-3">
            <h3 class="text-green-300 font-mono mb-2">TIER 1: VECTOR PROCESSING</h3>
            <ul class="text-xs space-y-1 text-green-400">
              <li>• Nomic Embed (768D) → Ollama</li>
              <li>• Redis Multi-Tier Cache</li>
              <li>• Qdrant HNSW Indexing</li>
              <li>• PostgreSQL + pgvector</li>
            </ul>
          </div>
          
          <div class="border border-green-600 p-3">
            <h3 class="text-green-300 font-mono mb-2">TIER 2: ENHANCED RAG</h3>
            <ul class="text-xs space-y-1 text-green-400">
              <li>• Real-time PageRank</li>
              <li>• Hybrid Search (Semantic + Keyword)</li>
              <li>• Context7 MCP Integration</li>
              <li>• Feedback Loop System</li>
            </ul>
          </div>
          
          <div class="border border-green-600 p-3">
            <h3 class="text-green-300 font-mono mb-2">TIER 3: GPU ACCELERATION</h3>
            <ul class="text-xs space-y-1 text-green-400">
              <li>• WebGPU Tensor Processing</li>
              <li>• 25+ Go CUDA Microservices</li>
              <li>• SIMD Optimizations</li>
              <li>• QUIC Gateway Streaming</li>
            </ul>
          </div>
          
          <div class="border border-green-600 p-3">
            <h3 class="text-green-300 font-mono mb-2">TIER 4: AI INTELLIGENCE</h3>
            <ul class="text-xs space-y-1 text-green-400">
              <li>• SOM Neural Clustering</li>
              <li>• Glyph Diffusion Bridge</li>
              <li>• Neo4j 3D Visualization</li>
              <li>• XState Orchestration</li>
            </ul>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Integration Flow -->
          <div class="border border-green-600 p-4">
            <h3 class="text-green-300 font-mono mb-3">INTEGRATION FLOW</h3>
            <div class="text-xs space-y-2 text-green-400 font-mono">
              <div>1. Document Upload → Vector Embedding</div>
              <div>2. Qdrant + PostgreSQL → Redis Cache</div>
              <div>3. PageRank + Feedback → Hybrid Search</div>
              <div>4. WebGPU Processing → SOM Clustering</div>
              <div>5. Glyph Generation → 3D Visualization</div>
              <div>6. Neo4j Graph → YoRHa Interface</div>
            </div>
          </div>

          <!-- API Endpoints -->
          <div class="border border-green-600 p-4">
            <h3 class="text-green-300 font-mono mb-3">API ENDPOINTS</h3>
            <div class="text-xs space-y-2 text-green-400 font-mono">
              <div><span class="text-blue-400">POST</span> /api/unified-vector</div>
              <div><span class="text-green-500">GET</span> /api/unified-vector?action=health</div>
              <div><span class="text-green-500">GET</span> /api/unified-vector?action=analytics</div>
              <div><span class="text-yellow-400">PUT</span> /api/unified-vector (feedback)</div>
              <div><span class="text-red-400">DELETE</span> /api/unified-vector?documentId=X</div>
            </div>
          </div>
        </div>

        <!-- Performance Metrics -->
        <div class="mt-6 border border-green-600 p-4">
          <h3 class="text-green-300 font-mono mb-3">SYSTEM SPECIFICATIONS</h3>
          <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
            <div>
              <div class="text-green-300">Processing Capacity</div>
              <div class="text-green-400">{systemStats.processingCapacity}</div>
            </div>
            <div>
              <div class="text-green-300">GPU Acceleration</div>
              <div class="text-green-400">{systemStats.gpuAcceleration}</div>
            </div>
            <div>
              <div class="text-green-300">Compression</div>
              <div class="text-green-400">{systemStats.compressionRatio}</div>
            </div>
            <div>
              <div class="text-green-300">Neural Clustering</div>
              <div class="text-green-400">128x128 SOM nodes</div>
            </div>
            <div>
              <div class="text-green-300">Vector Dimensions</div>
              <div class="text-green-400">768D embeddings</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Main Interface -->
  <main class="p-6">
    <div class="max-w-7xl mx-auto">
      <UnifiedVectorInterface />
    </div>
  </main>

  <!-- Footer -->
  <footer class="border-t border-green-400 p-4 text-center text-sm text-green-600">
    <div class="max-w-7xl mx-auto">
      Legal AI Platform • Unified Vector Systems • WebGPU + WebAssembly + Neural Networks
    </div>
  </footer>
</div>

<style>
  /* YoRHa-themed styling */
  :global(body) {
    background-color: black;
  }
</style>
