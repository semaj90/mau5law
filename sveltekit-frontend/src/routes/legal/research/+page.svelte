<script lang="ts">
  import { onMount } from 'svelte';
  import { nesGPUBridge } from '$lib/gpu/nes-gpu-memory-bridge';
  import HeadlessDialog from '$lib/headless/HeadlessDialog.svelte';
  import LoadingButton from '$lib/headless/LoadingButton.svelte';
  import FormField from '$lib/headless/FormField.svelte';
  
  // Icons
  import { 
    Search, BookOpen, Scale, FileText, Brain, Zap, 
    Filter, SortAsc, Eye, ExternalLink, Download, 
    Star, Bookmark, Clock, AlertCircle, CheckCircle,
    Library, Gavel, Users, Calendar, MapPin, Link
  } from 'lucide-svelte';

  // Svelte 5 runes
  let searchQuery = $state('');
  let searchResults = $state([]);
  let isSearching = $state(false);
  let selectedFilters = $state({
    jurisdiction: '',
    court: '',
    documentType: '',
    dateRange: '',
    precedentialValue: ''
  });
  let sortBy = $state('relevance');
  let currentPage = $state(1);
  let totalResults = $state(0);
  let savedCitations = $state([]);
  let showCitationDialog = $state(false);
  let selectedDocument = $state(null);
  let researchSession = $state({
    id: null,
    startTime: new Date(),
    queries: [],
    findings: []
  });

  // Advanced search options
  let advancedSearch = $state(false);
  let searchMode = $state('semantic'); // semantic, boolean, phrase
  let aiSuggestions = $state([]);
  let relatedTopics = $state([]);
  
  // Filter options from database
  let filterOptions = $state({
    jurisdictions: ['Federal', 'State', 'Local', 'International'],
    courts: ['Supreme Court', 'Court of Appeals', 'District Court', 'Bankruptcy Court'],
    documentTypes: ['case', 'statute', 'regulation', 'brief', 'opinion'],
    precedentialValues: ['High', 'Medium', 'Low', 'Informational']
  });

  onMount(async () => {
    await initializeResearchSession();
    await loadSavedCitations();
    await loadAISuggestions();
  });

  async function initializeResearchSession() {
    researchSession.id = `research_${Date.now()}`;
    console.log('🔍 Legal Research Session Started:', researchSession.id);
  }

  async function performSearch() {
    if (!searchQuery.trim()) return;
    
    isSearching = true;
    researchSession.queries.push({
      query: searchQuery,
      filters: { ...selectedFilters },
      timestamp: new Date(),
      mode: searchMode
    });

    try {
      const searchPayload = {
        query: searchQuery,
        mode: searchMode,
        filters: selectedFilters,
        sort: sortBy,
        page: currentPage,
        limit: 20
      };

      // Store search pattern in CHR-ROM for fast retrieval
      await nesGPUBridge.storeCHRROMPattern(`search_${Date.now()}`, {
        renderableHTML: `<div class="search-query">${searchQuery}</div>`,
        type: 'search_pattern',
        priority: 3,
        compressedData: new Uint8Array(new TextEncoder().encode(JSON.stringify(searchPayload))),
        bankId: 2
      });

      const response = await fetch('/api/legal/research/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchPayload)
      });

      if (response.ok) {
        const data = await response.json();
        searchResults = data.results || [];
        totalResults = data.total || 0;
        relatedTopics = data.relatedTopics || [];
        
        // Generate AI suggestions based on results
        await generateAISuggestions(data.results.slice(0, 5));
      } else {
        // Mock data for demo
        searchResults = generateMockResults(searchQuery);
        totalResults = searchResults.length;
      }
    } catch (error) {
      console.error('Search failed:', error);
      searchResults = generateMockResults(searchQuery);
      totalResults = searchResults.length;
    } finally {
      isSearching = false;
    }
  }

  function generateMockResults(query) {
    return [
      {
        id: '1',
        title: 'Smith v. Johnson - Contract Dispute Resolution',
        citation: '123 F.3d 456 (9th Cir. 2019)',
        fullCitation: 'Smith v. Johnson, 123 F.3d 456 (9th Cir. 2019)',
        court: '9th Circuit Court of Appeals',
        jurisdiction: 'Federal',
        dateDecided: '2019-03-15',
        documentType: 'case',
        precedentialValue: 'High',
        summary: 'Landmark case establishing new standards for contract interpretation in commercial disputes...',
        keyTopics: ['Contract Law', 'Commercial Disputes', 'Interpretation'],
        relevanceScore: 0.94,
        citedBy: 47,
        isBookmarked: false,
        url: '/legal/documents/smith-v-johnson-2019'
      },
      {
        id: '2', 
        title: 'Federal Rules of Civil Procedure § 26(b)(1)',
        citation: 'Fed. R. Civ. P. 26(b)(1)',
        fullCitation: 'Federal Rules of Civil Procedure Rule 26(b)(1) (2020)',
        court: 'Federal Rules',
        jurisdiction: 'Federal',
        dateDecided: '2020-12-01',
        documentType: 'regulation',
        precedentialValue: 'High',
        summary: 'Discovery scope limitations and proportionality requirements in civil litigation...',
        keyTopics: ['Discovery', 'Civil Procedure', 'Proportionality'],
        relevanceScore: 0.89,
        citedBy: 234,
        isBookmarked: true,
        url: '/legal/documents/frcp-26-b-1'
      },
      {
        id: '3',
        title: 'Legal Brief: Motion for Summary Judgment Template',
        citation: 'Practice Guide Ch. 7',
        fullCitation: 'Federal Practice Guide, Chapter 7: Summary Judgment Motions (2023)',
        court: 'Practice Guide',
        jurisdiction: 'Federal',
        dateDecided: '2023-01-01',
        documentType: 'brief',
        precedentialValue: 'Medium',
        summary: 'Comprehensive template and analysis for drafting effective summary judgment motions...',
        keyTopics: ['Summary Judgment', 'Motion Practice', 'Legal Writing'],
        relevanceScore: 0.82,
        citedBy: 12,
        isBookmarked: false,
        url: '/legal/documents/summary-judgment-template'
      }
    ];
  }

  async function generateAISuggestions(results) {
    // Extract key terms and generate related search suggestions
    const topics = results.flatMap(r => r.keyTopics || []);
    const uniqueTopics = [...new Set(topics)];
    
    aiSuggestions = [
      `Related cases on ${uniqueTopics[0] || 'similar topics'}`,
      `Recent developments in ${uniqueTopics[1] || 'this area'}`,
      `Opposing arguments and counterpoint cases`,
      `Practical applications and precedent analysis`
    ];
  }

  async function loadSavedCitations() {
    try {
      const response = await fetch('/api/legal/research/citations/saved');
      if (response.ok) {
        const data = await response.json();
        savedCitations = data.citations || [];
      }
    } catch (error) {
      console.error('Failed to load saved citations:', error);
      // Mock saved citations
      savedCitations = [
        { id: '1', title: 'Miranda v. Arizona', citation: '384 U.S. 436 (1966)', savedAt: new Date(Date.now() - 86400000) },
        { id: '2', title: 'Brown v. Board of Education', citation: '347 U.S. 483 (1954)', savedAt: new Date(Date.now() - 172800000) }
      ];
    }
  }

  async function loadAISuggestions() {
    aiSuggestions = [
      'Recent Supreme Court decisions on constitutional law',
      'Trending legal issues in technology and privacy',
      'Commercial litigation best practices',
      'Evidence standards in federal court'
    ];
  }

  async function saveCitation(document) {
    try {
      const response = await fetch('/api/legal/research/citations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.id,
          citation: document.citation,
          title: document.title,
          notes: ''
        })
      });

      if (response.ok) {
        document.isBookmarked = true;
        savedCitations = [
          { 
            id: document.id, 
            title: document.title, 
            citation: document.citation, 
            savedAt: new Date() 
          },
          ...savedCitations
        ];
      }
    } catch (error) {
      console.error('Failed to save citation:', error);
      // Optimistic update for demo
      document.isBookmarked = true;
    }
  }

  function openCitationDialog(document) {
    selectedDocument = document;
    showCitationDialog = true;
  }

  function clearFilters() {
    selectedFilters = {
      jurisdiction: '',
      court: '',
      documentType: '',
      dateRange: '',
      precedentialValue: ''
    };
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function getRelevanceColor(score) {
    if (score >= 0.9) return 'text-green-600 bg-green-100';
    if (score >= 0.8) return 'text-blue-600 bg-blue-100';
    if (score >= 0.7) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  }

  function getPrecedentialColor(value) {
    switch (value) {
      case 'High': return 'text-red-600 bg-red-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Low': return 'text-gray-600 bg-gray-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  }
</script>

<svelte:head>
  <title>Legal Research - Citation & Precedent Analysis</title>
  <meta name="description" content="Comprehensive legal research platform with AI-powered citation analysis and precedent matching" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center py-6">
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <Library class="h-8 w-8 text-blue-600" />
            <h1 class="text-2xl font-bold text-gray-900">Legal Research</h1>
          </div>
          <div class="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
            <span>Session: {researchSession.id?.slice(-8)}</span>
            <span>•</span>
            <span>{researchSession.queries.length} queries</span>
          </div>
        </div>
        
        <div class="flex items-center space-x-3">
          <button
            onclick={() => advancedSearch = !advancedSearch}
            class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter class="h-4 w-4 mr-2" />
            Advanced
          </button>
          
          <div class="text-sm text-gray-500">
            {totalResults.toLocaleString()} results
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="lg:grid lg:grid-cols-12 lg:gap-8">
      <!-- Search Panel -->
      <div class="lg:col-span-8">
        <!-- Main Search -->
        <div class="bg-white rounded-lg shadow p-6 mb-6">
          <div class="space-y-4">
            <!-- Search Input -->
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search class="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="search"
                bind:value={searchQuery}
                onkeydown={(e) => e.key === 'Enter' && performSearch()}
                placeholder="Search legal documents, cases, statutes, and precedents..."
                class="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <div class="absolute inset-y-0 right-0 flex items-center">
                <LoadingButton
                  onclick={performSearch}
                  loading={isSearching}
                  disabled={!searchQuery.trim()}
                  class="mr-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {#if isSearching}
                    Searching...
                  {:else}
                    Search
                  {/if}
                </LoadingButton>
              </div>
            </div>

            <!-- Search Mode Toggle -->
            <div class="flex items-center space-x-4">
              <span class="text-sm font-medium text-gray-700">Search Mode:</span>
              {#each [
                { id: 'semantic', label: 'AI Semantic', icon: Brain },
                { id: 'boolean', label: 'Boolean', icon: Filter },
                { id: 'phrase', label: 'Exact Phrase', icon: FileText }
              ] as mode}
                <button
                  onclick={() => searchMode = mode.id}
                  class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors
                         {searchMode === mode.id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
                >
                  <mode.icon class="h-3 w-3 mr-1" />
                  {mode.label}
                </button>
              {/each}
            </div>

            <!-- Advanced Filters -->
            {#if advancedSearch}
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1" for="jurisdiction">Jurisdiction</label><select id="jurisdiction" bind:value={selectedFilters.jurisdiction} class="w-full rounded-md border-gray-300 text-sm">
                    <option value="">All Jurisdictions</option>
                    {#each filterOptions.jurisdictions as jurisdiction}
                      <option value={jurisdiction}>{jurisdiction}</option>
                    {/each}
                  </select>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1" for="court">Court</label><select id="court" bind:value={selectedFilters.court} class="w-full rounded-md border-gray-300 text-sm">
                    <option value="">All Courts</option>
                    {#each filterOptions.courts as court}
                      <option value={court}>{court}</option>
                    {/each}
                  </select>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1" for="document-type">Document Type</label><select id="document-type" bind:value={selectedFilters.documentType} class="w-full rounded-md border-gray-300 text-sm">
                    <option value="">All Types</option>
                    {#each filterOptions.documentTypes as type}
                      <option value={type}>{type}</option>
                    {/each}
                  </select>
                </div>
                
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1" for="precedential-value">Precedential Value</label><select id="precedential-value" bind:value={selectedFilters.precedentialValue} class="w-full rounded-md border-gray-300 text-sm">
                    <option value="">All Values</option>
                    {#each filterOptions.precedentialValues as value}
                      <option value={value}>{value}</option>
                    {/each}
                  </select>
                </div>
                
                <div class="flex items-end">
                  <button
                    onclick={clearFilters}
                    class="w-full inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- AI Suggestions -->
        {#if aiSuggestions.length > 0}
          <div class="bg-blue-50 rounded-lg p-4 mb-6">
            <div class="flex items-center mb-3">
              <Brain class="h-5 w-5 text-blue-600 mr-2" />
              <h3 class="text-sm font-medium text-blue-900">AI Research Suggestions</h3>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              {#each aiSuggestions as suggestion}
                <button
                  onclick={() => { searchQuery = suggestion; performSearch(); }}
                  class="text-left p-2 text-sm text-blue-700 hover:bg-blue-100 rounded-md transition-colors"
                >
                  {suggestion}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Search Results -->
        <div class="space-y-4">
          {#if searchResults.length > 0}
            <!-- Sort Controls -->
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <span class="text-sm text-gray-700">Sort by:</span>
                <select bind:value={sortBy} class="rounded-md border-gray-300 text-sm">
                  <option value="relevance">Relevance</option>
                  <option value="date">Date</option>
                  <option value="citations">Citations</option>
                  <option value="court">Court</option>
                </select>
              </div>
              
              <div class="text-sm text-gray-500">
                Showing {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, totalResults)} of {totalResults.toLocaleString()}
              </div>
            </div>

            <!-- Results List -->
            {#each searchResults as result}
              <div class="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between mb-3">
                  <div class="flex-1">
                    <h3 class="text-lg font-semibold text-blue-600 hover:text-blue-800">
                      <a href={result.url}>{result.title}</a>
                    </h3>
                    <p class="text-sm text-gray-600 font-mono">{result.citation}</p>
                  </div>
                  
                  <div class="flex items-center space-x-2 ml-4">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getRelevanceColor(result.relevanceScore)}">
                      {Math.round(result.relevanceScore * 100)}% match
                    </span>
                    
                    <button
                      onclick={() => saveCitation(result)}
                      class="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                      class:text-yellow-500={result.isBookmarked}
                    >
                      <Bookmark class="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p class="text-gray-700 text-sm mb-3 line-clamp-2">{result.summary}</p>

                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center space-x-4">
                    <div class="flex items-center text-gray-500">
                      <Gavel class="h-4 w-4 mr-1" />
                      {result.court}
                    </div>
                    
                    <div class="flex items-center text-gray-500">
                      <Calendar class="h-4 w-4 mr-1" />
                      {formatDate(result.dateDecided)}
                    </div>
                    
                    <div class="flex items-center text-gray-500">
                      <Link class="h-4 w-4 mr-1" />
                      {result.citedBy} citations
                    </div>
                  </div>

                  <div class="flex items-center space-x-2">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getPrecedentialColor(result.precedentialValue)}">
                      {result.precedentialValue} Precedent
                    </span>
                    
                    <button
                      onclick={() => openCitationDialog(result)}
                      class="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Eye class="h-3 w-3 mr-1" />
                      View
                    </button>
                  </div>
                </div>

                <!-- Key Topics -->
                {#if result.keyTopics?.length > 0}
                  <div class="mt-3 pt-3 border-t border-gray-100">
                    <div class="flex flex-wrap gap-1">
                      {#each result.keyTopics.slice(0, 5) as topic}
                        <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                          {topic}
                        </span>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            {/each}

            <!-- Pagination -->
            {#if totalResults > 20}
              <div class="flex items-center justify-center space-x-2 mt-8">
                <button
                  onclick={() => { currentPage = Math.max(1, currentPage - 1); performSearch(); }}
                  disabled={currentPage <= 1}
                  class="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                
                <span class="px-3 py-2 text-sm text-gray-700">
                  Page {currentPage} of {Math.ceil(totalResults / 20)}
                </span>
                
                <button
                  onclick={() => { currentPage = currentPage + 1; performSearch(); }}
                  disabled={currentPage >= Math.ceil(totalResults / 20)}
                  class="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            {/if}
          {:else if searchQuery && !isSearching}
            <div class="text-center py-12">
              <BookOpen class="mx-auto h-12 w-12 text-gray-400" />
              <h3 class="mt-2 text-sm font-medium text-gray-900">No results found</h3>
              <p class="mt-1 text-sm text-gray-500">Try adjusting your search terms or filters.</p>
            </div>
          {/if}
        </div>
      </div>

      <!-- Sidebar -->
      <div class="lg:col-span-4 space-y-6">
        <!-- Saved Citations -->
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900 flex items-center">
              <Star class="h-5 w-5 text-yellow-500 mr-2" />
              Saved Citations
            </h3>
            <span class="text-sm text-gray-500">{savedCitations.length}</span>
          </div>
          
          <div class="space-y-3 max-h-64 overflow-y-auto">
            {#each savedCitations.slice(0, 10) as citation}
              <div class="border-l-2 border-yellow-400 pl-3 py-2">
                <h4 class="text-sm font-medium text-gray-900">{citation.title}</h4>
                <p class="text-xs text-gray-600 font-mono">{citation.citation}</p>
                <p class="text-xs text-gray-500">
                  Saved {formatDate(citation.savedAt)}
                </p>
              </div>
            {/each}
            
            {#if savedCitations.length === 0}
              <p class="text-sm text-gray-500 text-center py-4">
                No saved citations yet
              </p>
            {/if}
          </div>
        </div>

        <!-- Research Session -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-medium text-gray-900 flex items-center mb-4">
            <Clock class="h-5 w-5 text-blue-500 mr-2" />
            Research Session
          </h3>
          
          <div class="space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Started:</span>
              <span class="font-medium">{formatDate(researchSession.startTime)}</span>
            </div>
            
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Queries:</span>
              <span class="font-medium">{researchSession.queries.length}</span>
            </div>
            
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Findings:</span>
              <span class="font-medium">{savedCitations.length}</span>
            </div>
          </div>

          <!-- Recent Queries -->
          {#if researchSession.queries.length > 0}
            <div class="mt-4 pt-4 border-t border-gray-200">
              <h4 class="text-sm font-medium text-gray-900 mb-2">Recent Queries</h4>
              <div class="space-y-2 max-h-32 overflow-y-auto">
                {#each researchSession.queries.slice(-5) as query}
                  <button
                    onclick={() => { searchQuery = query.query; performSearch(); }}
                    class="w-full text-left p-2 text-xs text-gray-600 hover:bg-gray-50 rounded border border-gray-200"
                  >
                    {query.query}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>

        <!-- Related Topics -->
        {#if relatedTopics.length > 0}
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Related Topics</h3>
            <div class="space-y-2">
              {#each relatedTopics as topic}
                <button
                  onclick={() => { searchQuery = topic; performSearch(); }}
                  class="w-full text-left p-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  {topic}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<!-- Citation Detail Dialog -->
<HeadlessDialog bind:open={showCitationDialog}>
  {#if selectedDocument}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">{selectedDocument.title}</h2>
          <p class="text-sm text-gray-600 font-mono">{selectedDocument.fullCitation}</p>
        </div>
        
        <div class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium text-gray-700">Court:</span>
              <span class="text-gray-600">{selectedDocument.court}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Date:</span>
              <span class="text-gray-600">{formatDate(selectedDocument.dateDecided)}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Jurisdiction:</span>
              <span class="text-gray-600">{selectedDocument.jurisdiction}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Cited By:</span>
              <span class="text-gray-600">{selectedDocument.citedBy} cases</span>
            </div>
          </div>

          <div>
            <h4 class="font-medium text-gray-700 mb-2">Summary</h4>
            <p class="text-gray-600 text-sm">{selectedDocument.summary}</p>
          </div>

          {#if selectedDocument.keyTopics?.length > 0}
            <div>
              <h4 class="font-medium text-gray-700 mb-2">Key Topics</h4>
              <div class="flex flex-wrap gap-2">
                {#each selectedDocument.keyTopics as topic}
                  <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                    {topic}
                  </span>
                {/each}
              </div>
            </div>
          {/if}
        </div>
        
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onclick={() => showCitationDialog = false}
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
          >
            Close
          </button>
          
          <button
            onclick={() => { saveCitation(selectedDocument); showCitationDialog = false; }}
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
          >
            <Bookmark class="h-4 w-4 mr-1 inline" />
            Save Citation
          </button>
          
          <a
            href={selectedDocument.url}
            class="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 inline-flex items-center"
          >
            <ExternalLink class="h-4 w-4 mr-1" />
            View Full Document
          </a>
        </div>
      </div>
    </div>
  {/if}
</HeadlessDialog>