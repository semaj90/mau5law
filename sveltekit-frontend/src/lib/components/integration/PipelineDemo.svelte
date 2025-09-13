<!-- @migration-task Error while migrating Svelte code: 'default' is a reserved word in JavaScript and cannot be used here
https://svelte.dev/e/unexpected_reserved_word -->
<!-- @migration-task Error while migrating Svelte code: 'default' is a reserved word in JavaScript and cannot be used here -->
{#snippet default}
<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { pipelineManager, type PipelineType, type PipelineResult } from '$lib/services/pipeline-manager';
  import { PipelineVisualizer } from '$lib/services/pipeline-visualizer';
  import { Button } from '$lib/components/ui/enhanced-bits';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';;
  // Reactive state using Svelte 5 runes
  let isProcessing = $state(false);
  let results = $state<PipelineResult[]>([]);
  let systemHealth = $state<any>(null);
  let performanceReport = $state<any>(null);
  let searchQuery = $state('');
  let searchResults = $state<any>(null);
  let selectedPipeline = $state<PipelineType>('optimized');
  let cacheKey = $state('demo_legal_documents');

  // Performance metrics
  let metrics = $state({
    totalOperations: 0,
    averageTime: 0,
    successRate: 0,
    lastUpdate: new Date()
  });

  // Pipeline execution with XState management
  async function executePipeline() {
    if (isProcessing) return;
    isProcessing = true;
    try {
      console.log(`🚀 Starting ${selectedPipeline} pipeline execution`);
      const result = await pipelineManager.executePipeline(cacheKey, {
        type: selectedPipeline,
        enableGPU: true,
        enableConcurrency: true,
        enableMemoryOptimization: true
      });
      results = [result, ...results.slice(0, 9)]; // Keep last 10 results
      updateMetrics();
    } catch (error) {
      console.error('Pipeline execution failed:', error);
    } finally {
      isProcessing = false;
    }
  }

  // Auto-select optimal pipeline
  async function autoExecutePipeline() {
    if (isProcessing) return;
    isProcessing = true;
    try {
      console.log('🧠 Auto-selecting optimal pipeline');
      const result = await pipelineManager.autoSelectPipeline(cacheKey, {
        estimatedSize: 25000,
        requiresGPU: true,
        requiresConcurrency: true,
        prioritizeSpeed: true
      });
      results = [result, ...results.slice(0, 9)];
      updateMetrics();
    } catch (error) {
      console.error('Auto pipeline execution failed:', error);
    } finally {
      isProcessing = false;
    }
  }

  // Batch processing demo
  async function batchProcess() {
    if (isProcessing) return;
    isProcessing = true;
    try {
      console.log('📦 Starting batch processing');
      const batchRequests = [
        { cacheKey: 'contracts_batch', config: { type: 'optimized' as PipelineType } },
        { cacheKey: 'evidence_batch', config: { type: 'advanced' as PipelineType } },
        { cacheKey: 'cases_batch', config: { type: 'end-to-end' as PipelineType } }
      ];
      const batchResults = await pipelineManager.batchProcess(batchRequests);
      results = [...batchResults, ...results.slice(0, 7)];
      updateMetrics();
    } catch (error) {
      console.error('Batch processing failed:', error);
    } finally {
      isProcessing = false;
    }
  }

  // Search across all pipelines
  async function searchPipelines() {
    if (!searchQuery.trim()) return;
    try {
      console.log(`🔍 Searching all pipelines for: "${searchQuery}"`);
      const results = await pipelineManager.searchAllPipelines(searchQuery, 10);
      searchResults = results;
    } catch (error) {
      console.error('Search failed:', error);
    }
  }

  // System health check
  async function checkSystemHealth() {
    try {
      console.log('🏥 Checking system health');
      systemHealth = await pipelineManager.getSystemHealth();
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  // Generate performance report
  function generateReport() {
    console.log('📈 Generating performance report');
    performanceReport = pipelineManager.generatePerformanceReport();
  }

  // Update metrics
  function updateMetrics() {
    const successful = results.filter(r => r.success).length;
    const totalTime = results.reduce((sum, r) => sum + r.metrics.totalProcessingTime, 0);
    metrics = {
      totalOperations: results.length,
      averageTime: results.length > 0 ? totalTime / results.length : 0,
      successRate: results.length > 0 ? (successful / results.length) * 100 : 0,
      lastUpdate: new Date()
    };
  }

  // Cleanup resources
  async function cleanup() {
    try {
      console.log('🧹 Cleaning up pipeline resources');
      await pipelineManager.cleanup();
      results = [];
      searchResults = null;
      systemHealth = null;
      performanceReport = null;
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  // Format time display
  function formatTime(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  // Format memory display
  function formatMemory(mb: number): string {
    return `${mb.toFixed(0)}MB`;
  }

  // Get status color
  function getStatusColor(success: boolean): string {
    return success ? 'text-green-600' : 'text-red-600';
  }

  // Initialize on mount
  $effect(() => {
    checkSystemHealth();
  });
</script>

<div class="space-y-6 p-6 max-w-7xl mx-auto">
  <!-- Header -->
  <div class="text-center">
    <h1 class="text-3xl font-bold text-gray-900 mb-2">
      🚀 Advanced Redis Pipeline Demo
    </h1>
    <p class="text-gray-600">
      XState Management • Worker Threads • GPU Acceleration • Memory Optimization
    </p>
  </div>

  <!-- Pipeline Controls -->
  <NesCard>
    <div class="yorha-panel-header">
      <h3 class="nes-text is-primary">Pipeline Execution</h3>
    </div>
    <div class="yorha-panel-content" class="space-y-4">
      <!-- Pipeline Selection -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2" for="pipeline-type">Pipeline Type</label><select id="pipeline-type" 
            bind:value={selectedPipeline}
            class="w-full p-2 border rounded-md"
            disabled={isProcessing}
          >
            <option value="optimized">🚀 Optimized (XState + Workers)</option>
            <option value="advanced">⚡ Advanced (SIMD + GPU)</option>
            <option value="end-to-end">🔄 End-to-End (Full Stack)</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2" for="cache-key">Cache Key</label><input id="cache-key" 
            type="text" 
            bind:value={cacheKey}
            class="w-full p-2 border rounded-md"
            placeholder="Enter cache key..."
            disabled={isProcessing}
          />
        </div>
        
        <div class="flex items-end">
          <Button 
            onclick={executePipeline}
            disabled={isProcessing}
            class="w-full bits-btn bits-btn"
          >
            {isProcessing ? '⏳ Processing...' : '🚀 Execute Pipeline'}
          </button>
        </div>
      </div>

      <!-- Advanced Controls -->
      <div class="flex flex-wrap gap-2">
        <Button class="bits-btn" 
          onclick={autoExecutePipeline}
          disabled={isProcessing}
          variant="outline"
        >
          🧠 Auto-Select Optimal
        </button>
        
        <Button class="bits-btn" 
          onclick={batchProcess}
          disabled={isProcessing}
          variant="outline"
        >
          📦 Batch Process
        </button>
        
        <Button class="bits-btn" 
          onclick={checkSystemHealth}
          variant="outline"
        >
          🏥 Health Check
        </button>
        
        <Button class="bits-btn" 
          onclick={generateReport}
          variant="outline"
        >
          📈 Performance Report
        </button>
        
        <Button class="bits-btn" 
          onclick={cleanup}
          variant="destructive"
        >
          🧹 Cleanup
        </button>
      </div>
    </div>
  </NesCard>

  <!-- Search Interface -->
  <NesCard>
    <div class="yorha-panel-header">
      <h3 class="nes-text is-primary">Cross-Pipeline Search</h3>
    </div>
    <div class="yorha-panel-content">
      <div class="flex gap-2">
        <input 
          type="text" 
          bind:value={searchQuery}
          class="flex-1 p-2 border rounded-md"
          placeholder="Search across all pipelines..."
          onkeypress={(e) => e.key === 'Enter' && searchPipelines()}
        />
        <Button class="bits-btn" onclick={searchPipelines}>
          🔍 Search
        </button>
      </div>
      
      {#if searchResults}
        <div class="mt-4">
          <h4 class="font-semibold mb-2">Search Results ({searchResults.combinedResults.length})</h4>
          <div class="space-y-2">
            {#each searchResults.combinedResults.slice(0, 5) as result}
              <div class="p-2 bg-gray-50 rounded border-l-4 border-blue-500">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <p class="font-medium">{result.id}</p>
                    <p class="text-sm text-gray-600">{result.content?.substring(0, 100)}...</p>
                  </div>
                  <div class="text-right text-sm">
                    <div class="font-semibold">Score: {result.score?.toFixed(3)}</div>
                    <div class="text-gray-500">{result.source}</div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </NesCard>

  <!-- Metrics Dashboard -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <NesCard>
      <div class="yorha-panel-content" class="p-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{metrics.totalOperations}</div>
          <div class="text-sm text-gray-500">Total Operations</div>
        </div>
      </div>
    </NesCard>
    
    <NesCard>
      <div class="yorha-panel-content" class="p-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-green-600">{formatTime(metrics.averageTime)}</div>
          <div class="text-sm text-gray-500">Average Time</div>
        </div>
      </div>
    </NesCard>
    
    <NesCard>
      <div class="yorha-panel-content" class="p-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-purple-600">{metrics.successRate.toFixed(1)}%</div>
          <div class="text-sm text-gray-500">Success Rate</div>
        </div>
      </div>
    </NesCard>
    
    <NesCard>
      <div class="yorha-panel-content" class="p-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-orange-600">{results.length}</div>
          <div class="text-sm text-gray-500">Recent Results</div>
        </div>
      </div>
    </NesCard>
  </div>

  <!-- System Health -->
  {#if systemHealth}
    <NesCard>
      <div class="yorha-panel-header">
        <h3 class="nes-text is-primary">System Health</h3>
      </div>
      <div class="yorha-panel-content">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center">
            <div class={systemHealth.gpu ? 'text-green-600' : 'text-red-600'}>
              {systemHealth.gpu ? '✅' : '❌'} GPU
            </div>
          </div>
          <div class="text-center">
            <div class={systemHealth.redis ? 'text-green-600' : 'text-red-600'}>
              {systemHealth.redis ? '✅' : '❌'} Redis
            </div>
          </div>
          <div class="text-center">
            <div class="text-blue-600">
              {systemHealth.memory?.percentage}% Memory
            </div>
          </div>
          <div class="text-center">
            <div class="text-purple-600">
              {systemHealth.activeOperations} Active
            </div>
          </div>
        </div>
      </div>
    </NesCard>
  {/if}

  <!-- Recent Results -->
  {#if results.length > 0}
    <NesCard>
      <div class="yorha-panel-header">
        <h3 class="nes-text is-primary">Recent Pipeline Results</h3>
      </div>
      <div class="yorha-panel-content">
        <div class="space-y-3">
          {#each results.slice(0, 5) as result}
            <div class="p-3 border rounded-lg">
              <div class="flex justify-between items-start mb-2">
                <div class="flex items-center gap-2">
                  <span class="font-semibold">{result.type}</span>
                  <span class={getStatusColor(result.success)}>
                    {result.success ? '✅' : '❌'}
                  </span>
                </div>
                <div class="text-sm text-gray-500">
                  {formatTime(result.metrics.totalProcessingTime)}
                </div>
              </div>
              
              <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <span class="text-gray-500">Cache Hit:</span>
                  <span class="font-medium">{result.metrics.cacheHitRate.toFixed(1)}%</span>
                </div>
                <div>
                  <span class="text-gray-500">Memory:</span>
                  <span class="font-medium">{formatMemory(result.metrics.memoryUsageMB)}</span>
                </div>
                <div>
                  <span class="text-gray-500">GPU:</span>
                  <span class="font-medium">{result.metrics.gpuUtilization.toFixed(0)}%</span>
                </div>
                <div>
                  <span class="text-gray-500">Throughput:</span>
                  <span class="font-medium">{result.metrics.throughputPerSecond.toFixed(1)}/s</span>
                </div>
              </div>
              
              {#if result.error}
                <div class="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  Error: {result.error}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </NesCard>
  {/if}

  <!-- Performance Report -->
  {#if performanceReport}
    <NesCard>
      <div class="yorha-panel-header">
        <h3 class="nes-text is-primary">Performance Report</h3>
      </div>
      <div class="yorha-panel-content">
        <div class="space-y-4">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div class="text-gray-500">Total Operations</div>
              <div class="font-semibold">{performanceReport.totalOperations}</div>
            </div>
            <div>
              <div class="text-gray-500">Average Time</div>
              <div class="font-semibold">{formatTime(performanceReport.averageTime)}</div>
            </div>
            <div>
              <div class="text-gray-500">Throughput</div>
              <div class="font-semibold">{performanceReport.throughput.toFixed(2)} ops/sec</div>
            </div>
            <div>
              <div class="text-gray-500">Memory Efficiency</div>
              <div class="font-semibold">{performanceReport.memoryEfficiency.toFixed(1)}%</div>
            </div>
          </div>
          
          <div>
            <h4 class="font-semibold mb-2">Recommendations</h4>
            <ul class="space-y-1 text-sm">
              {#each performanceReport.recommendations as recommendation}
                <li class="flex items-start gap-2">
                  <span class="text-blue-500">•</span>
                  <span>{recommendation}</span>
                </li>
              {/each}
            </ul>
          </div>
        </div>
      </div>
    </NesCard>
  {/if}

  <!-- Architecture Diagram -->
  <NesCard>
    <div class="yorha-panel-header">
      <h3 class="nes-text is-primary">Pipeline Architecture</h3>
    </div>
    <div class="yorha-panel-content">
      <pre class="text-xs bg-gray-50 p-4 rounded overflow-x-auto">
{PipelineVisualizer.generateArchitectureDiagram()}
      </pre>
    </div>
  </NesCard>
</div>
{/snippet}

{@render default()}
