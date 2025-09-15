<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription
  } from '$lib/components/ui/enhanced-bits';
  import {
    Input
  } from '$lib/components/ui/enhanced-bits';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Search, BookOpen, ExternalLink, Bot, MessageSquare } from 'lucide-svelte';
  import { onMount } from 'svelte';

  // In Svelte 5 (runes mode) don't use `export let` for page props — use $props()
  const { data } = $props() as { data: unknown };
let EnhancedFuseSearch = $state<any >(null);

  onMount(async () => {
    EnhancedFuseSearch = (await import('$lib/components/search/EnhancedFuseSearch.svelte')).default;
  });

  // Simple search state
let searchQuery = $state<string >('');
let searchResults = $state<any[] >([]);
let isSearching = $state<boolean >(false);

  async function performSearch() {
    if (!searchQuery.trim()) return;

    isSearching = true;
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        jurisdiction: 'all',
        category: 'all',
      });

      const response = await fetch(`/api/laws/search?${params}`);
      const result = await (response as { json?: unknown }).json();

      if ((result as { success?: unknown; laws?: unknown; error?: unknown }).success) {
        searchResults = (result as { success?: unknown; laws?: unknown; error?: unknown }).laws || [];
      } else {
        searchResults = [];
        console.error('Search failed:', (result as { success?: unknown; laws?: unknown; error?: unknown }).error);
      }
    } catch (error) {
      console.error('Search error:', error);
      searchResults = [];
    } finally {
      isSearching = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      performSearch();
    }
  }

  // AI toolbar event handlers (typed)
  function handleAISearchResult(result: unknown) {
    console.log('AI Search Result:', result);
    if (result?.laws) {
      searchResults = (result as { success?: unknown; laws?: unknown; error?: unknown }).laws;
    }
  }

  function handleAIChatResult(result: unknown) {
    console.log('AI Chat Result:', result);
  }

  function handleAISummarizeResult(result: unknown) {
    console.log('AI Summarization Result:', result);
  }
</script>

<svelte:head>
  <title>Legal Resources - Laws & Regulations | YoRHa Legal AI</title>
  <meta
    name="description"
    content="Browse California and state laws with AI-powered search and summaries" />
  <!-- NES.css (optional) -->
  <link rel="stylesheet" href="https://unpkg.com/nes.css@2.3.0/css/nes.min.css" />
</svelte:head>

<div class="container mx-auto py-8 space-y-8 nes-container is-rounded">
  <!-- Header -->
  <div class="text-center space-y-4">
    <h1 class="text-4xl font-bold tracking-tight">Legal Resources</h1>
    <p class="text-xl nes-text is-disabled max-w-2xl mx-auto">
      Browse California and state laws with AI-powered search and summaries
    </p>
  </div>

  <!-- Enhanced Fuse.js Search (client-only) -->
  {#if EnhancedFuseSearch}
    <EnhancedFuseSearch
      maxResults={10}
      bind:results={searchResults}
      class="mb-4"
      onselect={(e: CustomEvent) => {
        const selected = e.detail;
        if (selected?.title) {
          searchQuery = selected.title;
        }
      }}
    />
  {/if}
  <!-- Simple Search -->
  <div class="nes-container">
    <div class="yorha-panel-header">
      <h3 class="nes-text is-primary flex items-center gap-2">
        <Search class="h-5 w-5" />
        Search Laws & Regulations
      </h3>
    </div>
    <div class="yorha-panel-content space-y-4">
      <div class="flex gap-2">
          <Input
          placeholder="Search laws, codes, regulations..."
          bind:value={searchQuery}
          onkeydown={handleKeydown}
          class="flex-1" />
        <button onclick={performSearch} disabled={isSearching || !searchQuery.trim()} class="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground py-2 px-3 hover:opacity-90 transition disabled:opacity-50">
          {#if isSearching}
            Loading...
          {:else}
            <Search class="h-4 w-4 mr-2" />
            Search
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Quick Links -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold flex items-center gap-2">
      <BookOpen class="h-6 w-6" />
      Quick Access
    </h2>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each (data as { quickLinks?: unknown }).quickLinks as link}
        <div class="hover:shadow-lg transition-all duration-200 nes-container">
          <div class="yorha-panel-header">
            <h3 class="nes-text is-primary text-lg">{link.title}</h3>
            <p class="nes-text">{link.description}</p>
            <div class="flex gap-2">
              <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">{link.jurisdiction}</span>
              <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">{link.category}</span>
            </div>
          </div>
          <div class="yorha-panel-content">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              class="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground py-2 px-3 hover:opacity-90 transition">
              <ExternalLink class="h-4 w-4" />
              Browse {link.title}
            </a>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Search Results -->
  {#if searchResults.length > 0}
    <div class="space-y-4">
      <h2 class="text-2xl font-semibold">
        Search Results ({searchResults.length})
      </h2>

      <div class="space-y-4">
        {#each searchResults as law}
          <div class="nes-container">
            <div class="yorha-panel-header">
              <h3 class="nes-text is-primary">{law.title}</h3>
              <p class="nes-text">
                {law.jurisdiction} • {law.category}
              </p>
            </div>
            <div class="yorha-panel-content">
              <p class="mb-4 text-sm">{law.description}</p>
              <div class="flex gap-2">
                <button onclick={() => handleAISummarizeResult(law)} class="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-1 text-sm">
                  <Bot class="h-4 w-4 mr-2" />
                  <span>AI Summary</span>
                </button>
                <button onclick={() => handleAIChatResult(law)} class="inline-flex items-center gap-2 rounded-md border px-3 py-1 text-sm">
                  <MessageSquare class="h-4 w-4 mr-2" />
                  <span>AI Chat</span>
                </button>
                {#if law.fullTextUrl}
                  <a href={law.fullTextUrl} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-md border px-3 py-1 text-sm">
                    Full Text
                  </a>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else if searchQuery && !isSearching}
    <div class="nes-container">
      <div class="yorha-panel-content py-8 text-center">
        <p class="nes-text is-disabled">No results found for "{searchQuery}"</p>
      </div>
    </div>
  {/if}
</div>

