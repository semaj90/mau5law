<!--
  Unified Vector Interface Component
  YoRHa-themed interface for all vector systems integration
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import type { UnifiedVectorRequest, UnifiedVectorResponse } from '$lib/services/unified-vector-orchestrator';

  // Stores
  const isProcessing = writable(false);
  const results = writable<UnifiedVectorResponse | null>(null);
  const health = writable<Record<string, boolean>>({});
  const analytics = writable<Record<string, any>>({});
  const logs = writable<string[]>([]);

  // Form state
  let selectedOperation: 'analyze' | 'search' | 'recommend' | 'visualize' | 'ingest' = 'analyze';
  let inputText = '';
  let userId = 'demo_user';
  let sessionId = `session_${Date.now()}`;
  // Options
  let useWebGPU = true;
  let useWebAssembly = true;
  let usePageRank = true;
  let generateGlyphs = false;
  let useRecommendations = true;
  let useNeo4j = true;
  let cacheResults = true;

  // Sample documents for testing
  let sampleDocuments = [
    {
      id: 'doc1',
      title: 'Contract Analysis',
      content: 'This employment contract contains standard clauses for non-disclosure and termination procedures.',
      type: 'CONTRACT'
    },
    {
      id: 'doc2', 
      title: 'Legal Precedent',
      content: 'In the case of Smith v. Johnson, the court ruled that contractual obligations must be clearly stated.',
      type: 'CASE_LAW'
    }
  ];

  function addLog(message: string) {
    logs.update(currentLogs => [
      `[${new Date().toLocaleTimeString()}] ${message}`,
      ...currentLogs.slice(0, 99) // Keep last 100 logs
    ]);
  }

  async function checkHealth() {
    try {
      const response = await fetch('/api/unified-vector?action=health');
      const data = await response.json();
      health.set(data.health || {});
      const healthStatus = data.allSystemsOperational ? 'All systems operational' : 'Some systems offline';
      addLog(`Health check: ${healthStatus}`);
    } catch (error: any) {
      addLog(`Health check failed: ${error.message}`);
    }
  }

  async function loadAnalytics() {
    try {
      const response = await fetch('/api/unified-vector?action=analytics');
      const data = await response.json();
      analytics.set(data.analytics || {});
      addLog('Analytics updated');
    } catch (error: any) {
      addLog(`Analytics failed: ${error.message}`);
    }
  }

  async function processRequest() {
    if (!inputText.trim() && selectedOperation !== 'ingest') {
      addLog('Error: Input text is required');
      return;
    }

    isProcessing.set(true);
    addLog(`Starting ${selectedOperation} operation...`);

    try {
      const request: UnifiedVectorRequest = {
        type: selectedOperation,
        payload: {
          text: inputText || undefined,
          documents: selectedOperation === 'ingest' ? sampleDocuments : undefined,
          query: selectedOperation === 'search' ? inputText : undefined,
          userId,
          sessionId,
          options: {
            useWebGPU,
            useWebAssembly,
            usePageRank,
            generateGlyphs,
            useRecommendations,
            useNeo4j,
            cacheResults
          }
        }
      };

      const response = await fetch('/api/unified-vector', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      const data: UnifiedVectorResponse = await response.json();
      results.set(data);

      if (data.success) {
        addLog(`✅ ${selectedOperation} completed in ${data.results.processingTime}ms`);
        addLog(`Components used: ${data.metadata.componentsUsed.join(', ')}`);
        addLog(`Confidence: ${(data.results.confidence * 100).toFixed(1)}%`);
      } else {
        addLog(`❌ ${selectedOperation} failed: ${data.metadata.errors?.join(', ') || 'Unknown error'}`);
      }

    } catch (error: any) {
      addLog(`❌ Request failed: ${error.message}`);
      results.set(null);
    } finally {
      isProcessing.set(false);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  onMount(() => {
    checkHealth();
    loadAnalytics();
    // Refresh health and analytics every 30 seconds
    const interval = setInterval(() => {
      checkHealth();
      loadAnalytics();
    }, 30000);

    return () => clearInterval(interval);
  });
</script>

<!-- YoRHa-themed UI -->
<div class="unified-vector-interface bg-black text-green-400 font-mono min-h-screen p-6">
  <!-- Header -->
  <div class="border border-green-400 mb-6 p-4">
    <h1 class="text-2xl mb-2 text-center">UNIFIED VECTOR ORCHESTRATOR</h1>
    <div class="text-sm text-center text-green-300">
      WebGPU SOM • WebAssembly RAG • PageRank • Glyph Diffusion • Neo4j • Vector Search
    </div>
  </div>

  <!-- System Status Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
    <!-- Health Status -->
    <div class="border border-green-400 p-4">
      <h2 class="text-lg mb-3 text-green-300">SYSTEM STATUS</h2>
      <div class="space-y-2 text-sm">
        {#each Object.entries($health) as [system, status]}
          <div class="flex justify-between">
            <span class="capitalize">{system.replace(/([A-Z])/g, ' $1')}</span>
            <span class="{status ? 'text-green-400' : 'text-red-400'}">
              {status ? '●' : '○'}
            </span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Performance Analytics -->
    <div class="border border-green-400 p-4">
      <h2 class="text-lg mb-3 text-green-300">PERFORMANCE</h2>
      <div class="space-y-2 text-sm">
        {#each Object.entries($analytics) as [operation, stats]}
          <div class="mb-2">
            <div class="capitalize text-green-200">{operation}</div>
            <div class="text-xs text-green-400">
              Avg: {stats.average?.toFixed(0)}ms | P95: {stats.p95?.toFixed(0)}ms
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Activity Log -->
    <div class="border border-green-400 p-4">
      <h2 class="text-lg mb-3 text-green-300">ACTIVITY LOG</h2>
      <div class="h-32 overflow-y-auto text-xs space-y-1">
        {#each $logs as log}
          <div class="text-green-300">{log}</div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Main Interface -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Control Panel -->
    <div class="border border-green-400 p-4">
      <h2 class="text-lg mb-4 text-green-300">CONTROL PANEL</h2>

      <!-- Operation Selection -->
      <div class="mb-4">
        <label class="block text-sm mb-2" for="operation">OPERATION</label><select id="operation" 
          bind:value={selectedOperation}
          class="w-full bg-black border border-green-400 text-green-400 p-2 text-sm"
        >
          <option value="analyze">Analyze - Complete AI analysis pipeline</option>
          <option value="search">Search - Hybrid vector + semantic search</option>
          <option value="recommend">Recommend - SOM-based recommendations</option>
          <option value="visualize">Visualize - 3D graphs + glyph generation</option>
          <option value="ingest">Ingest - Bulk document processing</option>
        </select>
      </div>

      <!-- Text Input -->
      {#if selectedOperation !== 'ingest'}
        <div class="mb-4">
          <label class="block text-sm mb-2" for="input-text">INPUT TEXT</label><textarea id="input-text"
            bind:value={inputText}
            placeholder="Enter your legal text for analysis..."
            class="w-full bg-black border border-green-400 text-green-400 p-2 text-sm h-24 resize-none"
          ></textarea>
        </div>
      {/if}

      <!-- User Context -->
      <div class="grid grid-cols-2 gap-2 mb-4">
        <div>
          <label class="block text-xs mb-1" for="user-id">USER ID</label><input id="user-id"
            bind:value={userId}
            class="w-full bg-black border border-green-400 text-green-400 p-1 text-xs"
          />
        </div>
        <div>
          <label class="block text-xs mb-1" for="session-id">SESSION ID</label><input id="session-id"
            bind:value={sessionId}
            class="w-full bg-black border border-green-400 text-green-400 p-1 text-xs"
          />
        </div>
      </div>

      <!-- Options Grid -->
      <div class="mb-4">
        <label class="block text-sm mb-2">SYSTEM OPTIONS</label>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <label class="flex items-center space-x-2">
            <input type="checkbox" bind:checked={useWebGPU} class="accent-green-400" />
            <span>WebGPU SOM</span>
          </label>
          <label class="flex items-center space-x-2">
            <input type="checkbox" bind:checked={useWebAssembly} class="accent-green-400" />
            <span>WebAssembly RAG</span>
          </label>
          <label class="flex items-center space-x-2">
            <input type="checkbox" bind:checked={usePageRank} class="accent-green-400" />
            <span>PageRank</span>
          </label>
          <label class="flex items-center space-x-2">
            <input type="checkbox" bind:checked={generateGlyphs} class="accent-green-400" />
            <span>Glyph Generation</span>
          </label>
          <label class="flex items-center space-x-2">
            <input type="checkbox" bind:checked={useRecommendations} class="accent-green-400" />
            <span>Recommendations</span>
          </label>
          <label class="flex items-center space-x-2">
            <input type="checkbox" bind:checked={useNeo4j} class="accent-green-400" />
            <span>Neo4j Graph</span>
          </label>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="grid grid-cols-3 gap-2">
        <button
          onclick={processRequest}
          disabled={$isProcessing}
          class="bg-green-900 border border-green-400 text-green-400 p-2 text-sm hover:bg-green-800 disabled:opacity-50"
        >
          {$isProcessing ? 'PROCESSING...' : 'EXECUTE'}
        </button>
        <button
          onclick={checkHealth}
          class="bg-blue-900 border border-blue-400 text-blue-400 p-2 text-sm hover:bg-blue-800"
        >
          HEALTH CHECK
        </button>
        <button
          onclick={loadAnalytics}
          class="bg-purple-900 border border-purple-400 text-purple-400 p-2 text-sm hover:bg-purple-800"
        >
          ANALYTICS
        </button>
      </div>
    </div>

    <!-- Results Panel -->
    <div class="border border-green-400 p-4">
      <h2 class="text-lg mb-4 text-green-300">RESULTS</h2>

      {#if $results}
        <div class="space-y-4 text-sm">
          <!-- Operation Summary -->
          <div class="border border-green-600 p-3">
            <div class="text-green-200 mb-2">OPERATION: {$results.type.toUpperCase()}</div>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>Status: <span class="{$results.success ? 'text-green-400' : 'text-red-400'}">
                {$results.success ? 'SUCCESS' : 'FAILED'}
              </span></div>
              <div>Processing: {$results.results.processingTime}ms</div>
              <div>Confidence: {($results.results.confidence * 100).toFixed(1)}%</div>
              <div>Components: {$results.metadata.componentsUsed.length}</div>
            </div>
          </div>

          <!-- Components Used -->
          <div class="border border-green-600 p-3">
            <div class="text-green-200 mb-2">COMPONENTS USED</div>
            <div class="flex flex-wrap gap-1">
              {#each $results.metadata.componentsUsed as component}
                <span class="bg-green-900 px-2 py-1 text-xs border border-green-400">
                  {component}
                </span>
              {/each}
            </div>
          </div>

          <!-- Performance Breakdown -->
          {#if Object.keys($results.metadata.performance).length > 0}
            <div class="border border-green-600 p-3">
              <div class="text-green-200 mb-2">PERFORMANCE</div>
              <div class="space-y-1 text-xs">
                {#each Object.entries($results.metadata.performance) as [component, time]}
                  <div class="flex justify-between">
                    <span>{component}</span>
                    <span>{time}ms</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Results Data -->
          {#if $results.results.vectorResults}
            <div class="border border-green-600 p-3">
              <div class="text-green-200 mb-2">VECTOR RESULTS ({$results.results.vectorResults.length})</div>
              <div class="space-y-1 text-xs max-h-32 overflow-y-auto">
                {#each $results.results.vectorResults.slice(0, 5) as result}
                  <div class="border-l-2 border-green-700 pl-2">
                    <div class="text-green-300">{result.metadata?.title || result.id}</div>
                    <div class="text-green-500">Score: {(result.score * 100).toFixed(1)}%</div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          {#if $results.results.recommendations}
            <div class="border border-green-600 p-3">
              <div class="text-green-200 mb-2">RECOMMENDATIONS ({$results.results.recommendations.length})</div>
              <div class="space-y-1 text-xs max-h-32 overflow-y-auto">
                {#each $results.results.recommendations.slice(0, 3) as rec}
                  <div class="border-l-2 border-green-700 pl-2">
                    <div class="text-green-300">{rec.title}</div>
                    <div class="text-green-500">Priority: {rec.priority} | Confidence: {(rec.confidence * 100).toFixed(1)}%</div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Errors -->
          {#if $results.metadata.errors && $results.metadata.errors.length > 0}
            <div class="border border-red-600 p-3">
              <div class="text-red-200 mb-2">ERRORS</div>
              <div class="space-y-1 text-xs">
                {#each $results.metadata.errors as error}
                  <div class="text-red-400">{error}</div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <div class="text-green-600 text-sm">No results yet. Execute an operation to see results.</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .unified-vector-interface {
    background-image: 
      linear-gradient(rgba(0, 255, 0, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 255, 0, 0.03) 1px, transparent 1px);
    background-size: 20px 20px;
  }

  input, textarea, select {
    outline: none;
  }

  input:focus, textarea:focus, select:focus {
    box-shadow: inset 0 0 0 1px theme('colors.green.400');
  }

  button:disabled {
    cursor: not-allowed;
  }

  .accent-green-400 {
    accent-color: theme('colors.green.400');
  }
</style>
