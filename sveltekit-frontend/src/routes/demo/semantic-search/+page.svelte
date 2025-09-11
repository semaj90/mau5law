<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<!-- Enhanced Semantic Search Demo -->
<script lang="ts">
  import { onMount } from 'svelte';

  // Search state management (Svelte 5)
  let searchQuery = $state('');
  let searchResults = $state([]);
  let searchAnalytics = $state(null);
  let isSearching = $state(false);
  let searchError = $state('');
  let searchSuggestions = $state([]);

  // Search options
  let limit = 10;
  let threshold = 0.7;
  let includeContent = true;
  let includeMetadata = true;
  let semanticExpansion = true;
  let queryRewriting = true;
  let showAnalytics = true;

  // Filter options
  let documentTypeFilter = '';
  let sourceFilter = '';
  let startDate = '';
  let endDate = '';

  // System health
  const systemHealth = writable(null);

  onMount(async () => {
    await checkSystemHealth();
  });

  async function checkSystemHealth() {
    try {
      const response = await fetch('/api/search/vector?action=health');
      const health = await response.json();
      systemHealth.set(health);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  async function performSearch() {
    const query = searchQuery.trim();
    if (!query) {
      searchError = 'Please enter a search query';
      return;
    }

    isSearching = true;
    searchError = '';
    searchResults = [];
    searchAnalytics = null;
    searchSuggestions = [];

    try {
      const searchOptions = {
        query,
        limit,
        threshold,
        includeContent,
        includeMetadata,
        semanticExpansion,
        queryRewriting,
        analytics: showAnalytics,
        ...(documentTypeFilter || sourceFilter || startDate || endDate) && {
          filters: {
            ...(documentTypeFilter && { documentType: [documentTypeFilter] }),
            ...(sourceFilter && { source: [sourceFilter] }),
            ...(startDate || endDate) && {
              dateRange: {
                ...(startDate && { start: startDate }),
                ...(endDate && { end: endDate })
              }
            }
          }
        }
      };

      const response = await fetch('/api/search/vector', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchOptions)
      });

      const result = await response.json();

      if (result.success) {
        searchResults = result.results || [];
        searchAnalytics.set(result.metadata || {]);
        searchSuggestions.set(result.suggestions || []);
      } else {
        searchError.set(result.error || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      searchError.set('Network error: Unable to perform search');
    } finally {
      isSearching.set(false);
    }
  }

  function applySuggestion(suggestion: string) {
    searchQuery.set(suggestion);
    performSearch();
  }

  function clearSearch() {
    searchQuery.set('');
    searchResults.set([]);
    searchAnalytics.set(null);
    searchError.set('');
    searchSuggestions.set([]);
  }

  // Sample queries for testing
  const sampleQueries = [
    'employment contract salary benefits',
    'liability indemnification clauses',
    'lease agreement tenant obligations',
    'breach of contract damages',
    'intellectual property licensing terms'
  ];
</script>

<svelte:head>
  <title>Enhanced Semantic Search Demo - Legal AI</title>
  <meta name="description" content="Advanced semantic search with pgvector, Gemma embeddings, and AI-powered query understanding" />
</svelte:head>

<main class="container mx-auto px-4 py-8 max-w-6xl">
  <!-- Header -->
  <header class="mb-8">
    <h1 class="text-4xl font-bold text-gray-800 mb-2">
      🧠 Enhanced Semantic Search
    </h1>
    <p class="text-gray-600 text-lg">
      Advanced AI-powered legal document search with pgvector, Gemma embeddings, and semantic understanding
    </p>

    {#if $systemHealth}
      <div class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div class="flex items-center gap-2 mb-2">
          <span class="w-2 h-2 bg-green-500 rounded-full"></span>
          <span class="font-semibold text-green-700">System Status: {$systemHealth.status}</span>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-green-600">
          {#each $systemHealth.features || [] as feature}
            <div class="flex items-center gap-1">
              <span>✓</span>
              <span>{feature}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </header>

  <!-- Search Interface -->
  <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
    <div class="space-y-4">
      <!-- Main search input -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Search Query
        </label>
        <div class="flex gap-2">
          <input
            type="text"
            bind:value={$searchQuery}
            placeholder="Enter your legal document search query..."
            class="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onkeypress={(e) => e.key === 'Enter' && performSearch()}
          />
          <button
            onclick={performSearch}
            disabled={$isSearching || !$searchQuery.trim()}
            class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {#if $isSearching}
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Searching...
            {:else}
              🔍 Search
            {/if}
          </button>
          <button
            onclick={clearSearch}
            class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </div>

      <!-- Sample queries -->
      <div>
        <p class="text-sm text-gray-600 mb-2">Try these sample queries:</p>
        <div class="flex flex-wrap gap-2">
          {#each sampleQueries as query}
            <button
              onclick={() => { searchQuery.set(query); performSearch(); }}
              class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
            >
              {query}
            </button>
          {/each}
        </div>
      </div>

      <!-- Search options -->
      <details class="border border-gray-200 rounded-lg">
        <summary class="px-4 py-2 bg-gray-50 cursor-pointer font-medium">
          Advanced Search Options
        </summary>
        <div class="p-4 space-y-4">
          <!-- Basic options -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="limit">Limit</label><input id="limit"
                type="number"
                bind:value={limit}
                min="1"
                max="50"
                class="w-full px-3 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="threshold">Threshold</label><input id="threshold"
                type="number"
                bind:value={threshold}
                min="0.1"
                max="1.0"
                step="0.1"
                class="w-full px-3 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="document-type">Document Type</label><select id="document-type"
                bind:value={documentTypeFilter}
                class="w-full px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="">All Types</option>
                <option value="contract">Contract</option>
                <option value="agreement">Agreement</option>
                <option value="lease">Lease</option>
                <option value="employment">Employment</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="source">Source</label><select id="source"
                bind:value={sourceFilter}
                class="w-full px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="">All Sources</option>
                <option value="pgvector">pgvector</option>
                <option value="uploaded">Uploaded</option>
                <option value="imported">Imported</option>
              </select>
            </div>
          </div>

          <!-- Date range -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="start-date">Start Date</label><input id="start-date"
                type="date"
                bind:value={startDate}
                class="w-full px-3 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="end-date">End Date</label><input id="end-date"
                type="date"
                bind:value={endDate}
                class="w-full px-3 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>

          <!-- Feature toggles -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label class="flex items-center gap-2">
              <input type="checkbox" bind:checked={includeContent} />
              <span class="text-sm">Include Content</span>
            </label>
            <label class="flex items-center gap-2">
              <input type="checkbox" bind:checked={includeMetadata} />
              <span class="text-sm">Include Metadata</span>
            </label>
            <label class="flex items-center gap-2">
              <input type="checkbox" bind:checked={semanticExpansion} />
              <span class="text-sm">Semantic Expansion</span>
            </label>
            <label class="flex items-center gap-2">
              <input type="checkbox" bind:checked={queryRewriting} />
              <span class="text-sm">Query Rewriting</span>
            </label>
          </div>
        </div>
      </details>
    </div>
  </div>

  <!-- Error display -->
  {#if $searchError}
    <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
      <div class="flex items-center gap-2">
        <span>⚠️</span>
        <span>{$searchError}</span>
      </div>
    </div>
  {/if}

  <!-- Search suggestions -->
  {#if $searchSuggestions.length > 0}
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <h3 class="font-semibold text-blue-800 mb-2">💡 Suggested searches:</h3>
      <div class="flex flex-wrap gap-2">
        {#each $searchSuggestions as suggestion}
          <button
            onclick={() => applySuggestion(suggestion)}
            class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
          >
            {suggestion}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Analytics display -->
  {#if $searchAnalytics && showAnalytics}
    <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
      <h3 class="font-semibold text-gray-800 mb-3">📊 Search Analytics</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span class="font-medium text-gray-600">Response Time:</span>
          <span class="ml-2">{$searchAnalytics.responseTime}ms</span>
        </div>
        <div>
          <span class="font-medium text-gray-600">Strategy:</span>
          <span class="ml-2">{$searchAnalytics.searchStrategy || 'N/A'}</span>
        </div>
        <div>
          <span class="font-medium text-gray-600">Complexity:</span>
          <span class="ml-2">{$searchAnalytics.queryComplexity || 'N/A'}</span>
        </div>
        <div>
          <span class="font-medium text-gray-600">Cache Hit:</span>
          <span class="ml-2">{$searchAnalytics.cacheHit ? 'Yes' : 'No'}</span>
        </div>
      </div>
      {#if $searchAnalytics.semanticConcepts && $searchAnalytics.semanticConcepts.length > 0}
        <div class="mt-3">
          <span class="font-medium text-gray-600">Semantic Concepts:</span>
          <div class="mt-1 flex flex-wrap gap-1">
            {#each $searchAnalytics.semanticConcepts as concept}
              <span class="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                {concept}
              </span>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Search results -->
  {#if $searchResults.length > 0}
    <div class="space-y-6">
      <h2 class="text-2xl font-bold text-gray-800">
        Search Results ({$searchResults.length})
      </h2>

      {#each $searchResults as result, index}
        <div class="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <!-- Result header -->
          <div class="flex items-start justify-between mb-3">
            <div>
              {#if result.title}
                <h3 class="text-xl font-semibold text-gray-900 mb-1">
                  {result.title}
                </h3>
              {/if}
              <div class="flex items-center gap-4 text-sm text-gray-600">
                <span>Score: {(result.score * 100).toFixed(1)}%</span>
                {#if result.semanticRelevance}
                  <span>Relevance: {(result.semanticRelevance * 100).toFixed(1)}%</span>
                {/if}
                <span>Rank: #{result.metadata?.rank || index + 1}</span>
              </div>
            </div>
            <div class="text-sm text-gray-500">
              ID: {result.id}
            </div>
          </div>

          <!-- Content snippet -->
          {#if result.snippet}
            <div class="mb-4">
              <p class="text-gray-700 leading-relaxed">
                {result.snippet}
              </p>
            </div>
          {/if}

          <!-- Highlights -->
          {#if result.highlights && result.highlights.length > 0}
            <div class="mb-4">
              <h4 class="text-sm font-medium text-gray-600 mb-2">Key Terms:</h4>
              <div class="flex flex-wrap gap-1">
                {#each result.highlights as highlight}
                  <span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                    {highlight}
                  </span>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Reasoning -->
          {#if result.reasoning}
            <div class="mb-4 p-3 bg-green-50 border-l-4 border-green-400">
              <h4 class="text-sm font-medium text-green-800 mb-1">Why this result matches:</h4>
              <p class="text-sm text-green-700">{result.reasoning}</p>
            </div>
          {/if}

          <!-- Metadata -->
          {#if includeMetadata && result.metadata}
            <details class="mt-4">
              <summary class="cursor-pointer text-sm font-medium text-gray-600">
                Metadata & Technical Details
              </summary>
              <div class="mt-2 p-3 bg-gray-50 rounded text-xs">
                <pre class="whitespace-pre-wrap text-gray-700">{JSON.stringify(result.metadata, null, 2)}</pre>
              </div>
            </details>
          {/if}

          <!-- Full content -->
          {#if includeContent && result.content}
            <details class="mt-4">
              <summary class="cursor-pointer text-sm font-medium text-gray-600">
                Full Content
              </summary>
              <div class="mt-2 p-4 bg-gray-50 rounded max-h-60 overflow-y-auto">
                <p class="text-sm text-gray-700 whitespace-pre-wrap">{result.content}</p>
              </div>
            </details>
          {/if}
        </div>
      {/each}
    </div>
  {:else if !$isSearching && $searchQuery}
    <div class="text-center py-12 text-gray-500">
      <div class="text-4xl mb-4">🔍</div>
      <p>No results found for "{$searchQuery}"</p>
      <p class="text-sm mt-2">Try adjusting your search terms or lowering the similarity threshold</p>
    </div>
  {/if}

  <!-- Help section -->
  <footer class="mt-12 p-6 bg-gray-50 rounded-lg">
    <h3 class="font-semibold text-gray-800 mb-3">🚀 Search Features</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
      <div>
        <h4 class="font-medium mb-2">AI-Powered Features:</h4>
        <ul class="space-y-1">
          <li>• Semantic query understanding</li>
          <li>• Legal domain concept extraction</li>
          <li>• Automatic query rewriting</li>
          <li>• Multi-concept expansion</li>
        </ul>
      </div>
      <div>
        <h4 class="font-medium mb-2">Technical Stack:</h4>
        <ul class="space-y-1">
          <li>• PostgreSQL + pgvector IVFFLAT indexing</li>
          <li>• Gemma 768D→1536D embedding compatibility</li>
          <li>• Enterprise security & rate limiting</li>
          <li>• SvelteKit 2 + TypeScript best practices</li>
        </ul>
      </div>
    </div>
  </footer>
</main>

<style>
  :global(body) {
    background-color: #f9fafb;
  }
</style>

