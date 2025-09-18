<!-- @migration-task Error while migrating Svelte code: Unexpected keyword 'class'
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected keyword 'class' -->
<!--
  LegalSearchCombobox.svelte
  
  Sophisticated legal search component with:
  - Vector search integration
  - AI-powered suggestions  
  - Multi-entity search (cases, evidence, precedents, statutes)
  - Real-time results with confidence scores
  - Advanced filtering capabilities
-->
<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { createEventDispatcher, onMount } from 'svelte';
  import { Combobox } from 'bits-ui';
  import { Search, FileText, Scale, Shield, Users, Zap, Clock } from 'lucide-svelte';
  import { debounce } from 'lodash-es';
  import { cn } from '$lib/utils/cn';
  // Types
  interface SearchResult {
    id: string;
    title: string;
    type: 'case' | 'evidence' | 'precedent' | 'statute' | 'criminal' | 'document';
    content: string;
    score: number;
    metadata: {
      date?: string;
      jurisdiction?: string;
      status?: string;
      confidentiality?: string;
      caseId?: string;
      tags?: string[];
    };
    highlights?: string[];
  }
  interface SearchOptions {
    categories: Array<'cases' | 'evidence' | 'precedents' | 'statutes' | 'criminals' | 'documents'>;
    enableVectorSearch: boolean;
    aiSuggestions: boolean;
    maxResults: number;
    similarityThreshold: number;
    includeMetadata: boolean;
  }
  // Props
  let { placeholder = $bindable()  }: { placeholder = $bindable() : unknown } = $props(); // "Search cases, precedents, statutes, evidence...";
  let { value = $bindable()  }: { value = $bindable() : unknown } = $props(); // "";
  let { categories = $bindable()  }: { categories = $bindable() : unknown } = $props(); // SearchOptions['categories'] = ['cases', 'evidence', 'precedents', 'statutes'];
  let { enableVectorSearch = $bindable()  }: { enableVectorSearch = $bindable() : unknown } = $props(); // true;
  let { aiSuggestions = $bindable()  }: { aiSuggestions = $bindable() : unknown } = $props(); // true;
  let { maxResults = $bindable()  }: { maxResults = $bindable() : unknown } = $props(); // 20;
  let { similarityThreshold = $bindable()  }: { similarityThreshold = $bindable() : unknown } = $props(); // 0.7;
  let { includeMetadata = $bindable()  }: { includeMetadata = $bindable() : unknown } = $props(); // true;
  let { disabled = $bindable()  }: { disabled = $bindable() : unknown } = $props(); // false;
  let { class: className = $bindable("")  }: { class: className = $bindable("") : unknown } = $props();
  // State
  let open = $state(false);
  let inputValue = value;
  let searchResults = $state<SearchResult[] >([]);
  let isLoading = $state(false);
  let selectedResult = $state<SearchResult | null >(null);
  let recentSearches = $state<string[] >([]);
  let suggestions = $state<string[] >([]);
  // Event dispatcher
  const dispatch = createEventDispatcher();
  // Icons for different types
  const typeIcons = {
    caseItem: Scale,
    evidence: Shield,
    precedent: FileText,
    statute: FileText,
    criminal: Users,
    document: FileText
  };
  const typeColors = {
    caseItem: 'text-blue-600',
    evidence: 'text-red-600', 
    precedent: 'text-purple-600',
    statute: 'text-green-600',
    criminal: 'text-orange-600',
    document: 'text-gray-600'
  };
  // Load recent searches from localStorage
  onMount(() => {
    const stored = localStorage.getItem('legalSearchHistory');
    if (stored) {
      recentSearches = JSON.parse.slice(0, 5);
    }
    // Load AI suggestions if enabled
    if (aiSuggestions) {
      loadAISuggestions();
    }
  });
  // Debounced search function
  const performSearch = debounce(async (query: string) => {
    if (query.length < 2) {
      searchResults = [];
      return;
    }
    isLoading = true;
    try {
      const searchParams = new URLSearchParams({
        q: query,
        limit: maxResults.toString(),
        threshold: similarityThreshold.toString(),
        categories: categories.join(','),
        vectorSearch: enableVectorSearch.toString(),
        aiSuggestions: aiSuggestions.toString(),
        includeMetadata: includeMetadata.toString()
      });
      const response = await fetch(`/api/search/legal?${searchParams}`);
      const data = await (response as { json?: unknown }).json();
      if ((data as { toString?: unknown; success?: unknown; results?: unknown; error?: unknown; suggestions?: unknown }).success) {
        searchResults = (data as { toString?: unknown; success?: unknown; results?: unknown; error?: unknown; suggestions?: unknown }).results.map((result: unknown) => ({
          id: (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).id,
          title: (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).title || (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).content?.substring(0, 100) + '...',
          type: (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).type || 'document',
          content: (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).content || (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).summary || '',
          score: (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).score || (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).similarity || 0,
          metadata: {
            date: (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).createdAt || (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).date,
            jurisdiction: (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).jurisdiction,
            status: (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).status,
            confidentiality: (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).confidentialityLevel,
            caseId: (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).caseId,
            tags: (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).tags || []
          },
          highlights: (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).highlights || []
        }));
        dispatch('search', { query, results: searchResults });
      } else {
        console.error(error);
        searchResults = [];
      }
    } catch (error) {
      console.error('Search error:', error);
      searchResults = [];
    } finally {
      isLoading = false;
    }
  }, 300);
  // Load AI-powered search suggestions
  async function loadAISuggestions() {
    try {
      const response = await fetch('/api/search/suggestions');
      const data = await (response as { json?: unknown }).json();
      if ((data as { toString?: unknown; success?: unknown; results?: unknown; error?: unknown; suggestions?: unknown }).success) {
        suggestions = (data as { toString?: unknown; success?: unknown; results?: unknown; error?: unknown; suggestions?: unknown }).suggestions || [];
      }
    } catch (error) {
      console.error('Failed to load AI suggestions:', error);
    }
  }
  // Handle input changes
  function handleInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    inputValue = target.value;
    value = inputValue;
    if (inputValue) {
      performSearch(inputValue);
    } else {
      searchResults = [];
    }
  }
  // Handle result selection
  function handleSelect(result: SearchResult) {
    selectedResult = result;
    inputValue = (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).title;
    value = inputValue;
    open = false;
    // Add to recent searches
    if (!recentSearches.includes.title)) {
      recentSearches = [(result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).title, ...recentSearches.slice(0, 4)];
      localStorage.setItem('legalSearchHistory', JSON.stringify(recentSearches));
    }
    dispatch('select', result);
  }
  // Handle clear
  function handleClear() {
    inputValue = "";
    value = "";
    selectedResult = null;
    searchResults = [];
    dispatch('clear');
  }
  // Get display results (includes recent searches when no query)
  let displayResults = $derived(inputValue.length < 2 );
    ? recentSearches.map(search => ({
        id: `recent-${search}`,
        title: search,
        type: 'recent' as any,
        content: 'Recent search',
        score: 1,
        metadata: })) as SearchResult[]
    : searchResults;
</script>

<div class={cn("relative w-full", className)}>
  <Combobox.Root bind:open bind:inputValue {disabled} class="w-full">
    
    <!-- Search Input -->
    <div class="relative">
      <Combobox.Input
        class={cn(
          "flex h-12 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pl-12 pr-10",
          "text-sm placeholder:text-gray-500",
          "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          selectedResult && "text-gray-900 font-medium"
        )}
        {placeholder} oninput={handleInputChange}
        autocomplete="off"
      />
      
      <!-- Search Icon -->
      <div class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
        {#if isLoading}
          <div class="animate-spin">
            <Zap class="h-5 w-5" />
          </div>
        {:else}
          <Search class="h-5 w-5" />
        {/if}
      </div>
      
      <!-- Clear Button -->
      {#if inputValue}
        <button
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          onclick={handleClear}
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      {/if}
    </div>
    
    <!-- Results Dropdown -->
    <Combobox.Content
      class={cn(
        "absolute top-full z-50 mt-2 max-h-96 w-full overflow-hidden",
        "rounded-lg border border-gray-200 bg-white shadow-xl",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
      )}
      sideOffset={4}
    >
      
      <!-- Search Categories Filter -->
      {#if inputValue.length >= 2}
        <div class="border-b border-gray-100 p-3">
          <div class="flex flex-wrap gap-2">
            {#each categories as category}
              <span class={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                "bg-blue-50 text-blue-700"
              )}>
                {category}
              </span>
            {/each}
            {#if enableVectorSearch}
              <span class={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                "bg-purple-50 text-purple-700"
              )}>
                <Zap class="mr-1 h-3 w-3" />
                AI Search
              </span>
            {/if}
          </div>
        </div>
      {/if}
      
      <!-- Results List -->
      <div class="max-h-80 overflow-auto p-1">
        {#if displayResults.length === 0 && inputValue.length >= 2}
          <div class="p-4 text-center text-gray-500">
            <Search class="mx-auto h-8 w-8 mb-2 text-gray-300" />
            <p class="text-sm">No results found</p>
            <p class="text-xs">Try different keywords or check spelling</p>
          </div>
        {:else if displayResults.length === 0 && inputValue.length < 2}
          <div class="p-4">
            <!-- Recent Searches -->
            {#if recentSearches.length > 0}
              <div class="mb-4">
                <p class="text-xs font-medium text-gray-500 mb-2 flex items-center">
                  <Clock class="mr-1 h-3 w-3" />
                  Recent Searches
                </p>
                {#each recentSearches as search}
                  <Combobox.Item
                    value={search}
                    class="flex items-center rounded-md px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                    onclick={() => {
                      inputValue = search;
                      performSearch(search);
                    }}
                  >
                    <Search class="mr-3 h-4 w-4 text-gray-400" />
                    {search}
                  </Combobox.Item>
                {/each}
              </div>
            {/if}
            
            <!-- AI Suggestions -->
            {#if suggestions.length > 0}
              <div>
                <p class="text-xs font-medium text-gray-500 mb-2 flex items-center">
                  <Zap class="mr-1 h-3 w-3" />
                  Suggested Searches
                </p>
                {#each suggestions.slice(0, 3) as suggestion}
                  <Combobox.Item
                    value={suggestion}
                    class="flex items-center rounded-md px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                    onclick={() => {
                      inputValue = suggestion;
                      performSearch(suggestion);
                    }}
                  >
                    <Zap class="mr-3 h-4 w-4 text-purple-400" />
                    {suggestion}
                  </Combobox.Item>
                {/each}
              </div>
            {/if}
          </div>
        {:else}
          {#each displayResults as result}
            <Combobox.Item
              value={(result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).title}
              class={cn(
                "flex items-start space-x-3 rounded-md p-3 text-sm",
                "hover:bg-gray-50 cursor-pointer transition-colors",
                "data-[highlighted]:bg-blue-50"
              )}
              onclick={() => handleSelect(result)}
            >
              <!-- Type Icon -->
              <div class={cn("flex-shrink-0 mt-1", typeColors[(result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).type] || 'text-gray-500')}>
                <svelte:component this={typeIcons[(result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).type] || FileText} class="h-4 w-4" />
              </div>
              
              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <p class="font-medium text-gray-900 truncate">
                    {(result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).title}
                  </p>
                  {#if (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).score}
                    <span class="flex-shrink-0 ml-2 text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                      {Math.round.score * 100)}%
                    </span>
                  {/if}
                </div>
                
                <!-- Content Preview -->
                {#if (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).content}
                  <p class="text-gray-600 text-xs mt-1 line-clamp-2">
                    {(result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).content.substring(0, 120)}...
                  </p>
                {/if}
                
                <!-- Metadata -->
                {#if (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).metadata && ((result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).metadata.date || (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).metadata.status || (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).metadata.jurisdiction)}
                  <div class="flex items-center space-x-2 mt-2">
                    {#if (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).metadata.date}
                      <span class="text-xs text-gray-500">
                        {new Date((result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).metadata.date).toLocaleDateString()}
                      </span>
                    {/if}
                    {#if (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).metadata.status}
                      <span class="text-xs bg-green-100 text-green-800 rounded px-1.5 py-0.5">
                        {(result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).metadata.status}
                      </span>
                    {/if}
                    {#if (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).metadata.jurisdiction}
                      <span class="text-xs bg-blue-100 text-blue-800 rounded px-1.5 py-0.5">
                        {(result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).metadata.jurisdiction}
                      </span>
                    {/if}
                  </div>
                {/if}
                
                <!-- Highlights -->
                {#if (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).highlights && (result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).highlights.length > 0}
                  <div class="mt-1 text-xs text-yellow-700">
                    <span class="bg-yellow-100 px-1 rounded">
                      ...{(result as { id?: unknown; title?: unknown; content?: unknown; type?: unknown; summary?: unknown; score?: unknown; similarity?: unknown; createdAt?: unknown; date?: unknown; jurisdiction?: unknown; status?: unknown; confidentialityLevel?: unknown; caseId?: unknown; tags?: unknown; highlights?: unknown; metadata?: unknown }).highlights[0]}...
                    </span>
                  </div>
                {/if}
              </div>
            </Combobox.Item>
          {/each}
        {/if}
      </div>
      
      <!-- Footer with search stats -->
      {#if searchResults.length > 0}
        <div class="border-t border-gray-100 p-2">
          <p class="text-xs text-gray-500 text-center">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} 
            {#if enableVectorSearch}• AI-powered search{/if}
          </p>
        </div>
      {/if}
      
    </Combobox.Content>
  </Combobox.Root>
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
