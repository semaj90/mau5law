<script lang="ts">
  import { onMount } from 'svelte';

  interface Statute {
    id: string;
    code: string;
    title: string;
    jurisdiction: string;
    category: string;
    severity: string;
    text: string;
  }

  interface FilterState {
    jurisdiction: Set<string>;
    category: Set<string>;
    severity: Set<string>;
    searchQuery: string;
  }

  let statutes: Statute[] = $state([]);
  let filteredStatutes: Statute[] = $state([]);
  let isLoading = $state(true);
  let selectedStatute: Statute | null = $state(null);
  let showFilters = $state(false);

  let filters: FilterState = $state({
    jurisdiction: new Set(),
    category: new Set(),
    severity: new Set(),
    searchQuery: '',
  });

  const jurisdictions = ['Federal', 'CA', 'NY', 'TX', 'FL'];
  const categories = ['Violent Crime', 'Property Crime', 'White Collar', 'Drug', 'Traffic'];
  const severities = ['Infraction', 'Misdemeanor', 'Felony'];

  onMount(async () => {
    // Simulate loading statutes
    await new Promise(resolve => setTimeout(resolve, 500));
    statutes = [
      {
        id: '1',
        code: '42 U.S.C. § 1983',
        title: 'Civil Rights Action',
        jurisdiction: 'Federal',
        category: 'Civil Rights',
        severity: 'Felony',
        text: 'Every person who, under color of any statute, ordinance, regulation, custom, or usage...',
      },
      {
        id: '2',
        code: 'Cal. Penal Code § 187',
        title: 'Murder',
        jurisdiction: 'CA',
        category: 'Violent Crime',
        severity: 'Felony',
        text: 'Murder is the unlawful killing of a human being, committed with malice aforethought...',
      },
      {
        id: '3',
        code: 'Cal. Penal Code § 261',
        title: 'Rape',
        jurisdiction: 'CA',
        category: 'Violent Crime',
        severity: 'Felony',
        text: 'Rape is an act of sexual intercourse accomplished against a person\'s will...',
      },
      {
        id: '4',
        code: 'NY Penal Law § 155',
        title: 'Larceny',
        jurisdiction: 'NY',
        category: 'Property Crime',
        severity: 'Misdemeanor',
        text: 'Larceny is the wrongful taking, obtaining or withholding of personal property...',
      },
    ];
    isLoading = false;
    applyFilters();
  });

  function applyFilters() {
    filteredStatutes = statutes.filter(statute => {
      const matchesSearch =
        statute.code.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        statute.title.toLowerCase().includes(filters.searchQuery.toLowerCase());

      const matchesJurisdiction =
        filters.jurisdiction.size === 0 || filters.jurisdiction.has(statute.jurisdiction);

      const matchesCategory =
        filters.category.size === 0 || filters.category.has(statute.category);

      const matchesSeverity =
        filters.severity.size === 0 || filters.severity.has(statute.severity);

      return matchesSearch && matchesJurisdiction && matchesCategory && matchesSeverity;
    });
  }

  function toggleFilter(type: 'jurisdiction' | 'category' | 'severity', value: string) {
    if (filters[type].has(value)) {
      filters[type].delete(value);
    } else {
      filters[type].add(value);
    }
    applyFilters();
  }

  function clearFilters() {
    filters.jurisdiction.clear();
    filters.category.clear();
    filters.severity.clear();
    filters.searchQuery = '';
    applyFilters();
  }

  function selectStatute(statute: Statute) {
    selectedStatute = statute;
  }

  function saveStatute(statute: Statute) {
    console.log('Saved statute:', statute);
  }

  function sendToChat(statute: Statute) {
    console.log('Sending to chat:', statute);
  }
</script>

<div class="laws-search-container">
  <!-- Search Bar -->
  <div class="search-bar">
    <input
      type="text"
      placeholder="Search statutes by code or title..."
      bind:value={filters.searchQuery}
      on:input={applyFilters}
      class="search-input"
    />
    <button class="filter-toggle" on:click={() => (showFilters = !showFilters)}>
      🔽 Filters
    </button>
  </div>

  <!-- Filters Panel -->
  {#if showFilters}
    <div class="filters-panel">
      <div class="filter-group">
        <h4 class="filter-title">Jurisdiction</h4>
        <div class="filter-chips">
          {#each jurisdictions as jurisdiction}
            <button
              class="chip"
              class:active={filters.jurisdiction.has(jurisdiction)}
              on:click={() => toggleFilter('jurisdiction', jurisdiction)}
            >
              {jurisdiction}
            </button>
          {/each}
        </div>
      </div>

      <div class="filter-group">
        <h4 class="filter-title">Category</h4>
        <div class="filter-chips">
          {#each categories as category}
            <button
              class="chip"
              class:active={filters.category.has(category)}
              on:click={() => toggleFilter('category', category)}
            >
              {category}
            </button>
          {/each}
        </div>
      </div>

      <div class="filter-group">
        <h4 class="filter-title">Severity</h4>
        <div class="filter-chips">
          {#each severities as severity}
            <button
              class="chip"
              class:active={filters.severity.has(severity)}
              on:click={() => toggleFilter('severity', severity)}
            >
              {severity}
            </button>
          {/each}
        </div>
      </div>

      <button class="clear-filters-btn" on:click={clearFilters}>Clear All Filters</button>
    </div>
  {/if}

  <!-- Results Grid -->
  <div class="results-grid">
    <!-- Statutes List -->
    <div class="statutes-list">
      {#if isLoading}
        <div class="loading">Loading statutes...</div>
      {:else if filteredStatutes.length === 0}
        <div class="empty-state">
          <p>No statutes found matching your criteria.</p>
          <button class="clear-filters-btn" on:click={clearFilters}>Clear Filters</button>
        </div>
      {:else}
        {#each filteredStatutes as statute (statute.id)}
          <div
            class="statute-card"
            class:selected={selectedStatute?.id === statute.id}
            on:click={() => selectStatute(statute)}
          >
            <div class="card-header">
              <div class="code-and-title">
                <span class="statute-code">{statute.code}</span>
                <span class="statute-title">{statute.title}</span>
              </div>
              <div class="badges">
                <span class="badge jurisdiction">{statute.jurisdiction}</span>
                <span class="badge severity" class:felony={statute.severity === 'Felony'}>
                  {statute.severity}
                </span>
              </div>
            </div>
            <p class="statute-preview">{statute.text.substring(0, 100)}...</p>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Detail Panel -->
    {#if selectedStatute}
      <div class="detail-panel">
        <div class="detail-header">
          <h3 class="detail-title">{selectedStatute.code}</h3>
          <button class="close-btn" on:click={() => (selectedStatute = null)}>✕</button>
        </div>

        <div class="detail-content">
          <h4 class="detail-subtitle">{selectedStatute.title}</h4>

          <div class="detail-meta">
            <div class="meta-item">
              <span class="meta-label">Jurisdiction:</span>
              <span class="meta-value">{selectedStatute.jurisdiction}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Category:</span>
              <span class="meta-value">{selectedStatute.category}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Severity:</span>
              <span class="meta-value">{selectedStatute.severity}</span>
            </div>
          </div>

          <div class="statute-text">
            <h5>Full Text</h5>
            <p>{selectedStatute.text}</p>
          </div>

          <div class="detail-actions">
            <button class="action-btn primary" on:click={() => saveStatute(selectedStatute!)}>
              💾 Save Citation
            </button>
            <button class="action-btn secondary" on:click={() => sendToChat(selectedStatute!)}>
              💬 Send to Chat
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .laws-search-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .search-bar {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .search-input {
    flex: 1;
    padding: 0.75rem 1rem;
    border: 2px solid #d4a574;
    border-radius: 6px;
    font-size: 1rem;
    background-color: white;
    color: #2c2c2c;
    font-family: 'Source Sans 3', sans-serif;
  }

  .search-input:focus {
    outline: none;
    border-color: #8b4513;
    box-shadow: 0 0 0 3px rgba(139, 69, 19, 0.1);
  }

  .filter-toggle {
    padding: 0.75rem 1.5rem;
    background-color: #8b4513;
    color: #f5f1e8;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .filter-toggle:hover {
    background-color: #a0522d;
  }

  .filters-panel {
    background-color: #f0ebe0;
    border: 1px solid #d4a574;
    border-radius: 6px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .filter-title {
    font-family: 'Crimson Text', Georgia, serif;
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
    color: #2c2c2c;
  }

  .filter-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .chip {
    padding: 0.5rem 1rem;
    background-color: #e0d5c7;
    border: 2px solid transparent;
    border-radius: 20px;
    color: #2c2c2c;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .chip:hover {
    background-color: #d4a574;
  }

  .chip.active {
    background-color: #8b4513;
    color: #f5f1e8;
    border-color: #8b4513;
  }

  .clear-filters-btn {
    padding: 0.5rem 1rem;
    background-color: transparent;
    border: 1px solid #d4a574;
    border-radius: 4px;
    color: #8b4513;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .clear-filters-btn:hover {
    background-color: #d4a574;
    color: #f5f1e8;
  }

  .results-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  .statutes-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: 600px;
    overflow-y: auto;
  }

  .loading,
  .empty-state {
    padding: 2rem;
    text-align: center;
    color: #666;
    background-color: #f0ebe0;
    border-radius: 6px;
  }

  .statute-card {
    padding: 1rem;
    background-color: white;
    border: 2px solid #e0d5c7;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .statute-card:hover {
    border-color: #d4a574;
    box-shadow: 0 2px 8px rgba(139, 69, 19, 0.1);
  }

  .statute-card.selected {
    border-color: #8b4513;
    background-color: #f5f1e8;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
    gap: 1rem;
  }

  .code-and-title {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .statute-code {
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 0.9rem;
    font-weight: 600;
    color: #8b4513;
  }

  .statute-title {
    font-family: 'Crimson Text', Georgia, serif;
    font-size: 1rem;
    font-weight: 600;
    color: #2c2c2c;
  }

  .badges {
    display: flex;
    gap: 0.5rem;
  }

  .badge {
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .badge.jurisdiction {
    background-color: #e0d5c7;
    color: #2c2c2c;
  }

  .badge.severity {
    background-color: #ffd700;
    color: #2c2c2c;
  }

  .badge.severity.felony {
    background-color: #ff6b6b;
    color: white;
  }

  .statute-preview {
    margin: 0;
    font-size: 0.85rem;
    color: #666;
    line-height: 1.4;
  }

  .detail-panel {
    background-color: white;
    border: 2px solid #d4a574;
    border-radius: 6px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: 600px;
    overflow-y: auto;
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 1rem;
    border-bottom: 2px solid #d4a574;
  }

  .detail-title {
    font-family: 'Crimson Text', Georgia, serif;
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    color: #2c2c2c;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #666;
  }

  .detail-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .detail-subtitle {
    font-family: 'Crimson Text', Georgia, serif;
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
    color: #2c2c2c;
  }

  .detail-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    padding: 1rem;
    background-color: #f5f1e8;
    border-radius: 4px;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .meta-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
  }

  .meta-value {
    font-size: 0.95rem;
    color: #2c2c2c;
    font-weight: 500;
  }

  .statute-text {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .statute-text h5 {
    font-family: 'Crimson Text', Georgia, serif;
    font-size: 0.95rem;
    font-weight: 600;
    margin: 0;
    color: #2c2c2c;
  }

  .statute-text p {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.6;
    color: #333;
  }

  .detail-actions {
    display: flex;
    gap: 0.75rem;
    padding-top: 1rem;
    border-top: 1px solid #e0d5c7;
  }

  .action-btn {
    flex: 1;
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-btn.primary {
    background-color: #8b4513;
    color: #f5f1e8;
  }

  .action-btn.primary:hover {
    background-color: #a0522d;
  }

  .action-btn.secondary {
    background-color: #e0d5c7;
    color: #2c2c2c;
  }

  .action-btn.secondary:hover {
    background-color: #d4a574;
  }

  @media (max-width: 1024px) {
    .results-grid {
      grid-template-columns: 1fr;
    }

    .detail-panel {
      max-height: 400px;
    }
  }
</style>
