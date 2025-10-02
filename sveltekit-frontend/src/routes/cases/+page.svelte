<script lang="ts">
  import { browser } from '$app/environment';

  // Svelte 5 runes
  let cases = $state<any[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  $effect(() => {
    if (browser) {
      loadCases();
    }
  });

  async function loadCases() {
    try {
      loading = true;
      const response = await fetch('/api/cases');

      if (response.ok) {
        const data = await response.json();
        cases = data.data?.cases || [];
      } else {
        error = 'Failed to load cases';
      }
    } catch (err) {
      console.error('Error loading cases:', err);
      error = 'Error loading cases';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Cases - YoRHa Legal AI</title>
</svelte:head>

<div class="cases-page">
  <div class="header">
    <h1>⚖️ Case Management</h1>
    <p class="subtitle">Manage your legal cases with AI-powered insights</p>
  </div>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading cases...</p>
    </div>
  {:else if error}
    <div class="error-card">
      <p>❌ {error}</p>
      <button onclick={() => loadCases()}>Retry</button>
    </div>
  {:else if cases.length === 0}
    <div class="empty-state">
      <h2>No Cases Yet</h2>
      <p>Create your first case to get started</p>
      <a href="/cases/create" class="create-button">+ New Case</a>
    </div>
  {:else}
    <div class="cases-grid">
      {#each cases as caseItem}
        <div class="case-card">
          <h3>{caseItem.title}</h3>
          <p class="case-description">{caseItem.description || 'No description'}</p>
          <div class="case-meta">
            <span class="status status-{caseItem.status}">{caseItem.status}</span>
            <span class="priority priority-{caseItem.priority}">{caseItem.priority}</span>
          </div>
          <a href="/cases/{caseItem.id}" class="view-link">View Details →</a>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .cases-page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
  }

  .header {
    margin-bottom: 2rem;
  }

  .header h1 {
    font-size: 2.5rem;
    color: #ffd700;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: #888;
    font-size: 1.1rem;
  }

  .loading {
    text-align: center;
    padding: 4rem;
  }

  .spinner {
    border: 4px solid rgba(255, 215, 0, 0.1);
    border-top: 4px solid #ffd700;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-card {
    background: rgba(255, 0, 0, 0.1);
    border: 2px solid #ff0000;
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
  }

  .error-card button {
    background: #ff0000;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    cursor: pointer;
    margin-top: 1rem;
  }

  .empty-state {
    text-align: center;
    padding: 4rem;
    background: rgba(42, 42, 42, 0.5);
    border-radius: 16px;
    border: 2px dashed #444;
  }

  .empty-state h2 {
    color: #ffd700;
    margin-bottom: 1rem;
  }

  .create-button {
    display: inline-block;
    background: linear-gradient(135deg, #00ff41 0%, #00cc33 100%);
    color: #000;
    padding: 1rem 2rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 700;
    margin-top: 1rem;
    transition: all 0.3s ease;
  }

  .create-button:hover {
    box-shadow: 0 0 20px rgba(0, 255, 65, 0.5);
    transform: translateY(-2px);
  }

  .cases-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .case-card {
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    border: 2px solid #444;
    border-radius: 12px;
    padding: 1.5rem;
    transition: all 0.3s ease;
  }

  .case-card:hover {
    border-color: #ffd700;
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
    transform: translateY(-4px);
  }

  .case-card h3 {
    color: #ffd700;
    margin: 0 0 1rem 0;
    font-size: 1.3rem;
  }

  .case-description {
    color: #b0b0b0;
    margin-bottom: 1rem;
    line-height: 1.5;
  }

  .case-meta {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .status, .priority {
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .status-open {
    background: rgba(0, 255, 65, 0.2);
    color: #00ff41;
  }

  .status-closed {
    background: rgba(128, 128, 128, 0.2);
    color: #888;
  }

  .priority-high {
    background: rgba(255, 0, 0, 0.2);
    color: #ff6b6b;
  }

  .priority-medium {
    background: rgba(255, 215, 0, 0.2);
    color: #ffd700;
  }

  .priority-low {
    background: rgba(0, 128, 255, 0.2);
    color: #4a9eff;
  }

  .view-link {
    color: #ffd700;
    text-decoration: none;
    font-weight: 600;
  }

  .view-link:hover {
    text-decoration: underline;
  }
</style>
