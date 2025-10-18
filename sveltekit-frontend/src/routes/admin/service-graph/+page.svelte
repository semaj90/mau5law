/**
 * Service Dependency Graph Interactive Dashboard
 * Real-time visualization with health status, performance metrics, and dependency analysis
 *
 * Usage: Add to src/routes/admin/service-graph/+page.svelte
 */

<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  interface Service {
    id: string;
    label: string;
    type: string;
    port: number;
    description: string;
    capabilities: string[];
    protocol: string | string[];
    dependsOn: string[];
    health?: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    responseTime?: number;
    uptime?: number;
  }

  interface ServiceGraph {
    nodes: Service[];
    edges: Array<{ source: string; target: string }>;
  }

  let graph: ServiceGraph | null = null;
  let selectedService: Service | null = null;
  let filterType: string = 'all';
  let searchQuery: string = '';
  let showDependencies: boolean = true;
  let showHealth: boolean = true;
  let autoRefresh: boolean = false;

  const serviceTypeColors: Record<string, string> = {
    frontend: 'bg-red-500',
    core: 'bg-teal-500',
    gpu: 'bg-blue-500',
    cache: 'bg-yellow-500',
    orchestration: 'bg-purple-500',
    ai: 'bg-cyan-500',
    vector: 'bg-green-500',
    infrastructure: 'bg-indigo-500',
    data: 'bg-purple-300',
    observability: 'bg-blue-300',
    security: 'bg-pink-500',
    database: 'bg-blue-600',
    storage: 'bg-yellow-600',
    queue: 'bg-orange-600'
  };

  const healthColors: Record<string, string> = {
    healthy: 'text-green-500',
    degraded: 'text-yellow-500',
    unhealthy: 'text-red-500',
    unknown: 'text-gray-500'
  };

  onMount(async () => {
    await loadGraph();
    if (autoRefresh) {
      setInterval(loadGraph, 5000);
    }
  });

  async function loadGraph() {
    try {
      const response = await fetch('/api/admin/service-graph');
      const data = await response.json();
      graph = data;
    } catch (error) {
      console.error('Failed to load service graph:', error);
    }
  }

  function getFilteredServices() {
    if (!graph) return [];
    return graph.nodes.filter(service => {
      const typeMatch = filterType === 'all' || service.type === filterType;
      const searchMatch =
        !searchQuery ||
        service.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase());
      return typeMatch && searchMatch;
    });
  }

  function getDependentServices(serviceId: string): Service[] {
    if (!graph) return [];
    const dependentIds = graph.edges
      .filter(e => e.target === serviceId)
      .map(e => e.source);
    return graph.nodes.filter(n => dependentIds.includes(n.id));
  }

  function selectService(service: Service) {
    selectedService = service;
  }

  async function checkServiceHealth(serviceId: string) {
    try {
      const response = await fetch(`/api/admin/service-health?service=${serviceId}`);
      const health = await response.json();
      if (graph) {
        const service = graph.nodes.find(s => s.id === serviceId);
        if (service) {
          service.health = health.status;
          service.responseTime = health.responseTime;
          service.uptime = health.uptime;
          graph = graph; // Trigger reactivity
        }
      }
    } catch (error) {
      console.error(`Failed to check health for ${serviceId}:`, error);
    }
  }

  function exportAsJSON() {
    if (!graph) return;
    const json = JSON.stringify(graph, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service-graph-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  }

  function exportAsCSV() {
    if (!graph) return;
    const csv = [
      ['Service', 'Type', 'Port', 'Dependencies', 'Health', 'Response Time (ms)'].join(','),
      ...graph.nodes.map(n => [
        n.id,
        n.type,
        n.port || 'N/A',
        n.dependsOn.join(';'),
        n.health || 'unknown',
        n.responseTime || 'N/A'
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service-graph-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }
</script>

<div class="min-h-screen bg-gray-900 text-white p-6">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold mb-2">🔗 Service Dependency Graph</h1>
      <p class="text-gray-400">Real-time visualization of microservices architecture</p>
    </div>

    <!-- Controls -->
    <div class="bg-gray-800 rounded-lg p-4 mb-6 space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Search -->
        <div>
          <label for="service-search" class="block text-sm font-medium mb-2">Search Services</label>
          <input
            id="service-search"
            type="text"
            placeholder="Filter services..."
            bind:value={searchQuery}
            class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>

        <!-- Type Filter -->
        <div>
          <label for="service-type" class="block text-sm font-medium mb-2">Service Type</label>
          <select
            id="service-type"
            bind:value={filterType}
            class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          >
            <option value="all">All Types</option>
            <option value="core">Core</option>
            <option value="gpu">GPU</option>
            <option value="ai">AI</option>
            <option value="vector">Vector</option>
            <option value="database">Database</option>
            <option value="cache">Cache</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="security">Security</option>
            <option value="observability">Observability</option>
          </select>
        </div>

        <!-- Options -->
        <div class="flex flex-col justify-end gap-2">
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" bind:checked={showHealth} />
            Show Health Status
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" bind:checked={autoRefresh} />
            Auto Refresh (5s)
          </label>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-2 flex-wrap">
        <button
          on:click={loadGraph}
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        >
          🔄 Refresh
        </button>
        <button
          on:click={exportAsJSON}
          class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
        >
          📥 Export JSON
        </button>
        <button
          on:click={exportAsCSV}
          class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
        >
          📥 Export CSV
        </button>
      </div>
    </div>

    <!-- Main Layout: Graph + Details -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Service List -->
      <div class="lg:col-span-2 bg-gray-800 rounded-lg p-4 max-h-[600px] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4">
          Services ({getFilteredServices().length} of {graph?.nodes.length || 0})
        </h2>
        <div class="space-y-2">
          {#each getFilteredServices() as service (service.id)}
            <button
              on:click={() => selectService(service)}
              class={`w-full text-left p-3 rounded border-2 transition ${
                selectedService?.id === service.id
                  ? 'border-blue-500 bg-gray-700'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class={`w-3 h-3 rounded-full ${serviceTypeColors[service.type] || 'bg-gray-500'}`}></div>
                  <div class="flex flex-col">
                    <span class="font-semibold">{service.id}</span>
                    {#if service.port}
                      <span class="text-xs text-gray-400">:{service.port}</span>
                    {/if}
                  </div>
                </div>
                {#if showHealth && service.health}
                  <span class={`text-sm ${healthColors[service.health] || 'text-gray-500'}`}>
                    ● {service.health}
                  </span>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      </div>

      <!-- Service Details Panel -->
      <div class="bg-gray-800 rounded-lg p-4">
        {#if selectedService}
          <h2 class="text-xl font-bold mb-4">📊 Service Details</h2>

          <div class="space-y-4">
            <!-- Basic Info -->
            <div>
              <h3 class="font-semibold text-blue-400 mb-2">Information</h3>
              <div class="space-y-1 text-sm">
                <p><span class="text-gray-400">Service:</span> {selectedService.id}</p>
                <p><span class="text-gray-400">Type:</span> <span class="capitalize">{selectedService.type}</span></p>
                {#if selectedService.port}
                  <p><span class="text-gray-400">Port:</span> {selectedService.port}</p>
                {/if}
                <p><span class="text-gray-400">Protocol:</span> {Array.isArray(selectedService.protocol) ? selectedService.protocol.join(', ') : selectedService.protocol}</p>
              </div>
            </div>

            <!-- Health Status -->
            {#if showHealth}
              <div>
                <h3 class="font-semibold text-blue-400 mb-2">Health</h3>
                <div class="space-y-1 text-sm">
                  <p><span class="text-gray-400">Status:</span> <span class={healthColors[selectedService.health || 'unknown']}>{selectedService.health || 'unknown'}</span></p>
                  {#if selectedService.responseTime}
                    <p><span class="text-gray-400">Response Time:</span> {selectedService.responseTime}ms</p>
                  {/if}
                  {#if selectedService.uptime}
                    <p><span class="text-gray-400">Uptime:</span> {selectedService.uptime}%</p>
                  {/if}
                </div>
                <button
                  on:click={() => checkServiceHealth(selectedService.id)}
                  class="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                >
                  Check Now
                </button>
              </div>
            {/if}

            <!-- Description -->
            <div>
              <h3 class="font-semibold text-blue-400 mb-2">Description</h3>
              <p class="text-sm text-gray-300">{selectedService.description}</p>
            </div>

            <!-- Capabilities -->
            {#if selectedService.capabilities.length > 0}
              <div>
                <h3 class="font-semibold text-blue-400 mb-2">Capabilities</h3>
                <div class="flex flex-wrap gap-2">
                  {#each selectedService.capabilities as cap}
                    <span class="text-xs bg-gray-700 px-2 py-1 rounded">{cap}</span>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Dependencies -->
            {#if showDependencies && selectedService.dependsOn.length > 0}
              <div>
                <h3 class="font-semibold text-blue-400 mb-2">Dependencies</h3>
                <div class="space-y-1 text-sm">
                  {#each selectedService.dependsOn as dep}
                    <p class="text-gray-300">→ {dep}</p>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Dependents -->
            {#if showDependencies}
              {@const dependents = getDependentServices(selectedService.id)}
              {#if dependents.length > 0}
                <div>
                  <h3 class="font-semibold text-blue-400 mb-2">Used By</h3>
                  <div class="space-y-1 text-sm">
                    {#each dependents as dep}
                      <p class="text-gray-300">← {dep.id}</p>
                    {/each}
                  </div>
                </div>
              {/if}
            {/if}
          </div>
        {:else}
          <div class="flex items-center justify-center h-64 text-gray-400">
            <p>Select a service to view details</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Statistics Footer -->
    {#if graph}
      <div class="mt-6 bg-gray-800 rounded-lg p-4">
        <h2 class="text-lg font-bold mb-4">📈 Statistics</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p class="text-gray-400 text-sm">Total Services</p>
            <p class="text-2xl font-bold">{graph.nodes.length}</p>
          </div>
          <div>
            <p class="text-gray-400 text-sm">Total Dependencies</p>
            <p class="text-2xl font-bold">{graph.edges.length}</p>
          </div>
          <div>
            <p class="text-gray-400 text-sm">Healthy</p>
            <p class="text-2xl font-bold text-green-500">{graph.nodes.filter(n => n.health === 'healthy').length}</p>
          </div>
          <div>
            <p class="text-gray-400 text-sm">Issues</p>
            <p class="text-2xl font-bold text-red-500">{graph.nodes.filter(n => n.health !== 'healthy' && n.health).length}</p>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  :global(body) {
    background-color: #111827;
  }
</style>
