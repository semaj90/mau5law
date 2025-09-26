<script lang="ts">
  import { Button } from '$lib/components/ui/core';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { onMount } from 'svelte';

  interface Law {
    id: string;
    title: string;
    code?: string;
    citation?: string;
    description?: string;
    summary?: string;
    category?: string;
    court?: string;
    jurisdiction?: string;
    year?: number;
    penalties?: any;
    legalPrinciples?: string[];
    isActive?: boolean;
  }

  let laws = $state<Law[]>([]);
  let loading = $state(true);
  let searchQuery = $state('');
  let lawType = $state<'statutes' | 'precedents'>('statutes');
  let jurisdiction = $state('');

  onMount(async () => {
    await loadLaws();
  });

  async function loadLaws() {
    try {
      loading = true;
      const params = new URLSearchParams();
      params.set('type', lawType);
      if (searchQuery) params.set('search', searchQuery);
      if (jurisdiction) params.set('jurisdiction', jurisdiction);

      const response = await fetch(`/api/legal/laws?${params}`);
      const data = await response.json();
      laws = data.laws || [];
    } catch (error) {
      console.error('Failed to load laws:', error);
    } finally {
      loading = false;
    }
  }

  async function handleSearch() {
    await loadLaws();
  }

  function switchLawType(type: 'statutes' | 'precedents') {
    lawType = type;
    loadLaws();
  }
</script>

<svelte:head>
  <title>Laws & Statutes | YoRHa Legal AI</title>
  <meta name="description" content="Search legal statutes and precedents with AI-powered analysis" />
</svelte:head>

<div class="laws-page">
  <div class="page-header">
    <h1>⚖️ Laws & Statutes</h1>
    <p>Search and analyze legal statutes and precedents</p>
  </div>

  <!-- Type Selector -->
  <div class="type-selector">
    <Button
      onclick={() => switchLawType('statutes')}
      class="type-button"
      class:active={lawType === 'statutes'}
    >
      📜 Statutes
    </Button>
    <Button
      onclick={() => switchLawType('precedents')}
      class="type-button"
      class:active={lawType === 'precedents'}
    >
      🏛️ Precedents
    </Button>
  </div>

  <!-- Search Controls -->
  <Card class="search-card">
    <CardContent>
      <div class="search-controls">
        <div class="search-input">
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search {lawType}..."
            class="search-field"
          />
        </div>
        <div class="filter-controls">
          <input
            type="text"
            bind:value={jurisdiction}
            placeholder="Jurisdiction (e.g., Federal, CA, NY)"
            class="jurisdiction-field"
          />
        </div>
        <Button onclick={handleSearch} class="search-button">
          🔍 Search
        </Button>
      </div>
    </CardContent>
  </Card>

  <!-- Results -->
  {#if loading}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading {lawType}...</p>
    </div>
  {:else if laws.length === 0}
    <div class="empty-state">
      <div class="empty-icon">⚖️</div>
      <h3>No {lawType} found</h3>
      <p>Try adjusting your search criteria</p>
    </div>
  {:else}
    <div class="laws-grid">
      {#each laws as law}
        <Card class="law-card">
          <CardHeader>
            <CardTitle class="law-title">
              {#if lawType === 'statutes'}
                {law.code} - {law.title}
              {:else}
                {law.title}
              {/if}
            </CardTitle>
            {#if law.jurisdiction}
              <div class="jurisdiction-badge">
                {law.jurisdiction}
              </div>
            {/if}
          </CardHeader>
          <CardContent>
            {#if lawType === 'precedents' && law.citation}
              <div class="citation">
                <strong>Citation:</strong> {law.citation}
              </div>
            {/if}

            {#if law.court}
              <div class="court-info">
                <strong>Court:</strong> {law.court}
                {#if law.year}({law.year}){/if}
              </div>
            {/if}

            <div class="description">
              {law.description || law.summary || 'No description available'}
            </div>

            {#if law.legalPrinciples && law.legalPrinciples.length > 0}
              <div class="legal-principles">
                <strong>Legal Principles:</strong>
                <ul>
                  {#each law.legalPrinciples.slice(0, 3) as principle}
                    <li>{principle}</li>
                  {/each}
                </ul>
              </div>
            {/if}

            {#if law.penalties && lawType === 'statutes'}
              <div class="penalties">
                <strong>Penalties:</strong>
                <div class="penalty-info">
                  {JSON.stringify(law.penalties)}
                </div>
              </div>
            {/if}

            <div class="law-footer">
              <div class="law-meta">
                {#if law.category}
                  <span class="category-tag">{law.category}</span>
                {/if}
                {#if law.isActive === false}
                  <span class="inactive-badge">INACTIVE</span>
                {/if}
              </div>
              <div class="law-actions">
                <Button size="sm" class="view-button">
                  👁️ View Full Text
                </Button>
                <Button size="sm" class="analyze-button">
                  🧠 AI Analysis
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      {/each}
    </div>
  {/if}
</div>

<style>
  .laws-page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .page-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .page-header h1 {
    font-size: 2.5rem;
    color: var(--text-primary, #00ff00);
    margin-bottom: 0.5rem;
    text-shadow: 0 0 15px currentColor;
  }

  .type-selector {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .type-button {
    padding: 0.75rem 1.5rem;
    background: rgba(0, 255, 0, 0.1);
    color: var(--text-primary, #00ff00);
    border: 1px solid rgba(0, 255, 0, 0.3);
  }

  .type-button.active {
    background: var(--text-primary, #00ff00);
    color: var(--surface-secondary, #000000);
  }

  .search-card {
    margin-bottom: 2rem;
    background: var(--surface-secondary, #111111);
    border: 1px solid var(--border-primary, #00ff00);
  }

  .search-controls {
    display: grid;
    grid-template-columns: 2fr 1fr auto;
    gap: 1rem;
    align-items: center;
  }

  .search-field, .jurisdiction-field {
    background: var(--surface-primary, #0a0a0a);
    border: 1px solid rgba(0, 255, 0, 0.3);
    border-radius: 4px;
    padding: 0.75rem;
    color: var(--text-primary, #ffffff);
    font-family: inherit;
  }

  .loading-state, .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--text-secondary, #888888);
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(0, 255, 0, 0.3);
    border-top: 3px solid var(--text-primary, #00ff00);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .laws-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
    gap: 1.5rem;
  }

  .law-card {
    background: var(--surface-secondary, #111111);
    border: 1px solid var(--border-primary, #00ff00);
    transition: all 0.3s ease;
  }

  .law-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 255, 0, 0.2);
  }

  .law-title {
    color: var(--text-primary, #00ff00);
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
  }

  .jurisdiction-badge {
    background: rgba(0, 255, 0, 0.2);
    color: var(--text-primary, #00ff00);
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
    font-size: 0.8rem;
    font-weight: bold;
    display: inline-block;
  }

  .citation, .court-info {
    color: var(--text-secondary, #cccccc);
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
  }

  .description {
    color: var(--text-primary, #ffffff);
    margin-bottom: 1rem;
    line-height: 1.4;
  }

  .legal-principles ul {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
    color: var(--text-secondary, #cccccc);
  }

  .legal-principles li {
    margin-bottom: 0.25rem;
  }

  .penalties {
    margin-bottom: 1rem;
  }

  .penalty-info {
    background: rgba(255, 102, 0, 0.1);
    color: var(--warning, #ff6600);
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    margin-top: 0.5rem;
  }

  .law-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(0, 255, 0, 0.2);
    padding-top: 0.75rem;
  }

  .law-meta {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .category-tag {
    background: rgba(0, 204, 255, 0.2);
    color: #00ccff;
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
    font-size: 0.7rem;
    font-weight: bold;
  }

  .inactive-badge {
    background: var(--error, #ff0000);
    color: white;
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
    font-size: 0.7rem;
    font-weight: bold;
  }

  .law-actions {
    display: flex;
    gap: 0.5rem;
  }

  @media (max-width: 768px) {
    .search-controls {
      grid-template-columns: 1fr;
    }

    .laws-grid {
      grid-template-columns: 1fr;
    }

    .type-selector {
      flex-direction: column;
      align-items: center;
    }

    .page-header h1 {
      font-size: 2rem;
    }
  }
</style>