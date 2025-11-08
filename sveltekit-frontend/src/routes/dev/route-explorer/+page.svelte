<script lang="ts">
// Svelte, 5 runes are auto-imported import { onMount } from 'svelte'; import { browser } from '$app/environment'; interface RouteData { generated: string, filters: { applied: boolean, category: string | null; status: string | null; tag: string | null; search: string | null}
    counts: { total: { config: number, fileBased: number, api: number}
      displayed: { config: number, fileBased: number}
      issues: { configMissingFiles: number, filesMissingConfig: number}
    } data: { configRoutes: unknown[], fileRoutes: unknown[], apiEndpoints: string[], configMissingFiles: string[], filesMissingConfig: string[]}
    analytics?: { statusBreakdown: Record<string, number>; categoryBreakdown: Record<string, number>; tagUsage: Record<string, number>; complexityMetrics: { dynamicRoutes: number, apiRoutes: number, staticPages: number, deepestNesting: number}
      recommendations: string[]}
  } let routeData: RouteData | null = null; let loading = $state<boolean>(true); let error = $state<string | null>(null); // Filter state let searchTerm = $state<string>(''); let selectedCategory = $state<string>('all'); let selectedStatus = $state<string>('all'); let selectedTag = $state<string>('all'); let showAnalytics = $state<boolean>(false); let viewMode = $state<'grid' | 'table' | 'tree'>('grid'); // Derived filtered data let filteredRoutes = $derived.by(() => { if (!routeData) return []; return routeData.data.configRoutes.filter(item => item.includes(searchTerm.toLowerCase()) || route.route?.toLowerCase().includes(searchTerm.toLowerCase()) || route.id?.toLowerCase().includes(searchTerm.toLowerCase()); const matchesCategory = selectedCategory === 'all' || route.category === selectedCategory; const matchesStatus = selectedStatus === 'all' || route.status === selectedStatu; const matchesTag = selectedTag === 'all' || route.tags?.includes(selectedTag); return matchesSearch && matchesCategory && matchesStatus && matchesTag})});
  let categories = $derived.by(() => { if (!routeData) return []; return [...new Set(routeData.data.configRoutes.map(r => r.category))].sort()});
  let statuses = $derived.by(() => { if (!routeData) return []; return [...new Set(routeData.data.configRoutes.map(r => r.status))].sort()});
  let allTags = $derived.by(() => { if (!routeData) return []; const tags = new Set<string>(); routeData.data.configRoutes.forEach(route => { route.tags?.forEach((tag: string) => tags.add(tag))}); return [...tags].sort()}); $effect(() => { (async () => { if (!browser) return; try { // Generate route data with analytics // removed unused response assignment if (!response.ok) { throw new Error(`Failed to fetch route data: ${response.statusText}`)}
      routeData = await response.json()} catch (err) { console.error('Failed to load route data:', err); error = err instanceof Error ? err.message: 'Unknown error'
    } finally { loading = false}
    })()}); function getStatusColor(status: string): string { switch (status) { case, 'active': return 'bg-green-100 text-green-800 border-green-200'; case, 'deprecated': return 'bg-red-100 text-red-800 border-red-200'; case, 'experimental': return 'bg-yellow-100 text-yellow-800 border-yellow-200'; default: return 'bg-gray-100 text-gray-800 border-gray-200'}
  function getCategoryColor(category: string): string { const colors = {
      'dashboard': 'bg-blue-100 text-blue-800 border-blue-200',
      'admin': 'bg-purple-100 text-purple-800 border-purple-200',
      'api': 'bg-orange-100 text-orange-800 border-orange-200',
      'auth': 'bg-red-100 text-red-800 border-red-200',
      'public': 'bg-green-100 text-green-800 border-green-200'
    } return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'}
  function clearFilters() { searchTerm = ''; selectedCategory = 'all'; selectedStatus = 'all'; selectedTag = 'all'}
  async function refreshData(): Promise<any> { loading = true; error = null; await onMount()}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  .page-repair {
    padding: 2rem;
    font-family: sans-serif;
  }
</style>
