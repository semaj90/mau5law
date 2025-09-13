<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { onMount } from 'svelte';
  import Button from '$lib/components/ui/nes-button.svelte';
  import { Input } from '$lib/components/ui/input';
  import Badge from '$lib/components/ui/Badge.svelte';
  import NesCard from '$lib/components/ui/nes-card.svelte';
  import { Loader2, Search, Brain, Zap, Database } from 'lucide-svelte';
  import { context7Service, type VectorIntelligence } from '$lib/services/context7Service';

  // Reactive state from Context7 service
  const { vectorResults, isAnalyzing } = context7Service;

  let searchQuery = '';
  let selectedFilters: string[] = [];
  let searchResults: VectorIntelligence | null = null;
  let searchHistory: string[] = [];

  // Demo data and filters
  const availableFilters = [
    'contracts', 'evidence', 'case-law', 'regulations', 
    'high-similarity', 'recent', 'archived'
  ];

  const sampleQueries = [
    'liability clauses in employment contracts',
    'digital evidence chain of custody',
    'precedent cases for intellectual property',
    'regulatory compliance for financial services'
  ];

  onMount(async () => {
    await context7Service.initialize();
    // Load search history from localStorage
    const saved = localStorage.getItem('vector-search-history');
    if (saved) {
      searchHistory = JSON.parse(saved);
    }
  });

  // Subscribe to vector results from service
  $effect(() => { if ($vectorResults) {
    searchResults = $vectorResults;
  }

  async function performSearch() {
    if (!searchQuery.trim()) return;
    await context7Service.vectorSearch(searchQuery, {
      filters: selectedFilters,
      limit: 10
    });

    // Add to search history
    if (!searchHistory.includes(searchQuery)) {
      searchHistory = [searchQuery, ...searchHistory.slice(0, 9)]; // Keep last 10
      localStorage.setItem('vector-search-history', JSON.stringify(searchHistory));
    }
  }

  function toggleFilter(filter: string) {
    if (selectedFilters.includes(filter)) {
      selectedFilters = selectedFilters.filter(f => f !== filter);
    } else {
      selectedFilters = [...selectedFilters, filter];
    }
  }

  function useSampleQuery(query: string) {
    searchQuery = query;
    performSearch();
  }

  function useHistoryQuery(query: string) {
    searchQuery = query;
  }

  function clearHistory() {
    searchHistory = [];
    localStorage.removeItem('vector-search-history');
  }

  function getSimilarityColor(similarity: number): string {
    if (similarity >= 0.9) return 'bg-green-500';
    if (similarity >= 0.7) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  function formatSimilarity(similarity: number): string {
    return `${(similarity * 100).toFixed(1)}%`;
  }
</script>

<div class="container mx-auto p-6 max-w-6xl">
  <!-- Header -->
  <div class="mb-8">
    <div class="flex items-center gap-3 mb-4">
      <Brain class="h-8 w-8 text-blue-600" />
      <h1 class="text-3xl font-bold">Vector Intelligence Demo</h1>
      <Badge variant="secondary">Phase 5 Enhanced</Badge>
    </div>
    <p class="text-gray-600">
      Demonstrate semantic search, document similarity, and AI-powered legal research capabilities
    </p>
  </div>

  <!-- Search Interface -->
  <NesCard class="mb-6">
    <div class="yorha-panel-header">
      <h3 class="nes-text is-primary" class="flex items-center gap-2">
        <Search class="h-5 w-5" />
        Semantic Search
      </h3>
      <p class="nes-text">
        Search across legal documents using natural language and AI-powered similarity matching
      </p>
    </div>
    <div class="yorha-panel-content" class="space-y-4">
      <!-- Search Input -->
      <div class="flex gap-2">
        <Input
          bind:value={searchQuery}
          placeholder="Enter your legal research question..."
          class="flex-1"
          onkeydown={(e) => e.key === 'Enter' && performSearch()}
        />
        <Button 
          onclick={performSearch} 
          disabled={$isAnalyzing || !searchQuery.trim()}
          class="px-6"
        >
          {#if $isAnalyzing}
            <Loader2 class="h-4 w-4 animate-spin mr-2" />
            Searching
          {:else}
            <Search class="h-4 w-4 mr-2" />
            Search
          {/if}
        </button>
      </div>

      <!-- Filters -->
      <div class="space-y-2">
        <label class="text-sm font-medium">Filters:</label>
        <div class="flex flex-wrap gap-2">
          {#each availableFilters as filter}
            <Badge
              variant={selectedFilters.includes(filter) ? 'default' : 'outline'}
              class="cursor-pointer hover:bg-blue-100 transition-colors"
              onclick={() => toggleFilter(filter)}
            >
              {filter}
            </Badge>
          {/each}
        </div>
      </div>

      <!-- Sample Queries -->
      <div class="space-y-2">
        <label class="text-sm font-medium">Sample Queries:</label>
        <div class="flex flex-wrap gap-2">
          {#each sampleQueries as query}
            <Button
              variant="outline"
              size="sm"
              class="text-xs"
              onclick={() => useSampleQuery(query)}
            >
              {query}
            </button>
          {/each}
        </div>
      </div>
    </div>
  </NesCard>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Search Results -->
    <div class="lg:col-span-2">
      <NesCard>
        <div class="yorha-panel-header">
          <h3 class="nes-text is-primary" class="flex items-center gap-2">
            <Database class="h-5 w-5" />
            Search Results
            {#if searchResults?.results.length}
              <Badge variant="secondary">{searchResults.results.length} matches</Badge>
            {/if}
          </h3>
        </div>
        <div class="yorha-panel-content">
          {#if $isAnalyzing}
            <div class="flex items-center justify-center py-12">
              <div class="text-center">
                <Loader2 class="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p class="text-gray-600">Analyzing documents with AI...</p>
              </div>
            </div>
          {:else if searchResults?.results.length}
            <div class="space-y-4">
              {#each searchResults.results as result, index}
                <div class="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div class="flex items-start justify-between mb-3">
                    <div class="flex-1">
                      <h3 class="font-medium text-gray-900 mb-1">
                        Document {index + 1}
                      </h3>
                      <p class="text-sm text-gray-600 line-clamp-3">
                        {result.content}
                      </p>
                    </div>
                    <div class="ml-4 text-right">
                      <div class="flex items-center gap-2">
                        <div 
                          class="w-3 h-3 rounded-full {getSimilarityColor(result.similarity)}"
                        ></div>
                        <span class="text-sm font-medium">
                          {formatSimilarity(result.similarity)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Metadata -->
                  <div class="flex flex-wrap gap-2 mt-3">
                    {#each Object.entries(result.metadata) as [key, value]}
                      <Badge variant="outline" class="text-xs">
                        {key}: {value}
                      </Badge>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {:else if searchQuery}
            <div class="text-center py-12">
              <Database class="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p class="text-gray-600 mb-2">No results found</p>
              <p class="text-sm text-gray-500">Try adjusting your search terms or filters</p>
            </div>
          {:else}
            <div class="text-center py-12">
              <Search class="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p class="text-gray-600 mb-2">Start your search</p>
              <p class="text-sm text-gray-500">Enter a legal research question above</p>
            </div>
          {/if}
        </div>
      </NesCard>
    </div>

    <!-- Sidebar -->
    <div class="space-y-6">
      <!-- AI Suggestions -->
      {#if searchResults?.suggestions.length}
        <NesCard>
          <div class="yorha-panel-header">
            <h3 class="nes-text is-primary" class="flex items-center gap-2">
              <Zap class="h-5 w-5" />
              AI Suggestions
            </h3>
          </div>
          <div class="yorha-panel-content">
            <div class="space-y-2">
              {#each searchResults.suggestions as suggestion}
                <div class="p-3 bg-blue-50 rounded-lg text-sm">
                  {suggestion}
                </div>
              {/each}
            </div>
          </div>
        </NesCard>
      {/if}

      <!-- Search History -->
      {#if searchHistory.length > 0}
        <NesCard>
          <div class="yorha-panel-header">
            <div class="flex items-center justify-between">
              <h3 class="nes-text is-primary" class="text-lg">Recent Searches</h3>
              <button class="nes-btn" variant="ghost" size="sm" onclick={clearHistory}>
                Clear
              </button>
            </div>
          </div>
          <div class="yorha-panel-content">
            <div class="space-y-2">
              {#each searchHistory as query}
                <button
                  class="w-full text-left p-2 text-sm rounded hover:bg-gray-100 transition-colors"
                  onclick={() => useHistoryQuery(query)}
                >
                  {query}
                </button>
              {/each}
            </div>
          </div>
        </NesCard>
      {/if}

      <!-- System Stats -->
      <NesCard>
        <div class="yorha-panel-header">
          <h3 class="nes-text is-primary" class="text-lg">System Status</h3>
        </div>
        <div class="yorha-panel-content">
          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span>Vector Database:</span>
              <Badge variant="outline" class="text-green-600">Active</Badge>
            </div>
            <div class="flex justify-between">
              <span>AI Engine:</span>
              <Badge variant="outline" class="text-green-600">Ready</Badge>
            </div>
            <div class="flex justify-between">
              <span>Cache:</span>
              <Badge variant="outline" class="text-blue-600">Enabled</Badge>
            </div>
            <div class="flex justify-between">
              <span>Context7:</span>
              <Badge variant="outline" class="text-green-600">Connected</Badge>
            </div>
          </div>
        </div>
      </NesCard>
    </div>
  </div>
</div>

<style>
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical
    overflow: hidden
  }
</style>
