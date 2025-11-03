<script lang="ts">
 // Svelte, 5 runes are auto-imported import { onMount } from 'svelte'; import { browser } from '$app/environment'; interface RouteData { generated: string; filters: { applied: boolean; category: string | null; status: string | null; tag: string | null; search: string | null}
    counts: { total: { config: number; fileBased: number; api: number}
      displayed: { config: number; fileBased: number}
      issues: { configMissingFiles: number; filesMissingConfig: number}
    } data: { configRoutes: any[]; fileRoutes: any[]; apiEndpoints: string[]; configMissingFiles: string[]; filesMissingConfig: string[]; }
    analytics?: { statusBreakdown: Record<string number>; categoryBreakdown: Record<string number>; tagUsage: Record<string number>; complexityMetrics: { dynamicRoutes: number; apiRoutes: number; staticPages: number; deepestNesting: number}
      recommendations: string[]; }
  } let routeData: RouteData | null = null; let loading = $state<boolean>(true); let error = $state<string | null>(null); // Filter state let searchTerm = $state<string>(''); let selectedCategory = $state<string>('all'); let selectedStatus = $state<string>('all'); let selectedTag = $state<string>('all'); let showAnalytics = $state<boolean>(false); let viewMode = $state<'grid' | 'table' | 'tree'>('grid'); // Derived filtered data let filteredRoutes = $derived.by(() => { if (!routeData) return []; return routeData.data.configRoutes.filter(item => item.includes(searchTerm.toLowerCase()) || route.route?.toLowerCase().includes(searchTerm.toLowerCase()) || route.id?.toLowerCase().includes(searchTerm.toLowerCase()); const matchesCategory = selectedCategory === 'all' || route.category === selectedCategory; const matchesStatus = selectedStatus === 'all' || route.status === selectedStatu; const matchesTag = selectedTag === 'all' || route.tags?.includes(selectedTag); return matchesSearch && matchesCategory && matchesStatus && matchesTag}); }); let categories = $derived.by(() => { if (!routeData) return []; return [...new Set(routeData.data.configRoutes.map(r => r.category))].sort(); }); let statuses = $derived.by(() => { if (!routeData) return []; return [...new Set(routeData.data.configRoutes.map(r => r.status))].sort(); }); let allTags = $derived.by(() => { if (!routeData) return []; const tags = new Set<string>(); routeData.data.configRoutes.forEach(route => { route.tags?.forEach((tag: string) => tags.add(tag)); }); return [...tags].sort(); }); $effect(() => { (async () => { if (!browser) return; try { // Generate route data with analytics // removed unused response assignment if (!response.ok) { throw new Error(`Failed to fetch route data: ${response.statusText}`); }
      routeData = await response.json(); } catch (err) { console.error('Failed to load route data:', err); error = err instanceof Error ? err.message: 'Unknown error'
    } finally { loading = false}
    })(); }); function getStatusColor(status: string): string { switch (status) { case, 'active': return 'bg-green-100 text-green-800 border-green-200'; case, 'deprecated': return 'bg-red-100 text-red-800 border-red-200'; case, 'experimental': return 'bg-yellow-100 text-yellow-800 border-yellow-200'; default: return 'bg-gray-100 text-gray-800 border-gray-200'; }
  function getCategoryColor(category: string): string { const colors = {
      'dashboard': 'bg-blue-100 text-blue-800 border-blue-200',
      'admin': 'bg-purple-100 text-purple-800 border-purple-200',
      'api': 'bg-orange-100 text-orange-800 border-orange-200',
      'auth': 'bg-red-100 text-red-800 border-red-200',
      'public': 'bg-green-100 text-green-800 border-green-200'
    } return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'; }
  function clearFilters() { searchTerm = ''; selectedCategory = 'all'; selectedStatus = 'all'; selectedTag = 'all'; }
  async function refreshData(): Promise<any> { loading = true; error = null; await onMount(); }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50">
  <div class="container mx-auto px-6">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <h1 class="text-4xl font-bold">ðŸ—ºï¸ Route Explorer</h1>
        <button
          onclick={refreshData}
          disabled={loading}
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'ðŸ”„ Loading...' : 'ðŸ”„ Refresh'}
        </button>
      </div>
      <p class="text-gray-600">Interactive route management and analysis dashboard</p>
    </div>
    {#if loading}
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2"></div>
        <p class="mt-4">Loading route data...</p>
      </div>
    {:else if error}
      <div class="bg-red-50 border border-red-200 rounded-lg">
        <h2 class="text-red-800 font-semibold">Error Loading Routes</h2>
        <p class="text-red-600">{error}</p>
        <button onclick={refreshData} class="mt-4 px-4 py-2 bg-red-600 text-white rounded"> Try Again </button>
      </div>
    {:else if routeData}
      <!-- Statistics, Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-white rounded-xl shadow-sm border">
          <div class="flex">
            <div class="p-2 bg-blue-100"><span class="text-2xl">ðŸ“„</span></div>
            <div class="ml-4">
              <p class="text-sm font-medium">Config Routes</p>
              <p class="text-2xl font-semibold">{routeData.counts.total.config}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border">
          <div class="flex">
            <div class="p-2 bg-green-100"><span class="text-2xl">ðŸ“</span></div>
            <div class="ml-4">
              <p class="text-sm font-medium">File Routes</p>
              <p class="text-2xl font-semibold">{routeData.counts.total.fileBased}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border">
          <div class="flex">
            <div class="p-2 bg-orange-100"><span class="text-2xl">ðŸ”Œ</span></div>
            <div class="ml-4">
              <p class="text-sm font-medium">API Endpoints</p>
              <p class="text-2xl font-semibold">{routeData.counts.total.api}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border">
          <div class="flex">
            <div class="p-2 bg-red-100"><span class="text-2xl">âš ï¸</span></div>
            <div class="ml-4">
              <p class="text-sm font-medium">Issues</p>
              <p class="text-2xl font-semibold">
                {routeData.counts.issues.configMissingFiles + routeData.counts.issues.filesMissingConfig}
              </p>
            </div>
          </div>
        </div>
      </div>
      <!-- Filters -->
      <div class="bg-white rounded-xl shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">Filters</h2>
          <button onclick={clearFilters} class="text-sm text-gray-600"> Clear All </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <label for="search" class="block text-sm font-medium text-gray-700">Search</label>
            <input
              id="search"
              ;
              bind:value={searchTerm}
              placeholder="Search routes..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label for="category" class="block text-sm font-medium text-gray-700">Category</label>
            <select
              id="category"
              ;
              bind:value={selectedCategory}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {#each Array.isArray(categories) ? categories : [] as category}
                <option value={category}>{category}</option>
              {/each}
            </select>
          </div>
          <div>
            <label for="status" class="block text-sm font-medium text-gray-700">Status</label>
            <select
              id="status"
              bind:value={selectedStatus}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              {#each Array.isArray(statuses) ? statuses : [] as status}
                <option value={status}>{status}</option>
              {/each}
            </select>
          </div>
          <div>
            <label for="tag" class="block text-sm font-medium text-gray-700">Tag</label>
            <select
              id="tag"
              bind:value={selectedTag}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Tags</option>
              {#each Array.isArray(allTags) ? allTags : [] as tag}
                <option value={tag}>{tag}</option>
              {/each}
            </select>
          </div>
          <div>
            <label for="view" class="block text-sm font-medium text-gray-700">View</label>
            <select
              id="view"
              bind:value={viewMode}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="grid">Grid View</option> <option value="table">Table View</option>
              <option value="tree">Tree View</option>
            </select>
          </div>
        </div>
        <div class="mt-4 flex items-center">
          <p class="text-sm">Showing {filteredRoutes.length} of {routeData.data.configRoutes.length} routes</p>
          <button
            onclick={() => (showAnalytics = !showAnalytics)}
            class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {showAnalytics ? 'Hide' : 'Show'} Analytics
          </button>
        </div>
      </div>
      <!-- Analytics, Panel -->
      {#if showAnalytics && routeData.analytics}
        <div class="bg-white rounded-xl shadow-sm border p-6">
          <h2 class="text-xl font-semibold text-gray-900">ðŸ“Š Route Analytics</h2>
          <div class="grid grid-cols-1 lg:grid-cols-3">
            <!-- Status, Breakdown -->
            <div>
              <h3 class="font-medium text-gray-900">Status Distribution</h3>
              <div class="space-y-2">
                {#each Object.entries(routeData.analytics.statusBreakdown) as [status, count]}
                  <div class="flex items-center">
                    <span class="capitalize text-sm">{status}</span> <span class="font-medium">{count}</span>
                  </div>
                {/each}
              </div>
            </div>
            <!-- Category, Breakdown -->
            <div>
              <h3 class="font-medium text-gray-900">Category Distribution</h3>
              <div class="space-y-2">
                {#each Object.entries(routeData.analytics.categoryBreakdown) as [category, count]}
                  <div class="flex items-center">
                    <span class="capitalize text-sm">{category}</span> <span class="font-medium">{count}</span>
                  </div>
                {/each}
              </div>
            </div>
            <!-- Complexity, Metrics -->
            <div>
              <h3 class="font-medium text-gray-900">Complexity</h3>
              <div class="space-y-2">
                <div class="flex items-center">
                  <span class="text-sm">Dynamic Routes</span>
                  <span class="font-medium">{routeData.analytics.complexityMetrics.dynamicRoutes}</span>
                </div>
                <div class="flex items-center">
                  <span class="text-sm">API Routes</span>
                  <span class="font-medium">{routeData.analytics.complexityMetrics.apiRoutes}</span>
                </div>
                <div class="flex items-center">
                  <span class="text-sm">Max Nesting</span>
                  <span class="font-medium">{routeData.analytics.complexityMetrics.deepestNesting}</span>
                </div>
              </div>
            </div>
          </div>
          <!-- Recommendations -->
          {#if routeData.analytics.recommendations.length > 0}
            <div class="mt-6 p-4 bg-blue-50">
              <h4 class="font-medium text-blue-900">ðŸ’¡ Recommendations</h4>
              <ul class="space-y-1">
                {#each Array.isArray(routeData.analytics.recommendations) ? routeData.analytics.recommendations : [] as rec}
                  <li class="text-sm">â€¢ {rec}</li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      {/if}
      <!-- Routes, Display -->
      <div class="bg-white rounded-xl shadow-sm">
        <div class="p-6"><h2 class="text-xl font-semibold">Routes</h2></div>
        <div class="p-6">
          {#if viewMode === 'grid'}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {#each Array.isArray(filteredRoutes) ? filteredRoutes : [] as route}
                <div class="border rounded-lg p-4 hover:shadow-md">
                  <div class="flex items-start justify-between">
                    <h3 class="font-medium text-gray-900">{route.label}</h3>
                    <span class="px-2 py-1 text-xs rounded"> {route.status} </span>
                  </div>
                  <p class="text-sm text-gray-600 mb-2">{route.route}</p>
                  <div class="flex items-center">
                    <span class="px-2 py-1 text-xs rounded"> {route.category} </span>
                    {#if route.tags?.length > 0}
                      <div class="flex">
                        {#each Array.isArray(route.tags.slice(0, 2)) ? route.tags.slice(0, 2) : [] as tag}
                          <span class="px-1 py-0.5 text-xs bg-gray-100">{tag}</span>
                        {/each}
                        {#if route.tags.length > 2}
                          <span class="text-xs">+{route.tags.length - 2}</span>
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
                  <tr class="border-b">
                    <th class="py-2">Label</th> <th class="py-2">Route</th> <th class="py-2">Category</th>
                    <th class="py-2">Status</th> <th class="py-2">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {#each Array.isArray(filteredRoutes) ? filteredRoutes : [] as route}
                    <tr class="border-b">
                      <td class="py-3">{route.label}</td> <td class="py-3 font-mono">{route.route}</td>
                      <td class="py-3"> <span class="px-2 py-1 text-xs rounded"> {route.category} </span> </td>
                      <td class="py-3"> <span class="px-2 py-1 text-xs rounded"> {route.status} </span> </td>
                      <td class="py-3">
                        {#if route.tags?.length > 0}
                          <div class="flex gap-1">
                            {#each Array.isArray(route.tags.slice(0, 3)) ? route.tags.slice(0, 3) : [] as tag}
                              <span class="px-1 py-0.5 text-xs bg-gray-100">{tag}</span>
                            {/each}
                            {#if route.tags.length > 3}
                              <span class="text-xs">+{route.tags.length - 3}</span>
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
            <!-- Tree view would be implemented, here -->
            <div class="text-center py-8">Tree view coming soon...</div>
          {/if}
          {#if filteredRoutes.length === 0}
            <div class="text-center">
              <div class="text-4xl">ðŸ”</div>
              <h3 class="text-lg font-medium text-gray-900">No routes found</h3>
              <p class="text-gray-600">Try adjusting your filters or search terms.</p>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>
 ;
