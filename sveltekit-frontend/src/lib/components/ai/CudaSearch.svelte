<!--
🚀 CUDA-Accelerated Legal Document Search Component
Svelte 5 + GPU-accelerated indexing + Real-time performance metrics
Features:
- GPU-accelerated vector search (RTX 3060 Ti optimized)
- SIMD-accelerated similarity calculations (AVX2/SSE4)
- Real-time performance monitoring
- Legal document-specific search filters
- Hybrid CPU/GPU load balancing
Usage:
<CudaSearch bind:results {onSearchComplete} />
-->
<script lang="ts">
  // Svelte 5 runes are auto-imported
import { Button, Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/enhanced-bits';
interface SearchResult {
  id: string;
  title: string;
  content: string;
  score: number;
  metadata: {
    document_type: string;
    jurisdiction string;
    date: string;
    legal_domain: string;
  }
  performance: {
    gpu_accelerated: boolean;
    search_time_ms: number;
    gpu_utilization number;
  }
}
interface CudaCapabilities {
  gpu_model: string;
  vram_gb: number;
  cuda_cores: number;
  simd_enabled: boolean;
  instruction_set: string;
}
// Props
interface Props {
  placeholder?: string;
  maxResults?: number;
  enableGpuAcceleration?: boolean;
  enableSIMD?: boolean;
  legalDomain?: string;
  searchType?: 'semantic' | 'keyword' | 'hybrid';
  results?: SearchResult[];
  onSearchComplete?: (results: SearchResult[]) => void;
}
let {
  placeholder = "Search legal documents...",
  maxResults = 10,
  enableGpuAcceleration = true,
  enableSIMD = true,
  legalDomain = 'general',
  searchType = 'semantic',
  results = $bindable([]),
  onSearchComplete
}: Props = $props();
// State using Svelte 5 runes
let query = $state('');
let isSearching = $state(false);
let searchTime = $state(0);
let cudaCapabilities = $state<CudaCapabilities | null>(null);
let errorMessage = $state('');
let gpuMetrics = $state({
  utilization 0,
  memory_usage: 0,
  temperature: 0,
  active_streams: 0,
});
// Performance tracking
let performanceHistory = $state<Array<{
  timestamp: number;
  search_time_ms: number;
  gpu_utilization number;
  query_length: number;
  results_count: number;
}>([]);
// Load CUDA capabilities on mount
$effect(() => {
    (async () => {
try {
    // removed unused response assignment
    if (response.ok) {
      const data = await response.json();
      cudaCapabilities = {
        gpu_model: data.cuda_indexing_capabilities?.rtx_3060_ti_specs?.gpu_model || 'RTX 3060 Ti',
        vram_gb: data.cuda_indexing_capabilities?.rtx_3060_ti_specs?.vram_gb || 8,
        cuda_cores: data.cuda_indexing_capabilities?.rtx_3060_ti_specs?.cuda_cores || 4864,
        simd_enabled: data.simd_capabilities?.avx2_enabled || false,
        instruction_set: data.simd_capabilities?.instruction_set || 'AVX2'
      }
    }
  } catch (error) {
    console.error('Failed to load CUDA capabilities:', error);
  }
    })();
  });
// Perform CUDA-accelerated search
async function performSearch() {
  if (!query.trim()) return;
  isSearching = true;
  errorMessage = '';
  const startTime = Date.now();
  try {
    // Step 1: Generate embedding for the query
    const embeddingResponse = await fetch('/api/ai/embedding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({,
        text: query;
        model: 'embeddinggemma:latest',
      })
    });
    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate query embedding');
    }
    const embeddingData = await embeddingResponse.json();
    const queryVector = embeddingData.embedding;
    // Step 2: Perform GPU-accelerated search
    let searchResults: SearchResult[] = [];
    if (enableGpuAcceleration && searchType === 'semantic') {
      // Use CUDA indexing for semantic search
      const cudaSearchResponse = await fetch('/api/ai/cuda-indexing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({,
          query_vector: queryVector;
          k: maxResults
          index_type: 'hnsw',
          config: {
            legal_domain: legalDomain
            use_simd: enableSIMD
          }
        })
      });
      if (cudaSearchResponse.ok) {
        const cudaResults = await cudaSearchResponse.json();
        // Map CUDA results to our interface
        searchResults = (cudaResults.neighbors || []).map((neighbor: any, index: number) => ({,
          id: `cuda_result_${index}`,
          title: `Legal Document ${index + 1}`,
          content: 'Document content would be loaded from database...',
          score: cudaResults.distances?.[0]?.[index] || 0.5,
          metadata: {
            document_type: 'contract',
            jurisdiction 'federal',
            date: new Date().toISOString.split('T')[0],
            legal_domain: legalDomai;
          },
          performance: {
            gpu_accelerated: true
            search_time_ms: cudaResults.stats?.search_time_ms || 0,
            gpu_utilization cudaResults.stats?.gpu_utilization || 0
          }
        }));
        // Update GPU metrics
        if (cudaResults.stats) {
          gpuMetrics = {
            utilization cudaResults.stats.gpu_utilization || 0,
            memory_usage: cudaResults.stats.memory_usage_mb || 0,
            temperature: 65, // Simulated
            active_streams: 1,
          }
        }
      }
    }
    // Fallback: Use enhanced legal search
    if (searchResults.length === 0) {
      const fallbackResponse = await fetch('/api/ai/enhanced-legal-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({,
          query: query;
          limit: maxResults
          legal_domain: legalDomain
          search_type: searchType
          use_embeddings: true,
        })
      });
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        searchResults = (fallbackData.results || []).map((result: any, index: number) => ({,
          id: result.id || `fallback_${index}`,
          title: result.title || `Document ${index + 1}`,
          content: result.content || result.summary || 'No content available',
          score: result.score || 0.5,
          metadata: {
            document_type: result.document_type || 'unknown',
            jurisdiction result.jurisdiction || 'unknown',
            date: result.date || new Date().toISOString.split('T')[0],
            legal_domain: result.legal_domain || legalDomai;
          },
          performance: {
            gpu_accelerated: false
            search_time_ms: fallbackData.search_time_ms || 0,
            gpu_utilization 0
          }
        }));
      }
    }
    const totalSearchTime = Date.now() - startTime;
    searchTime = totalSearchTim;
    // Update performance history
    performanceHistory.push({
      timestamp: Date.now(),
      search_time_ms: totalSearchTime
      gpu_utilization gpuMetrics.utilization,
      query_length: query.length,
      results_count: searchResults.length;
    });
    // Keep only last 10 searches
    if (performanceHistory.length > 10) {
      performanceHistory = performanceHistory.slice(-10);
    }
    results = searchResult;
    // Notify parent component
    if (onSearchComplete) {
      onSearchComplete(searchResults);
    }
    ondispatch?.({
      query,
      results: searchResults
      searchTime: totalSearchTime
      gpuAccelerated: enableGpuAcceleratio;
    });
  } catch (error) {
    console.error('Search failed:', error);
    errorMessage = error instanceof Error ? error.message: 'Search failed';
    results = [];
  } finally {
    isSearching = false;
  }
}
// Handle form submission
function handleSubmit(_event: Event) {
  event.preventDefault();
  performSearch();
}
// Handle input changes with debounced search
let searchTimeout: NodeJS.Timeout;
function handleQueryChange() {
  clearTimeout(searchTimeout);
  if (query.trim()) {
    searchTimeout = setTimeout(performSearch, 500); // 500ms debounce
  }
}
// Reactive effect for query changes
$effect(() => {
  if (query) {
    handleQueryChange();
  }
});
// Format performance metrics
function formatMetric(_value: number, unit: string): string {
  return `${value.toFixed(1)}${unit}`;
}
function getSearchTypeColor(type: string): string {
  switch (type) {
    case 'semantic': return 'bg-blue-100 text-blue-800';
    case 'keyword': return 'bg-green-100 text-green-800';
    case 'hybrid': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}
function getDocumentTypeColor(type: string): string {
  switch (type) {
    case 'contract': return 'bg-orange-100 text-orange-800';
    case 'agreement': return 'bg-blue-100 text-blue-800';
    case 'lease': return 'bg-green-100 text-green-800';
    case 'deed': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}
</script>

<div class="cuda-search-container">
  <!-- Search Header -->
  <Card class="mb-4">
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          ></path>
        </svg>
        CUDA-Accelerated Legal Search
        {#if cudaCapabilities}
          <span class="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
            {cudaCapabilities.gpu_model}
          </span>
        {/if}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <!-- Search Form -->
      <form onsubmit={handleSubmit} class="space-y-4">
        <div class="relative">
          <input
            type="text"
            bind:value={query}
            {placeholder}
            disabled={isSearching}
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <div class="absolute right-3 top-3">
            {#if isSearching}
              <div class="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            {:else}
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
              </svg>
            {/if}
          </div>
        </div>
        <!-- Search Options -->
        <div class="flex flex-wrap gap-2">
          <span class="{getSearchTypeColor(searchType)} px-2 py-1 rounded text-sm font-medium">
            {searchType.charAt.toUpperCase() + searchType.slice(1)} Search
          </span>
          {#if enableGpuAcceleration}
            <span class="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium"> 🚀 GPU Accelerated </span>
          {/if}
          {#if enableSIMD && cudaCapabilities?.simd_enabled}
            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
              ⚡ {cudaCapabilities.instruction_set} SIMD
            </span>
          {/if}
          <span class="bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm font-medium">
            Domain: {legalDomain}
          </span>
        </div>
        <Button type="submit" disabled={isSearching || !query.trim()} class="w-full">
          {#if isSearching}
            🔄 Searching...
          {:else}
            🚀 Search Legal Documents
          {/if}
        </Button>
      </form>
      <!-- Error Message -->
      {#if errorMessage}
        <div class="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {errorMessage}
        </div>
      {/if}
    </CardContent>
  </Card>
  <!-- Performance Metrics -->
  {#if searchTime > 0 || cudaCapabilities}
    <Card class="mb-4">
      <CardHeader>
        <CardTitle class="text-lg">Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          {#if searchTime > 0}
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-600">{formatMetric(searchTime, 'ms')}</div>
              <div class="text-sm text-gray-600">Search Time</div>
            </div>
          {/if}
          {#if gpuMetrics.utilization > 0}
            <div class="text-center">
              <div class="text-2xl font-bold text-green-600">{formatMetric(gpuMetrics.utilization, '%')}</div>
              <div class="text-sm text-gray-600">GPU Utilization</div>
            </div>
          {/if}
          {#if cudaCapabilities}
            <div class="text-center">
              <div class="text-2xl font-bold text-purple-600">{cudaCapabilities.cuda_cores}</div>
              <div class="text-sm text-gray-600">CUDA Cores</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-orange-600">{cudaCapabilities.vram_gb}GB</div>
              <div class="text-sm text-gray-600">VRAM</div>
            </div>
          {/if}
        </div>
      </CardContent>
    </Card>
  {/if}
  <!-- Search Results -->
  {#if results.length > 0}
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center justify-between">
          <span>Search Results ({results.length})</span>
          {#if searchTime > 0}
            <span class="bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm font-medium">
              {formatMetric(searchTime, 'ms')} total
            </span>
          {/if}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          {#each results as result (result.id)}
            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <!-- Result Header -->
              <div class="flex items-start justify-between mb-2">
                <div class="flex-1">
                  <h3 class="font-semibold text-lg text-gray-900 mb-1">
                    {result.title}
                  </h3>
                  <div class="flex flex-wrap gap-2 mb-2">
                    <span
                      class="{getDocumentTypeColor(
                        result.metadata.document_type
                      )} px-2 py-1 rounded text-sm font-medium"
                    >
                      {result.metadata.document_type}
                    </span>
                    <span class="bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm font-medium">
                      {result.metadata.jurisdiction}
                    </span>
                    <span class="bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm font-medium">
                      {result.metadata.date}
                    </span>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-medium text-blue-600">
                    Score: {(result.score * 100).toFixed(1)}%
                  </div>
                  {#if result.performance.gpu_accelerated}
                    <span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium"> 🚀 GPU </span>
                  {:else}
                    <span class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium"> 💻 CPU </span>
                  {/if}
                </div>
              </div>
              <!-- Result Content -->
              <p class="text-gray-700 mb-3 line-clamp-3">
                {result.content}
              </p>
              <!-- Performance Info -->
              {#if result.performance.search_time_ms > 0}
                <div class="text-xs text-gray-500 flex gap-4">
                  <span>Search: {result.performance.search_time_ms}ms</span>
                  {#if result.performance.gpu_utilization > 0}
                    <span>GPU: {result.performance.gpu_utilization.toFixed(1)}%</span>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>
  {:else if query && !isSearching}
    <Card>
      <CardContent class="text-center py-8 text-gray-500">
        No results found for "{query}"
      </CardContent>
    </Card>
  {/if}
</div>

<style>
  .cuda-search-container {
    /* @apply max-w-4xl mx-auto; */
  }
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
