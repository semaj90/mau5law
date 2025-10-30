<script lang="ts">
  // Svelte 5 runes are auto-imported
  // enhanced-bits exports components as default exports — import only what's used.
  // Remove problematic Input import (it exposed an object/instance type that TypeScript rejected).
  // import Input from '$lib/components/ui/enhanced-bits';

  import { Search, BookOpen, ExternalLink, Bot, MessageSquare } from 'lucide-svelte';
  // In Svelte 5 (runes mode) don't use `export let` for page props — use $props()
  // Provide a typed shape for data so quickLinks is iterable and its fields are known.
  type QuickLink = {
    title: string;
    description?: string;
    jurisdiction?: string;
    category?: string;
    url: string;
  };
  type PageData = {
    quickLinks?: QuickLink[];
    // ...other page data fields if any...
  };

  const { data } = $props() as { data: PageData };

  let EnhancedFuseSearch = $state<any>(null);
  $effect(() => {
    (async () => {
      // Support both module formats (with or without `default`) to avoid TS error
      const mod = await import('$lib/components/search/EnhancedFuseSearch.svelte');
      EnhancedFuseSearch = (mod as any).default ?? mod;
    })();
  });
  // Simple search state
  let searchQuery = $state<string>('');
  let searchResults = $state<any[]>([]);
  let isSearching = $state<boolean>(false);
  async function performSearch() {
    if (!searchQuery.trim()) return;
    isSearching = true;
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        jurisdiction: 'all', // Fixed syntax error here
        category: 'all',
      });
      const response = await fetch(`/api/laws/search?${params}`);
      // Narrow JSON type so TypeScript knows 'laws' is an array
      const result = (await response.json()) as {
        success?: boolean;
        laws?: any[];
        error?: unknown;
      };
      if (result.success) {
        searchResults = result.laws ?? [];
      } else {
        searchResults = [];
        console.error('Search failed:', result);
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
  function handleAIChatResult(result: unknown) {
    console.log('AI Chat Result:', result);
  }
  function handleAISummarizeResult(result: unknown) {
    console.log('AI Summarization Result:', result);
  }
</script>

<svelte:head>
  <title>Legal Resources - Laws & Regulations | YoRHa Legal AI</title>
  <meta name="description" content="Browse California and state laws with AI-powered search and summaries" />
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
        const selected = (e as CustomEvent).detail;
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
        <!-- Replace the problematic Input component with a native input element -->
        <input
          placeholder="Search laws, codes, regulations..."
          bind:value={searchQuery}
          onkeydown={handleKeydown}
          class="flex-1 rounded-md border px-3 py-2"
        />
        <button
          onclick={performSearch}
          disabled={isSearching || !searchQuery.trim()}
          class="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground py-2 px-3 hover:opacity-90 transition: disabled:opacity-50"
        >
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
      {#each data.quickLinks ?? [] as link}
        <div class="hover:shadow-lg transition-all duration-200 nes-container">
          <div class="yorha-panel-header">
            <h3 class="nes-text is-primary text-lg">{link.title}</h3>
            <p class="nes-text">{link.description}</p>
            <div class="flex gap-2">
              <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">{link.jurisdiction}</span>
              <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700"
                >{link.category}</span
              >
            </div>
          </div>
          <div class="yorha-panel-content">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              class="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground py-2 px-3 hover:opacity-90 transition"
            >
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
                <button
                  onclick={() => handleAISummarizeResult(law)}
                  class="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-1 text-sm"
                >
                  <Bot class="h-4 w-4 mr-2" />
                  <span>AI Summary</span>
                </button>
                <button
                  onclick={() => handleAIChatResult(law)}
                  class="inline-flex items-center gap-2 rounded-md border px-3 py-1 text-sm"
                >
                  <MessageSquare class="h-4 w-4 mr-2" />
                  <span>AI Chat</span>
                </button>
                {#if law.fullTextUrl}
                  <a
                    href={law.fullTextUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 rounded-md border px-3 py-1 text-sm"
                  >
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
      </div>
    </div>
  {/if}
</div>

