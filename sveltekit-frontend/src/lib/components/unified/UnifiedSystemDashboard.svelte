<!-- 
Unified System Dashboard
Showcases integration between Phase 2 GPU Acceleration and Production Pipeline
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { writable, derived } from 'svelte/store';
  // System status and metrics stores
  const systemStatus = writable({
    status: 'unknown',
    services: {},
    metrics: {
      totalProcessed: 0,
      gpuProcessed: 0, 
      cpuProcessed: 0,
      averageGPUTime: 0,
      averageCPUTime: 0,
      errorRate: 0
    },
    activeJobs: { gpu: 0, cpu: 0 },
    uptime: 0,
    version: '2.0.0'
  });
  const processingResults = writable([]);
  const isProcessing = writable(false);
  // Derived stores for computed values
  const healthyServices = derived(systemStatus, ($status) => {
    const services = Object.values($status.services);
    const healthy = services.filter(s => s === 'healthy').length;
    return { healthy, total: services.length };
  });
  const performanceMetrics = derived(systemStatus, ($status) => {
    const total = $status.metrics.totalProcessed || 1;
    return {
      gpuEfficiency: ($status.metrics.gpuProcessed / total * 100).toFixed(1),
      avgProcessingTime: (
        ($status.metrics.averageGPUTime * $status.metrics.gpuProcessed) +
        ($status.metrics.averageCPUTime * $status.metrics.cpuProcessed)
      ) / total,
      systemLoad: ($status.activeJobs.gpu + $status.activeJobs.cpu) / 20 * 100
    };
  });
  let statusInterval: NodeJS.Timeout;
  let testDocument = {
    id: 'demo_doc_' + Date.now(),
    title: 'Sample Legal Contract Analysis',
    content: `This is a demonstration legal document for testing the unified processing system. 
    AGREEMENT made this day between Party A and Party B, whereas the parties agree to the following terms and conditions:
    1. SCOPE OF WORK: Party A shall provide legal consulting services
    2. COMPENSATION: Payment terms as specified herein
    3. CONFIDENTIALITY: All information shall remain confidential
    4. TERMINATION: This agreement may be terminated with 30 days notice
    This document demonstrates the integration of GPU-accelerated processing with the standard production pipeline.`,
    metadata: {
      document_type: 'contract',
      court_level: 'appellate',
      jurisdiction: 'federal',
      practice_areas: ['contract', 'commercial'],
      estimated_complexity: 'medium'
    },
    createdAt: new Date().toISOString()
  };
  // Processing options
  let processingOptions = {
    priority: 0.8,
    forceGPU: false,
    batchMode: false,
    query: { query: 'legal contract analysis', keywords: ['contract', 'agreement'] }
  };
  onMount(async () => {
    await refreshSystemStatus();
    // Start periodic status updates
    statusInterval = setInterval(refreshSystemStatus, 5000);
  });
  onDestroy(() => {
    if (statusInterval) {
      clearInterval(statusInterval);
    }
  });
  async function refreshSystemStatus() {
    try {
      const response = await fetch('/api/unified/status');
      if (response.ok) {
        const data = await response.json();
        systemStatus.set(data);
      }
    } catch (error) {
      console.error('Failed to refresh system status:', error);
    }
  }
  async function processDocument() {
    isProcessing.set(true);
    try {
      const response = await fetch('/api/unified/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: testDocument,
          options: processingOptions
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Add to results
          processingResults.update(results => [{
            timestamp: Date.now(),
            document: testDocument,
            result: data.result,
            processingTime: data.result.processingTime
          }, ...results.slice(0, 9)]); // Keep last 10 results
          // Update test document ID for next test
          testDocument.id = 'demo_doc_' + Date.now();
          // Refresh system status to show updated metrics
          await refreshSystemStatus();
        }
      }
    } catch (error) {
      console.error('Document processing failed:', error);
    }
    isProcessing.set(false);
  }
  function formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
  function getServiceStatusColor(status: string): string {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'unhealthy': return 'text-red-400';
      case 'degraded': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  }
  function getProcessingPathColor(path: string): string {
    return path === 'gpu' ? 'text-purple-400' : 'text-blue-400';
  }
  function getProcessingPathIcon(path: string): string {
    return path === 'gpu' ? '🔥' : '⚙️';
  }
</script>

<div class="unified-dashboard p-6 bg-gray-900 text-white min-h-screen">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2">🚀 Unified Legal AI System Dashboard</h1>
      <p class="text-gray-400">Phase 2 GPU Acceleration + Production Pipeline Integration</p>
    </div>
    
    <!-- System Status Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <!-- Overall Status -->
      <div class="bg-gray-800 rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-4">🏥 System Health</h3>
        {#each Object.entries($systemStatus.services) as [service, status]}
          <div class="flex justify-between items-center py-2">
            <span class="capitalize">{service.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
            <span class={`font-medium ${getServiceStatusColor(status)}`}>
              {status}
            </span>
          </div>
        {/each}
        
        <div class="mt-4 pt-4 border-t border-gray-700">
          <div class="flex justify-between">
            <span>Services Healthy:</span>
            <span class="text-green-400">{$healthyServices.healthy}/{$healthyServices.total}</span>
          </div>
          <div class="flex justify-between">
            <span>Uptime:</span>
            <span class="text-blue-400">{formatUptime($systemStatus.uptime)}</span>
          </div>
          <div class="flex justify-between">
            <span>Version:</span>
            <span class="text-purple-400">{$systemStatus.version}</span>
          </div>
        </div>
      </div>
      
      <!-- Processing Metrics -->
      <div class="bg-gray-800 rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-4">📊 Processing Metrics</h3>
        
        <div class="space-y-3">
          <div>
            <div class="flex justify-between text-sm text-gray-400 mb-1">
              <span>Total Processed</span>
              <span>{$systemStatus.metrics.totalProcessed}</span>
            </div>
          </div>
          
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-purple-400">🔥 GPU Processed</span>
              <span>{$systemStatus.metrics.gpuProcessed}</span>
            </div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-blue-400">⚙️ CPU Processed</span>
              <span>{$systemStatus.metrics.cpuProcessed}</span>
            </div>
          </div>
          
          <div>
            <div class="flex justify-between text-sm text-gray-400 mb-1">
              <span>GPU Efficiency</span>
              <span>{$performanceMetrics.gpuEfficiency}%</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2">
              <div class="bg-purple-500 h-2 rounded-full transition-all duration-300" 
                   style="width: {$performanceMetrics.gpuEfficiency}%"></div>
            </div>
          </div>
          
          <div>
            <div class="flex justify-between text-sm text-gray-400 mb-1">
              <span>Avg Processing Time</span>
              <span>{Math.round($performanceMetrics.avgProcessingTime)}ms</span>
            </div>
          </div>
          
          <div>
            <div class="flex justify-between text-sm text-gray-400 mb-1">
              <span>Error Rate</span>
              <span>{($systemStatus.metrics.errorRate * 100).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Active Jobs -->
      <div class="bg-gray-800 rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-4">⚡ Active Jobs</h3>
        
        <div class="space-y-4">
          <div>
            <div class="flex justify-between items-center mb-2">
              <span class="text-purple-400">🔥 GPU Jobs</span>
              <span class="text-2xl font-bold text-purple-400">{$systemStatus.activeJobs.gpu}</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2">
              <div class="bg-purple-500 h-2 rounded-full transition-all duration-300" 
                   style="width: {($systemStatus.activeJobs.gpu / 8) * 100}%"></div>
            </div>
            <div class="text-xs text-gray-500 mt-1">Max: 8 concurrent</div>
          </div>
          
          <div>
            <div class="flex justify-between items-center mb-2">
              <span class="text-blue-400">⚙️ CPU Jobs</span>
              <span class="text-2xl font-bold text-blue-400">{$systemStatus.activeJobs.cpu}</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2">
              <div class="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                   style="width: {($systemStatus.activeJobs.cpu / 32) * 100}%"></div>
            </div>
            <div class="text-xs text-gray-500 mt-1">Max: 32 concurrent</div>
          </div>
          
          <div class="pt-2 border-t border-gray-700">
            <div class="flex justify-between text-sm text-gray-400">
              <span>System Load</span>
              <span>{$performanceMetrics.systemLoad.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Document Processing Test -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Processing Controls -->
      <div class="bg-gray-800 rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-4">🧪 Document Processing Test</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-2" for="priority-affects-gpu">Priority (affects GPU routing)</label><input id="priority-affects-gpu" type="range" min="0" max="1" step="0.1" bind:value={processingOptions.priority}
                   class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer">
            <div class="flex justify-between text-xs text-gray-500 mt-1">
              <span>Low (CPU)</span>
              <span class="text-white font-medium">{processingOptions.priority}</span>
              <span>High (GPU)</span>
            </div>
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2" for="document-title">Document Title</label><input id="document-title" type="text" bind:value={testDocument.title}
                   class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white">
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm text-gray-400 mb-2" for="document-type">Document Type</label><select id="document-type" bind:value={testDocument.metadata.document_type}
                      class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white">
                <option value="contract">Contract</option>
                <option value="brief">Legal Brief</option>
                <option value="statute">Statute</option>
                <option value="case">Case Law</option>
                <option value="regulation">Regulation</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-2" for="court-level">Court Level</label><select id="court-level" bind:value={testDocument.metadata.court_level}
                      class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white">
                <option value="supreme">Supreme Court</option>
                <option value="appellate">Appellate Court</option>
                <option value="district">District Court</option>
                <option value="administrative">Administrative</option>
              </select>
            </div>
          </div>
          
          <button onclick={processDocument} disabled={$isProcessing}
                  class="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 
                         disabled:cursor-not-allowed rounded-lg font-medium transition-colors">
            {#if $isProcessing}
              <div class="flex items-center justify-center">
                <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            {:else}
              🚀 Process Document
            {/if}
          </button>
        </div>
      </div>
      
      <!-- Processing Results -->
      <div class="bg-gray-800 rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-4">📋 Recent Processing Results</h3>
        
        <div class="space-y-3 max-h-96 overflow-y-auto">
          {#each $processingResults as result}
            <div class="bg-gray-700 rounded-lg p-4">
              <div class="flex justify-between items-start mb-2">
                <div class="flex items-center">
                  <span class="mr-2">{getProcessingPathIcon(result.result.processingPath)}</span>
                  <span class={`font-medium ${getProcessingPathColor(result.result.processingPath)}`}>
                    {result.result.processingPath.toUpperCase()} Path
                  </span>
                </div>
                <span class="text-xs text-gray-400">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </span>
              </div>
              
              <div class="text-sm text-gray-300 mb-2">
                {result.document.title}
              </div>
              
              <div class="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span class="text-gray-400">Time:</span>
                  <span class="text-white ml-1">{result.processingTime}ms</span>
                </div>
                <div>
                  <span class="text-gray-400">Score:</span>
                  <span class="text-white ml-1">{result.result.ranking.finalScore.toFixed(3)}</span>
                </div>
                <div>
                  <span class="text-gray-400">Confidence:</span>
                  <span class="text-white ml-1">{(result.result.analysis.confidence * 100).toFixed(1)}%</span>
                </div>
              </div>
              
              {#if result.result.metadata.gpuUtilization > 0}
                <div class="mt-2 text-xs">
                  <span class="text-purple-400">GPU Utilization:</span>
                  <span class="text-white ml-1">{(result.result.metadata.gpuUtilization * 100).toFixed(1)}%</span>
                </div>
              {/if}
            </div>
          {:else}
            <div class="text-center text-gray-500 py-8">
              No processing results yet. Try processing a document!
            </div>
          {/each}
        </div>
      </div>
    </div>
    
    <!-- Integration Status -->
    <div class="bg-gray-800 rounded-lg p-6">
      <h3 class="text-lg font-semibold mb-4">🔗 System Integration Status</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="text-center">
          <div class="text-3xl mb-2">🔥</div>
          <div class="font-medium text-purple-400">GPU Processing</div>
          <div class="text-sm text-gray-400">Phase 2 Complete</div>
        </div>
        
        <div class="text-center">
          <div class="text-3xl mb-2">🧠</div>
          <div class="font-medium text-blue-400">Neural Dashboard</div>
          <div class="text-sm text-gray-400">Real-time Monitoring</div>
        </div>
        
        <div class="text-center">
          <div class="text-3xl mb-2">⚙️</div>
          <div class="font-medium text-green-400">Production Pipeline</div>
          <div class="text-sm text-gray-400">RabbitMQ + Redis + PostgreSQL</div>
        </div>
        
        <div class="text-center">
          <div class="text-3xl mb-2">🚀</div>
          <div class="font-medium text-orange-400">HTTP/3 QUIC</div>
          <div class="text-sm text-gray-400">Caddy Proxy</div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .unified-dashboard {
    font-family: 'Inter', system-ui, sans-serif;
  }
  
  /* Custom scrollbar for results */
  .max-h-96::-webkit-scrollbar {
    width: 6px;
  }
  
  .max-h-96::-webkit-scrollbar-track {
    background: #374151;
    border-radius: 3px;
  }
  
  .max-h-96::-webkit-scrollbar-thumb {
    background: #6b7280;
    border-radius: 3px;
  }
  
  .max-h-96::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
</style>
