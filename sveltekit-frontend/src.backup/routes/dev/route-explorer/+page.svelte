<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  import type { browser  } from '$app/environment';

  interface Route {
    route: string;
    id?: string;
    category: string;
    status: string;
    tags?: string[];
  }

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
      total: { config: number; fileBased: number; api: number };
      displayed: { config: number; fileBased: number };
      issues: { configMissingFiles: number; filesMissingConfig: number };
    };
    data: {
      configRoutes: Route[];
      fileRoutes: unknown[];
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

  let routeData = $state <RouteData | null>(null);
  let loading = $state <boolean>(true);
  let error = $state <string | null>(null);

  // Filter state
  let searchTerm = $state <string>('');
  let selectedCategory = $state <string>('all');
  let selectedStatus = $state <string>('all');
  let selectedTag = $state <string>('all');
  let showAnalytics = $state <boolean>(false);
  let viewMode = $state <'grid' | 'table' | 'tree'>('grid');

  // Derived filtered data
  let filteredRoutes = $derived.by(() => {
    if (!routeData) return [];
    return routeData.data.configRoutes.filter((route: Route) => {
      const matchesSearch = route.route?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            route.id?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || route.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || route.status === selectedStatus;
      const matchesTag = selectedTag === 'all' || route.tags?.includes(selectedTag);
      return matchesSearch && matchesCategory && matchesStatus && matchesTag;
    });
  });

  let categories = $derived.by(() => {
    if (!routeData) return [];
    return [...new Set(routeData.data.configRoutes.map((r: any) => r.category))].sort();
  });

  let statuses = $derived.by(() => {
    if (!routeData) return [];
    return [...new Set(routeData.data.configRoutes.map((r: any) => r.status))].sort();
  });

  let allTags = $derived.by(() => {
    if (!routeData) return [];
    const tags = new Set<string>();
    routeData.data.configRoutes.forEach((route: any) => {
      route.tags?.forEach((tag: string) => tags.add(tag));
    });
    return [...tags].sort();
  });

  $effect(() => {() => {
    (async () => {
      if (!browser) return;
      try {
        loading = true;
        const response = await fetch('/api/routes'); // Added missing fetch
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
    })();
  });

  function getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'deprecated':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'experimental':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  function getCategoryColor(category: string): string {
    const colors = {
      dashboard: 'bg-blue-100 text-blue-800 border-blue-200',
      admin: 'bg-purple-100 text-purple-800 border-purple-200',
      api: 'bg-orange-100 text-orange-800 border-orange-200',
      auth: 'bg-red-100 text-red-800 border-red-200',
      public: 'bg-green-100 text-green-800 border-green-200',
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
    // Trigger effect by re-running the fetch
    if (browser) {
      const response = await fetch('/api/routes');
      if (response.ok) {
        routeData = await response.json();
      } else {
        error = 'Failed to refresh data';
      }
      loading = false;
    }
  }
</script>

<main class="route-explorer">
  <h1>Route Explorer</h1>

  {#if loading}
    <p>Loading route data...</p>
  {:else if error}
    <p class="error">Error: {error}</p>
  {:else if routeData}
    <div class="filters">
      <input bind:value={searchTerm} placeholder="Search routes..." />
      <select bind:value={selectedCategory}>
        <option value="all">All Categories</option>
        {#each categories as cat}
          <option value={cat}>{cat}</option>
        {/each}
      </select>
      <select bind:value={selectedStatus}>
        <option value="all">All Statuses</option>
        {#each statuses as stat}
          <option value={stat}>{stat}</option>
        {/each}
      </select>
      <select bind:value={selectedTag}>
        <option value="all">All Tags</option>
        {#each allTags as tag}
          <option value={tag}>{tag}</option>
        {/each}
      </select>
      <button onclick={clearFilters}>Clear Filters</button>
      <button onclick={refreshData}>Refresh</button>
    </div>

    <div class="view-toggle">
      <button onclick={() => viewMode = 'grid'}>Grid</button>
      <button onclick={() => viewMode = 'table'}>Table</button>
      <button onclick={() => viewMode = 'tree'}>Tree</button>
      <button onclick={() => showAnalytics = !showAnalytics}>Analytics</button>
    </div>

    {#if showAnalytics && routeData.analytics}
      <div class="analytics">
        <h2>Analytics</h2>
        <p>Status Breakdown: {JSON.stringify(routeData.analytics.statusBreakdown)}</p>
        <!-- Add more analytics display as needed -->
      </div>
    {/if}

    <div class="routes {viewMode}">
      {#each filteredRoutes as route}
        <div class="route-card">
          <h3>{route.route}</h3>
          <p>Status: <span class={getStatusColor(route.status)}>{route.status}</span></p>
          <p>Category: <span class={getCategoryColor(route.category)}>{route.category}</span></p>
        </div>
      {/each}
    </div>
  {/if}
</main>

<style>
  .route-explorer {
    padding: 2rem;
    font-family: sans-serif;
  }

  .filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .view-toggle {
    margin-bottom: 1rem;
  }

  .routes.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }

  .route-card {
    border: 1px solid #ccc;
    padding: 1rem;
  }

  .error {
    color: red;
  }
</style>
