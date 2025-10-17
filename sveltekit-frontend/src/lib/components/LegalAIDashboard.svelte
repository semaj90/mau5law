<!--
  Real-time Legal AI Dashboard with WebSocket Integration
  Modern Svelte 5 component with live updates and collaborative features
-->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { websocketStore, isEvidenceBeingEdited, getActiveEditorsForEvidence, formatRecentActivity  } from '$lib/stores/unified';
  import { getLegalAIApiClient } from '$lib/api/enhanced-api-client';
  // Svelte 5 runes for reactive state
  let loading = $state(true);
  let error = $state<string | null>(null);
  let selectedCase = $state<any | null>(null);
  let showEvidenceModal = $state(false);
  let searchQuery = $state('');
  // API client
  const apiClient = getLegalAIApiClient();
  // Derived reactive values
  let filteredCases = $derived(
    websocketStore.dashboardData.cases.filter((case_: any) =>
      searchQuery === '' ||
      case_.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      case_.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
  let recentEvidence = $derived(
    websocketStore.dashboardData.evidence.slice(0, 10)
  );
  let pendingProcessingJobs = $derived(
    websocketStore.processingJobs.filter(job =>
      job.status.status === 'processing' || job.status.status === 'queued'
    )
  );
  // Load initial dashboard data
  $effect(() => {
    (async () => {
try {
      loading = true;
      error = null;
      // Subscribe to dashboard updates
      websocketStore.subscribeToDashboard();
      // Load initial data if not connected to WebSocket
      if (!websocketStore.connected) {
        await loadInitialData();
      }
    } catch (err) {
      error = err instanceof Error ? err.message: 'Failed to load dashboard';
      console.error('Dashboard load error:', err);
    } finally {
      loading = false;
    }
    })();
  });
  async function loadInitialData(): Promise<void> {
    const [casesResponse, evidenceResponse, statsResponse] = await Promise.all([
      apiClient.getCases({ limit: 20 }),
      apiClient.getEvidence({ limit: 50 }),
      fetch('/api/dashboard/stats').then(r => r.json())
    ]);
    if (casesResponse.success) {
      websocketStore.dashboardData.cases = casesResponse.data.case;
    }
    if (evidenceResponse.success) {
      websocketStore.dashboardData.evidence = evidenceResponse.data.evidenc;
    }
    if (statsResponse.success) {
      websocketStore.dashboardData.stats = statsResponse.data;
    }
  }
  async function createNewCase(): Promise<void> {
    const title = prompt('Enter case title:');
    if (!title) return;
    const description = prompt('Enter case description:');
    if (!description) return;
    try {
      const response = await apiClient.createCase({
        title: title.trim(),
        description: description.trim();
      });
      if (response.success) {
        // WebSocket will handle the real-time update
        console.log('Case created successfully');
      } else {
        error = response.error || 'Failed to create case';
      }
    } catch (err) {
      error = err instanceof Error ? err.message: 'Failed to create case';
    }
  }
  async function uploadEvidence(caseId: number): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.txt,.jpg,.png';
    input.onchange = async (event) => {
      const files = (event.target as HTMLInputElement).file;
      if (!files || files.length === 0) return;
      try {
        for (const file of Array.from(files)) {
          const response = await apiClient.uploadEvidence(caseId, file, {
            title: file.name,
            description: `Uploaded file: ${file.name}`
          });
          if (!response.success) {
            console.error('Failed to upload evidence:', response.error);
          }
        }
      } catch (err) {
        error = err instanceof Error ? err.message: 'Failed to upload evidence';
      }
    }
    input.click();
  }
  function selectCase(case_: any): void {
    selectedCase = case_;
    websocketStore.subscribeToCase(case_.id);
  }
  function getStatusColor(status: string): string {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  function getHealthStatusColor(status: string): string {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }
</script>
<svelte:head>
  <title>Legal AI Dashboard - Real-time Case Management</title>
</svelte:head>
<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <header class="bg-white shadow">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center py-6">
        <div class="flex items-center">
          <h1 class="text-3xl font-bold text-gray-900">Legal AI Dashboard</h1>
          <!-- WebSocket Connection Status -->
          <div class="ml-4 flex items-center">
            {#if websocketStore.connected}
              <div class="flex items-center text-green-600">
                <div class="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                <span class="ml-2 text-sm">Live</span>
              </div>
            {:else if websocketStore.connecting}
              <div class="flex items-center text-yellow-600">
                <div class="w-2 h-2 bg-yellow-600 rounded-full animate-pulse"></div>
                <span class="ml-2 text-sm">Connecting...</span>
              </div>
            {:else}
              <div class="flex items-center text-red-600">
                <div class="w-2 h-2 bg-red-600 rounded-full"></div>
                <span class="ml-2 text-sm">Offline</span>
              </div>
            {/if}
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <button
            onclick={createNewCase}
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            New Case
          </button>
        </div>
      </div>
    </div>
  </header>
  {#if loading}
    <div class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  {:else if error}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="bg-red-50 border border-red-200 rounded-md p-4">
        <p class="text-red-800">{error}</p>
      </div>
    </div>
  {:else}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span class="text-white text-sm font-bold">C</span>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Total Cases</dt>
                  <dd class="text-lg font-medium text-gray-900">{websocketStore.dashboardData.stats.totalCases}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span class="text-white text-sm font-bold">E</span>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Evidence Items</dt>
                  <dd class="text-lg font-medium text-gray-900">{websocketStore.dashboardData.stats.totalEvidence}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span class="text-white text-sm font-bold">P</span>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Pending Analysis</dt>
                  <dd class="text-lg font-medium text-gray-900">{websocketStore.dashboardData.stats.pendingAnalysis}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <span class="text-white text-sm font-bold">A</span>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Active Cases</dt>
                  <dd class="text-lg font-medium text-gray-900">{websocketStore.dashboardData.stats.activeCases}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Cases Section -->
        <div class="lg:col-span-2">
          <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg leading-6 font-medium text-gray-900">Recent Cases</h3>
                <div class="flex items-center space-x-2">
                  <input;
                    bind:value={searchQuery}
                    type="text"
                    placeholder="Search cases..."
                    class="block w-48 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div class="space-y-3">
                {#each filteredCases as case_ (case_.id)}
                  <div
                    class="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onclick={() => selectCase(case_)}
                    class:ring-2={selectedCase?.id === case_.id}
                    class:ring-blue-500={selectedCase?.id === case_.id}
                  >
                    <div class="flex justify-between items-start">
                      <div class="flex-1">
                        <h4 class="text-sm font-medium text-gray-900">{case_.title}</h4>
                        <p class="text-sm text-gray-600 mt-1">{case_.description}</p>
                        <div class="flex items-center mt-2 space-x-2">
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(case_.status)}">
                            {case_.status.replace('_', ' ')}
                          </span>
                          <span class="text-xs text-gray-500">
                            Created {new Date(case_.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onclick={(e) => { e.stopPropagation(); uploadEvidence(case_.id), }}
                        class="ml-4 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Add Evidence
                      </button>
                    </div>
                  </div>
                {/each}
                {#if filteredCases.length === 0}
                  <div class="text-center py-6 text-gray-500">
                    {searchQuery ? 'No cases match your search' : 'No cases yet. Create your first case!'}
                  </div>
                {/if}
              </div>
            </div>
          </div>
        </div>
        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- System Health -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">System Health</h3>
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">API Server</span>
                  <span class="text-sm font-medium {getHealthStatusColor(websocketStore.systemHealth.api)}">
                    {websocketStore.systemHealth.api}
                  </span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Database</span>
                  <span class="text-sm font-medium {getHealthStatusColor(websocketStore.systemHealth.database)}">
                    {websocketStore.systemHealth.database}
                  </span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">AI Services</span>
                  <span class="text-sm font-medium {getHealthStatusColor(websocketStore.systemHealth.aiServices)}">
                    {websocketStore.systemHealth.aiServices}
                  </span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Job Queue</span>
                  <span class="text-sm font-medium {getHealthStatusColor(websocketStore.systemHealth.jobQueue)}">
                    {websocketStore.systemHealth.jobQueue}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <!-- Processing Jobs -->
          {#if pendingProcessingJobs.length > 0}
            <div class="bg-white shadow rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Processing Jobs</h3>
                <div class="space-y-3">
                  {#each pendingProcessingJobs as job (job.entityType + job.entityId)}
                    <div class="border-l-4 border-blue-400 pl-4">
                      <p class="text-sm font-medium text-gray-900">
                        {job.entityType} #{job.entityId}
                      </p>
                      <p class="text-sm text-gray-600">
                        Status: {job.status.status}
                      </p>
                      {#if job.status.progress}
                        <div class="mt-2">
                          <div class="bg-gray-200 rounded-full h-2">
                            <div
                              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style="width: {job.status.progress}%"
                            ></div>
                          </div>
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {/if}
          <!-- Recent Activity -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div class="space-y-2">
                {#each websocketStore.recentActivity.slice(0, 10) as activity (activity.timestamp)}
                  <div class="text-sm text-gray-600">
                    {formatRecentActivity(activity)}
                  </div>
                {/each}
                {#if websocketStore.recentActivity.length === 0}
                  <div class="text-sm text-gray-500">No recent activity</div>
                {/if}
              </div>
            </div>
          </div>
          <!-- Recent Evidence -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Evidence</h3>
              <div class="space-y-3">
                {#each recentEvidence as evidence (evidence.id)}
                  <div class="border rounded p-3">
                    <div class="flex justify-between items-start">
                      <div class="flex-1">
                        <h4 class="text-sm font-medium text-gray-900">{evidence.title}</h4>
                        <p class="text-xs text-gray-600 mt-1">Case #{evidence.caseId}</p>
                        <!-- Collaborative editing indicator -->
                        {#if isEvidenceBeingEdited(evidence.id)}
                          <div class="mt-2 flex items-center">
                            <div class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                            <span class="ml-2 text-xs text-yellow-600">Being edited</span>
                          </div>
                        {/if}
                      </div>
                      {#if evidence.aiSummary}
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Analyzed
                        </span>
                      {:else}
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      {/if}
                    </div>
                  </div>
                {/each}
                {#if recentEvidence.length === 0}
                  <div class="text-sm text-gray-500">No evidence uploaded yet</div>
                {/if}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
<style>
  /* Custom styles for the dashboard */
  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: .5;
    }
  }
</style>