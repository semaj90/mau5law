<!--
  Unified Vector Search - Legal AI Dashboard
  Enhanced-Bits orchestrated components with Svelte 5 runes
-->
<script lang="ts">
  // Enhanced-Bits orchestrated components (Badge is a default export in this module)
  import Badge, { Button, Input } from '$lib/components/ui/enhanced-bits';
  import { OrchestratedCard, OrchestratedButton } from '$lib/components/ui/orchestrated';
  // NOTE: lucide-svelte named exports caused type/import issues in this project;
  // use a small inline icon map (emoji placeholders) to avoid breaking the build.
  const ICON = {
    brain: '🧠',
    sparkles: '✨',
    settings: '⚙️',
    search: '🔍',
    zap: '⚡',
    target: '🎯',
    filter: '🔎',
    fileText: '📄',
    bookOpen: '📖',
    scale: '⚖️',
    lightbulb: '💡',
    database: '🗄️',
    alert: '⚠️',
    clock: '🕒',
    check: '✅',
    eye: '👁️',
    chevronRight: '➡️',
    trendingUp: '📈'
  };

  // Enhanced types using orchestrated components
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
    }
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
    }
    suggestions?: string[];
  }

  // Svelte 5 runes for reactive state
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

  // documentTypes now carry direct icon components
  const documentTypes = [
    { value: 'evidence', label: 'Evidence', iconEmoji: ICON.fileText, color: 'bg-blue-500' },
    { value: 'case_note', label: 'Case Notes', iconEmoji: ICON.bookOpen, color: 'bg-green-500' },
    { value: 'contract', label: 'Contracts', iconEmoji: ICON.scale, color: 'bg-purple-500' },
    { value: 'brief', label: 'Briefs', iconEmoji: ICON.target, color: 'bg-orange-500' },
    { value: 'precedent', label: 'Precedents', iconEmoji: ICON.lightbulb, color: 'bg-yellow-500' }
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
        throw new Error(`Search failed: ${response.statusText || response.status}`);
      }
      const data = await response.json() as SearchResponse;
      if (!data.success) {
        throw new Error('Search request failed');
      }
      results = data.results || [];
      searchInfo = data.query_info || null;
      suggestions = data.suggestions || [];
      console.log('Vector search results:', data);
    } catch (err) {
      console.error('Search error:', err);
      error = err instanceof Error ? err.message : 'Search failed';
    } finally {
      loading = false;
    }
  }

  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter') {
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
  $effect(() => {
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
-        <Brain class="w-8 h-8 text-nier-accent-warm" />
+        <span class="w-8 h-8 text-nier-accent-warm inline-flex items-center justify-center text-2xl">{ICON.brain}</span>
        Vector Search
      </h1>
      <p class="text-nier-text-muted mt-1">AI-powered semantic search across legal documents</p>
    </div>
    <div class="flex items-center gap-2">
      <Badge variant="ghost" class="text-nier-accent-warm border-nier-accent-warm">
-        <Sparkles class="w-3 h-3 mr-1" />
+        <span class="mr-1">{ICON.sparkles}</span>
        pgvector + AI
      </Badge>
-      <Button class="bits-btn" variant="ghost" size="sm" on:click={() => {/* open settings */}}>
-        <Settings class="w-4 h-4 mr-2" />
+      <Button class="bits-btn" variant="ghost" size="sm" onclick={() => {/* open settings */}}>
+        <span class="w-4 h-4 mr-2 inline-block">{ICON.settings}</span>
        Settings
      </Button>
    </div>
  </div>

  <!-- Search Interface - Enhanced-Bits orchestrated -->
  <OrchestratedCard.Analysis>
    <div class="p-6 nes-container">
      <div class="space-y-4">
        <!-- Search Input -->
        <div class="relative">
-          <Search class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-nier-text-muted" />
+          <span class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-nier-text-muted">{ICON.search}</span>
          <!-- use value + oninput instead of bind:value if Input isn't bindable -->
          <Input
            value={query}
-            on:input={(e) => (query = (e.target as HTMLInputElement).value)}
-            on:keydown={handleKeyPress}
+            oninput={(e) => (query = (e.target as HTMLInputElement).value)}
+            onkeydown={handleKeyPress}
            placeholder="Describe your legal research question in natural language..."
            class="pl-12 pr-4 py-3 text-lg border-2 border-nier-border-muted focus:border-nier-accent-warm"
            disabled={loading}
          />
-          <OrchestratedButton.SearchSimilar
-            on:click={performSearch}
+          <OrchestratedButton.SearchSimilar
+            onclick={performSearch}
             disabled={loading || !query.trim()}
             class="absolute right-2 top-1/2 transform -translate-y-1/2 gap-2"
           >
             {#if loading}
               <div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
               Searching...
             {:else}
-              <Zap class="w-4 h-4" />
+              <span class="w-4 h-4">{ICON.zap}</span>
               Search
             {/if}
           </OrchestratedButton.SearchSimilar>
         </div>

         <!-- Search Mode Tabs -->
         <!-- simple inline tab buttons to avoid external Tabs API mismatch -->
         <div class="grid w-full grid-cols-3 gap-2">
-          <button class={"gap-2 px-3 py-2 rounded " + (searchMode === 'semantic' ? 'bg-nier-accent-warm text-white' : 'bg-transparent border')} on:click={() => (searchMode = 'semantic')}>
-            <Brain class="w-4 h-4 inline-block mr-1" /> Semantic
+          <button class={"gap-2 px-3 py-2 rounded " + (searchMode === 'semantic' ? 'bg-nier-accent-warm text-white' : 'bg-transparent border')} onclick={() => (searchMode = 'semantic')}>
+            <span class="inline-block mr-1">{ICON.brain}</span> Semantic
           </button>
-          <button class={"gap-2 px-3 py-2 rounded " + (searchMode === 'keyword' ? 'bg-nier-accent-warm text-white' : 'bg-transparent border')} on:click={() => (searchMode = 'keyword')}>
-            <Target class="w-4 h-4 inline-block mr-1" /> Keyword
+          <button class={"gap-2 px-3 py-2 rounded " + (searchMode === 'keyword' ? 'bg-nier-accent-warm text-white' : 'bg-transparent border')} onclick={() => (searchMode = 'keyword')}>
+            <span class="inline-block mr-1">{ICON.target}</span> Keyword
           </button>
-          <button class={"gap-2 px-3 py-2 rounded " + (searchMode === 'hybrid' ? 'bg-nier-accent-warm text-white' : 'bg-transparent border')} on:click={() => (searchMode = 'hybrid')}>
-            <Sparkles class="w-4 h-4 inline-block mr-1" /> Hybrid
+          <button class={"gap-2 px-3 py-2 rounded " + (searchMode === 'hybrid' ? 'bg-nier-accent-warm text-white' : 'bg-transparent border')} onclick={() => (searchMode = 'hybrid')}>
+            <span class="inline-block mr-1">{ICON.sparkles}</span> Hybrid
           </button>
         </div>

         <!-- Filters -->
         <div class="flex flex-wrap gap-4 items-center">
           <div class="flex items-center gap-2">
-            <Filter class="w-4 h-4 text-nier-text-muted" />
+            <span class="w-4 h-4 text-nier-text-muted">{ICON.filter}</span>
             <span class="text-sm text-nier-text-muted">Document Types:</span>
           </div>

           {#each documentTypes as docType}
             <button
-              onclick={() => toggleDocumentType(docType.value)}
+              onclick={() => toggleDocumentType(docType.value)}
               class={
                 "flex items-center gap-2 px-3 py-1 rounded-full border transition-all " +
                 (selectedTypes.has(docType.value)
                   ? 'border-nier-accent-warm bg-nier-accent-warm text-nier-bg-primary'
                   : 'border-nier-border-muted hover:border-nier-accent-warm')
               }
             >
               <!-- docType.icon is a component reference -->
-              <svelte:component this={docType.icon} class="w-3 h-3" />
+              <span class="w-3 h-3">{docType.iconEmoji}</span>
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
     </div>
   </OrchestratedCard.Analysis>

   <!-- Search Results -->
-  {#if searchInfo}
+  {#if searchInfo}
     <OrchestratedCard.Evidence>
       <div class="nes-container">
         <div class="flex items-center justify-between">
           <div class="flex items-center gap-2">
-            <Database class="w-5 h-5" />
+            <span class="w-5 h-5">{ICON.database}</span>
             <h2 class="text-lg font-medium">Search Results ({results.length})</h2>
           </div>
           <div class="flex items-center gap-4 text-sm text-nier-text-muted">
             <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">{formatSearchTime(searchInfo.search_time_ms)}</span>
             <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">{searchInfo.embedding_model}</span>
           </div>
         </div>
         <p class="text-sm text-nier-text-muted mt-2">Query: "{searchInfo.processed_query}" • Total: {searchInfo.total_results} matches</p>
       </div>

       <div class="space-y-4 nes-container">
         {#if loading}
           <div class="text-center py-8">
             <div class="animate-spin w-8 h-8 border-4 border-nier-accent-warm border-t-transparent rounded-full mx-auto"></div>
             <p class="mt-2 text-nier-text-muted">Searching vector space...</p>
           </div>
         {:else if error}
           <div class="text-center py-8">
-            <AlertCircle class="w-8 h-8 text-red-500 mx-auto mb-2" />
+            <div class="w-8 h-8 text-red-500 mx-auto mb-2 text-2xl">{ICON.alert}</div>
             <p class="text-red-600">{error}</p>
-            <Button on:click={performSearch} variant="ghost" size="sm" class="mt-2 bits-btn">
+            <Button onclick={performSearch} variant="ghost" size="sm" class="mt-2 bits-btn">
               Retry Search
             </Button>
           </div>
         {:else if results.length === 0}
           <div class="text-center py-8">
-            <Search class="w-8 h-8 text-nier-text-muted mx-auto mb-2" />
+            <div class="w-8 h-8 text-nier-text-muted mx-auto mb-2 text-2xl">{ICON.search}</div>
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
                       {#if result.metadata?.file_type}
                         <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">{result.metadata.file_type.toUpperCase()}</span>
                       {/if}
                     </div>
                   </div>
                 </div>

                 <div class="flex items-center gap-2">
                   <Badge class={"text-xs " + getSimilarityColor(result.similarity_score)}>
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
-                  {#if result.metadata?.upload_date}
-                    <div class="flex items-center gap-1">
-                      <Clock class="w-3 h-3" />
-                      {new Date(result.metadata.upload_date).toLocaleDateString()}
-                    </div>
-                  {/if}
+                  {#if result.metadata?.upload_date}
+                    <div class="flex items-center gap-1">
+                      <span class="w-3 h-3">{ICON.clock}</span>
+                      {new Date(result.metadata.upload_date).toLocaleDateString()}
+                    </div>
+                  {/if}
                   {#if typeof result.metadata?.confidence === 'number'}
                     <div class="flex items-center gap-1">
-                      <CheckCircle class="w-3 h-3" />
+                      <span class="w-3 h-3">{ICON.check}</span>
                       {(result.metadata.confidence * 100).toFixed(1)}% confidence
                     </div>
                   {/if}
                 </div>

                 <div class="flex items-center gap-2">
                   <Button class="bits-btn" variant="ghost" size="sm">
-                    <Eye class="w-4 h-4 mr-1" />
+                    <span class="w-4 h-4 mr-1">{ICON.eye}</span>
                     View
                   </Button>
                   <Button class="bits-btn" variant="ghost" size="sm">
-                    <ChevronRight class="w-4 h-4" />
+                    <span class="w-4 h-4">{ICON.chevronRight}</span>
                   </Button>
                 </div>
               </div>
             </div>
           {/each}
         {/if}
       </div>
     </OrchestratedCard.Evidence>
   {/if}

   <!-- Search Suggestions -->
   <section class="nes-container">
     <div class="flex items-center gap-2">
-      <Lightbulb class="w-5 h-5" />
+      <span class="w-5 h-5">{ICON.lightbulb}</span>
       <h3 class="text-lg font-medium">Search Suggestions</h3>
     </div>
     <p class="text-sm text-nier-text-muted mt-1">Try these common legal research queries</p>

     <div class="nes-container mt-3">
       <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
         {#each searchSuggestions as suggestion}
           <button
-            on:click={() => setSuggestionQuery(suggestion)}
+            onclick={() => setSuggestionQuery(suggestion)}
             class="text-left p-3 text-sm bg-nier-bg-tertiary hover:bg-nier-accent-warm/10 rounded-lg transition-colors border border-transparent hover:border-nier-accent-warm/20"
             disabled={loading}
           >
             <div class="flex items-center justify-between">
               <span>{suggestion}</span>
-              <ChevronRight class="w-4 h-4 text-nier-text-muted" />
+              <span class="w-4 h-4 text-nier-text-muted">{ICON.chevronRight}</span>
             </div>
           </button>
         {/each}
       </div>
     </div>
   </section>

   <!-- Performance Metrics -->
-  {#if searchInfo}
+  {#if searchInfo}
     <section class="nes-container">
       <div class="flex items-center gap-2">
-        <TrendingUp class="w-5 h-5" />
+        <span class="w-5 h-5">{ICON.trendingUp}</span>
         <h3 class="text-lg font-medium">Search Performance</h3>
       </div>
       <div class="nes-container mt-3">
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
       </div>
     </section>
   {/if}
 </div>