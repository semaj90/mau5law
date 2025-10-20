<!--
  RAG Search Component
  Unified frontend component for vector search + AI generation
  Enhanced with bits-ui professional components
-->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { onMount } from 'svelte';
  import { unifiedServiceRegistry } from '$lib/services/unified-service-registry';
  import { CardBits } from '$lib/enhanced-bits';
  import { AlertCircle } from 'lucide-svelte';
  let errorMessage = $state<string | null>('');
  // Additional imports
  import { ButtonBits, InputBits } from '$lib/enhanced-bits';
  import { Search, Loader2, CheckCircle } from 'lucide-svelte';
  let searchQuery = $state('');
  let searchResults = $state(null);
  let ragResponse = $state(null);
  let isSearching = $state(false);
  let searchHistory = $state([]);
  let systemStatus = $state(null);
  // Search configuration
  let searchConfig = $state({
    limit: 5,
    threshold: 0.7,
    includeRAGResponse: true,
  });
  $effect(() => {
    (async () => {
      await loadSystemStatus();
    })();
    // Refresh system status periodically
    const interval = setInterval(loadSystemStatus, 10000);
    return () => clearInterval(interval);
  });
  async function loadSystemStatus() {
    try {
      systemStatus = await unifiedServiceRegistry.getSystemStatus();
    } catch (error) {
      console.error('Failed to load system status:', error);
    }
  }
  async function performSearch() {
    if (!searchQuery.trim() || isSearching) return;
    isSearching = true;
    errorMessage = null;
    try {
      // Use the new enhanced semantic search API for better performance
      const response = await fetch('/api/rag/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          limit: searchConfig.limit,
          threshold: searchConfig.threshold,
          // Optional filters can be added her;
          filters: {},
        }),
      });
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success) {
        searchResults = data.results || [];
        // If includeRAGResponse is enabled, generate a response using the retrieved documents
        if (searchConfig.includeRAGResponse && Array.isArray(data.results) && data.results.length > 0) {
          try {
            const ragResponseFetch = await fetch('/api/rag/enhanced', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: searchQuery,
                mode: 'semantic_search', // Use our enhanced semantic search mode
                limit: searchConfig.limit,
                threshold: searchConfig.threshold,
              }),
            });
            if (ragResponseFetch.ok) {
              const ragData = await ragResponseFetch.json();
              ragResponse = ragData.success ? ragData.answer : null;
            }
          } catch (ragError) {
            console.warn('RAG response generation failed:', ragError);
            ragResponse = null;
          }
        }
        // Add to search history
        searchHistory.unshift({
          query: searchQuery,
          resultCount: Array.isArray(data.results) ? data.results.length : 0,
          timestamp: new Date(),
          hasRAGResponse: !!ragResponse,
          processingTime: data.processingTime || 0,
        });
        // Keep only last 5 searches
        if (searchHistory.length > 5) {
          searchHistory = searchHistory.slice(0, 5);
        }
        // Cache the query using unified service registry
        if (Array.isArray(data.results) && data.results.length > 0) {
          await unifiedServiceRegistry.cacheGraphQuery(searchQuery, data, 300);
        }
      } else {
        throw new Error(data.error || 'Search request failed');
      }
    } catch (error) {
      errorMessage = (error as Error).message;
      console.error('Search error:', error);
    } finally {
      isSearching = false;
    }
  }
  async function ingestDocument() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt,.pdf,.doc,.docx';
    fileInput.onchange = async event => {
      const input = event.currentTarget as HTMLInputElement | null;
      const file = input?.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const response = await fetch('/api/embed/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text,
            entityType: 'document',
            entityId: crypto.randomUUID(),
            metadata: {
              filename: file.name,
              filesize: file.size,
              uploadedAt: new Date().toISOString(),
            },
          }),
        });
        if (!response.ok) {
          throw new Error(`Ingestion failed: ${response.statusText}`);
        }
        const result = await response.json();
        // Show success notification
        console.log(`Document ingested: ${result.chunks.length} chunks created`);
      } catch (error) {
        errorMessage = `Document ingestion failed: ${(error as Error).message}`;
      }
    };
    fileInput.click();
  }
  function formatTimestamp(date: Date) {
    return date.toLocaleTimeString() + ' ' + date.toLocaleDateString();
  }
  function highlightMatch(text: string, query: string) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-300 px-1">$1</mark>');
  }
  // Suggestions based on system components
  const searchSuggestions = [
    'evidence analysis',
    'case precedents',
    'contract terms',
    'liability clauses',
    'legal procedures',
  ];
</script>

<svelte:head>
  <title>RAG Search - Legal AI Platform</title>
</svelte:head>
<div class="space-y-6">
  <header class="flex justify-between items-center">
    <div>
      <h1 class="text-3xl font-bold text-nier-accent-warm">RAG Search</h1>
      <p class="text-nier-text-secondary">Vector search with AI-powered responses</p>
    </div>
    <!-- System Status -->
    {#if systemStatus}
      <div class="flex items-center gap-2 text-sm">
        <div
          class="w-3 h-3 rounded-full {systemStatus.healthScore > 80
            ? 'bg-green-500'
            : systemStatus.healthScore > 60
              ? 'bg-yellow-500'
              : 'bg-red-500'}"
        ></div>
        <span class="font-mono">Health: {systemStatus.healthScore}%</span>
        <span class="text-nier-text-muted">
          ({systemStatus.services.filter(item => item.length)}/{systemStatus.services.length} services)
        </span>
      </div>
    {/if}
  </header>
  <!-- Search Interface -->
  <CardBits variant="elevated" padding="lg" class="bg-nier-bg-secondary border border-nier-border-primary">
    <div class="space-y-4">
      <!-- Search Input -->
      <div class="flex gap-4">
        <InputBits
          bind:value={searchQuery}
          onkeydown={e => e.key === 'Enter' && performSearch()}
          placeholder="Search legal documents and cases..."
          label="Legal Document Search"
          variant="outlined"
          inputSize="lg"
          leftIcon={Search}
          class="flex-1 legal-ai-search-input"
          disabled={isSearching}
        />
        <ButtonBits
          on:click={performSearch}
          disabled={isSearching || !searchQuery.trim()}
          variant="success"
          size="lg"
          loading={isSearching}
          class="legal-ai-search-btn"
        >
          {#snippet children()}
            {#if isSearching}
              <Loader2 class="w-4 h-4 mr-2 animate-spin" />
              Searching...
            {:else}
              <Search class="w-4 h-4 mr-2" />
              Search
            {/if}
          {/snippet}
        </ButtonBits>
        <ButtonBits on:click={ingestDocument} variant="ghost" size="lg" class="border-blue-500 text-blue-400">
          {#snippet children()}
            📄 Ingest Doc
          {/snippet}
        </ButtonBits>
      </div>
      <!-- Search Configuration -->
      <div class="flex gap-4 text-sm">
        <label class="flex items-center gap-2">
          <span>Results:</span>
          <select
            bind:value={searchConfig.limit}
            class="bg-nier-bg-primary border border-nier-border-muted rounded px-2 py-1"
          >
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
          </select>
        </label>
        <label class="flex items-center gap-2">
          <span>Threshold:</span>
          <select
            bind:value={searchConfig.threshold}
            class="bg-nier-bg-primary border border-nier-border-muted rounded px-2 py-1"
          >
            <option value={0.5}>0.5</option>
            <option value={0.7}>0.7</option>
            <option value={0.8}>0.8</option>
          </select>
        </label>
        <label class="flex items-center gap-2">
          <input type="checkbox" bind:checked={searchConfig.includeRAGResponse} class="rounded" />
          <span>Include AI Response</span>
        </label>
      </div>
      <!-- Search Suggestions -->
      <div class="flex flex-wrap gap-2">
        <span class="text-sm text-nier-text-muted">Try:</span>
        {#each searchSuggestions as suggestion}
          <ButtonBits
            on:click={() => {
              searchQuery = suggestion;
            }}
            variant="ghost"
            size="xs"
            class="text-xs bg-nier-bg-tertiary border border-nier-border-muted hover:bg-nier-bg-primary"
          >
            {#snippet children()}
              {suggestion}
            {/snippet}
          </ButtonBits>
        {/each}
      </div>
    </div>
  </CardBits>
  <!-- Error Message -->
  {#if errorMessage}
    <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
      <div class="text-red-400 font-mono text-sm">
        ❌ {errorMessage}
      </div>
    </div>
  {/if}
  <!-- RAG Response -->
  {#if ragResponse}
    <CardBits variant="elevated" padding="lg" class="bg-nier-bg-secondary border border-nier-border-primary">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-nier-accent-warm flex items-center gap-2">
          <CheckCircle class="w-5 h-5 text-green-400" />
          AI Response
        </h3>
        <div class="text-xs text-nier-text-muted font-mono">Generated by: gemma3-legal</div>
      </div>
      <div class="prose prose-invert max-w-none">
        <div class="text-nier-text-primary whitespace-pre-wrap leading-relaxed">
          {ragResponse}
        </div>
      </div>
    </CardBits>
  {/if}
  <!-- Search Results -->
  {#if searchResults?.length > 0}
    <CardBits variant="elevated" padding="lg" class="bg-nier-bg-secondary border border-nier-border-primary">
      <h3 class="font-bold text-nier-accent-warm mb-4">
        Search Results ({searchResults.length})
      </h3>
      <div class="space-y-4">
        {#each searchResults as result}
          <CardBits
            variant="outlined"
            padding="md"
            class="bg-nier-bg-primary border border-nier-border-muted legal-search-result"
          >
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center gap-3">
                <span class="font-mono text-sm bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                  Similarity: {((result.similarity || 0) * 100).toFixed(1)}%
                </span>
                {#if result.entityInfo}
                  <span class="font-mono text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                    {result.entityInfo.type}: {result.entityInfo.name || result.entityInfo.id}
                  </span>
                {/if}
                <span class="font-mono text-xs text-nier-text-muted">
                  Chunk #{(result.chunk_sequence || 0) + 1}
                </span>
              </div>
            </div>
            <div class="text-nier-text-primary text-sm leading-relaxed">
              {@html highlightMatch(result.chunk_text || '', searchQuery)}
            </div>
          </CardBits>
        {/each}
      </div>
    </CardBits>
  {:else if searchResults?.length === 0}
    <CardBits variant="outlined" padding="lg" class="bg-nier-bg-secondary border border-nier-border-primary">
      <div class="text-center text-nier-text-muted">
        <div class="text-4xl mb-2">🔍</div>
        <div class="text-lg font-semibold mb-2">No Results Found</div>
        <div class="text-sm">Try adjusting your search query or lowering the similarity threshold</div>
      </div>
    </CardBits>
  {/if}
  <!-- Search History -->
  {#if searchHistory.length > 0}
    <CardBits variant="elevated" padding="lg" class="bg-nier-bg-secondary border border-nier-border-primary">
      <h3 class="font-bold text-nier-accent-warm mb-4">Recent Searches</h3>
      <div class="space-y-2">
        {#each searchHistory as historyItem}
          <ButtonBits
            on:click={() => {
              searchQuery = historyItem.query;
            }}
            variant="ghost"
            class="w-full text-left p-3 bg-nier-bg-primary border border-nier-border-muted hover:bg-nier-bg-tertiary"
            fullWidth
          >
            {#snippet children()}
              <div class="flex justify-between items-center w-full">
                <span class="font-mono text-sm">{historyItem.query}</span>
                <div class="flex gap-2 text-xs text-nier-text-muted">
                  <span>{historyItem.resultCount} results</span>
                  {#if historyItem.hasRAGResponse}
                    <span class="text-green-400">+AI</span>
                  {/if}
                  <span>{formatTimestamp(historyItem.timestamp)}</span>
                </div>
              </div>
            {/snippet}
          </ButtonBits>
        {/each}
      </div>
    </CardBits>
  {/if}
</div>

<style>
  /* Enhanced bits-ui styling for legal AI search */
  :global(.legal-ai-search-input) {
    background: var(--nier-bg-primary);
    border: 2px solid var(--nier-border-muted);
    transition: all 0.3s ease;
  }
  :global(.legal-ai-search-input:focus) {
    border-color: var(--nier-accent-warm);
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }
  :global(.legal-ai-search-btn) {
    transition: all 0.2s ease;
    box-shadow: var(--legal-ai-shadow-md);
  }
  :global(.legal-ai-search-btn:hover) {
    transform: translateY(-1px);
    box-shadow: var(--legal-ai-shadow-lg);
  }
  :global(.legal-search-result) {
    border-left: 4px solid var(--nier-accent-warm);
    transition: transform 0.2s ease;
  }
  :global(.legal-search-result:hover) {
    transform: translateY(-2px);
  }
  /* Custom scrollbar for results */
  .space-y-4 ::-webkit-scrollbar {
    width: 6px;
  }
  .space-y-4 ::-webkit-scrollbar-track {
    background: var(--nier-bg-tertiary);
  }
  .space-y-4 ::-webkit-scrollbar-thumb {
    background: var(--nier-accent-warm);
    border-radius: 3px;
  }
  /* Highlighting for search matches */
  :global(mark) {
    background-color: rgba(255, 255, 0, 0.3);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
  }
</style>
