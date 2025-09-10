<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import type { ShaderSearchResult, ShaderSearchQuery } from '$lib/webgpu/shader-cache-manager';

  interface SearchResponse {
    shaders: ShaderSearchResult[];
    metadata: {
      totalResults: number;
      searchTime: number;
      query: ShaderSearchQuery;
      breakdown?: {
        webgpu: number;
        webgl: number;
      };
    };
  }

  interface ShaderStats {
    totalShaders: {
      total: number;
      webgpu: number;
      webgl: number;
    };
    topOperations: Array<{ operation: string; count: number }>;
    averagePerformance: number;
    totalUsage: number;
  }

  let searchQuery = $state('');
  let selectedOperation = $state('');
  let selectedShaderType = $state<'webgpu' | 'webgl' | 'all'>('all');
  let selectedTags = $state<string[]>([]);
  let sortBy = $state<'relevance' | 'performance' | 'usage' | 'recent'>('relevance');
  let limit = $state(20);

  let searchResults = $state<ShaderSearchResult[]>([]);
  let searchMetadata = $state<SearchResponse['metadata'] | null>(null);
  let isSearching = $state(false);
  let stats = $state<ShaderStats | null>(null);
  let selectedShader = $state<ShaderSearchResult | null>(null);
  let showFullCode = $state(false);

  let availableTags = $state<string[]>([]);
  let availableOperations = $state<string[]>([]);

  onMount(async () => {
    if (!browser) return;
    await loadStats();
    await loadAvailableFilters();
    await performSearch(); // Initial search to show all shaders
  });

  async function loadStats() {
    try {
      const response = await fetch('/api/shaders/unified');
      const data = await response.json();
      stats = {
        totalShaders: {
          total: data.totalShaders.total,
          webgpu: data.totalShaders.webgpu,
          webgl: data.totalShaders.webgl
        },
        topOperations: data.supportedOperations.map((op: string) => ({ operation: op, count: 0 })),
        averagePerformance: 0,
        totalUsage: 0
      };
      availableOperations = data.supportedOperations;
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  async function loadAvailableFilters() {
    try {
      const response = await fetch('/api/shaders/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 100 })
      });
      const data = await response.json();
      
      const tagSet = new Set<string>();
      const operationSet = new Set<string>();
      
      data.shaders.forEach((shader: any) => {
        shader.metadata.tags?.forEach((tag: string) => tagSet.add(tag));
        if (shader.metadata.operation) operationSet.add(shader.metadata.operation);
      });
      
      availableTags = Array.from(tagSet).sort();
      availableOperations = Array.from(operationSet).sort();
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
  }

  async function performSearch() {
    isSearching = true;
    try {
      const query: ShaderSearchQuery = {
        text: searchQuery.trim() || undefined,
        operation: selectedOperation || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        shaderType: selectedShaderType,
        sortBy,
        limit
      };

      const response = await fetch('/api/shaders/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query)
      });

      const data: SearchResponse = await response.json();
      searchResults = data.shaders;
      searchMetadata = data.metadata;

    } catch (error) {
      console.error('Search failed:', error);
      searchResults = [];
      searchMetadata = null;
    } finally {
      isSearching = false;
    }
  }

  function toggleTag(tag: string) {
    const index = selectedTags.indexOf(tag);
    if (index > -1) {
      selectedTags = selectedTags.filter(t => t !== tag);
    } else {
      selectedTags = [...selectedTags, tag];
    }
  }

  function clearFilters() {
    searchQuery = '';
    selectedOperation = '';
    selectedShaderType = 'all';
    selectedTags = [];
    sortBy = 'relevance';
    limit = 20;
  }

  function formatExecutionTime(time: number): string {
    if (time === 0) return 'N/A';
    return time < 1 ? `${(time * 1000).toFixed(1)}μs` : `${time.toFixed(2)}ms`;
  }

  function formatRelevanceScore(score: number | undefined): string {
    return score ? (score * 100).toFixed(1) + '%' : 'N/A';
  }

  function copyShaderCode(shader: ShaderSearchResult) {
    navigator.clipboard.writeText(shader.wgsl);
    // TODO: Show toast notification
  }

  function exportResults() {
    const exportData = {
      query: searchMetadata?.query,
      results: searchResults.map(shader => ({
        id: shader.id,
        operation: shader.metadata.operation,
        description: shader.metadata.description,
        tags: shader.metadata.tags,
        relevanceScore: shader.relevanceScore,
        embeddingSimilarity: shader.embeddingSimilarity,
        performance: {
          usageCount: shader.metadata.usageCount,
          averageExecutionTime: shader.metadata.averageExecutionTime
        }
      })),
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shader_search_results_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head>
  <title>Shader Search - WebGPU Shader Cache</title>
  <meta name="description" content="Search and explore cached WebGPU shaders using semantic similarity and advanced filters" />
</svelte:head>

<div class="container">
  <header>
    <h1>🔍 WebGPU Shader Search</h1>
    <p>Search and explore cached shaders using semantic similarity and performance metrics</p>
  </header>

  <!-- Stats Overview -->
  {#if stats}
    <section class="stats-section">
      <h2>Cache Statistics</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">{stats.totalShaders.total}</div>
          <div class="stat-label">Total Shaders</div>
        </div>
        <div class="stat-card">
          <div class="stat-number webgpu-color">{stats.totalShaders.webgpu}</div>
          <div class="stat-label">WebGPU Shaders</div>
        </div>
        <div class="stat-card">
          <div class="stat-number webgl-color">{stats.totalShaders.webgl}</div>
          <div class="stat-label">WebGL Shaders</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{formatExecutionTime(stats.averagePerformance)}</div>
          <div class="stat-label">Avg Performance</div>
        </div>
      </div>

      {#if stats.topOperations.length > 0}
        <div class="top-operations">
          <h3>Top Operations</h3>
          <div class="operation-tags">
            {#each stats.topOperations as op}
              <span class="operation-tag" onclick={() => selectedOperation = op.operation}>
                {op.operation} ({op.count})
              </span>
            {/each}
          </div>
        </div>
      {/if}
    </section>
  {/if}

  <!-- Search Interface -->
  <section class="search-section">
    <div class="search-controls">
      <div class="search-input-group">
        <input
          type="text"
          placeholder="Search shaders by description, operation, or WGSL code..."
          bind:value={searchQuery}
          onkeydown={(e) => e.key === 'Enter' && performSearch()}
          class="search-input"
        />
        <button onclick={performSearch} disabled={isSearching} class="search-button">
          {isSearching ? '⏳' : '🔍'} Search
        </button>
      </div>

      <div class="filters-row">
        <div class="filter-group">
          <label>Operation:</label>
          <select bind:value={selectedOperation}>
            <option value="">All Operations</option>
            {#each availableOperations as operation}
              <option value={operation}>{operation}</option>
            {/each}
          </select>
        </div>

        <div class="filter-group">
          <label>Shader Type:</label>
          <select bind:value={selectedShaderType}>
            <option value="all">All (WebGPU + WebGL)</option>
            <option value="webgpu">WebGPU Only</option>
            <option value="webgl">WebGL Only</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Sort by:</label>
          <select bind:value={sortBy}>
            <option value="relevance">Relevance</option>
            <option value="performance">Performance</option>
            <option value="usage">Usage Count</option>
            <option value="recent">Recently Used</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Results:</label>
          <select bind:value={limit}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <button onclick={clearFilters} class="clear-button">Clear Filters</button>
      </div>

      <!-- Tag Filters -->
      {#if availableTags.length > 0}
        <div class="tags-section">
          <label>Tags:</label>
          <div class="tag-filters">
            {#each availableTags as tag}
              <button
                class="tag-button"
                class:selected={selectedTags.includes(tag)}
                onclick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      {#if selectedTags.length > 0}
        <div class="selected-tags">
          <strong>Selected Tags:</strong>
          {#each selectedTags as tag}
            <span class="selected-tag" onclick={() => toggleTag(tag)}>
              {tag} ×
            </span>
          {/each}
        </div>
      {/if}
    </div>
  </section>

  <!-- Search Results -->
  <section class="results-section">
    {#if searchMetadata}
      <div class="results-header">
        <h2>Search Results</h2>
        <div class="results-meta">
          <span>
            {searchMetadata.totalResults} results in {searchMetadata.searchTime.toFixed(2)}ms
            {#if searchMetadata.breakdown}
              • WebGPU: {searchMetadata.breakdown.webgpu} • WebGL: {searchMetadata.breakdown.webgl}
            {/if}
          </span>
          {#if searchResults.length > 0}
            <button onclick={exportResults} class="export-button">📥 Export Results</button>
          {/if}
        </div>
      </div>
    {/if}

    {#if isSearching}
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>Searching shaders...</p>
      </div>
    {:else if searchResults.length === 0}
      <div class="no-results">
        <p>No shaders found matching your search criteria.</p>
        <p>Try adjusting your filters or search query.</p>
      </div>
    {:else}
      <div class="results-grid">
        {#each searchResults as shader}
          <div class="shader-card" onclick={() => selectedShader = shader}>
            <div class="shader-header">
              <h3>{shader.id}</h3>
              <div class="shader-badges">
                <div class="shader-type">{shader.config?.type || 'unknown'}</div>
                <div class="platform-badge {shader.shaderType}">{shader.shaderType?.toUpperCase() || 'UNKNOWN'}</div>
              </div>
            </div>

            <div class="shader-meta">
              <div class="meta-item">
                <strong>Operation:</strong> {shader.metadata.operation}
              </div>
              <div class="meta-item">
                <strong>Usage:</strong> {shader.metadata.usageCount} times
              </div>
              <div class="meta-item">
                <strong>Performance:</strong> {formatExecutionTime(shader.metadata.averageExecutionTime)}
              </div>
              {#if shader.relevanceScore}
                <div class="meta-item">
                  <strong>Relevance:</strong> {formatRelevanceScore(shader.relevanceScore)}
                </div>
              {/if}
            </div>

            <div class="shader-description">
              {shader.metadata.description}
            </div>

            <div class="shader-tags">
              {#each shader.metadata.tags as tag}
                <span class="tag">{tag}</span>
              {/each}
            </div>

            <div class="shader-preview">
              <pre><code>{shader.wgslPreview || shader.wgsl.substring(0, 200) + '...'}</code></pre>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Shader Detail Modal -->
  {#if selectedShader}
    <div class="modal-backdrop" onclick={() => selectedShader = null}>
      <div class="modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h2>{selectedShader.id}</h2>
          <button onclick={() => selectedShader = null} class="close-button">×</button>
        </div>

        <div class="modal-content">
          <div class="shader-details">
            <div class="detail-group">
              <h3>Metadata</h3>
              <div class="detail-grid">
                <div><strong>Type:</strong> {selectedShader.config.type}</div>
                <div><strong>Operation:</strong> {selectedShader.metadata.operation}</div>
                <div><strong>Usage Count:</strong> {selectedShader.metadata.usageCount}</div>
                <div><strong>Performance:</strong> {formatExecutionTime(selectedShader.metadata.averageExecutionTime)}</div>
                <div><strong>Compiled:</strong> {selectedShader.metadata.compiledAt}</div>
                <div><strong>Last Used:</strong> {selectedShader.metadata.lastUsed}</div>
                {#if selectedShader.relevanceScore}
                  <div><strong>Relevance:</strong> {formatRelevanceScore(selectedShader.relevanceScore)}</div>
                {/if}
                {#if selectedShader.embeddingSimilarity}
                  <div><strong>Similarity:</strong> {(selectedShader.embeddingSimilarity * 100).toFixed(2)}%</div>
                {/if}
              </div>
            </div>

            <div class="detail-group">
              <h3>Description</h3>
              <p>{selectedShader.metadata.description}</p>
            </div>

            <div class="detail-group">
              <h3>Tags</h3>
              <div class="tags">
                {#each selectedShader.metadata.tags as tag}
                  <span class="tag">{tag}</span>
                {/each}
              </div>
            </div>

            <div class="detail-group">
              <div class="code-header">
                <h3>WGSL Code</h3>
                <button onclick={() => copyShaderCode(selectedShader!)} class="copy-button">
                  📋 Copy Code
                </button>
              </div>
              <div class="code-container">
                <pre><code>{selectedShader.wgsl}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  header {
    text-align: center;
    margin-bottom: 2rem;
  }

  h1 {
    color: #2563eb;
    margin-bottom: 0.5rem;
  }

  .stats-section {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: 8px;
    text-align: center;
  }

  .stat-number {
    font-size: 2rem;
    font-weight: bold;
    color: #1f2937;
  }

  .stat-number.webgpu-color {
    color: #10b981;
  }

  .stat-number.webgl-color {
    color: #f59e0b;
  }

  .stat-label {
    color: #6b7280;
    font-size: 0.9rem;
  }

  .top-operations {
    border-top: 1px solid #e5e7eb;
    padding-top: 1rem;
  }

  .operation-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .operation-tag {
    background: #dbeafe;
    color: #1e40af;
    padding: 0.25rem 0.75rem;
    border-radius: 15px;
    font-size: 0.9rem;
    cursor: pointer;
  }

  .operation-tag:hover {
    background: #bfdbfe;
  }

  .search-section {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .search-input-group {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .search-input {
    flex: 1;
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
  }

  .search-input:focus {
    outline: none;
    border-color: #2563eb;
  }

  .search-button {
    background: #2563eb;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
  }

  .search-button:disabled {
    background: #9ca3af;
  }

  .filters-row {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: end;
    margin-bottom: 1rem;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-group label {
    font-weight: 500;
    color: #374151;
  }

  .filter-group select {
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
  }

  .clear-button {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
  }

  .tags-section {
    margin-top: 1rem;
  }

  .tag-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .tag-button {
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    padding: 0.25rem 0.75rem;
    border-radius: 15px;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .tag-button.selected {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
  }

  .selected-tags {
    margin-top: 1rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }

  .selected-tag {
    background: #1e40af;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 15px;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .results-section {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .results-meta {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .export-button {
    background: #10b981;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
  }

  .loading {
    text-align: center;
    padding: 3rem;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f4f6;
    border-top: 4px solid #2563eb;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .no-results {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }

  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 1.5rem;
  }

  .shader-card {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .shader-card:hover {
    border-color: #2563eb;
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .shader-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .shader-header h3 {
    margin: 0;
    color: #1f2937;
  }

  .shader-badges {
    display: flex;
    gap: 0.5rem;
  }

  .shader-type {
    background: #dbeafe;
    color: #1e40af;
    padding: 0.25rem 0.75rem;
    border-radius: 15px;
    font-size: 0.8rem;
  }

  .platform-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 15px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .platform-badge.webgpu {
    background: #10b981;
    color: white;
  }

  .platform-badge.webgl {
    background: #f59e0b;
    color: white;
    font-weight: 500;
  }

  .shader-meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.5rem;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .meta-item {
    color: #4b5563;
  }

  .shader-description {
    color: #6b7280;
    margin-bottom: 1rem;
    font-style: italic;
  }

  .shader-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-bottom: 1rem;
  }

  .tag {
    background: #f3f4f6;
    color: #374151;
    padding: 0.15rem 0.5rem;
    border-radius: 10px;
    font-size: 0.8rem;
  }

  .shader-preview {
    background: #1f2937;
    border-radius: 6px;
    padding: 1rem;
    overflow: hidden;
  }

  .shader-preview pre {
    margin: 0;
    color: #d1d5db;
    font-size: 0.8rem;
    white-space: pre-wrap;
    overflow: hidden;
  }

  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 1000px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-header h2 {
    margin: 0;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.5rem;
  }

  .modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .detail-group {
    margin-bottom: 2rem;
  }

  .detail-group h3 {
    color: #1f2937;
    margin-bottom: 1rem;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .copy-button {
    background: #10b981;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
  }

  .code-container {
    background: #1f2937;
    border-radius: 8px;
    padding: 1.5rem;
    overflow-x: auto;
  }

  .code-container pre {
    margin: 0;
    color: #d1d5db;
    font-size: 0.9rem;
    white-space: pre-wrap;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
</style>
