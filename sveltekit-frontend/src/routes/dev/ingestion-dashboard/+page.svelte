<script>
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';

  // Dashboard data store
  const dashboardData = writable({
    jobs: { active: [], recent: [], stats: {} },
    workers: { active: [], stats: {} },
    metrics: { recentActivity: [], performance: {} },
    workflow: { state: 'idle', context: {} },
    system: {}
  });

  let pollInterval;
  let isConnected = false;
  let errorMessage = '';
  let autoRefresh = true;
  let refreshRate = 5000; // 5 seconds

  // Job submission form
  let newJob = {
    documentId: '',
    text: '',
    chunks: 1,
    priority: 'normal'
  };
  let submissionStatus = '';

  async function fetchDashboardData() {
    try {
      const response = await fetch('/api/ingestion/comprehensive?action=get_dashboard');
      const result = await response.json();
      
      if (result.success) {
        dashboardData.set(result.dashboard);
        isConnected = true;
        errorMessage = '';
      } else {
        errorMessage = result.error || 'Failed to fetch dashboard data';
      }
    } catch (error) {
      errorMessage = `Connection error: ${error.message}`;
      isConnected = false;
    }
  }

  async function submitTestJob() {
    if (!newJob.documentId || !newJob.text) {
      submissionStatus = 'Error: Document ID and text are required';
      return;
    }

    try {
      submissionStatus = 'Submitting...';
      
      // Split text into chunks
      const words = newJob.text.split(' ');
      const chunkSize = Math.ceil(words.length / newJob.chunks);
      const chunks = [];
      for (let i = 0; i < words.length; i += chunkSize) {
        chunks.push(words.slice(i, i + chunkSize).join(' '));
      }

      const response = await fetch('/api/ingestion/comprehensive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_document',
          documentId: newJob.documentId,
          chunks,
          metadata: {
            priority: newJob.priority,
            source: 'dashboard_test',
            userId: 'test_user'
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        submissionStatus = `✅ Job submitted: ${result.jobId}`;
        // Reset form
        newJob = { documentId: '', text: '', chunks: 1, priority: 'normal' };
        // Refresh dashboard
        await fetchDashboardData();
      } else {
        submissionStatus = `❌ Error: ${result.error}`;
      }
    } catch (error) {
      submissionStatus = `❌ Network error: ${error.message}`;
    }
  }

  async function controlWorkflow(action, params = {}) {
    try {
      const response = await fetch('/api/ingestion/comprehensive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params })
      });

      const result = await response.json();
      if (result.success) {
        console.log(`✅ ${action}:`, result.message);
        await fetchDashboardData();
      } else {
        console.error(`❌ ${action}:`, result.error);
      }
    } catch (error) {
      console.error(`❌ ${action} failed:`, error);
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  function getStatusColor(status) {
    const colors = {
      'queued': 'text-yellow-600',
      'processing': 'text-blue-600',
      'completed': 'text-green-600',
      'failed': 'text-red-600',
      'active': 'text-green-600',
      'idle': 'text-gray-600',
      'error': 'text-red-600',
      'offline': 'text-gray-400'
    };
    return colors[status] || 'text-gray-600';
  }

  onMount(() => {
    fetchDashboardData();
    
    if (autoRefresh) {
      pollInterval = setInterval(fetchDashboardData, refreshRate);
    }
  });

  onDestroy(() => {
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  });

  // Reactive updates for auto-refresh
  $: {
    if (pollInterval) clearInterval(pollInterval);
    if (autoRefresh && typeof window !== 'undefined') {
      pollInterval = setInterval(fetchDashboardData, refreshRate);
    }
  }
</script>

<svelte:head>
  <title>Ingestion Dashboard - Real-time Monitoring</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-4">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Ingestion Dashboard</h1>
          <p class="text-gray-600 mt-1">XState + LokiJS + RabbitMQ + Drizzle ORM Integration</p>
        </div>
        
        <div class="flex items-center space-x-4">
          <!-- Connection Status -->
          <div class="flex items-center">
            <div class={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span class="text-sm {isConnected ? 'text-green-600' : 'text-red-600'}">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <!-- Auto Refresh Toggle -->
          <label class="flex items-center">
            <input type="checkbox" bind:checked={autoRefresh} class="mr-2">
            <span class="text-sm text-gray-600">Auto Refresh</span>
          </label>

          <!-- Refresh Rate -->
          <select bind:value={refreshRate} class="text-sm border rounded px-2 py-1">
            <option value={2000}>2s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
          </select>

          <!-- Manual Refresh -->
          <button 
            onclick={fetchDashboardData}
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {#if errorMessage}
        <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div class="text-red-700 text-sm">{errorMessage}</div>
        </div>
      {/if}
    </div>

    {#if $dashboardData}
      <!-- System Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow-sm p-6">
          <div class="text-2xl font-bold text-blue-600">
            {$dashboardData.jobs?.stats?.total || 0}
          </div>
          <div class="text-gray-600 text-sm">Total Jobs</div>
        </div>
        
        <div class="bg-white rounded-lg shadow-sm p-6">
          <div class="text-2xl font-bold text-green-600">
            {$dashboardData.jobs?.active?.length || 0}
          </div>
          <div class="text-gray-600 text-sm">Active Jobs</div>
        </div>
        
        <div class="bg-white rounded-lg shadow-sm p-6">
          <div class="text-2xl font-bold text-purple-600">
            {$dashboardData.workers?.active?.length || 0}
          </div>
          <div class="text-gray-600 text-sm">Active Workers</div>
        </div>
        
        <div class="bg-white rounded-lg shadow-sm p-6">
          <div class="text-2xl font-bold text-orange-600">
            {($dashboardData.jobs?.stats?.successRate * 100)?.toFixed(1) || 0}%
          </div>
          <div class="text-gray-600 text-sm">Success Rate</div>
        </div>
      </div>

      <!-- Workflow Status -->
      <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-gray-900">Workflow Control</h2>
          <div class="flex space-x-2">
            <button 
              onclick={() => controlWorkflow('pause_processing')}
              class="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
            >
              Pause
            </button>
            <button 
              onclick={() => controlWorkflow('resume_processing')}
              class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
            >
              Resume
            </button>
            <button 
              onclick={() => controlWorkflow('clear_completed')}
              class="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
            >
              Clear Completed
            </button>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div class="text-sm text-gray-600">Current State</div>
            <div class="font-bold text-lg {getStatusColor($dashboardData.workflow?.state)}">
              {$dashboardData.workflow?.state || 'idle'}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-600">Queue Length</div>
            <div class="font-bold text-lg">
              {$dashboardData.workflow?.context?.queueLength || 0}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-600">Concurrency</div>
            <div class="font-bold text-lg">
              {$dashboardData.workflow?.context?.concurrency || 0}
            </div>
          </div>
        </div>
      </div>

      <!-- Job Submission -->
      <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 class="text-xl font-bold text-gray-900 mb-4">Submit Test Job</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Document ID</label>
            <input 
              type="text" 
              bind:value={newJob.documentId}
              placeholder="test-doc-001"
              class="w-full border rounded px-3 py-2"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select bind:value={newJob.priority} class="w-full border rounded px-3 py-2">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        
        <div class="mt-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Text Content</label>
          <textarea 
            bind:value={newJob.text}
            placeholder="Enter text to be processed and embedded..."
            rows="4"
            class="w-full border rounded px-3 py-2"
          ></textarea>
        </div>
        
        <div class="mt-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Chunks ({newJob.chunks})
          </label>
          <input 
            type="range" 
            min="1" 
            max="10" 
            bind:value={newJob.chunks}
            class="w-full"
          >
        </div>
        
        <div class="mt-4 flex justify-between items-center">
          <button 
            onclick={submitTestJob}
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Submit Job
          </button>
          
          {#if submissionStatus}
            <div class="text-sm {submissionStatus.includes('✅') ? 'text-green-600' : submissionStatus.includes('❌') ? 'text-red-600' : 'text-blue-600'}">
              {submissionStatus}
            </div>
          {/if}
        </div>
      </div>

      <!-- Recent Jobs -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Active Jobs -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Active Jobs</h2>
          
          <div class="space-y-3 max-h-64 overflow-y-auto">
            {#each $dashboardData.jobs?.active || [] as job}
              <div class="border rounded p-3 bg-gray-50">
                <div class="flex justify-between items-start">
                  <div>
                    <div class="font-medium text-sm">{job.documentId}</div>
                    <div class="text-xs text-gray-600">Job ID: {job.id}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm {getStatusColor(job.state)}">{job.state}</div>
                    <div class="text-xs text-gray-500">{job.chunks?.length || 0} chunks</div>
                  </div>
                </div>
                
                {#if job.progress}
                  <div class="mt-2">
                    <div class="w-full bg-gray-200 rounded-full h-2">
                      <div class="bg-blue-500 h-2 rounded-full" style="width: {job.progress}%"></div>
                    </div>
                    <div class="text-xs text-gray-600 mt-1">{job.progress}% complete</div>
                  </div>
                {/if}
              </div>
            {:else}
              <div class="text-gray-500 text-center py-4">No active jobs</div>
            {/each}
          </div>
        </div>

        <!-- Recent Jobs -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Recent Jobs</h2>
          
          <div class="space-y-3 max-h-64 overflow-y-auto">
            {#each $dashboardData.jobs?.recent || [] as job}
              <div class="border rounded p-3">
                <div class="flex justify-between items-start">
                  <div>
                    <div class="font-medium text-sm">{job.documentId}</div>
                    <div class="text-xs text-gray-600">
                      {new Date(job.startedAt).toLocaleString()}
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm {getStatusColor(job.state)}">{job.state}</div>
                    {#if job.results?.processingTime}
                      <div class="text-xs text-gray-500">
                        {formatDuration(job.results.processingTime)}
                      </div>
                    {/if}
                  </div>
                </div>
                
                {#if job.error}
                  <div class="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                    {job.error}
                  </div>
                {/if}
              </div>
            {:else}
              <div class="text-gray-500 text-center py-4">No recent jobs</div>
            {/each}
          </div>
        </div>
      </div>

      <!-- System Info -->
      {#if $dashboardData.system}
        <div class="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">System Information</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div class="text-gray-600">Uptime</div>
              <div class="font-medium">{formatDuration($dashboardData.system.uptime * 1000)}</div>
            </div>
            <div>
              <div class="text-gray-600">Memory Usage</div>
              <div class="font-medium">
                {formatBytes($dashboardData.system.memory?.rss || 0)}
              </div>
            </div>
            <div>
              <div class="text-gray-600">Configuration</div>
              <div class="font-medium">
                RabbitMQ: {$dashboardData.system.config?.enableRabbitMQ ? '✅' : '❌'} |
                Redis: {$dashboardData.system.config?.enableRedisQueues ? '✅' : '❌'}
              </div>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .bg-gray-50 {
    background-color: #f9fafb;
  }
</style>
