<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  interface RouteData {
    generated: string;
    filters: {
      applied: boolean;
      category: string | null;
      status: string | null;
      tag: string | null;
      search: string | null;
    };
    counts: {
      total: {
        config: number;
        fileBased: number;
        api: number;
      };
      displayed: {
        config: number;
        fileBased: number;
      };
      issues: {
        configMissingFiles: number;
        filesMissingConfig: number;
      };
    };
    data: {
      configRoutes: any[];
      fileRoutes: any[];
      apiEndpoints: string[];
      configMissingFiles: string[];
      filesMissingConfig: string[];
    };
    analytics?: {
      statusBreakdown: Record<string, number>;
      categoryBreakdown: Record<string, number>;
      tagUsage: Record<string, number>;
      complexityMetrics: {
        dynamicRoutes: number;
        apiRoutes: number;
        staticPages: number;
        deepestNesting: number;
      };
      recommendations: string[];
    };
  }

  let routeData: RouteData | null = $state(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Filter state
  let searchTerm = $state('');
  let selectedCategory = $state('all');
  let selectedStatus = $state('all');
  let selectedTag = $state('all');
  let showAnalytics = $state(false);
  let viewMode = $state<'grid' | 'table' | 'tree'>('grid');

  // Derived filtered data
  let filteredRoutes = $derived.by(() => {
    if (!routeData) return [];

    return routeData.data.configRoutes.filter(route => {
      const matchesSearch = !searchTerm ||
        route.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.route?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.id?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || route.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || route.status === selectedStatus;
      const matchesTag = selectedTag === 'all' || route.tags?.includes(selectedTag);

      return matchesSearch && matchesCategory && matchesStatus && matchesTag;
    });
  });

  let categories = $derived.by(() => {
    if (!routeData) return [];
    return [...new Set(routeData.data.configRoutes.map(r => r.category))].sort();
  });

  let statuses = $derived.by(() => {
    if (!routeData) return [];
    return [...new Set(routeData.data.configRoutes.map(r => r.status))].sort();
  });

  let allTags = $derived.by(() => {
    if (!routeData) return [];
    const tags = new Set<string>();
    routeData.data.configRoutes.forEach(route => {
      route.tags?.forEach((tag: string) => tags.add(tag));
    });
    return [...tags].sort();
  });

  onMount(async () => {
    if (!browser) return;

    try {
      // Generate route data with analytics
      const response = await fetch('/api/dev/route-data');
      if (!response.ok) {
        throw new Error(`Failed to fetch route data: ${response.statusText}`);
      }
      routeData = await response.json();
    } catch (err) {
      console.error('Failed to load route data:', err);
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading = false;
    }
  });

  function getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'deprecated': return 'bg-red-100 text-red-800 border-red-200';
      case 'experimental': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  function getCategoryColor(category: string): string {
    const colors = {
      'dashboard': 'bg-blue-100 text-blue-800 border-blue-200',
      'admin': 'bg-purple-100 text-purple-800 border-purple-200',
      'api': 'bg-orange-100 text-orange-800 border-orange-200',
      'auth': 'bg-red-100 text-red-800 border-red-200',
      'public': 'bg-green-100 text-green-800 border-green-200',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  function clearFilters() {
    searchTerm = '';
    selectedCategory = 'all';
    selectedStatus = 'all';
    selectedTag = 'all';
  }

  async function refreshData() {
    loading = true;
    error = null;
    await onMount();
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
  <div class="container mx-auto px-6 py-8">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-4xl font-bold text-gray-900">
          🗺️ Route Explorer
        </h1>
        <button
          onclick={refreshData}
          disabled={loading}
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
      </div>

      <p class="text-gray-600 text-lg">
        Interactive route management and analysis dashboard
      </p>
    </div>

    {#if loading}
      <div class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-4 text-gray-600">Loading route data...</p>
      </div>
    {:else if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 class="text-red-800 font-semibold mb-2">Error Loading Routes</h2>
        <p class="text-red-600">{error}</p>
        <button
          onclick={refreshData}
          class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    {:else if routeData}
      <!-- Statistics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-sm border p-6">
          <div class="flex items-center">
            <div class="p-2 bg-blue-100 rounded-lg">
              <span class="text-2xl">📄</span>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Config Routes</p>
              <p class="text-2xl font-semibold text-gray-900">{routeData.counts.total.config}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border p-6">
          <div class="flex items-center">
            <div class="p-2 bg-green-100 rounded-lg">
              <span class="text-2xl">📁</span>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">File Routes</p>
              <p class="text-2xl font-semibold text-gray-900">{routeData.counts.total.fileBased}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border p-6">
          <div class="flex items-center">
            <div class="p-2 bg-orange-100 rounded-lg">
              <span class="text-2xl">🔌</span>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">API Endpoints</p>
              <p class="text-2xl font-semibold text-gray-900">{routeData.counts.total.api}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border p-6">
          <div class="flex items-center">
            <div class="p-2 bg-red-100 rounded-lg">
              <span class="text-2xl">⚠️</span>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Issues</p>
              <p class="text-2xl font-semibold text-gray-900">
                {routeData.counts.issues.configMissingFiles + routeData.counts.issues.filesMissingConfig}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-900">Filters</h2>
          <button
            onclick={clearFilters}
            class="text-sm text-gray-600 hover:text-gray-800"
          >
            Clear All
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label for="search" class="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              id="search"
              bind:value={searchTerm}
              placeholder="Search routes..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
          </div>

          <div>
            <label for="category" class="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              id="category"
              bind:value={selectedCategory}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {#each categories as category}
                <option value={category}>{category}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="status" class="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              id="status"
              bind:value={selectedStatus}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              {#each statuses as status}
                <option value={status}>{status}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="tag" class="block text-sm font-medium text-gray-700 mb-2">Tag</label>
            <select
              id="tag"
              bind:value={selectedTag}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Tags</option>
              {#each allTags as tag}
                <option value={tag}>{tag}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="view" class="block text-sm font-medium text-gray-700 mb-2">View</label>
            <select
              id="view"
              bind:value={viewMode}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="grid">Grid View</option>
              <option value="table">Table View</option>
              <option value="tree">Tree View</option>
            </select>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between">
          <p class="text-sm text-gray-600">
            Showing {filteredRoutes.length} of {routeData.data.configRoutes.length} routes
          </p>

          <button
            onclick={() => showAnalytics = !showAnalytics}
            class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {showAnalytics ? 'Hide' : 'Show'} Analytics
          </button>
        </div>
      </div>

      <!-- Analytics Panel -->
      {#if showAnalytics && routeData.analytics}
        <div class="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <h2 class="text-xl font-semibold text-gray-900 mb-6">📊 Route Analytics</h2>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Status Breakdown -->
            <div>
              <h3 class="font-medium text-gray-900 mb-3">Status Distribution</h3>
              <div class="space-y-2">
                {#each Object.entries(routeData.analytics.statusBreakdown) as [status, count]}
                  <div class="flex items-center justify-between">
                    <span class="capitalize text-sm text-gray-600">{status}</span>
                    <span class="font-medium">{count}</span>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Category Breakdown -->
            <div>
              <h3 class="font-medium text-gray-900 mb-3">Category Distribution</h3>
              <div class="space-y-2">
                {#each Object.entries(routeData.analytics.categoryBreakdown) as [category, count]}
                  <div class="flex items-center justify-between">
                    <span class="capitalize text-sm text-gray-600">{category}</span>
                    <span class="font-medium">{count}</span>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Complexity Metrics -->
            <div>
              <h3 class="font-medium text-gray-900 mb-3">Complexity</h3>
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Dynamic Routes</span>
                  <span class="font-medium">{routeData.analytics.complexityMetrics.dynamicRoutes}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">API Routes</span>
                  <span class="font-medium">{routeData.analytics.complexityMetrics.apiRoutes}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Max Nesting</span>
                  <span class="font-medium">{routeData.analytics.complexityMetrics.deepestNesting}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Recommendations -->
          {#if routeData.analytics.recommendations.length > 0}
            <div class="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 class="font-medium text-blue-900 mb-2">💡 Recommendations</h4>
              <ul class="space-y-1">
                {#each routeData.analytics.recommendations as rec}
                  <li class="text-sm text-blue-800">• {rec}</li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Routes Display -->
      <div class="bg-white rounded-xl shadow-sm border">
        <div class="p-6 border-b">
          <h2 class="text-xl font-semibold text-gray-900">Routes</h2>
        </div>

        <div class="p-6">
          {#if viewMode === 'grid'}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {#each filteredRoutes as route}
                <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div class="flex items-start justify-between mb-2">
                    <h3 class="font-medium text-gray-900 truncate">{route.label}</h3>
                    <span class="px-2 py-1 text-xs rounded border {getStatusColor(route.status)}">
                      {route.status}
                    </span>
                  </div>

                  <p class="text-sm text-gray-600 mb-2 font-mono">{route.route}</p>

                  <div class="flex items-center justify-between">
                    <span class="px-2 py-1 text-xs rounded border {getCategoryColor(route.category)}">
                      {route.category}
                    </span>

                    {#if route.tags?.length > 0}
                      <div class="flex gap-1">
                        {#each route.tags.slice(0, 2) as tag}
                          <span class="px-1 py-0.5 text-xs bg-gray-100 rounded">{tag}</span>
                        {/each}
                        {#if route.tags.length > 2}
                          <span class="text-xs text-gray-500">+{route.tags.length - 2}</span>
                        {/if}
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {:else if viewMode === 'table'}
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b text-left">
                    <th class="py-2 font-medium">Label</th>
                    <th class="py-2 font-medium">Route</th>
                    <th class="py-2 font-medium">Category</th>
                    <th class="py-2 font-medium">Status</th>
                    <th class="py-2 font-medium">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {#each filteredRoutes as route}
                    <tr class="border-b hover:bg-gray-50">
                      <td class="py-3">{route.label}</td>
                      <td class="py-3 font-mono text-sm">{route.route}</td>
                      <td class="py-3">
                        <span class="px-2 py-1 text-xs rounded border {getCategoryColor(route.category)}">
                          {route.category}
                        </span>
                      </td>
                      <td class="py-3">
                        <span class="px-2 py-1 text-xs rounded border {getStatusColor(route.status)}">
                          {route.status}
                        </span>
                      </td>
                      <td class="py-3">
                        {#if route.tags?.length > 0}
                          <div class="flex gap-1 flex-wrap">
                            {#each route.tags.slice(0, 3) as tag}
                              <span class="px-1 py-0.5 text-xs bg-gray-100 rounded">{tag}</span>
                            {/each}
                            {#if route.tags.length > 3}
                              <span class="text-xs text-gray-500">+{route.tags.length - 3}</span>
                            {/if}
                          </div>
                        {/if}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <!-- Tree view would be implemented here -->
            <div class="text-center py-8 text-gray-500">
              Tree view coming soon...
            </div>
          {/if}

          {#if filteredRoutes.length === 0}
            <div class="text-center py-8">
              <div class="text-4xl mb-4">🔍</div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">No routes found</h3>
              <p class="text-gray-600">Try adjusting your filters or search terms.</p>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>
