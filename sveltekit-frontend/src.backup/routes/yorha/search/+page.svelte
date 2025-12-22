<!-- @migration-task Error while migrating Svelte code: Expected token >
https://svelte.dev/e/expected_token -->
<!-- @migration-task Error while migrating Svelte code: Expected token >
https://svelte.dev/e/expected_token -->
<script lang="ts">
  import type { Badge  } from '$lib/components/ui/badge';
  import Button from '$lib/components/ui/button';
  import Card from '$lib/components/ui/card';
  import type { Input  } from '$lib/components/ui/input';
  import type { appActions, appStore  } from '$lib/stores/app-store';
  import * as Lucide from 'lucide-svelte';
  import { onMount } from 'svelte';;

  // Reactive state from app store (plain locals to be updated via subscription)
  let searchResults: any[] = [];
  let isLoading = false;
  let error: string | null = null;
  let searchQuery = '';

  let selectedType = 'all';
  let selectedDateFrom = '';
  let selectedDateTo = '';

  // Subscribe to app store on mount
  onMount(() => {
    const unsubscribe = appStore.subscribe((state) => {
      searchResults = state.searchResults;
      isLoading = state.isLoading;
      error = state.error;
    });

    // return cleanup
    return unsubscribe;
  });

  function resolveIcon(name: string) {
    const ns = Lucide as Record<string, any>;
    return ns[name] ?? ns[name.toLowerCase()] ?? ns.default?.[name] ?? ns.default ?? undefined;
  }

  const Search = resolveIcon('Search');
  const FileText = resolveIcon('FileText');
  const Users = resolveIcon('Users');
  const Folder = resolveIcon('Folder');
  const Eye = resolveIcon('Eye');

  function getResultIcon(type: string) {
    switch (type?.toLowerCase()) {
      case 'case':
        return Folder;
      case 'evidence':
        return FileText;
      case 'person':
        return Users;
      default:
        return FileText;
    }
  }

  // helper to satisfy template dynamic component usage with TypeScript
  function getResultIconAsAny(type: string): any {
    return getResultIcon(type) as any;
  }

  function getTypeColor(type: string) {
    switch (type?.toLowerCase()) {
      case 'case':
        return 'bg-blue-600 text-white';
      case 'evidence':
        return 'bg-green-600 text-white';
      case 'person':
        return 'bg-purple-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  }

  async function performSearch() {
    if (!searchQuery.trim()) return;

    const filters: any = {};
    if (selectedType && selectedType !== 'all') {
      filters.type = [selectedType];
    }
    if (selectedDateFrom) {
      filters.dateFrom = selectedDateFrom;
    }
    if (selectedDateTo) {
      filters.dateTo = selectedDateTo;
    }

    await appActions.search(searchQuery, filters);
  }

  // use keydown for broader browser support in Svelte 5
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      performSearch();
    }
  }

  onMount(() => {
    // Initial load if there's a query
    if (searchQuery) {
      performSearch();
    }
  });
</script>

<svelte:head>
  <title>GLOBAL SEARCH - YoRHa Detective Interface</title>
</svelte:head>

<!-- YoRHa Interface -->
<div class="yorha-interface">
  <!-- Left Sidebar -->
  <aside class="yorha-sidebar">
    <div class="yorha-logo">
      <div class="yorha-title">YORHA</div>
      <div class="yorha-subtitle">DETECTIVE</div>
      <div class="yorha-subtext">Investigation Interface</div>
    </div>
    <nav class="yorha-nav">
      <div class="nav-section">
        <a href="/yorha-command-center" class="nav-item">
          <span class="nav-icon">⌘</span> COMMAND CENTER
        </a>
        <a href="/yorha/detective" class="nav-item">
          <span class="nav-text">ACTIVE CASES</span>
          <span class="nav-count">3</span>
        </a>
        <a href="/yorha/evidence" class="nav-item">
          <span class="nav-icon">📋</span> EVIDENCE LIBRARY
        </a>
        <a href="/yorha/persons" class="nav-item">
          <span class="nav-icon">👤</span> PERSONS OF INTEREST
        </a>
        <a href="/yorha/analysis" class="nav-item">
          <span class="nav-icon">📊</span> ANALYSIS
        </a>
        <a href="/yorha/search" class="nav-item search-active">
          <span class="nav-icon">🔍</span> GLOBAL SEARCH
        </a>
        <a href="/yorha/terminal" class="nav-item">
          <span class="nav-icon">></span> TERMINAL
        </a>
      </div>
      <div class="nav-section">
        <a href="/yorha/config" class="nav-item">
          <span class="nav-icon">⚙️</span> SYSTEM CONFIG
        </a>
      </div>
    </nav>
    <div class="yorha-status">
      <div class="status-item">Online</div>
      <div class="status-time">{new Date().toLocaleTimeString()}</div>
      <div class="status-text">System: Operational</div>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="yorha-main">
    <!-- Header -->
    <header class="search-header">
      <div class="header-left">
        <button class="header-icon">🔍</button>
        <h1 class="search-title">GLOBAL SEARCH</h1>
        <div class="search-subtitle">Cross-System Investigation Query</div>
      </div>
    </header>

    <!-- Search Interface -->
    <div class="search-interface">
      <div class="search-input-section">
        <div class="search-input-wrapper">
          <div class="search-icon">
            {#if Search}
              <Search class="w-5" / />
            {:else}
              <span class="search-fallback">🔍</span>
            {/if}
          </div>
          <div class="search-input">
            <Input
              type="text"
              placeholder="Search across cases, evidence, persons, and documents..."
              bind:value={searchQuery}
              onkeydown={handleKeyDown}
            />
          </div>
          <div class="search-btn">
            <Button onclick={performSearch} disabled={isLoading}>
              {isLoading ? 'SEARCHING...' : 'SEARCH'}
            </Button>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label for="filter-type" class="filter-label">Type:</label>
          <select id="filter-type" bind:value={selectedType} class="filter-select">
            <option value="all">All Types</option>
            <option value="case">Cases</option>
            <option value="evidence">Evidence</option>
            <option value="person">Persons</option>
          </select>
        </div>
        <div class="filter-group">
          <label for="date-from" class="filter-label">From Date:</label>
          <div class="filter-date">
            <Input
              id="date-from"
              type="date"
              bind:value={selectedDateFrom}
            />
          </div>
        </div>
        <div class="filter-group">
          <label for="date-to" class="filter-label">To Date:</label>
          <div class="filter-date">
            <Input
              id="date-to"
              type="date"
              bind:value={selectedDateTo}
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    {#if error}
      <div class="error-banner">
        Search failed: {error}
      </div>
    {/if}

    <!-- Results -->
    <div class="results-section">
      {#if isLoading}
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <div class="loading-text">Searching across all systems...</div>
        </div>
      {:else if searchResults.length > 0}
        <div class="results-header">
          <div class="results-count">
            Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            {#if searchQuery} for "{searchQuery}"{/if}
          </div>
        </div>

        <div class="results-grid">
          {#each searchResults as result (result.id)}
            {@const Icon = getResultIconAsAny(result.type) || FileText}
            <div class="result-card">
              <Card>
              <div class="result-header">
                <div class="result-icon">
                  <Icon class="w-6 h-6" / />
                </div>
                <div class="result-info">
                  <div class="result-title">{result.title || result.name || 'Untitled'}</div>
                  <div class="result-type">
                    <Badge class={getTypeColor(result.type)}>
                      {result.type?.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                {#if result.score}
                  <div class="result-score">
                    {Math.round(result.score * 100)}% match
                  </div>
                {/if}
              </div>
              <div class="result-content">
                {#if result.description || result.content}
                  <div class="result-description">
                    {result.description || result.content}
                  </div>
                {/if}
                <div class="result-meta">
                  {#if result.createdAt}
                    <span class="meta-item">
                      Created: {new Date(result.createdAt).toLocaleDateString()}
                    </span>
                  {/if}
                  {#if result.updatedAt}
                    <span class="meta-item">
                      Updated: {new Date(result.updatedAt).toLocaleDateString()}
                    </span>
                  {/if}
                  {#if result.caseId}
                    <span class="meta-item">Case: {result.caseId}</span>
                  {/if}
                </div>
              </div>
              <div class="result-actions">
                <Button class="bits-btn" size="sm" variant="ghost" type="button">
                  <Eye || FileText class="w-4" / /> View Details
                </Button>
              </div>
              </Card>
            </div>
          {/each}
        </div>
      {:else if searchQuery}
        <div class="no-results">
          <div class="no-results-icon">🔍</div>
          <div class="no-results-title">No Results Found</div>
          <div class="no-results-subtitle">
            Try adjusting your search terms or filters
          </div>
        </div>
      {:else}
        <div class="search-prompt">
          <div class="prompt-icon">🔍</div>
          <div class="prompt-title">Ready to Search</div>
          <div class="prompt-subtitle">
            Enter your query above to search across all cases, evidence, and persons
          </div>
        </div>
      {/if}
    </div>
  </main>
</div>

<style>
  .yorha-interface {
    display: flex;
    height: 100vh;
    background: #2a2a2a;
    color: #d4af37;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
  }

  .yorha-sidebar {
    width: 200px;
    background: #1a1a1a;
    border-right: 1px solid #3a3a3a;
    display: flex;
    flex-direction: column;
  }

  .yorha-logo {
    padding: 20px 15px;
  }

  .yorha-title,
  .yorha-subtitle {
    font-size: 18px;
    font-weight: bold;
    color: #d4af37;
    line-height: 1;
  }

  .yorha-subtext {
    font-size: 10px;
    color: #888;
    padding-top: 8px;
    border-bottom: 1px solid #3a3a3a;
  }

  .yorha-nav {
    padding: 10px 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-left: 8px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    color: #888;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    justify-content: space-between;
    font-size: 11px;
  }

  .nav-item:hover {
    background: #2a2a2a;
    color: #d4af37;
  }

  .nav-item.search-active {
    background: #162016;
    color: #d4af37;
    border-left: 3px solid #d4af37;
    padding-left: 9px;
  }

  .nav-count {
    font-size: 10px;
    background: #d4af37;
    color: #000;
    padding: 1px 6px;
    border-radius: 2px;
  }

  .yorha-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #2a2a2a;
    overflow: hidden;
  }

  .search-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid #3a3a3a;
    background: #2a2a2a;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-icon {
    background: none;
    border: 1px solid #555;
    color: #d4af37;
    padding: 6px 8px;
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
  }

  .search-title {
    font-size: 24px;
    font-weight: bold;
    color: #d4af37;
    margin: 0;
  }

  .search-subtitle {
    font-size: 12px;
    color: #888;
  }

  .search-interface {
    padding: 20px;
    background: #242424;
    border-bottom: 1px solid #3a3a3a;
  }

  .search-input-section {
    margin-bottom: 20px;
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .search-icon {
    position: absolute;
    left: 12px;
  }

  .search-input {
    flex: 1;
    padding-left: 44px !important;
    background: #1a1a1a !important;
    border: 1px solid #555 !important;
    color: #d4af37 !important;
    font-size: 16px;
    padding: 12px;
  }

  .search-btn {
    background: #d4af37 !important;
    color: #000 !important;
    border: none;
    padding: 12px 24px;
    font-weight: bold;
  }

  .filters-section {
    display: flex;
    gap: 20px;
    align-items: center;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .filter-label {
    font-size: 11px;
    color: #d4af37;
    font-weight: bold;
    text-transform: uppercase;
  }

  .filter-select {
    background: #1a1a1a;
    border: 1px solid #555;
    color: #d4af37;
    padding: 8px 12px;
    font-family: inherit;
    font-size: 12px;
  }

  .filter-date {
    background: #1a1a1a !important;
    border: 1px solid #555 !important;
    color: #d4af37 !important;
    padding: 8px 12px;
  }

  .results-section {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
  }

  .results-header {
    margin-bottom: 20px;
  }

  .results-count {
    font-size: 14px;
    color: #d4af37;
    font-weight: bold;
  }

  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
    gap: 20px;
  }

  .result-card {
    background: #1a1a1a !important;
    border: 1px solid #3a3a3a !important;
    padding: 16px;
  }

  .result-header {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
  }

  .result-icon {
    color: #d4af37;
  }

  .result-info {
    flex: 1;
  }

  .result-title {
    font-size: 16px;
    font-weight: bold;
    color: #d4af37;
    margin-bottom: 4px;
  }

  .result-type {
    margin-bottom: 8px;
  }

  .result-score {
    font-size: 12px;
    color: #4ade80;
    font-weight: bold;
  }

  .result-content {
    margin-bottom: 12px;
  }

  .result-description {
    font-size: 12px;
    color: #ccc;
    line-height: 1.4;
    margin-bottom: 8px;
  }

  .result-meta {
    display: flex;
    gap: 12px;
    font-size: 10px;
    color: #888;
  }

  .meta-item {
    background: #2a2a2a;
    padding: 2px 6px;
    border-radius: 2px;
  }

  .result-actions {
    display: flex;
    justify-content: flex-end;
  }

  .no-results,
  .search-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #666;
    text-align: center;
  }

  .no-results-icon,
  .prompt-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .no-results-title,
  .prompt-title {
    font-size: 18px;
    color: #888;
    margin-bottom: 8px;
  }

  .no-results-subtitle,
  .prompt-subtitle {
    font-size: 12px;
    color: #999;
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: #4a1a1a;
    border: 1px solid #ef4444;
    color: #fca5a5;
    font-size: 12px;
    margin: 15px 20px;
    border-radius: 4px;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #888;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 2px solid #3a3a3a;
    border-top: 2px solid #d4af37;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 12px;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
