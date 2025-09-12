<!-- @migration-task Error while migrating Svelte code: Expected token }
https://svelte.dev/e/expected_token -->
<!-- @migration-task Error while migrating Svelte code: Expected token } -->
<!--
  InstantLegalSearch - High-Performance Legal Document Search
  
  Features:
  - Sub-100ms search responses via Loki.js + Fuse.js + Redis
  - Smart legal pattern recognition and synonym expansion
  - Real-time result highlighting and ranking
  - Advanced filtering with legal-specific context
  - Search analytics and performance monitoring
  - Progressive loading and debounced search
  
  Integration:
  - InstantSearchEngine: Core search logic with multi-source results
  - Semantic Search API: AI-powered document retrieval
  - Loki.js + Redis: High-performance caching layer
  - Fuse.js: Fuzzy search with legal-specific weighting
-->

<script lang="ts">
</script>
  import { onMount, onDestroy } from 'svelte';
  import { 
    instantSearchEngine, 
    type InstantSearchResult, 
    type SearchFilters 
  } from '$lib/services/instant-search-engine.js';
  import { Input } from '$lib/components/ui/enhanced-bits';
  import Button from '$lib/components/ui/Button.svelte';
  import * as Card from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import * as Select from '$lib/components/ui/select';
  import { 
    Search, 
    Loader2, 
    Filter, 
    TrendingUp, 
    Clock, 
    AlertTriangle,
    FileText,
    Scale,
    Shield,
    Zap 
  } from 'lucide-svelte';

  // Props
  let {
    placeholder = 'Search legal documents, cases, evidence...',
    showFilters = true,
    showStats = true,
    showAdvanced = false,
    maxResults = 20,
    onResultClick = null,
    onResultAction = null,
    class: className = ''
  } = $props();

  // Search state
  let searchQuery = $state('');
  let searchResults = $state<InstantSearchResult[]>([]);
  let isSearching = $state(false);
  let showFiltersPanel = $state(false);
  let searchStartTime = $state(0);
  let lastSearchTime = $state(0);

  // Filters
  let selectedFilters = $state<SearchFilters>({
    documentTypes: [],
    riskLevels: [],
    jurisdictions: [],
    confidenceMin: 0.5,
    priorityMin: 50,
  });

  // Stats
  let searchStats = $state({
    totalSearches: 0,
    averageResponseTime: 0,
    cacheHitRate: 0,
    popularQueries: [],
    performanceMetrics: { p50: 0, p90: 0, p95: 0, p99: 0 }
  });

  // Search options
  const documentTypes = [
    { value: 'contract', label: 'Contracts', icon: FileText },
    { value: 'evidence', label: 'Evidence', icon: Shield },
    { value: 'brief', label: 'Legal Briefs', icon: Scale },
    { value: 'citation', label: 'Citations', icon: TrendingUp },
    { value: 'precedent', label: 'Precedents', icon: Clock },
  ];

  const riskLevels = [
    { value: 'low', label: 'Low Risk', color: 'bg-green-100 text-green-800' },
    { value: 'medium', label: 'Medium Risk', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'High Risk', color: 'bg-orange-100 text-orange-800' },
    { value: 'critical', label: 'Critical Risk', color: 'bg-red-100 text-red-800' },
  ];

  const jurisdictions = [
    { value: 'federal', label: 'Federal' },
    { value: 'state', label: 'State' },
    { value: 'local', label: 'Local' },
    { value: 'international', label: 'International' },
  ];

  let searchTimeout: NodeJS.Timeout | null = null;

  // Initialize search engine
  onMount(async () => {
    try {
      await instantSearchEngine.initialize();
      
      // Set up event listeners
      instantSearchEngine.on('searchCompleted', (data) => {
        lastSearchTime = data.responseTime;
        if (showStats) {
          searchStats = instantSearchEngine.getSearchStats();
        }
      });

      instantSearchEngine.on('indexRefreshed', (data) => {
        console.log(`🔍 Search index refreshed with ${data.documentCount} documents`);
      });

    } catch (error) {
      console.error('❌ Failed to initialize search engine:', error);
    }
  });

  onDestroy(async () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    // Note: Don't destroy the singleton instance here as it might be used elsewhere
  });

  // Reactive search with debouncing
  $effect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (searchQuery.trim().length < 2) {
      searchResults = [];
      isSearching = false;
      return;
    }

    isSearching = true;
    searchStartTime = Date.now();

    searchTimeout = setTimeout(async () => {
      await performSearch();
    }, 150); // 150ms debounce
  });

  async function performSearch() {
    if (!searchQuery.trim()) {
      searchResults = [];
      isSearching = false;
      return;
    }

    try {
      const results = await instantSearchEngine.search(
        searchQuery.trim(),
        selectedFilters,
        `search_${Date.now()}`
      );

      searchResults = results.slice(0, maxResults);
      isSearching = false;

    } catch (error) {
      console.error('❌ Search failed:', error);
      searchResults = [];
      isSearching = false;
    }
  }

  function toggleFiltersPanel() {
    showFiltersPanel = !showFiltersPanel;
  }

  function handleResultClick(result: InstantSearchResult) {
    if (onResultClick) {
      onResultClick(result);
    }
  }

  function handleResultAction(result: InstantSearchResult, action: string) {
    if (onResultAction) {
      onResultAction(result, action);
    }
  }

  function getRiskLevelColor(riskLevel: string) {
    const risk = riskLevels.find(r => r.value === riskLevel);
    return risk?.color || 'bg-gray-100 text-gray-800';
  }

  function getResultTypeIcon(resultType: string) {
    switch (resultType) {
      case 'cache': return Clock;
      case 'fuzzy': return Search;
      case 'semantic': return TrendingUp;
      case 'hybrid': return Zap;
      default: return FileText;
    }
  }

  function getResultTypeColor(resultType: string) {
    switch (resultType) {
      case 'cache': return 'text-blue-600';
      case 'fuzzy': return 'text-green-600';
      case 'semantic': return 'text-purple-600';
      case 'hybrid': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  }

  function formatScore(score: number) {
    return (score * 100).toFixed(1) + '%';
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && searchResults.length > 0) {
      handleResultClick(searchResults[0]);
    } else if (event.key === 'Escape') {
      searchQuery = '';
      showFiltersPanel = false;
    }
  }
</script>

<div class="instant-legal-search {className}">
  <!-- Search Header -->
  <div class="space-y-4">
    <!-- Main Search Input -->
    <div class="relative">
      <Search 
        class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" 
      />
      <Input
        bind:value={searchQuery}
        {placeholder}
        keydown={handleKeydown}
        class="pl-10 pr-20 text-base"
      />
      
      <!-- Search Status Icons -->
      <div class="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
        {#if isSearching}
          <Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
        {/if}
        
        {#if showFilters}
          <Button
            size="sm"
            variant="ghost"
            onclick={toggleFiltersPanel}
            class="h-8 w-8 p-0"
          >
            <Filter class="h-4 w-4" />
          </Button>
        {/if}
      </div>
    </div>

    <!-- Search Filters Panel -->
    {#if showFiltersPanel && showFilters}
      <div.Root class="p-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Document Types -->
          <div>
            <label class="text-sm font-medium mb-2 block">Document Types</label>
            <div class="space-y-2">
              {#each documentTypes as docType}
                <label class="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    bind:group={selectedFilters.documentTypes}
                    value={docType.value}
                    class="rounded"
                  />
                  <svelte:component this={docType.icon} class="h-4 w-4" />
                  <span class="text-sm">{docType.label}</span>
                </label>
              {/each}
            </div>
          </div>

          <!-- Risk Levels -->
          <div>
            <label class="text-sm font-medium mb-2 block">Risk Levels</label>
            <div class="space-y-2">
              {#each riskLevels as risk}
                <label class="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    bind:group={selectedFilters.riskLevels}
                    value={risk.value}
                    class="rounded"
                  />
                  <Badge class={risk.color}>{risk.label}</Badge>
                </label>
              {/each}
            </div>
          </div>

          <!-- Jurisdictions -->
          <div>
            <label class="text-sm font-medium mb-2 block">Jurisdictions</label>
            <div class="space-y-2">
              {#each jurisdictions as jurisdiction}
                <label class="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    bind:group={selectedFilters.jurisdictions}
                    value={jurisdiction.value}
                    class="rounded"
                  />
                  <span class="text-sm">{jurisdiction.label}</span>
                </label>
              {/each}
            </div>
          </div>

          <!-- Advanced Filters -->
          <div>
            <label class="text-sm font-medium mb-2 block">Minimum Scores</label>
            <div class="space-y-3">
              <div>
                <label class="text-xs text-muted-foreground" for="confidence-selectedf">Confidence: {selectedFilters.confidenceMin}</label><input id="confidence-selectedf"
                  type="range"
                  bind:value={selectedFilters.confidenceMin}
                  min="0"
                  max="1"
                  step="0.1"
                  class="w-full"
                />
              </div>
              <div>
                <label class="text-xs text-muted-foreground" for="priority-selectedfil">Priority: {selectedFilters.priorityMin}</label><input id="priority-selectedfil"
                  type="range"
                  bind:value={selectedFilters.priorityMin}
                  min="0"
                  max="255"
                  step="10"
                  class="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </Card.Root>
    {/if}

    <!-- Search Stats -->
    {#if showStats && (searchQuery || searchResults.length > 0)}
      <div class="flex items-center justify-between text-sm text-muted-foreground">
        <div class="flex items-center gap-4">
          {#if searchQuery && searchResults.length > 0}
            <span>
              Found {searchResults.length} results for "{searchQuery}"
              {#if lastSearchTime}
                <span class="text-green-600">({lastSearchTime}ms)</span>
              {/if}
            </span>
          {/if}
        </div>
        
        {#if searchStats.totalSearches > 0}
          <div class="flex items-center gap-3">
            <span>Avg: {Math.round(searchStats.averageResponseTime)}ms</span>
            <span>Cache: {(searchStats.cacheHitRate * 100).toFixed(1)}%</span>
            <span>Total: {searchStats.totalSearches}</span>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Search Results -->
  <div class="mt-6">
    {#if searchResults.length > 0}
      <div class="space-y-4">
        {#each searchResults as result}
          <Card.Root 
            class="hover:shadow-md transition-shadow cursor-pointer"
            onclick={() => handleResultClick(result)}
          >
            <div.Header class="pb-3">
              <!-- Result Header -->
              <div class="flex items-start justify-between">
                <div.Title class="text-base leading-tight flex items-center gap-2">
                  <svelte:component 
                    this={getResultTypeIcon(result.resultType)} 
                    class="h-4 w-4 {getResultTypeColor(result.resultType)}" 
                  />
                  {#if result.highlights?.title}
                    {@html result.highlights.title}
                  {:else}
                    {result.document.metadata?.title || result.id}
                  {/if}
                </Card.Title>
                
                <div class="flex items-center gap-2 ml-2">
                  <!-- Result Type Badge -->
                  <Badge class="text-xs capitalize {getResultTypeColor(result.resultType)}">
                    {result.resultType}
                  </Badge>
                  
                  <!-- Score Badge -->
                  <Badge variant="outline" class="text-xs">
                    {formatScore(result.combinedScore)}
                  </Badge>
                  
                  <!-- Risk Level Badge -->
                  <Badge class={getRiskLevelColor(result.document.riskLevel)}>
                    {result.document.riskLevel.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <!-- Description -->
              <div.Description class="text-sm">
                {#if result.highlights?.content}
                  {@html result.highlights.content}
                {:else}
                  {result.document.metadata?.description || 'No description available'}
                {/if}
              </Card.Description>

              <!-- Metadata -->
              <div class="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div class="flex items-center gap-1">
                  <FileText class="h-3 w-3" />
                  <span class="capitalize">{result.document.type}</span>
                </div>
                
                {#if result.document.metadata?.jurisdiction}
                  <div class="flex items-center gap-1">
                    <Scale class="h-3 w-3" />
                    <span>{result.document.metadata.jurisdiction}</span>
                  </div>
                {/if}
                
                <div class="flex items-center gap-1">
                  <TrendingUp class="h-3 w-3" />
                  <span>Priority: {result.document.priority}</span>
                </div>
                
                <div class="flex items-center gap-1">
                  <Shield class="h-3 w-3" />
                  <span>Confidence: {formatScore(result.document.confidenceLevel)}</span>
                </div>
                
                {#if result.document.accessCount > 0}
                  <div class="flex items-center gap-1">
                    <Clock class="h-3 w-3" />
                    <span>Accessed {result.document.accessCount} times</span>
                  </div>
                {/if}

                {#if result.responseTime}
                  <div class="flex items-center gap-1">
                    <Zap class="h-3 w-3" />
                    <span>{result.responseTime}ms</span>
                  </div>
                {/if}
              </div>
            </Card.Header>

            <!-- Action Buttons -->
            <div.Content class="pt-0">
              <div class="flex gap-2 flex-wrap">
                <Button 
                  size="sm" 
                  onclick={(e) => { e.stopPropagation(); handleResultAction(result, 'view'); }}
                >
                  View Document
                </Button>
                
                <Button 
                  size="sm" 
                  variant="outline" 
                  onclick={(e) => { e.stopPropagation(); handleResultAction(result, 'analyze'); }}
                >
                  AI Analysis
                </Button>
                
                {#if result.document.type === 'evidence'}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onclick={(e) => { e.stopPropagation(); handleResultAction(result, 'canvas'); }}
                  >
                    Open in Canvas
                  </Button>
                {/if}
                
                {#if result.fuseScore && result.semanticScore}
                  <div class="ml-auto text-xs text-muted-foreground">
                    Fuzzy: {formatScore(1 - result.fuseScore)} | 
                    Semantic: {formatScore(result.semanticScore)}
                  </div>
                {/if}
              </div>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>

    {:else if searchQuery && !isSearching}
      <!-- No Results -->
      <div.Root>
        <div.Content class="py-12 text-center">
          <AlertTriangle class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 class="font-medium mb-2">No results found</h3>
          <p class="text-muted-foreground text-sm mb-4">
            No documents match your search for "{searchQuery}".
          </p>
          <div class="text-sm text-muted-foreground space-y-1">
            <p>Try:</p>
            <ul class="list-disc list-inside space-y-1">
              <li>Using different or more general keywords</li>
              <li>Checking your spelling</li>
              <li>Reducing the number of filters</li>
              <li>Using legal synonyms (e.g., "contract" instead of "agreement")</li>
            </ul>
          </div>
        </Card.Content>
      </Card.Root>

    {:else if searchQuery && isSearching}
      <!-- Loading State -->
      <div.Root>
        <div.Content class="py-12 text-center">
          <Loader2 class="h-12 w-12 mx-auto text-muted-foreground animate-spin mb-4" />
          <h3 class="font-medium mb-2">Searching...</h3>
          <p class="text-muted-foreground text-sm">
            Searching across legal documents, cases, and evidence...
          </p>
        </Card.Content>
      </Card.Root>
    {/if}
  </div>
</div>

<style>
  :global(.instant-legal-search mark) {
    background-color: theme(colors.yellow.200);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-weight: 500;
  }

  :global(.dark .instant-legal-search mark) {
    background-color: theme(colors.yellow.900);
    color: theme(colors.yellow.100);
  }
</style>