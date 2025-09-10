<!--
  Intelligent Model Orchestrator Dashboard
  Real-time monitoring and control of the multi-model AI system
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { writable, derived } from 'svelte/store';
  import {
    intelligentOrchestrator,
    currentModelInfo,
    selfPromptingSuggestions,
    performanceMetrics,
    memoryOptimization,
    type SelfPromptingSuggestion
  } from '$lib/ai/intelligent-model-orchestrator';

  // Component state
  let mounted = false;
  let queryInput = '';
  let isProcessing = false;
  let results = writable<any>(null);
  let systemStatus = writable<any>(null);
  let userFeedback = writable<Map<string, boolean>>(new Map());

  // Auto-refresh interval
  let refreshInterval: NodeJS.Timeout;
  let worker: Worker | null = null;

  // Derived stores for UI
  const modelStatusDisplay = derived(
    [currentModelInfo, performanceMetrics],
    ([$model, $metrics]) => ({
      current: $model,
      metrics: $metrics,
      isHealthy: $model && $metrics.some(m => m.modelId === $model.id && m.successRate > 0.7)
    })
  );

  const memoryStatusDisplay = derived(
    memoryOptimization,
    ($memory) => $memory ? {
      totalUsed: $memory.totalMemoryUsed,
      fragmentation: $memory.fragmentationRatio,
      efficiency: 1 - $memory.fragmentationRatio,
      layout: Array.from($memory.layout.entries())
    } : null
  );

  const suggestionDisplay = derived(
    selfPromptingSuggestions,
    ($suggestions) => $suggestions.sort((a, b) => b.confidence - a.confidence)
  );

  onMount(async () => {
    mounted = true;

    // Initialize worker for communication with the intelligent system
    try {
  worker = new Worker('/workers/rl-workergemma.js');

      worker.onmessage = (event) => {
  const { type, data, payload } = event.data;

        switch (type) {
          case 'SMART_MODEL_SELECTED':
            console.log('🧠 Smart model selected:', data || payload);
            break;
          case 'MODEL_PERFORMANCE':
            console.log('📊 Performance data:', data || payload);
            break;
          case 'CACHE_OPTIMIZED':
            console.log('🔧 Cache optimized:', data || payload);
            break;
        }
      };

      // Initialize the worker
      worker.postMessage({ type: 'INIT_WASM' });

    } catch (error) {
      console.error('Failed to initialize worker:', error);
    }

    // Start auto-refresh
    refreshInterval = setInterval(refreshSystemStatus, 5000);

    // Initial status load
    await refreshSystemStatus();
  });

  onDestroy(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    if (worker) {
      worker.terminate();
    }
  });

  async function refreshSystemStatus() {
    try {
      const status = intelligentOrchestrator.getModelPerformanceReport();
      systemStatus.set(status);
    } catch (error) {
      console.error('Failed to refresh system status:', error);
    }
  }

  async function processQuery() {
    if (!queryInput.trim() || isProcessing) return;

    isProcessing = true;

    try {
      // Process the query through the intelligent orchestrator
      const result = await intelligentOrchestrator.processQuery(
        queryInput,
        {
          sessionLength: 5,
          totalSessions: 1,
          avgQueryComplexity: 0.5
        }
      );

      results.set(result);

      // Send to worker for additional processing if available
      if (worker) {
        worker.postMessage({
          type: 'SMART_MODEL_SELECT',
          payload: {
            query: queryInput,
            userContext: { sessionId: 'demo' },
            intent: { category: 'general', confidence: 0.8 }
          }
        });
      }

    } catch (error) {
      console.error('Query processing failed:', error);
      results.set({ error: error.message });
    } finally {
      isProcessing = false;
    }
  }

  async function acceptSuggestion(suggestion: SelfPromptingSuggestion) {
    try {
      await intelligentOrchestrator.handleUserFeedback(suggestion.id, true, suggestion.suggestion);

      // Update local feedback tracking
      userFeedback.update(fb => {
        fb.set(suggestion.id, true);
        return fb;
      });

      // Process the accepted suggestion as a new query
      queryInput = suggestion.suggestion;
      await processQuery();

    } catch (error) {
      console.error('Failed to accept suggestion:', error);
    }
  }

  async function rejectSuggestion(suggestion: SelfPromptingSuggestion) {
    try {
      await intelligentOrchestrator.handleUserFeedback(suggestion.id, false);

      userFeedback.update(fb => {
        fb.set(suggestion.id, false);
        return fb;
      });

    } catch (error) {
      console.error('Failed to reject suggestion:', error);
    }
  }

  function formatLatency(ms: number): string {
    if (ms < 100) return `${ms.toFixed(0)}ms`;
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  function formatMemorySize(mb: number): string {
    if (mb < 1024) return `${mb.toFixed(0)}MB`;
    return `${(mb / 1024).toFixed(1)}GB`;
  }

  function getConfidenceColor(confidence: number): string {
    if (confidence > 0.8) return 'text-green-600';
    if (confidence > 0.6) return 'text-yellow-600';
    return 'text-red-600';
  }

  function getCategoryIcon(category: string): string {
    switch (category) {
      case 'clarification': return '❓';
      case 'expansion': return '📋';
      case 'alternative': return '🔄';
      case 'follow-up': return '➡️';
      case 'correction': return '✏️';
      default: return '💡';
    }
  }
</script>

<div class="intelligent-orchestrator-dashboard min-h-screen bg-gray-50 p-6">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-2">
      🧠 Intelligent Model Orchestrator
    </h1>
    <p class="text-gray-600">
      Multi-model AI system with auto-switching, predictive loading, and self-prompting intelligence
    </p>
  </div>

  <!-- Query Interface -->
  <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
    <h2 class="text-xl font-semibold text-gray-800 mb-4">Query Interface</h2>

    <div class="flex gap-4 mb-4">
      <input
        bind:value={queryInput}
        on:keydown={(e) => e.key === 'Enter' && processQuery()}
        placeholder="Ask me anything... (the system will intelligently select the best model)"
        class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        disabled={isProcessing}
      />
      <button
        on:click={processQuery}
        disabled={isProcessing || !queryInput.trim()}
        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#if isProcessing}
          <span class="animate-spin">⚙️</span> Processing...
        {:else}
          🚀 Process
        {/if}
      </button>
    </div>

    <!-- Query Results -->
    {#if $results}
      <div class="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <h3 class="text-lg font-medium text-gray-800 mb-3">🎯 Processing Results</h3>

        {#if $results.error}
          <div class="text-red-600">
            <strong>Error:</strong> {$results.error}
          </div>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div class="text-sm text-gray-600">Selected Model:</div>
              <div class="text-lg font-semibold text-blue-600">{$results.selectedModel}</div>
            </div>
            <div>
              <div class="text-sm text-gray-600">Estimated Latency:</div>
              <div class="text-lg font-semibold {$results.estimatedLatency < 500 ? 'text-green-600' : 'text-yellow-600'}">
                {formatLatency($results.estimatedLatency)}
              </div>
            </div>
            <div class="md:col-span-2">
              <div class="text-sm text-gray-600">Preload Recommendations:</div>
              <div class="flex gap-2 mt-1">
                {#each $results.shouldPreload || [] as model}
                  <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">{model}</span>
                {/each}
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- System Status Dashboard -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
    <!-- Current Model Status -->
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">🤖 Current Model</h3>

      {#if $modelStatusDisplay.current}
        <div class="space-y-3">
          <div>
            <div class="text-sm text-gray-600">Active Model</div>
            <div class="text-xl font-bold text-gray-900">{$modelStatusDisplay.current.name}</div>
            <div class="text-sm text-gray-500">{$modelStatusDisplay.current.id}</div>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div class="text-gray-600">Target Latency</div>
              <div class="font-semibold">{formatLatency($modelStatusDisplay.current.targetLatency)}</div>
            </div>
            <div>
              <div class="text-gray-600">Memory</div>
              <div class="font-semibold">{formatMemorySize($modelStatusDisplay.current.memoryFootprint)}</div>
            </div>
          </div>

          <div>
            <div class="text-gray-600">Capabilities</div>
            <div class="flex flex-wrap gap-1 mt-1">
              {#each $modelStatusDisplay.current.capabilities as capability}
                <span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                  {capability}
                </span>
              {/each}
            </div>
          </div>

          <div class="pt-2 border-t">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full {$modelStatusDisplay.isHealthy ? 'bg-green-500' : 'bg-red-500'}"></div>
              <span class="text-sm {$modelStatusDisplay.isHealthy ? 'text-green-600' : 'text-red-600'}">
                {$modelStatusDisplay.isHealthy ? 'Healthy' : 'Issues Detected'}
              </span>
            </div>
          </div>
        </div>
      {:else}
        <div class="text-gray-500">No model currently active</div>
      {/if}
    </div>

    <!-- Memory Optimization Status -->
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">🧠 Memory Status</h3>

      {#if $memoryStatusDisplay}
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div class="text-gray-600">Total Used</div>
              <div class="font-semibold">{formatMemorySize($memoryStatusDisplay.totalUsed)}</div>
            </div>
            <div>
              <div class="text-gray-600">Efficiency</div>
              <div class="font-semibold text-green-600">
                {($memoryStatusDisplay.efficiency * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div>
            <div class="text-gray-600 mb-2">Fragmentation</div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div
                class="bg-{$memoryStatusDisplay.fragmentation < 0.3 ? 'green' : 'orange'}-500 h-2 rounded-full"
                style="width: {$memoryStatusDisplay.fragmentation * 100}%"
              ></div>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              {($memoryStatusDisplay.fragmentation * 100).toFixed(1)}% fragmented
            </div>
          </div>

          <div>
            <div class="text-gray-600 mb-2">Model Layout</div>
            <div class="space-y-1">
              {#each $memoryStatusDisplay.layout as [modelId, layout]}
                <div class="flex justify-between text-xs">
                  <span class="truncate">{modelId}</span>
                  <span class="text-gray-500">{formatMemorySize(layout.size)}</span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {:else}
        <div class="text-gray-500">Memory data not available</div>
      {/if}
    </div>

    <!-- Performance Metrics -->
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">📊 Performance</h3>

      {#if $systemStatus}
        <div class="space-y-3 text-sm">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-gray-600">Total Queries</div>
              <div class="text-xl font-bold">{$systemStatus.summary?.totalQueries || 0}</div>
            </div>
            <div>
              <div class="text-gray-600">Avg Latency</div>
              <div class="text-xl font-bold">{formatLatency($systemStatus.summary?.averageLatency || 0)}</div>
            </div>
          </div>

          <div>
            <div class="text-gray-600 mb-1">Overall Satisfaction</div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div
                class="bg-blue-500 h-2 rounded-full"
                style="width: {($systemStatus.summary?.overallSatisfaction || 0) * 100}%"
              ></div>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              {(($systemStatus.summary?.overallSatisfaction || 0) * 100).toFixed(1)}%
            </div>
          </div>

          <div>
            <div class="text-gray-600">Active Models</div>
            <div class="text-lg font-semibold">{$systemStatus.summary?.activeModels || 0}</div>
          </div>

          <div>
            <div class="text-gray-600">Cache Hit Rate</div>
            <div class="text-lg font-semibold text-green-600">
              {(($systemStatus.summary?.cacheHitRate || 0) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      {:else}
        <div class="text-gray-500">Loading performance data...</div>
      {/if}
    </div>
  </div>

  <!-- Self-Prompting Suggestions -->
  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-semibold text-gray-800 mb-4">💡 Self-Prompting Suggestions</h3>

    {#if $suggestionDisplay && $suggestionDisplay.length > 0}
      <div class="space-y-4">
        {#each $suggestionDisplay as suggestion}
          <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-lg">{getCategoryIcon(suggestion.category)}</span>
                  <span class="text-sm font-medium text-gray-700 capitalize">
                    {suggestion.category}
                  </span>
                  <span class="text-xs px-2 py-1 bg-gray-100 rounded {getConfidenceColor(suggestion.confidence)}">
                    {(suggestion.confidence * 100).toFixed(0)}% confident
                  </span>
                </div>

                <p class="text-gray-800 mb-3">{suggestion.suggestion}</p>

                <div class="flex items-center gap-4 text-xs text-gray-500">
                  <span>📱 {suggestion.modelRecommendation}</span>
                  <span>⚡ {formatLatency(suggestion.estimatedLatency)}</span>
                  <span>🎯 {(suggestion.contextRelevance * 100).toFixed(0)}% relevant</span>
                </div>
              </div>

              <div class="flex gap-2 ml-4">
                {#if !$userFeedback.has(suggestion.id)}
                  <button
                    on:click={() => acceptSuggestion(suggestion)}
                    class="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                  >
                    ✓ Accept
                  </button>
                  <button
                    on:click={() => rejectSuggestion(suggestion)}
                    class="px-3 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500"
                  >
                    ✗ Reject
                  </button>
                {:else}
                  <span class="px-3 py-1 rounded text-xs {$userFeedback.get(suggestion.id) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    {$userFeedback.get(suggestion.id) ? '✓ Accepted' : '✗ Rejected'}
                  </span>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-center py-8 text-gray-500">
        <div class="text-4xl mb-2">🤔</div>
        <p>No suggestions available. Try asking a question to see intelligent suggestions!</p>
      </div>
    {/if}
  </div>

  <!-- Model Performance Details -->
  {#if $performanceMetrics && $performanceMetrics.length > 0}
    <div class="mt-8 bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">🔍 Model Performance Details</h3>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left">Model ID</th>
              <th class="px-4 py-2 text-center">Avg Latency</th>
              <th class="px-4 py-2 text-center">Success Rate</th>
              <th class="px-4 py-2 text-center">User Satisfaction</th>
              <th class="px-4 py-2 text-center">Usage Count</th>
              <th class="px-4 py-2 text-center">Last Used</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            {#each $performanceMetrics as metric}
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-2 font-medium">{metric.modelId}</td>
                <td class="px-4 py-2 text-center">{formatLatency(metric.averageLatency)}</td>
                <td class="px-4 py-2 text-center">
                  <span class="px-2 py-1 rounded text-xs {metric.successRate > 0.8 ? 'bg-green-100 text-green-800' : metric.successRate > 0.6 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">
                    {(metric.successRate * 100).toFixed(1)}%
                  </span>
                </td>
                <td class="px-4 py-2 text-center">{(metric.userSatisfaction * 100).toFixed(1)}%</td>
                <td class="px-4 py-2 text-center">{metric.usageCount}</td>
                <td class="px-4 py-2 text-center text-gray-500">
                  {new Date(metric.lastUsed).toLocaleTimeString()}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<style>
  .intelligent-orchestrator-dashboard {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* Responsive animations */
  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Custom scrollbar for overflow areas */
  .overflow-x-auto::-webkit-scrollbar {
    height: 6px;
  }

  .overflow-x-auto::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }

  .overflow-x-auto::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }

  .overflow-x-auto::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
</style>

