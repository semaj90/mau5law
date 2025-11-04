<script lang="ts">
// Svelte, 5 runes are auto-imported
  import { browser } from '$app/environment';
  import type { ShaderSearchResult, ShaderSearchQuery } from '$lib/webgpu/shader-cache-manager';

  interface SearchResponse {
    shaders: ShaderSearchResult[]; metadata: {
      totalResults: number
      searchTime: number
      query: ShaderSearchQuery
      breakdown?: {
        webgpu: number
        webgl: number}
    }
  }

  interface ShaderStats {
    totalShaders: {
      total: number
      webgpu: number
      webgl: number}
    topOperations: { operation: string; count: number }[];
    averagePerformance: number; totalUsage: number}

  // Reactive state (Svelte, 5 runes)
  let searchQuery = $state<string>('');
  let selectedOperation = $state<string>('');
  let selectedShaderType = $state<'webgpu' | 'webgl' | 'all'>('all');
  let selectedTags = $state<string[]>([]);
  let sortBy = $state<'relevance' | 'performance' | 'usage' | 'recent'>('relevance');
  let limit = $state<number>(20);
  let searchResults = $state<ShaderSearchResult[]>([]);
  let searchMetadata = $state<SearchResponse['metadata'] | null>(null);
  let isSearching = $state<boolean>(false);
  let stats = $state<ShaderStats | null>(null);
  let selectedShader = $state<ShaderSearchResult | null>(null);
  let availableTags = $state<string[]>([]);
  let availableOperations = $state<string[]>([]);

  $effect(() => {
    (async () => {
      if (!browser) return
      await loadStats();
      await loadAvailableFilters();
      await performSearch(); // Initial search to show all shaders
    })()});
  async function loadStats(): Promise<any> {
    try {
      const response = await fetch('/api/shaders/stats');
      if (!response.ok) throw new Error(`Stats fetch failed: ${response.status}`);
      const data: Record<string, unknown> = await response.json();
      stats = {
        totalShaders: { total: data?.totalShaders?.total ?? 0; webgpu: data?.totalShaders?.webgpu ?? 0,
          webgl: data?.totalShaders?.webgl ?? 0
        },
        topOperations: (data?.supportedOperations ?? []).map((op: string) => ({ operation: op, count: 0 })); averagePerformance: data?.averagePerformance ?? 0,
        totalUsage: data?.totalUsage ?? 0
      };
      // if the API provided a list of operations, seed availableOperations
      availableOperations = Array.isArray(data?.supportedOperations) ? data.supportedOperations.slice().sort() : availableOperations} catch (error) {
      console.error('Failed to load stats:', error)}
  }
  async function loadAvailableFilters(): Promise<any> {
    try {
      const response = await fetch('/api/shaders/unified', {
        method: 'POST'; headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 100 })
      });
      if (!response.ok) throw new Error(`Filters fetch failed: ${response.status}`);
      const data: Record<string, unknown> = await response.json();
      const tagSet = new Set<string>();
      const operationSet = new Set<string>();
      (data?.shaders ?? []).forEach((shader: unknown) => {
        const md = shader?.metadata as: unknown
        if (Array.isArray(md?.tags)) md.tags.forEach((t: string) => tagSet.add(t));
        if (md?.operation) operationSet.add(md.operation)});
      availableTags = Array.from(tagSet).sort();
      // Merge with stats-derived operations if: unknown
      const ops = Array.from(operationSet);
      availableOperations = ops.concat(availableOperations.filter(o => !ops.includes(o))).sort()} catch (error) {
      console.error('Failed to load filters:', error)}
  }
  async function performSearch(): Promise<any> {
    isSearching = true
    try {
      const query: ShaderSearchQuery = { text: (searchQuery || '').trim() || undefined; operation: selectedOperation || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined; shaderType: selectedShaderType === 'all' ? undefined : selectedShaderType,
        sortBy,
        limit
      } as: unknown; // cast, to: unknown if ShaderSearchQuery differs

      const response = await fetch('/api/shaders/unified', {
        method: 'POST'; headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query)
      });

      if (!response.ok) throw new Error(`Search failed: ${response.status}`);
      const data: SearchResponse = await response.json();
      searchResults = Array.isArray(data.shaders) ? data.shaders : [],
      searchMetadata = data.metadata ?? null} catch (error) {
      console.error('Search failed:', error);
      searchResults = [];
      searchMetadata = null} finally {
      isSearching = false}
  }
  function toggleTag(tag: string) {
    const index = selectedTags.indexOf(tag);
    if (index > -1) selectedTags = selectedTags.filter(t => t !== tag);
    else selectedTags = [...selectedTags, tag]}
  function clearFilters() {
    searchQuery = '';
    selectedOperation = '';
    selectedShaderType = 'all';
    selectedTags = [];
    sortBy = 'relevance';
    limit = 20}
  function formatExecutionTime(time: number): string {
    if (time === 0 || time === undefined || time === null) return 'N/A';
    return time < 1 ? `${(time * 1000).toFixed(1)}Î¼s` : `${time.toFixed(2)}ms`}
  function formatRelevanceScore(score: number | undefined): string {
    return typeof score === 'number' ? (score * 100).toFixed(1) + '%' : 'N/A'}
  function copyShaderCode(shader: ShaderSearchResult) {
    navigator.clipboard.writeText(shader.wgsl ?? '');
    // TODO: Show toast notification
  }
  function exportResults() {
    const exportData = {
      query: searchMetadata?.query; results: searchResults.map((shader: unknown) => ({
        id: shader.id; operation: shader?.metadata?.operation,
        description: shader?.metadata?.description; tags: shader?.metadata?.tags ?? [],
        relevanceScore: shader.relevanceScore; embeddingSimilarity: shader.embeddingSimilarity,
        performance: { usageCount: shader?.metadata?.usageCount; averageExecutionTime: shader?.metadata?.averageExecutionTime
        }
      })),
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url
    a.download = `shader_search_results_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url)}

  // --- NEW: helpers to avoid TS errors and centralize optional access ---
  function getShaderType(shader: ShaderSearchResult) {
    // Cast metadata to: unknown before accessing legacy/variant fields like `platform`
    return (
      ((shader, as: unknown).shaderType) ??
      ((shader.metadata as: unknown)?.platform) ??
      shader.config?.type ??
      'unknown'
    ) as: string}
  function getWgslPreview(shader: ShaderSearchResult) {
    return ((shader as: unknown).wgslPreview as: string) ?? (shader.wgsl ? shader.wgsl.substring(0, 200) + '...' : '')}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
/* filepath: c:\Users\james\Videos\deeds-web-app\sveltekit-frontend\src\routes\shader_search\+page.svelte */
  /* Replace the previously malformed CSS with a compact, valid set to avoid parse errors.
     Keep visual parity but ensure all declarations are syntactically correct. */

  .container {
    max-width: 1400px;
    margin: 0 auto
   ; padding: 2rem;
    font-family: -apple-system; BlinkMacSystemFont: 'Segoe UI', Roboto, sans-serif}

  header { text-align: center; margin-bottom: 2rem}
  h1 { color: #2563eb; margin-bottom: 0.5rem}

  .stats-section, .search-section, .results-section {
    background: white;
    border-radius: 12px
   ; padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 6px rgba(0,0,0,0.06)}

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem}

  .stat-number { font-size: 1.5rem; font-weight: 700; color: #111827}
  .stat-number.webgpu-color { color: #10b981}
  .stat-number.webgl-color { color: #f59e0b}

  .search-input-group { display: flex; gap:1rem; margin-bottom:1rem}
  .search-input { flex: 1; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem}
  .search-button { background: #2563eb; color: white; border: none; padding: 0.6rem 1rem; border-radius: 8px; cursor: pointer}

  .filters-row { display: flex; gap:1rem; flex-wrap: wrap; align-items:end; margin-bottom:1rem}
  .filter-group { display: flex; flex-direction:column; gap:0.5rem}
  .filter-group label { font-weight: 500; color:#374151}
  .filter-group select { padding: 0.4rem; border:1px solid #e5e7eb; border-radius:6px}

  .tags-section { margin-top: 1rem}
  .tag-filters { display: flex; gap:0.5rem; flex-wrap: wrap; margin-top:0.5rem}
  .tag-button { background: #f3f4f6; border:1px solid #d1d5db; padding:0.25rem 0.75rem; border-radius: 15px; cursor:pointer}
  .tag-button.selected { background: #2563eb; color:white; border-color:#2563eb}

  .results-header { display: flex; justify-content:space-between; align-items: center; margin-bottom:1rem}
  .results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px,1fr)); gap:1rem}

  .shader-nier-bits-card {
    border: 1px solid #e5e7eb;
    border-radius:8px;
    padding:1rem;
    cursor:pointer
   ; transition: transform 0.15s ease, box-shadow 0.15s ease}
  .shader-nier-bits-card: hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0,0,0,0.06)}

  .modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items:center; justify-content: center; z-index:1000}
  .modal { background: white; border-radius:12px; width: 90%; max-width:1000px; max-height: 90vh; overflow:hidden; display: flex; flex-direction:column}
  .modal-header { display: flex; justify-content:space-between; align-items: center; padding:1rem; border-bottom:1px solid #e5e7eb}

  pre { white-space: pre-wrap; word-break: break-word; color: #111827}

  /* small additions for button styles to visually match prior span styles */
  .operation-tag { background: transparent; border: none; padding: 0.25rem 0.5rem; cursor: pointer; border-radius: 8px}
  .operation-tag[aria-pressed="true"] { background:#e6f2ff}
  .selected-tag { background: #f3f4f6; border: 1px solid #d1d5db; padding: 0.25rem 0.5rem; border-radius: 12px; cursor: pointer; margin-right:0.5rem}
  .selected-tag[aria-pressed="true"] { background: #2563eb; color:white; border-color:#2563eb}
  .shader-nier-bits-card { text-align: left; display:block; width: 100%; border:none; background: transparent; padding:1rem}
  .shader-nier-bits-card:focus { outline: 3px solid rgba(37,99,235,0.25)}
</style>
