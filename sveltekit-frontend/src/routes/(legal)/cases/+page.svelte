<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';

  // Svelte 5 props from server load function
  let { data }: { data: PageData } = $props();

  // Svelte 5 runes - initialize from server data
  let cases = $state<any[]>(data.cases || []);
  let loading = $state(false);
  let error = $state<string | null>(data.error || null);

  // Development mode indicator
  let devBypassActive = $state(data.devBypassActive || false);

  async function loadCases() {
    try {
      loading = true;
      const response = await fetch('/api/cases');

      if (response.ok) {
        const data = await response.json();
        cases = data.data?.cases || [];
        error = null;
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load cases' }));
        error = errorData.error || errorData.message || 'Failed to load cases';
        console.error('Failed to load cases:', errorData);
      }
    } catch (err) {
      console.error('Failed to load cases:', err);
      error = err instanceof Error ? err.message : 'Error loading cases';
    } finally {
      loading = false;
    }
  }

  function navigateToCase(caseId: string) {
    goto(`/cases/${caseId}`);
  }

  function createNewCase() {
    goto('/cases/create');
  }
</script>

<svelte:head>
  <title>Cases - Legal AI Platform</title>
</svelte:head>

<div class="cases-page">
  {#if devBypassActive}
    <div class="dev-banner">🔓 Development Mode: Authentication Bypassed - Testing uploads without user session</div>
  {/if}

  <header class="page-header">
    <h1>Legal Cases</h1>
    <button class="btn-primary" on:click={createNewCase}>
      <span>+</span> New Case
    </button>
  </header>

  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading cases...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <div class="error-icon">⚠️</div>
      <h2>Error Loading Cases</h2>
      <p>{error}</p>
      <button class="btn-secondary" on:click={loadCases}>Retry</button>
    </div>
  {:else if cases.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📋</div>
      <h2>No Cases Found</h2>
      <p>Get started by creating your first case</p>
      <button class="btn-primary" on:click={createNewCase}>Create Case</button>
    </div>
  {:else}
    <div class="cases-grid">
      {#each cases as caseItem (caseItem.id)}
        <div
          class="case-card"
          on:click={() => navigateToCase(caseItem.id)}
          onkeydown={e => {
            if (e.key === 'Enter' || e.key === ' ') navigateToCase(caseItem.id);
          }}
          role="button"
          tabindex="0"
        >
          <div class="case-header">
            <h3>{caseItem.title}</h3>
            <span class="case-status status-{caseItem.status}">{caseItem.status}</span>
          </div>
          {#if caseItem.description}
            <p class="case-description">{caseItem.description}</p>
          {/if}
          <div class="case-meta">
            {#if caseItem.caseNumber}
              <span class="meta-item">📋 {caseItem.caseNumber}</span>
            {/if}
            {#if caseItem.priority}
              <span class="meta-item priority-{caseItem.priority}">
                🔔 {caseItem.priority}
              </span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .cases-page {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .page-header h1 {
    font-size: 2rem;
    color: #ffd700;
    margin: 0,
  }

  .btn-primary,
  .btn-secondary {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #ffd700;
    color: #000;
    font-weight: 600,
  }

  .btn-primary:hover {
    background: #ffed4e;
    transform: translateY(-2px);
  }

  .btn-secondary {
    background: #333;
    color: #ffd700;
    border: 1px solid #ffd700;
  }

  .btn-secondary:hover {
    background: #444;
  }

  .loading-state,
  .error-state,
  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #333;
    border-top-color: #ffd700;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-icon,
  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .cases-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .case-card {
    background: #1a1a1a;
    border: 2px solid #333;
    border-radius: 12px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .case-card:hover {
    border-color: #ffd700;
    transform: translateY(-4px);
    box-shadow: 0 4px 20px rgba(255, 215, 0, 0.2);
  }

  .case-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 1rem;
  }

  .case-header h3 {
    margin: 0,
    color: #fff;
    font-size: 1.25rem;
  }

  .case-status {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-open {
    background: #4caf50;
    color: #000;
  }

  .status-investigating {
    background: #ff9800;
    color: #000;
  }

  .status-pending {
    background: #ffd700;
    color: #000;
  }

  .status-closed {
    background: #666;
    color: #fff;
  }

  .case-description {
    color: #aaa;
    margin: 0 0 1rem 0;
    line-height: 1.5,
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .case-meta {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .meta-item {
    font-size: 0.9rem;
    color: #888;
  }

  .priority-critical {
    color: #f44336;
    font-weight: 600,
  }

  .priority-high {
    color: #ff9800;
    font-weight: 600,
  }

  .priority-medium {
    color: #ffd700;
  }

  .priority-low {
    color: #888;
  }

  .dev-banner {
    background: linear-gradient(135deg, #ff6b6b 0%, #ffd700 100%);
    color: #000;
    padding: 0.75rem 1.5rem;
    text-align: center;
    font-weight: 600;
    border-radius: 8px;
    margin-bottom: 1rem;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1,
    }
    50% {
      opacity: 0.8,
    }
  }
</style>
