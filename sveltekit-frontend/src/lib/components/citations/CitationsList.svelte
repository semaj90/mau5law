<!-- @migration-task Error while migrating Svelte code: Event attribute must be a JavaScript expression, not a string
https://svelte.dev/e/attribute_invalid_event_handler -->
<!-- @migration-task Error while migrating Svelte code: Event attribute must be a JavaScript expression, not a string -->
<!--
  Citations List Component
  
  Features:
  - Display citations with filtering and search
  - Integration with rich text editor
  - Citation verification status
  - Relevance scoring and sorting
  - Detective mode integration
-->
<script lang="ts">
  const { caseId: string, detectiveMode = false, readonly = false } = $props();

  import { onMount, createEventDispatcher } from 'svelte';
  import { writable } from 'svelte/store';
  import type { Citation } from '$lib/server/db/schemas/cases-schema.js';
  import CitationEditor from './CitationEditor.svelte';

  // Props
  
  
  

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    citationSelected: Citation;
    citationsUpdated: void;
  }>();

  // State
  let citations = writable<Citation[]>([]);
  let filteredCitations = writable<Citation[]>([]);
  let isLoading = $state(false);
  let showEditor = $state(false);
  let selectedCitation = $state<Citation | null>(null);
  let editMode = $state<'create' | 'edit'>('create');

  // Filters
  let searchQuery = $state('');
  let typeFilter = $state('all');
  let verifiedFilter = $state('all');
  let sortBy = $state<'relevance' | 'date' | 'title'>('relevance');
  let sortOrder = $state<'asc' | 'desc'>('desc');

  // Pagination
  let currentPage = $state(1);
  let itemsPerPage = $state(20);
  let totalPages = $state(1);

  // Citation types for filtering
  const citationTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'case_law', label: 'Case Law' },
    { value: 'statute', label: 'Statute' },
    { value: 'regulation', label: 'Regulation' },
    { value: 'secondary_authority', label: 'Secondary Authority' },
    { value: 'legal_brief', label: 'Legal Brief' },
    { value: 'court_document', label: 'Court Document' },
    { value: 'expert_report', label: 'Expert Report' },
    { value: 'news_article', label: 'News Article' },
    { value: 'academic_paper', label: 'Academic Paper' },
    { value: 'other', label: 'Other' }
  ];

  // Load citations
  async function loadCitations() {
    isLoading = true;
    try {
      const params = new URLSearchParams({
        caseId,
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString()
      });

      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (verifiedFilter !== 'all') params.set('verified', verifiedFilter);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/citations?${params}`);
      const result = await response.json();

      if (result.success) {
        citations.set(result.citations);
        totalPages = result.pagination?.totalPages || 1;
        applyClientSideSort();
      } else {
        console.error('Failed to load citations:', result.error);
      }
    } catch (error) {
      console.error('Citation loading error:', error);
    } finally {
      isLoading = false;
    }
  }

  // Apply client-side sorting
  function applyClientSideSort() {
    citations.update(items => {
      const sorted = [...items].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'relevance':
            comparison = (b.relevanceScore || 0) - (a.relevanceScore || 0);
            break;
          case 'date':
            comparison = new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
            break;
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
        }

        return sortOrder === 'asc' ? -comparison : comparison;
      });

      filteredCitations.set(sorted);
      return items;
    });
  }

  // Handle citation save
  function handleCitationSave(event: CustomEvent<Citation>) {
    const citation = event.detail;
    if (editMode === 'create') {
      citations.update(items => [citation, ...items]);
    } else {
      citations.update(items => 
        items.map(item => item.id === citation.id ? citation : item)
      );
    }

    applyClientSideSort();
    showEditor = false;
    selectedCitation = null;
    dispatch('citationsUpdated');
  }

  // Handle citation deletion
  function handleCitationDelete(event: CustomEvent<string>) {
    const citationId = event.detail;
    citations.update(items => items.filter(item => item.id !== citationId));
    applyClientSideSort();
    showEditor = false;
    selectedCitation = null;
    dispatch('citationsUpdated');
  }

  // Open editor for new citation
  function createCitation() {
    selectedCitation = null;
    editMode = 'create';
    showEditor = true;
  }

  // Open editor for existing citation
  function editCitation(citation: Citation) {
    selectedCitation = citation;
    editMode = 'edit';
    showEditor = true;
  }

  // Close editor
  function closeEditor() {
    showEditor = false;
    selectedCitation = null;
  }

  // Select citation
  function selectCitation(citation: Citation) {
    dispatch('citationSelected', citation);
  }

  // Format citation display
  function formatCitationDisplay(citation: Citation): string {
    return citation.citation || 
           `${citation.title}${citation.author ? ` by ${citation.author}` : ''}`;
  }

  // Get citation type label
  function getCitationTypeLabel(type: string): string {
    const found = citationTypes.find(t => t.value === type);
    return found?.label || type;
  }

  // Get relevance color
  function getRelevanceColor(score: number): string {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    if (score >= 4) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  }

  // Handle search
  function handleSearch() {
    currentPage = 1;
    loadCitations();
  }

  // Handle filter change
  function handleFilterChange() {
    currentPage = 1;
    loadCitations();
  }

  // Handle sort change
  function handleSortChange() {
    applyClientSideSort();
  }

  // Handle page change
  function changePage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
      loadCitations();
    }
  }

  // Load citations on mount and when dependencies change
  onMount(() => {
    loadCitations();
  });

  $effect(() => {
    if (caseId) {
      loadCitations();
    }
  });
</script>

{#if showEditor}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <CitationEditor
        {caseId}
        citation={selectedCitation}
        mode={editMode}
        on:save={handleCitationSave}
        on:delete={handleCitationDelete}
        on:cancel={closeEditor}
      />
    </div>
  </div>
{/if}

<div class="citations-list space-y-6">
  <!-- Header -->
  <div class="flex justify-between items-center">
    <div>
      <h2 class="text-xl font-semibold text-gray-900">Citations</h2>
      <p class="text-sm text-gray-600 mt-1">
        Manage legal citations and references for this case
      </p>
    </div>
    {#if !readonly}
      <button
        onclick={createCitation}
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Add Citation
      </button>
    {/if}
  </div>

  <!-- Filters and Search -->
  <div class="bg-gray-50 p-4 rounded-lg">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
      <!-- Search -->
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1" for="search">Search</label><input id="search"
          type="text"
          bind:value={searchQuery}
          onkeydown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search citations..."
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Type Filter -->
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1" for="type">Type</label><select id="type"
          bind:value={typeFilter}
          onchange={handleFilterChange}
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {#each citationTypes as type}
            <option value={type.value}>{type.label}</option>
          {/each}
        </select>
      </div>

      <!-- Verified Filter -->
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1" for="status">Status</label><select id="status"
          bind:value={verifiedFilter}
          onchange={handleFilterChange}
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Citations</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
      </div>

      <!-- Sort -->
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">Sort by</label>
        <div class="flex space-x-1">
          <select
            bind:value={sortBy}
            onchange={handleSortChange}
            class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="relevance">Relevance</option>
            <option value="date">Date</option>
            <option value="title">Title</option>
          </select>
          <button
            onclick={() => { sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'; handleSortChange(); }}
            class="px-2 py-2 text-sm border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title={sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="flex justify-between items-center">
      <button
        onclick={handleSearch}
        class="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800"
      >
        Search
      </button>
      <button
        onclick={() => { searchQuery = ''; typeFilter = 'all'; verifiedFilter = 'all'; handleFilterChange(); }}
        class="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800"
      >
        Clear Filters
      </button>
    </div>
  </div>

  <!-- Loading State -->
  {#if isLoading}
    <div class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="text-gray-600 mt-2">Loading citations...</p>
    </div>
  {:else}
    <!-- Citations List -->
    <div class="space-y-4">
      {#each $filteredCitations as citation}
        <div 
          class="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
          role="button" tabindex="0"
                onclick={() => selectCitation(citation)}
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <!-- Citation Header -->
              <div class="flex items-center space-x-3 mb-2">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {getCitationTypeLabel(citation.citationType)}
                </span>
                <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRelevanceColor(citation.relevanceScore || 0)}`}>
                  Relevance: {citation.relevanceScore}/10
                </span>
                {#if citation.verified}
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ Verified
                  </span>
                {/if}
                {#if citation.citationPurpose}
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {citation.citationPurpose}
                  </span>
                {/if}
              </div>

              <!-- Title and Citation -->
              <h3 class="font-medium text-gray-900 mb-1">{citation.title}</h3>
              {#if citation.citation}
                <p class="text-sm text-gray-600 mb-2 font-mono">{citation.citation}</p>
              {/if}

              <!-- Author and Source -->
              {#if citation.author || citation.source}
                <p class="text-sm text-gray-500 mb-2">
                  {#if citation.author}{citation.author}{/if}
                  {#if citation.author && citation.source} • {/if}
                  {#if citation.source}{citation.source}{/if}
                  {#if citation.publicationDate}
                    • {new Date(citation.publicationDate).getFullYear()}
                  {/if}
                </p>
              {/if}

              <!-- Abstract -->
              {#if citation.abstract}
                <p class="text-sm text-gray-700 mb-2 line-clamp-2">{citation.abstract}</p>
              {/if}

              <!-- Relevant Quote -->
              {#if citation.relevantQuote}
                <blockquote class="border-l-4 border-blue-200 pl-4 py-2 bg-blue-50 text-sm text-gray-700 italic mb-2">
                  "{citation.relevantQuote}"
                </blockquote>
              {/if}

              <!-- Tags -->
              {#if citation.tags && citation.tags.length > 0}
                <div class="flex flex-wrap gap-1 mb-2">
                  {#each citation.tags as tag}
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {tag}
                    </span>
                  {/each}
                </div>
              {/if}

              <!-- Links -->
              {#if citation.url || citation.doi}
                <div class="flex space-x-4 text-xs">
                  {#if citation.url}
                    <a 
                      href={citation.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      class="text-blue-600 hover:text-blue-800"
                      onclick
                    >
                      View Source ↗
                    </a>
                  {/if}
                  {#if citation.doi}
                    <a 
                      href={`https://doi.org/${citation.doi}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      class="text-blue-600 hover:text-blue-800"
                      onclick
                    >
                      DOI: {citation.doi} ↗
                    </a>
                  {/if}
                </div>
              {/if}
            </div>

            <!-- Actions -->
            {#if !readonly}
              <div class="flex space-x-2 ml-4">
                <button
                  onclick={() => editCitation(citation)}
                  class="text-gray-400 hover:text-gray-600 p-1"
                  title="Edit citation"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            {/if}
          </div>

          <!-- Metadata -->
          <div class="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
            <span>
              Created {new Date(citation.dateCreated).toLocaleDateString()}
            </span>
            {#if citation.dateModified && citation.dateModified !== citation.dateCreated}
              <span>
                Modified {new Date(citation.dateModified).toLocaleDateString()}
              </span>
            {/if}
          </div>
        </div>
      {/each}

      <!-- Empty State -->
      {#if $filteredCitations.length === 0}
        <div class="text-center py-8">
          <div class="text-gray-400 mb-4">
            <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No citations found</h3>
          <p class="text-gray-600 mb-4">
            {searchQuery || typeFilter !== 'all' || verifiedFilter !== 'all' 
              ? 'No citations match your current filters.' 
              : 'Start by adding your first citation to this case.'}
          </p>
          {#if !readonly}
            <button
              onclick={createCitation}
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add First Citation
            </button>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="flex justify-between items-center mt-6">
        <div class="text-sm text-gray-700">
          Page {currentPage} of {totalPages}
        </div>
        <div class="flex space-x-1">
          <button
            onclick={() => changePage(currentPage - 1)}
            disabled={currentPage <= 1}
            class="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            Previous
          </button>
          {#each Array(Math.min(5, totalPages)).fill(0) as _, i}
            {@const pageNum = Math.max(1, currentPage - 2) + i}
            {#if pageNum <= totalPages}
              <button
                onclick={() => changePage(pageNum)}
                class={`px-3 py-2 text-sm font-medium rounded ${
                  pageNum === currentPage 
                    ? 'text-white bg-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {pageNum}
              </button>
            {/if}
          {/each}
          <button
            onclick={() => changePage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            class="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
