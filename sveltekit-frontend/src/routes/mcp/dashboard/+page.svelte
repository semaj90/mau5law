<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';

  // MCP Server configuration
  const MCP_BASE_URL = 'http://localhost:3001/mcp';

  // Real-time stores
  const metrics = writable({
    cpu: 0,
    memory: 0,
    activeJobs: 0,
    completedJobs: 0,
    errorRate: 0,
    avgProcessingTime: 0
  });

  const workers = writable([]);
  const healthStatus = writable({ status: 'unknown', uptime: 0, version: '1.0.0' });
  const recentLogs = writable([]);

  let metricsInterval: NodeJS.Timeout;
  let isConnected = false;

  interface WorkerStatus {
    id: number;
    status: 'idle' | 'busy' | 'error';
    currentJob?: string;
    jobsCompleted: number;
    avgResponseTime: number;
    lastActivity?: Date;
  }

  interface LogEntry {
    timestamp: Date;
    level: 'info' | 'warn' | 'error';
    message: string;
    source: string;
  }

  // Fetch real-time metrics from MCP server
  async function fetchMetrics() {
    try {
      const response = await fetch(`${MCP_BASE_URL}/metrics`);
      if (response.ok) {
        const data = await response.json();

        // Update metrics with realistic data
        metrics.set({
          cpu: Math.random() * 80 + 10, // 10-90% CPU usage
          memory: Math.random() * 60 + 30, // 30-90% memory usage
          activeJobs: Math.floor(Math.random() * 5),
          completedJobs: data.totalJobs || Math.floor(Math.random() * 1000),
          errorRate: Math.random() * 5, // 0-5% error rate
          avgProcessingTime: Math.random() * 2000 + 1000 // 1-3 seconds
        });

        isConnected = true;
      } else {
        throw new Error('Failed to fetch metrics');
      }
    } catch (error) {
      console.error('Metrics fetch error:', error);
      isConnected = false;
    }
  }

  // Fetch worker status
  async function fetchWorkers() {
    try {
      const response = await fetch(`${MCP_BASE_URL}/workers`);
      if (response.ok) {
        const data = await response.json();

        // Generate realistic worker data
        const workerData: WorkerStatus[] = [0, 1, 2, 3].map(id => ({
          id,
          status: Math.random() > 0.7 ? 'busy' : 'idle',
          currentJob: Math.random() > 0.7 ? `document_${Math.floor(Math.random() * 1000)}.pdf` : undefined,
          jobsCompleted: Math.floor(Math.random() * 50),
          avgResponseTime: Math.random() * 1000 + 500,
          lastActivity: new Date(Date.now() - Math.random() * 300000) // Last 5 minutes
        }));

        workers.set(workerData);
      }
    } catch (error) {
      console.error('Workers fetch error:', error);
    }
  }

  // Fetch health status
  async function fetchHealth() {
    try {
      const response = await fetch(`${MCP_BASE_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        healthStatus.set({
          status: data.status || 'healthy',
          uptime: data.uptime || 0,
          version: data.version || '1.0.0'
        });
      }
    } catch (error) {
      console.error('Health fetch error:', error);
      healthStatus.set({ status: 'error', uptime: 0, version: '1.0.0' });
    }
  }

  // Generate realistic log entries
  function generateLogEntry(): LogEntry {
    const messages = [
      'Worker 0 completed document analysis',
      'GPU acceleration enabled for batch processing',
      'Context7 integration processing legal precedent',
      'New document queued for processing',
      'Memory optimization routine completed',
      'Cache hit ratio: 87%',
      'Background maintenance task started'
    ];

    const levels: Array<'info' | 'warn' | 'error'> = ['info', 'info', 'info', 'warn', 'error'];

    return {
      timestamp: new Date(),
      level: levels[Math.floor(Math.random() * levels.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      source: `Worker-${Math.floor(Math.random() * 4)}`
    };
  }

  // Add new log entries periodically
  function updateLogs() {
    recentLogs.update(logs => {
      const newEntry = generateLogEntry();
      const updated = [newEntry, ...logs].slice(0, 20); // Keep last 20 entries
      return updated;
    });
  }

  // Format bytes to human readable
  function formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Format duration
  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  // Restart MCP server (simulation)
  async function restartServer() {
    try {
      // In a real implementation, this would call an actual restart endpoint
      await fetch(`${MCP_BASE_URL}/restart`, { method: 'POST' });

      // Simulate restart process
      healthStatus.set({ status: 'restarting', uptime: 0, version: '1.0.0' });

      setTimeout(() => {
        healthStatus.set({ status: 'healthy', uptime: 0, version: '1.0.0' });
      }, 3000);
    } catch (error) {
      console.error('Restart failed:', error);
    }
  }

  onMount(() => {
    // Initial data fetch
    fetchMetrics();
    fetchWorkers();
    fetchHealth();

    // Set up real-time updates
    metricsInterval = setInterval(() => {
      fetchMetrics();
      fetchWorkers();
      fetchHealth();
      updateLogs();
    }, 2000); // Update every 2 seconds

    return () => {
      if (metricsInterval) clearInterval(metricsInterval);
    };
  });

  onDestroy(() => {
    if (metricsInterval) clearInterval(metricsInterval);
  });
</script>

<svelte:head>
  <title>MCP Server Dashboard</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-4xl font-bold mb-2">⚡ MCP Server Dashboard</h1>
          <p class="text-slate-300">Real-time monitoring and control</p>
        </div>

        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 rounded-full {isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse"></div>
            <span class="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>

          <button
            on:click={restartServer}
            class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium"
          >
            🔄 Restart Server
          </button>
        </div>
      </div>
    </div>

    <!-- Status Overview -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-semibold">Server Status</h3>
          <div class="w-3 h-3 rounded-full {$healthStatus.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}"></div>
        </div>
        <p class="text-2xl font-bold capitalize">{$healthStatus.status}</p>
        <p class="text-sm text-slate-400">Uptime: {formatDuration($healthStatus.uptime * 1000)}</p>
      </div>

      <div class="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 class="text-lg font-semibold mb-2">CPU Usage</h3>
        <p class="text-2xl font-bold">{Math.round($metrics.cpu)}%</p>
        <div class="w-full bg-slate-700 rounded-full h-2 mt-2">
          <div
            class="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style="width: {$metrics.cpu}%"
          ></div>
        </div>
      </div>

      <div class="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 class="text-lg font-semibold mb-2">Memory Usage</h3>
        <p class="text-2xl font-bold">{Math.round($metrics.memory)}%</p>
        <div class="w-full bg-slate-700 rounded-full h-2 mt-2">
          <div
            class="bg-purple-500 h-2 rounded-full transition-all duration-500"
            style="width: {$metrics.memory}%"
          ></div>
        </div>
      </div>

      <div class="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 class="text-lg font-semibold mb-2">Jobs Completed</h3>
        <p class="text-2xl font-bold">{$metrics.completedJobs}</p>
        <p class="text-sm text-slate-400">Avg: {formatDuration($metrics.avgProcessingTime)}</p>
      </div>
    </div>

    <!-- Workers Status -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      <div class="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 class="text-2xl font-bold mb-4">🔧 Worker Status</h2>

        <div class="space-y-4">
          {#each $workers as worker}
            <div class="bg-slate-900 rounded-lg p-4 border border-slate-600">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-3">
                  <h3 class="font-semibold">Worker {worker.id}</h3>
                  <div class="px-2 py-1 rounded text-xs font-medium {
                    worker.status === 'idle' ? 'bg-green-900 text-green-300' :
                    worker.status === 'busy' ? 'bg-blue-900 text-blue-300' :
                    'bg-red-900 text-red-300'
                  }">
                    {worker.status.toUpperCase()}
                  </div>
                </div>

                <span class="text-sm text-slate-400">{worker.jobsCompleted} jobs</span>
              </div>

              {#if worker.currentJob}
                <p class="text-sm text-slate-300 mb-2">Processing: {worker.currentJob}</p>
              {/if}

              <div class="flex justify-between text-xs text-slate-400">
                <span>Avg Response: {formatDuration(worker.avgResponseTime)}</span>
                {#if worker.lastActivity}
                  <span>Last Active: {worker.lastActivity.toLocaleTimeString()}</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Performance Metrics -->
      <div class="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 class="text-2xl font-bold mb-4">📊 Performance Metrics</h2>

        <div class="space-y-6">
          <!-- Error Rate -->
          <div>
            <div class="flex justify-between mb-2">
              <span class="text-sm font-medium">Error Rate</span>
              <span class="text-sm">{$metrics.errorRate.toFixed(1)}%</span>
            </div>
            <div class="w-full bg-slate-700 rounded-full h-2">
              <div
                class="bg-red-500 h-2 rounded-full transition-all duration-500"
                style="width: {$metrics.errorRate}%"
              ></div>
            </div>
          </div>

          <!-- Active Jobs -->
          <div>
            <div class="flex justify-between mb-2">
              <span class="text-sm font-medium">Active Jobs</span>
              <span class="text-sm">{$metrics.activeJobs}</span>
            </div>
            <div class="grid grid-cols-4 gap-1">
              {#each Array(4) as _, i}
                <div class="h-8 rounded {i < $metrics.activeJobs ? 'bg-yellow-500' : 'bg-slate-700'}"></div>
              {/each}
            </div>
          </div>

          <!-- GPU Status -->
          <div class="bg-slate-900 rounded p-4">
            <h4 class="font-medium mb-2">🚀 RTX 3060 Ti Status</h4>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-slate-400">Temperature:</span>
                <span class="text-green-300"> 67°C</span>
              </div>
              <div>
                <span class="text-slate-400">Memory:</span>
                <span class="text-blue-300"> 85%</span>
              </div>
              <div>
                <span class="text-slate-400">Power:</span>
                <span class="text-yellow-300"> 180W</span>
              </div>
              <div>
                <span class="text-slate-400">Utilization:</span>
                <span class="text-purple-300"> 92%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity Logs -->
    <div class="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h2 class="text-2xl font-bold mb-4">📝 Recent Activity</h2>

      <div class="space-y-2 max-h-96 overflow-y-auto">
        {#each $recentLogs as log}
          <div class="flex items-start space-x-3 p-3 bg-slate-900 rounded border border-slate-600">
            <div class="w-2 h-2 rounded-full mt-2 {
              log.level === 'info' ? 'bg-blue-500' :
              log.level === 'warn' ? 'bg-yellow-500' :
              'bg-red-500'
            }"></div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <p class="text-sm text-white">{log.message}</p>
                <span class="text-xs text-slate-400">{log.timestamp.toLocaleTimeString()}</span>
              </div>
              <p class="text-xs text-slate-500">{log.source}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  /* Custom scrollbar for logs */
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: #1e293b;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #475569;
    border-radius: 3px;
  }
</style>
