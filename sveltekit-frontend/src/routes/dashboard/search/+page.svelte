<!--
  Vector Search - SvelteKit 2 + pgvector + AI-powered semantic search
  Advanced legal document search with similarity matching
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  // Modern UI Components  
  import * as Card from '$lib/components/ui/card';
  import {
    Button
  } from '$lib/components/ui/enhanced-bits';;
  import {
    Input
  } from '$lib/components/ui/enhanced-bits';;
  import { Badge } from '$lib/components/ui/badge';
  import * as Tabs from '$lib/components/ui/tabs';
  import { Progress } from '$lib/components/ui/progress';
  
  // Icons
  import { 
    Search, Sparkles, Filter, Zap, FileText, 
    Brain, Target, Clock, TrendingUp, Eye,
    ChevronRight, Lightbulb, Database, Settings,
    BookOpen, Scale, AlertCircle, CheckCircle
  } from 'lucide-svelte';
  
  // Types for search results
  interface VectorSearchResult {
    id: string;
    document_id: string;
    title: string;
    content_preview: string;
    similarity_score: number;
    document_type: 'evidence' | 'case_note' | 'contract' | 'brief' | 'precedent';
    case_id?: string;
    metadata: {
      file_type?: string;
      upload_date?: string;
      tags?: string[];
      confidence?: number;
    };
    highlights?: string[];
  }
  
  interface SearchResponse {
    success: boolean;
    results: VectorSearchResult[];
    query_info: {
      original_query: string;
      processed_query: string;
      embedding_model: string;
      search_time_ms: number;
      total_results: number;
    };
    suggestions?: string[];
  }
  
  // State
  let query = $state('');
  let loading = $state(false);
  let results = $state<VectorSearchResult[]>([]);
  let searchInfo = $state<SearchResponse['query_info'] | null>(null);
  let suggestions = $state<string[]>([]);
  let error = $state<string | null>(null);
  let searchMode = $state<'semantic' | 'keyword' | 'hybrid'>('semantic');
  let selectedTypes = $state<Set<string>>(new Set());
  let similarityThreshold = $state(0.7);
  
  // Search suggestions for different legal domains
  const searchSuggestions = [
    'Contract breach and damages analysis',
    'Intellectual property infringement precedents', 
    'Employment law termination cases',
    'Personal injury liability determination',
    'Corporate merger compliance requirements',
    'Real estate title dispute resolution',
    'Criminal defense evidence evaluation',
    'Tax law regulatory compliance'
  ];
  
  // Document type filters
  const documentTypes = [
    { value: 'evidence', label: 'Evidence', icon: FileText, color: 'bg-blue-500' },
    { value: 'case_note', label: 'Case Notes', icon: BookOpen, color: 'bg-green-500' },
    { value: 'contract', label: 'Contracts', icon: Scale, color: 'bg-purple-500' },
    { value: 'brief', label: 'Briefs', icon: Target, color: 'bg-orange-500' },
    { value: 'precedent', label: 'Precedents', icon: Lightbulb, color: 'bg-yellow-500' }
  ];
  
  // Perform vector search
  async function performSearch() {
    if (!query.trim()) return;
    
    loading = true;
    error = null;
    results = [];
    searchInfo = null;
    
    try {
      const requestBody = {
        query: query.trim(),
        mode: searchMode,
        filters: {
          document_types: Array.from(selectedTypes),
          similarity_threshold: similarityThreshold,
          limit: 20
        },
        options: {
          include_highlights: true,
          include_metadata: true,
          boost_recent: true
        }
      };
      
      console.log('Vector search request:', requestBody);
      
      const response = await fetch('/api/unified/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      const data: SearchResponse = await response.json();
      
      if (!data.success) {
        throw new Error('Search request failed');
      }
      
      results = data.results;
      searchInfo = data.query_info;
      suggestions = data.suggestions || [];
      
      console.log('Vector search results:', data);
      
    } catch (err) {
      console.error('Search error:', err);
      error = err instanceof Error ? err.message : 'Search failed';
    } finally {
      loading = false;
    }
  }
  
  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      performSearch();
    }
  }
  
  function setSuggestionQuery(suggestion: string) {
    query = suggestion;
    performSearch();
  }
  
  function toggleDocumentType(type: string) {
    if (selectedTypes.has(type)) {
      selectedTypes.delete(type);
    } else {
      selectedTypes.add(type);
    }
    selectedTypes = new Set(selectedTypes); // Trigger reactivity
  }
  
  function getSimilarityColor(score: number): string {
    if (score >= 0.9) return 'text-green-600 bg-green-100';
    if (score >= 0.7) return 'text-blue-600 bg-blue-100';
    if (score >= 0.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  }
  
  function getSimilarityLabel(score: number): string {
    if (score >= 0.9) return 'Excellent Match';
    if (score >= 0.7) return 'Good Match';
    if (score >= 0.5) return 'Moderate Match';
    return 'Weak Match';
  }
  
  function formatSearchTime(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }
  
  // Initialize with example search on mount
  onMount(() => {
    // Auto-suggest based on existing RAG demo
    if (!query) {
      query = 'Contract breach and liability analysis';
    }
  });
</script>

<svelte:head>
  <title>Vector Search - Legal AI Dashboard</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-nier-text-primary flex items-center gap-3">
        <Brain class="w-8 h-8 text-nier-accent-warm" />
        Vector Search
      </h1>
      <p class="text-nier-text-muted mt-1">AI-powered semantic search across legal documents</p>
    </div>
    <div class="flex items-center gap-2">
      <Badge variant="outline" class="text-nier-accent-warm border-nier-accent-warm">
        <Sparkles class="w-3 h-3 mr-1" />
        pgvector + AI
      </Badge>
      <Button class="bits-btn bits-btn" variant="outline" size="sm">
        <Settings class="w-4 h-4 mr-2" />
        Settings
      </Button>
    </div>
  </div>
  
  <!-- Search Interface -->
  <Card.Root>
    <Card.Content class="p-6">
      <div class="space-y-4">
        <!-- Search Input -->
        <div class="relative">
          <Search class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-nier-text-muted" />
          <Input
            bind:value={query}
            onkeypress={handleKeyPress}
            placeholder="Describe your legal research question in natural language..."
            class="pl-12 pr-4 py-3 text-lg border-2 border-nier-border-muted focus:border-nier-accent-warm"
            disabled={loading}
          />
          <Button 
            onclick={performSearch}
            disabled={loading || !query.trim()}
            class="absolute right-2 top-1/2 transform -translate-y-1/2 gap-2 bits-btn bits-btn"
          >
            {#if loading}
              <div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              Searching...
            {:else}
              <Zap class="w-4 h-4" />
              Search
            {/if}
          </Button>
        </div>
        
        <!-- Search Mode Tabs -->
        <Tabs.Root bind:value={searchMode} class="w-full">
          <Tabs.List class="grid w-full grid-cols-3">
            <Tabs.Trigger value="semantic" class="gap-2">
              <Brain class="w-4 h-4" />
              Semantic
            </Tabs.Trigger>
            <Tabs.Trigger value="keyword" class="gap-2">
              <Target class="w-4 h-4" />
              Keyword
            </Tabs.Trigger>
            <Tabs.Trigger value="hybrid" class="gap-2">
              <Sparkles class="w-4 h-4" />
              Hybrid
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>
        
        <!-- Filters -->
        <div class="flex flex-wrap gap-4 items-center">
          <div class="flex items-center gap-2">
            <Filter class="w-4 h-4 text-nier-text-muted" />
            <span class="text-sm text-nier-text-muted">Document Types:</span>
          </div>
          
          {#each documentTypes as docType}
            <button
              onclick={() => toggleDocumentType(docType.value)}
              class="flex items-center gap-2 px-3 py-1 rounded-full border transition-all
                     {selectedTypes.has(docType.value) 
                       ? 'border-nier-accent-warm bg-nier-accent-warm text-nier-bg-primary' 
                       : 'border-nier-border-muted hover:border-nier-accent-warm'}"
            >
              <svelte:component this={docType.icon} class="w-3 h-3" />
              <span class="text-xs">{docType.label}</span>
            </button>
          {/each}
          
          <div class="ml-auto flex items-center gap-2">
            <span class="text-xs text-nier-text-muted">Similarity:</span>
            <input
              type="range"
              bind:value={similarityThreshold}
              min="0.1"
              max="1"
              step="0.1"
              class="w-20"
            />
            <span class="text-xs font-mono">{similarityThreshold}</span>
          </div>
        </div>
      </div>
    </Card.Content>
  </Card.Root>
  
  <!-- Search Results -->
  {#if searchInfo}
    <Card.Root>
      <Card.Header>
        <div class="flex items-center justify-between">
          <Card.Title class="flex items-center gap-2">
            <Database class="w-5 h-5" />
            Search Results ({results.length})
          </Card.Title>
          <div class="flex items-center gap-4 text-sm text-nier-text-muted">
            <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">{formatSearchTime(searchInfo.search_time_ms)}</span>
            <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">{searchInfo.embedding_model}</span>
          </div>
        </div>
        <Card.Description>
          Query: "{searchInfo.processed_query}" • Total: {searchInfo.total_results} matches
        </Card.Description>
      </Card.Header>
      
      <Card.Content class="space-y-4">
        {#if loading}
          <div class="text-center py-8">
            <div class="animate-spin w-8 h-8 border-4 border-nier-accent-warm border-t-transparent rounded-full mx-auto"></div>
            <p class="mt-2 text-nier-text-muted">Searching vector space...</p>
          </div>
        {:else if error}
          <div class="text-center py-8">
            <AlertCircle class="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p class="text-red-600">{error}</p>
            <Button onclick={performSearch} variant="outline" size="sm" class="mt-2 bits-btn bits-btn">
              Retry Search
            </Button>
          </div>
        {:else if results.length === 0}
          <div class="text-center py-8">
            <Search class="w-8 h-8 text-nier-text-muted mx-auto mb-2" />
            <p class="text-nier-text-muted">No matching documents found</p>
            <p class="text-sm text-nier-text-muted mt-1">Try adjusting your query or filters</p>
          </div>
        {:else}
          {#each results as result, i}
            <div class="border border-nier-border-muted rounded-lg p-4 hover:bg-nier-bg-tertiary transition-colors">
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-nier-accent-warm/10 rounded-lg flex items-center justify-center text-nier-accent-warm font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <h3 class="font-medium text-nier-text-primary hover:text-nier-accent-warm cursor-pointer">
                      {result.title || `Document ${result.document_id.slice(0, 8)}`}
                    </h3>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">{result.document_type.replace('_', ' ')}</span>
                      {#if result.case_id}
                        <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">Case: {result.case_id.slice(0, 8)}</span>
                      {/if}
                      {#if result.metadata.file_type}
                        <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">{result.metadata.file_type.toUpperCase()}</span>
                      {/if}
                    </div>
                  </div>
                </div>
                
                <div class="flex items-center gap-2">
                  <Badge class="text-xs {getSimilarityColor(result.similarity_score)}">
                    {getSimilarityLabel(result.similarity_score)}
                  </Badge>
                  <span class="text-xs font-mono text-nier-text-muted">
                    {(result.similarity_score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <p class="text-sm text-nier-text-secondary leading-relaxed mb-3">
                {result.content_preview}
              </p>
              
              {#if result.highlights && result.highlights.length > 0}
                <div class="mb-3">
                  <h4 class="text-xs font-medium text-nier-text-muted mb-2">Key Highlights:</h4>
                  <div class="flex flex-wrap gap-1">
                    {#each result.highlights.slice(0, 3) as highlight}
                      <span class="text-xs px-2 py-1 bg-nier-accent-warm/10 text-nier-accent-warm rounded">
                        {highlight}
                      </span>
                    {/each}
                  </div>
                </div>
              {/if}
              
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4 text-xs text-nier-text-muted">
                  {#if result.metadata.upload_date}
                    <div class="flex items-center gap-1">
                      <Clock class="w-3 h-3" />
                      {new Date(result.metadata.upload_date).toLocaleDateString()}
                    </div>
                  {/if}
                  {#if result.metadata.confidence}
                    <div class="flex items-center gap-1">
                      <CheckCircle class="w-3 h-3" />
                      {(result.metadata.confidence * 100).toFixed(1)}% confidence
                    </div>
                  {/if}
                </div>
                
                <div class="flex items-center gap-2">
                  <Button class="bits-btn bits-btn" variant="ghost" size="sm">
                    <Eye class="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button class="bits-btn bits-btn" variant="ghost" size="sm">
                    <ChevronRight class="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}
  
  <!-- Search Suggestions -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="flex items-center gap-2">
        <Lightbulb class="w-5 h-5" />
        Search Suggestions
      </Card.Title>
      <Card.Description>
        Try these common legal research queries
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        {#each searchSuggestions as suggestion}
          <button
            onclick={() => setSuggestionQuery(suggestion)}
            class="text-left p-3 text-sm bg-nier-bg-tertiary hover:bg-nier-accent-warm/10 
                   rounded-lg transition-colors border border-transparent hover:border-nier-accent-warm/20"
            disabled={loading}
          >
            <div class="flex items-center justify-between">
              <span>{suggestion}</span>
              <ChevronRight class="w-4 h-4 text-nier-text-muted" />
            </div>
          </button>
        {/each}
      </div>
    </Card.Content>
  </Card.Root>
  
  <!-- Performance Metrics -->
  {#if searchInfo}
    <Card.Root>
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <TrendingUp class="w-5 h-5" />
          Search Performance
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div class="text-nier-text-muted">Query Processing</div>
            <div class="font-medium">{formatSearchTime(searchInfo.search_time_ms)}</div>
          </div>
          <div>
            <div class="text-nier-text-muted">Results Found</div>
            <div class="font-medium">{searchInfo.total_results}</div>
          </div>
          <div>
            <div class="text-nier-text-muted">Embedding Model</div>
            <div class="font-medium">{searchInfo.embedding_model}</div>
          </div>
          <div>
            <div class="text-nier-text-muted">Search Mode</div>
            <div class="font-medium capitalize">{searchMode}</div>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>