<script lang="ts">
  import { tick } from 'svelte';
  import { enhancedRAGStore } from '$lib/stores/enhanced-rag-store.js';
  import Input from '$lib/components/ui/enhanced-bits/Input.svelte';
  import Button from '$lib/components/ui/enhanced-bits/Button.svelte';

  const store = enhancedRAGStore as any;
  let searchQuery = '';
  let isLoading = false;
  let lastDuration = 0;

  async function handleSearch() {
    if (!searchQuery || !searchQuery.trim()) return;
    isLoading = true;
    const t0 = performance.now();
    try {
      if (typeof store?.search === 'function') {
        await store.search(searchQuery, { limit: 10 }).catch(() => null);
      }
    } finally {
      lastDuration = Math.round(performance.now() - t0);
      isLoading = false;
      await tick();
      if (typeof document !== 'undefined') document.querySelector('#search-results')?.scrollIntoView({ behavior: 'smooth' });
    <script lang="ts">
      import { tick } from 'svelte';
      import { enhancedRAGStore } from '$lib/stores/enhanced-rag-store.js';
      import Input from '$lib/components/ui/enhanced-bits/Input.svelte';
      import Button from '$lib/components/ui/enhanced-bits/Button.svelte';

      const store = enhancedRAGStore as any;
      let searchQuery = '';
      let isLoading = false;
      let lastDuration = 0;

      async function handleSearch() {
        if (!searchQuery || !searchQuery.trim()) return;
        isLoading = true;
        const t0 = performance.now();
        try {
          if (typeof store?.search === 'function') {
            await store.search(searchQuery, { limit: 10 }).catch(() => null);
          }
        } finally {
          lastDuration = Math.round(performance.now() - t0);
          isLoading = false;
          await tick();
          if (typeof document !== 'undefined') document.querySelector('#search-results')?.scrollIntoView({ behavior: 'smooth' });
        }
      }
<script lang="ts">
  import { tick } from 'svelte';
  import { enhancedRAGStore } from '$lib/stores/enhanced-rag-store.js';
  import Input from '$lib/components/ui/enhanced-bits/Input.svelte';
  import Button from '$lib/components/ui/enhanced-bits/Button.svelte';

  const store = enhancedRAGStore as any;
  let searchQuery = '';
  let isLoading = false;
  let lastDuration = 0;

  async function handleSearch() {
    if (!searchQuery || !searchQuery.trim()) return;
    isLoading = true;
    const t0 = performance.now();
    try {
      if (typeof store?.search === 'function') {
        await store.search(searchQuery, { limit: 10 }).catch(() => null);
      }
    } finally {
      lastDuration = Math.round(performance.now() - t0);
      isLoading = false;
      await tick();
      if (typeof document !== 'undefined') document.querySelector('#search-results')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  async function handleOptimize() {
    if (typeof store?.optimizeCache === 'function') await store.optimizeCache().catch(() => null);
  }

  $: ragState = store?.state || { didYouMean: [], error: null, currentQuery: '', cacheMetrics: { hitRate: 0 } };
  $: intelligentSuggestions = store?.intelligentSuggestions || [];
  $: optimizedResults = store?.results || [];
  $: searchDuration = lastDuration;
</script>

<div class="enhanced-rag-interface nes-container">
  <div class="search-bar bits-row">
    <Input bind:value={searchQuery} placeholder="Ask about case documents..." class="bits-input" />
    <Button onclick={handleSearch} disabled={isLoading} class="bits-btn ml-2"
      >{isLoading ? 'Searching...' : 'Search'}</Button
    >
    <Button onclick={handleOptimize} class="bits-btn ml-2">Optimize</Button>
  </div>

  <div class="meta mt-3"><small>Last search time: {searchDuration}ms</small></div>

  {#if intelligentSuggestions.length}
    <div class="mt-3">
      <div class="mb-2"><strong>Suggestions</strong></div>
      <div class="suggestions">
        {#each intelligentSuggestions as s}
          <Button
            onclick={() => {
              searchQuery = s;
              handleSearch();
            }}
            class="bits-chip mr-2">{s}</Button
          >
        {/each}
      </div>
    </div>
  {/if}

  <div id="search-results" class="results mt-4">
    {#if optimizedResults && optimizedResults.length > 0}
      <div class="results-header nes-container p-3">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="is-primary">
              {optimizedResults.length} results {#if ragState.currentQuery}for "{ragState.currentQuery}"{/if}
            </h3>
            <p class="text-sm">
              Found in {searchDuration}ms • Cache hit rate: {Math.round((ragState.cacheMetrics?.hitRate || 0) * 100)}%
            </p>
          </div>
        </div>
      </div>

      <div class="space-y-3 mt-3">
        {#each optimizedResults as result}
          <div class="nes-container p-3">
            <div class="result-row">
              <div class="result-main">
                <h4>{result?.document?.title || result?.id || 'Document'}</h4>
                {#if result?.highlights && result.highlights.length > 0}
                  <div class="highlights mt-2">{@html result.highlights[0]}</div>
                {/if}
              </div>
              <div class="result-meta">
                <div class="badge">Relevance: {Math.round((result?.score || 0) * 100)}%</div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="nes-container p-4 mt-3">
        <p class="text-sm text-gray-600">No results yet. Try searching for a case term or document title.</p>
      </div>
    {/if}
  </div>

  {#if ragState.error}
    <div class="nes-container is-error mt-3 p-3"><strong>Error:</strong> {ragState.error}</div>
  {/if}
</div>

<style>
  .enhanced-rag-interface {
    padding: 0.75rem;
  }
  .search-bar {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .bits-row :global(.bits-input) {
    min-width: 320px;
  }
  .bits-chip {
    margin-bottom: 6px;
  }
  .result-row {
    display: flex;
    justify-content: space-betweenn;
    gap: 12px;
  }
  .result-main h4 {
    margin: 0 0 6px 0;
  }
  .badge {
    font-size: 0.85rem;
    background: #edf2ff;
    padding: 4px 8px;
    border-radius: 6px;
  }
</style>

