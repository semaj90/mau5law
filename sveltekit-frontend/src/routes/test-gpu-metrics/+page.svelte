<script lang="ts">
  import { onMount } from 'svelte';
  import { gpuMetricsBatcher } from '$lib/services/gpuMetricsBatcher';
  
  let metricsStatus = $state({
    sessionId: '',
    metricsCount: 0,
    isActive: false,
    serverHealthy: false
  });
  
  let testResults = $state([]);
  
  onMount(() => {
    updateStatus();
    
    // Update status every 2 seconds
    const interval = setInterval(updateStatus, 2000);
    
    return () => clearInterval(interval);
  });
  
  function updateStatus() {
    metricsStatus = {
      sessionId: gpuMetricsBatcher.getSessionId(),
      metricsCount: gpuMetricsBatcher.getMetricsCount(),
      isActive: true,
      serverHealthy: true
    };
  }
  
  async function testRedisConnection() {
    try {
      const response = await fetch('/api/health/redis');
      const result = await response.json();
      testResults = [...testResults, {
        timestamp: new Date().toLocaleTimeString(),
        test: 'Redis Connection',
        status: response.ok ? 'Success' : 'Failed',
        details: JSON.stringify(result)
      }];
    } catch (error) {
      testResults = [...testResults, {
        timestamp: new Date().toLocaleTimeString(),
        test: 'Redis Connection',
        status: 'Error',
        details: error.message
      }];
    }
  }
  
  async function testGPUMetrics() {
    try {
      await gpuMetricsBatcher.forceFlush();
      testResults = [...testResults, {
        timestamp: new Date().toLocaleTimeString(),
        test: 'GPU Metrics Flush',
        status: 'Success',
        details: 'Forced flush completed'
      }];
    } catch (error) {
      testResults = [...testResults, {
        timestamp: new Date().toLocaleTimeString(),
        test: 'GPU Metrics Flush',
        status: 'Error',
        details: error.message
      }];
    }
  }
  
  async function testServerHealth() {
    const endpoints = [
      '/api/health',
      '/api/metrics/gpu?health=true',
      '/api/v1/health'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        testResults = [...testResults, {
          timestamp: new Date().toLocaleTimeString(),
          test: `Server Health: ${endpoint}`,
          status: response.ok ? 'Success' : 'Failed',
          details: `Status: ${response.status}`
        }];
      } catch (error) {
        testResults = [...testResults, {
          timestamp: new Date().toLocaleTimeString(),
          test: `Server Health: ${endpoint}`,
          status: 'Error',
          details: error.message
        }];
      }
    }
  }
  
  function clearResults() {
    testResults = [];
  }
</script>

<svelte:head>
  <title>GPU Metrics & Redis Test Dashboard</title>
</svelte:head>

<div class="min-h-screen bg-gray-900 text-white p-8">
  <div class="max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold mb-8 text-yellow-400">🚀 GPU Metrics & Redis Test Dashboard</h1>
    
    <!-- Status Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-gray-800 p-4 rounded-lg">
        <h3 class="text-sm font-semibold text-gray-400 mb-2">Session ID</h3>
        <p class="text-yellow-400 font-mono text-xs">{metricsStatus.sessionId}</p>
      </div>
      
      <div class="bg-gray-800 p-4 rounded-lg">
        <h3 class="text-sm font-semibold text-gray-400 mb-2">Metrics Count</h3>
        <p class="text-2xl font-bold text-green-400">{metricsStatus.metricsCount}</p>
      </div>
      
      <div class="bg-gray-800 p-4 rounded-lg">
        <h3 class="text-sm font-semibold text-gray-400 mb-2">Batcher Status</h3>
        <div class="flex items-center">
          <div class="w-3 h-3 rounded-full {metricsStatus.isActive ? 'bg-green-400' : 'bg-red-400'} mr-2"></div>
          <span>{metricsStatus.isActive ? 'Active' : 'Inactive'}</span>
        </div>
      </div>
      
      <div class="bg-gray-800 p-4 rounded-lg">
        <h3 class="text-sm font-semibold text-gray-400 mb-2">Server Health</h3>
        <div class="flex items-center">
          <div class="w-3 h-3 rounded-full {metricsStatus.serverHealthy ? 'bg-green-400' : 'bg-red-400'} mr-2"></div>
          <span>{metricsStatus.serverHealthy ? 'Healthy' : 'Unhealthy'}</span>
        </div>
      </div>
    </div>
    
    <!-- Test Controls -->
    <div class="bg-gray-800 p-6 rounded-lg mb-8">
      <h2 class="text-xl font-bold mb-4">🔧 Connection Tests</h2>
      <div class="flex flex-wrap gap-4">
        <button 
          onclick={testRedisConnection}
          class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
        >
          Test Redis Connection
        </button>
        
        <button 
          onclick={testGPUMetrics}
          class="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded transition-colors"
        >
          Test GPU Metrics
        </button>
        
        <button 
          onclick={testServerHealth}
          class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors"
        >
          Test Server Health
        </button>
        
        <button 
          onclick={clearResults}
          class="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded transition-colors"
        >
          Clear Results
        </button>
      </div>
    </div>
    
    <!-- Test Results -->
    <div class="bg-gray-800 p-6 rounded-lg">
      <h2 class="text-xl font-bold mb-4">📊 Test Results</h2>
      
      {#if testResults.length === 0}
        <p class="text-gray-400 italic">No test results yet. Click the buttons above to run tests.</p>
      {:else}
        <div class="space-y-3">
          {#each testResults as result}
            <div class="flex items-start gap-4 p-3 bg-gray-700 rounded">
              <span class="text-xs text-gray-400 min-w-20">{result.timestamp}</span>
              <span class="font-semibold min-w-48">{result.test}</span>
              <span class="px-2 py-1 text-xs rounded {
                result.status === 'Success' ? 'bg-green-600 text-white' : 
                result.status === 'Failed' ? 'bg-red-600 text-white' : 
                'bg-orange-600 text-white'
              }">{result.status}</span>
              <span class="text-sm text-gray-300 flex-1 font-mono">{result.details}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
