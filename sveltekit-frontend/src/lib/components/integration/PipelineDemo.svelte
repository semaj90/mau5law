{#snippet default}
<script lang="ts">
  import { pipelineManager, type PipelineType, type PipelineResult } from '$lib/services/pipeline-manager';
  import { PipelineVisualizer } from '$lib/services/pipeline-visualizer';
  import Button from '$lib/components/ui/Button.svelte';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  
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
  <Card>
    <CardHeader>
      <CardTitle>Pipeline Execution</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Pipeline Selection -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2">Pipeline Type</label>
          <select 
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
          <label class="block text-sm font-medium mb-2">Cache Key</label>
          <input 
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
            class="w-full"
          >
            {isProcessing ? '⏳ Processing...' : '🚀 Execute Pipeline'}
          </Button>
        </div>
      </div>

      <!-- Advanced Controls -->
      <div class="flex flex-wrap gap-2">
        <Button 
          onclick={autoExecutePipeline}
          disabled={isProcessing}
          variant="outline"
        >
          🧠 Auto-Select Optimal
        </Button>
        
        <Button 
          onclick={batchProcess}
          disabled={isProcessing}
          variant="outline"
        >
          📦 Batch Process
        </Button>
        
        <Button 
          onclick={checkSystemHealth}
          variant="outline"
        >
          🏥 Health Check
        </Button>
        
        <Button 
          onclick={generateReport}
          variant="outline"
        >
          📈 Performance Report
        </Button>
        
        <Button 
          onclick={cleanup}
          variant="destructive"
        >
          🧹 Cleanup
        </Button>
      </div>
    </CardContent>
  </Card>

  <!-- Search Interface -->
  <Card>
    <CardHeader>
      <CardTitle>Cross-Pipeline Search</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="flex gap-2">
        <input 
          type="text" 
          bind:value={searchQuery}
          class="flex-1 p-2 border rounded-md"
          placeholder="Search across all pipelines..."
          onkeypress={(e) => e.key === 'Enter' && searchPipelines()}
        />
        <Button onclick={searchPipelines}>
          🔍 Search
        </Button>
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
    </CardContent>
  </Card>

  <!-- Metrics Dashboard -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card>
      <CardContent class="p-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{metrics.totalOperations}</div>
          <div class="text-sm text-gray-500">Total Operations</div>
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardContent class="p-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-green-600">{formatTime(metrics.averageTime)}</div>
          <div class="text-sm text-gray-500">Average Time</div>
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardContent class="p-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-purple-600">{metrics.successRate.toFixed(1)}%</div>
          <div class="text-sm text-gray-500">Success Rate</div>
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardContent class="p-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-orange-600">{results.length}</div>
          <div class="text-sm text-gray-500">Recent Results</div>
        </div>
      </CardContent>
    </Card>
  </div>

  <!-- System Health -->
  {#if systemHealth}
    <Card>
      <CardHeader>
        <CardTitle>System Health</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  {/if}

  <!-- Recent Results -->
  {#if results.length > 0}
    <Card>
      <CardHeader>
        <CardTitle>Recent Pipeline Results</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  {/if}

  <!-- Performance Report -->
  {#if performanceReport}
    <Card>
      <CardHeader>
        <CardTitle>Performance Report</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  {/if}

  <!-- Architecture Diagram -->
  <Card>
    <CardHeader>
      <CardTitle>Pipeline Architecture</CardTitle>
    </CardHeader>
    <CardContent>
      <pre class="text-xs bg-gray-50 p-4 rounded overflow-x-auto">
{PipelineVisualizer.generateArchitectureDiagram()}
      </pre>
    </CardContent>
  </Card>
</div>
{/snippet}

{@render default()}