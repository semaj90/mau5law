<!-- Legal AI Performance Metrics Dashboard -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    legalPerformanceMonitor, 
    currentMetrics, 
    systemHealth,
    cacheEfficiency,
    averageLatency,
    gpuUtilization,
    legalConfidence,
    formatMetric,
    type PerformanceSnapshot 
  } from '$lib/monitoring/legal-performance-metrics.js';
  
  let metricsHistory: PerformanceSnapshot[] = $state([]);
  let refreshInterval: number;
  
  onMount(() => {
    // Refresh metrics every 5 seconds
    refreshInterval = setInterval(() => {
      metricsHistory = legalPerformanceMonitor.getHistoricalMetrics(10);
    }, 5000);
    
    // Initial load
    metricsHistory = legalPerformanceMonitor.getHistoricalMetrics(10);
    
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  });
  
  function getHealthColor(health: string): string {
    switch (health) {
      case 'optimal': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  }
  
  function getCacheColor(efficiency: number): string {
    if (efficiency >= 0.8) return 'text-green-500';
    if (efficiency >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  }
  
  function getLatencyColor(latency: number): string {
    if (latency <= 500) return 'text-green-500';
    if (latency <= 1000) return 'text-yellow-500';
    return 'text-red-500';
  }
  
  function getGPUColor(utilization: number): string {
    if (utilization <= 70) return 'text-green-500';
    if (utilization <= 90) return 'text-yellow-500';
    return 'text-red-500';
  }
</script>

<svelte:head>
  <title>Legal AI Performance Dashboard</title>
</svelte:head>

<div class="min-h-screen bg-black text-green-400 font-mono p-6">
  <!-- Header -->
  <div class="border-b border-green-500 pb-4 mb-6">
    <h1 class="text-2xl font-bold text-green-300">Legal AI Performance Dashboard</h1>
    <p class="text-sm text-green-600">Gemma3:legal-latest + RTX 3060 Ti Monitoring</p>
  </div>

  <!-- System Health Overview -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <!-- System Health -->
    <div class="border border-green-500 rounded p-4">
      <h3 class="text-sm font-semibold text-green-300 mb-2">System Health</h3>
      <div class="text-xl font-bold {getHealthColor($systemHealth)}">
        {$systemHealth.toUpperCase()}
      </div>
      <div class="text-xs text-green-600 mt-1">
        Overall system status
      </div>
    </div>

    <!-- Cache Efficiency -->
    <div class="border border-green-500 rounded p-4">
      <h3 class="text-sm font-semibold text-green-300 mb-2">Cache Efficiency</h3>
      <div class="text-xl font-bold {getCacheColor($cacheEfficiency)}">
        {formatMetric($cacheEfficiency, 'percentage')}
      </div>
      <div class="text-xs text-green-600 mt-1">
        Multi-tier hit rate
      </div>
    </div>

    <!-- Average Latency -->
    <div class="border border-green-500 rounded p-4">
      <h3 class="text-sm font-semibold text-green-300 mb-2">Query Latency</h3>
      <div class="text-xl font-bold {getLatencyColor($averageLatency)}">
        {formatMetric($averageLatency, 'milliseconds')}
      </div>
      <div class="text-xs text-green-600 mt-1">
        Average response time
      </div>
    </div>

    <!-- GPU Utilization -->
    <div class="border border-green-500 rounded p-4">
      <h3 class="text-sm font-semibold text-green-300 mb-2">GPU Utilization</h3>
      <div class="text-xl font-bold {getGPUColor($gpuUtilization)}">
        {formatMetric($gpuUtilization / 100, 'percentage')}
      </div>
      <div class="text-xs text-green-600 mt-1">
        RTX 3060 Ti usage
      </div>
    </div>
  </div>

  {#if $currentMetrics}
    <!-- Detailed Metrics Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Cache Performance -->
      <div class="border border-green-500 rounded p-4">
        <h3 class="text-lg font-semibold text-green-300 mb-4">Cache Performance</h3>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-green-400">L1 GPU Cache:</span>
            <span class="text-green-200">{formatMetric($currentMetrics.cache_hits.L1_GPU, 'percentage')}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-green-400">L2 Memory Cache:</span>
            <span class="text-green-200">{formatMetric($currentMetrics.cache_hits.L2_Memory, 'percentage')}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-green-400">L3 Redis Cache:</span>
            <span class="text-green-200">{formatMetric($currentMetrics.cache_hits.L3_Redis, 'percentage')}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-green-400">L4 Database Hit:</span>
            <span class="text-green-200">{formatMetric($currentMetrics.cache_hits.L4_Database, 'percentage')}</span>
          </div>
        </div>
      </div>

      <!-- Latency Breakdown -->
      <div class="border border-green-500 rounded p-4">
        <h3 class="text-lg font-semibold text-green-300 mb-4">Latency Breakdown</h3>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-green-400">Embedding Generation:</span>
            <span class="text-green-200">{formatMetric($currentMetrics.latency.embedding_generation, 'milliseconds')}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-green-400">Similarity Search:</span>
            <span class="text-green-200">{formatMetric($currentMetrics.latency.similarity_search, 'milliseconds')}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-green-400">Result Retrieval:</span>
            <span class="text-green-200">{formatMetric($currentMetrics.latency.result_retrieval, 'milliseconds')}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-green-400">Cache Lookup:</span>
            <span class="text-green-200">{formatMetric($currentMetrics.latency.cache_lookup_time, 'milliseconds')}</span>
          </div>
        </div>
      </div>

      <!-- Resource Usage -->
      <div class="border border-green-500 rounded p-4">
        <h3 class="text-lg font-semibold text-green-300 mb-4">Resource Usage</h3>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-green-400">GPU VRAM:</span>
            <span class="text-green-200">{formatMetric($currentMetrics.resources.gpu_vram_usage, 'megabytes')} / 8GB</span>
          </div>
          <div class="flex justify-between">
            <span class="text-green-400">System RAM:</span>
            <span class="text-green-200">{formatMetric($currentMetrics.resources.system_ram_usage, 'megabytes')}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-green-400">Redis Memory:</span>
            <span class="text-green-200">{formatMetric($currentMetrics.resources.redis_memory_usage, 'megabytes')}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-green-400">CPU Usage:</span>
            <span class="text-green-200">{formatMetric($currentMetrics.resources.cpu_usage / 100, 'percentage')}</span>
          </div>
        </div>
      </div>

      <!-- Legal Processing Stats -->
      <div class="border border-green-500 rounded p-4">
        <h3 class="text-lg font-semibold text-green-300 mb-4">Legal Processing</h3>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-green-400">Documents Processed:</span>
            <span class="text-green-200">{formatMetric($currentMetrics.legal_processing.documents_processed, 'count')}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-green-400">Entities Extracted:</span>
            <span class="text-green-200">{formatMetric($currentMetrics.legal_processing.entities_extracted, 'count')}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-green-400">Cases Analyzed:</span>
            <span class="text-green-200">{formatMetric($currentMetrics.legal_processing.cases_analyzed, 'count')}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-green-400">Legal Confidence:</span>
            <span class="text-green-200">{formatMetric($currentMetrics.legal_processing.legal_confidence_score, 'percentage')}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Throughput Metrics -->
    <div class="border border-green-500 rounded p-4 mb-6">
      <h3 class="text-lg font-semibold text-green-300 mb-4">Throughput Metrics</h3>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div class="text-center">
          <div class="text-xl font-bold text-green-200">
            {formatMetric($currentMetrics.throughput.queries_per_second, 'count')}
          </div>
          <div class="text-xs text-green-600">QPS</div>
        </div>
        <div class="text-center">
          <div class="text-xl font-bold text-green-200">
            {formatMetric($currentMetrics.throughput.embeddings_per_second, 'count')}
          </div>
          <div class="text-xs text-green-600">Embeddings/sec</div>
        </div>
        <div class="text-center">
          <div class="text-xl font-bold text-green-200">
            {formatMetric($currentMetrics.throughput.documents_per_minute, 'count')}
          </div>
          <div class="text-xs text-green-600">Docs/min</div>
        </div>
        <div class="text-center">
          <div class="text-xl font-bold text-green-200">
            {formatMetric($currentMetrics.throughput.concurrent_sessions, 'count')}
          </div>
          <div class="text-xs text-green-600">Sessions</div>
        </div>
        <div class="text-center">
          <div class="text-xl font-bold text-green-200">
            {formatMetric($currentMetrics.throughput.peak_throughput, 'count')}
          </div>
          <div class="text-xs text-green-600">Peak QPS</div>
        </div>
        <div class="text-center">
          <div class="text-xl font-bold text-green-200">
            {formatMetric($currentMetrics.throughput.average_batch_size, 'count')}
          </div>
          <div class="text-xs text-green-600">Batch Size</div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Historical Trends (Simple Text Display) -->
  <div class="border border-green-500 rounded p-4">
    <h3 class="text-lg font-semibold text-green-300 mb-4">Recent Performance History (Last 10 minutes)</h3>
    
    {#if metricsHistory.length > 0}
      <div class="space-y-2 max-h-96 overflow-y-auto">
        {#each metricsHistory.slice(-20) as metric}
          <div class="text-sm">
            <span class="text-green-600">{metric.timestamp.toLocaleTimeString()}</span>
            - <span class="text-green-400">Health:</span>
            <span class="{getHealthColor(metric.system_health)}">{metric.system_health}</span>
            - <span class="text-green-400">Cache:</span>
            <span class="text-green-200">{formatMetric(metric.cache_hits.overall, 'percentage')}</span>
            - <span class="text-green-400">Latency:</span>
            <span class="text-green-200">{formatMetric(metric.latency.total_query_time, 'milliseconds')}</span>
            - <span class="text-green-400">GPU:</span>
            <span class="text-green-200">{formatMetric(metric.resources.gpu_utilization / 100, 'percentage')}</span>
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-green-600">No historical data available yet...</div>
    {/if}
  </div>

  <!-- Footer -->
  <div class="mt-8 pt-4 border-t border-green-500 text-center text-xs text-green-600">
    Legal AI Performance Dashboard | Gemma3:legal-latest | RTX 3060 Ti | Real-time Monitoring
  </div>
</div>

<style>
  /* Additional terminal-style animations */
  .text-green-400 {
    text-shadow: 0 0 5px currentColor;
  }
  
  .text-green-300 {
    text-shadow: 0 0 3px currentColor;
  }
  
  /* Subtle pulse animation for critical alerts */
  .text-red-500 {
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
</style>