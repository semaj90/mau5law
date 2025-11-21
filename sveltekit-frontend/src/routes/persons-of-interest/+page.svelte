<script lang="ts">
  import FilterPanel from '$lib/components/FilterPanel.svelte';
  import PersonCard from '$lib/components/PersonCard.svelte';
  import PersonForm from '$lib/components/PersonForm.svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import StatsPanel from '$lib/components/StatsPanel.svelte';
  import type { PersonOfInterest } from '$lib/db/schema';
  import { onMount } from 'svelte';

  // State management with Svelte 5 runes
  let persons = $state<PersonOfInterest[]>([]);
  let filteredPersons = $state<PersonOfInterest[]>([]);
  let stats = $state({
    total: 0,
    active: 0,
    highRisk: 0,
    aiGenerated: 0,
    byPriority: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    },
    byStatus: {
      active: 0,
      inactive: 0,
      archived: 0
    }
  });

  let searchQuery = $state('');
  let filters = $state({
    status: '',
    priority: '',
    tags: [] as string[]
  });

  let showCreateForm = $state(false);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Load persons from API
  async function loadPersons() {
    try {
      loading = true;
      error = null;

      const response = await fetch('/api/persons');
      if (!response.ok) {
        throw new Error(`Failed to load persons: ${response.status}`);
      }

      const result = await response.json();
      persons = result.persons || [];
      stats = result.stats || stats;

      applyFilters();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load persons';
      console.error('Error loading persons:', err);
    } finally {
      loading = false;
    }
  }

  // Apply search and filters
  function applyFilters() {
    let filtered = [...persons];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(person =>
        person.name.toLowerCase().includes(query) ||
        person.aliases?.some(alias => alias.toLowerCase().includes(query)) ||
        person.description?.toLowerCase().includes(query) ||
        person.aiProfile?.who?.toLowerCase().includes(query) ||
        person.aiProfile?.what?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(person => person.status === filters.status);
    }

    // Apply priority filter
    if (filters.priority) {
      filtered = filtered.filter(person => person.priority === filters.priority);
    }

    // Apply tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(person =>
        filters.tags.some(tag => person.tags?.includes(tag))
      );
    }

    filteredPersons = filtered;
  }

  // Event handlers
  function handleSearch(event: CustomEvent<string>) {
    searchQuery = event.detail;
    applyFilters();
  }

  function handleFilter(event: CustomEvent<typeof filters>) {
    filters = event.detail;
    applyFilters();
  }

  function handleCreatePerson() {
    showCreateForm = true;
  }

  function handlePersonCreated() {
    showCreateForm = false;
    loadPersons(); // Refresh the list
  }

  function handleFormCancel() {
    showCreateForm = false;
  }

  // Load data on mount
  onMount(() => {
    loadPersons();
  });

  // Reactive effects for filtering
  $effect(() => {
    applyFilters();
  });
</script>

<main class="persons-page">
  <div class="page-header">
    <div class="header-content">
      <h1 class="page-title">Persons of Interest</h1>
      <p class="page-subtitle">
        AI-powered legal investigation profiles with structured intelligence analysis
      </p>
    </div>

    <button
      class="create-btn"
      on:click={handleCreatePerson}
      disabled={loading}
    >
      <span class="btn-icon">🤖</span>
      New POI
    </button>
  </div>

  <!-- Stats Panel -->
  <StatsPanel {stats} />

  <!-- Controls Bar -->
  <div class="controls-bar">
    <SearchBar
      placeholder="Search persons by name, aliases, or description..."
      on:search={handleSearch}
    />

    <FilterPanel {filters} on:filter={handleFilter} />
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading persons of interest...</p>
    </div>
  {/if}

  <!-- Error State -->
  {#if error}
    <div class="error-state">
      <div class="error-icon">⚠️</div>
      <h3>Error Loading Data</h3>
      <p>{error}</p>
      <button class="retry-btn" on:click={loadPersons}>
        Retry
      </button>
    </div>
  {/if}

  <!-- Persons Grid -->
  {#if !loading && !error}
    <div class="persons-grid">
      {#if filteredPersons.length === 0}
        <div class="empty-state">
          {#if persons.length === 0}
            <div class="empty-icon">👥</div>
            <h3>No Persons of Interest</h3>
            <p>Get started by creating your first AI-powered POI profile.</p>
            <button class="create-first-btn" on:click={handleCreatePerson}>
              <span class="btn-icon">🤖</span>
              Create First POI
            </button>
          {:else}
            <div class="empty-icon">🔍</div>
            <h3>No Results Found</h3>
            <p>No persons match your current search and filters.</p>
            <button class="clear-filters-btn" on:click={() => { searchQuery = ''; filters = { status: '', priority: '', tags: [] }; }}>
              Clear Filters
            </button>
          {/if}
        </div>
      {:else}
        {#each filteredPersons as person (person.id)}
          <PersonCard {person} />
        {/each}
      {/if}
    </div>
  {/if}

  <!-- Create Person Modal -->
  {#if showCreateForm}
    <div class="modal-overlay" on:click={handleFormCancel}>
      <div class="modal-content" on:click|stopPropagation>
        <PersonForm
          on:created={handlePersonCreated}
          on:cancel={handleFormCancel}
        />
      </div>
    </div>
  {/if}
</main>

<style>
  .persons-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%);
    padding: 2rem;
    color: #e0e0e0;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .header-content {
    flex: 1;
  }

  .page-title {
    margin: 0;
    font-size: 2.5rem;
    font-weight: 700;
    background: linear-gradient(45deg, #00d4ff, #0099cc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .page-subtitle {
    margin: 0.5rem 0 0 0;
    font-size: 1rem;
    color: #b0b0b0;
    max-width: 500px;
  }

  .create-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: linear-gradient(45deg, #00d4ff, #0099cc);
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 15px rgba(0, 212, 255, 0.3);
  }

  .create-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 212, 255, 0.4);
  }

  .create-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-icon {
    font-size: 1.1rem;
  }

  .controls-bar {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    align-items: center;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top: 3px solid #00d4ff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .loading-state p {
    color: #b0b0b0;
    font-size: 1rem;
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
    background: rgba(255, 68, 68, 0.1);
    border: 1px solid rgba(255, 68, 68, 0.3);
    border-radius: 12px;
    margin: 2rem 0;
  }

  .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .error-state h3 {
    margin: 0 0 0.5rem 0;
    color: #ff4444;
    font-size: 1.5rem;
  }

  .error-state p {
    margin: 0 0 1.5rem 0;
    color: #b0b0b0;
  }

  .retry-btn {
    padding: 0.75rem 1.5rem;
    background: linear-gradient(45deg, #ff4444, #cc3333);
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .retry-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(255, 68, 68, 0.3);
  }

  .persons-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 1.5rem;
  }

  .empty-state {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.6;
  }

  .empty-state h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    color: #e0e0e0;
  }

  .empty-state p {
    margin: 0 0 1.5rem 0;
    color: #b0b0b0;
    max-width: 400px;
  }

  .create-first-btn, .clear-filters-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: linear-gradient(45deg, #00d4ff, #0099cc);
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .create-first-btn:hover, .clear-filters-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 212, 255, 0.3);
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
  }

  .modal-content {
    background: rgba(26, 26, 46, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  }

  @media (max-width: 768px) {
    .persons-page {
      padding: 1rem;
    }

    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .page-title {
      font-size: 2rem;
    }

    .controls-bar {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }

    .persons-grid {
      grid-template-columns: 1fr;
    }

    .modal-overlay {
      padding: 1rem;
    }
  }
</style>


