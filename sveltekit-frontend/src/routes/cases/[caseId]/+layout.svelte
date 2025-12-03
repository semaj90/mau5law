<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  // Get case ID from URL params
  let caseId = $derived($page.params.caseId);

  // Case data (will be loaded from API)
  let caseData = $state<any>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Active tab
  let activeTab = $derived($page.url.pathname.split('/').pop() || 'overview');

  // Tabs configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'persons', label: 'Persons', icon: '👥' },
    { id: 'evidence', label: 'Evidence', icon: '📎' },
    { id: 'ai', label: 'AI Analysis', icon: '🤖' },
    { id: 'reports', label: 'Reports', icon: '📄' }
  ];

  // Load case data
  async function loadCase() {
    loading = true;
    error = null;

    try {
      const res = await fetch(`/api/cases/${caseId}`);
      if (!res.ok) {
        throw new Error('Failed to load case');
      }
      caseData = await res.json();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to load case:', err);
    } finally {
      loading = false;
    }
  }

  // Navigate to tab
  function navigateToTab(tabId: string) {
    goto(`/cases/${caseId}/${tabId}`);
  }

  // Load case on mount
  $effect(() => {
    if (caseId) {
      loadCase();
    }
  });
</script>

<div class="case-layout">
  <!-- Case Header -->
  <header class="case-header">
    {#if loading}
      <div class="loading-header">
        <div class="skeleton-title"></div>
        <div class="skeleton-subtitle"></div>
      </div>
    {:else if error}
      <div class="error-header">
        <h1>❌ Error Loading Case</h1>
        <p>{error}</p>
      </div>
    {:else if caseData}
      <div class="case-header-content">
        <div class="case-title-section">
          <h1>{caseData.title || `Case #${caseId}`}</h1>
          <div class="case-meta">
            <span class="case-status status-{caseData.status}">
              {caseData.status?.toUpperCase() || 'OPEN'}
            </span>
            <span class="case-severity severity-{caseData.severity}">
              {caseData.severity?.toUpperCase() || 'MEDIUM'}
            </span>
            <span class="case-date">
              Created: {new Date(caseData.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div class="case-actions">
          <button class="btn-action" onclick={() => navigateToTab('ai')}>
            🤖 Ask AI
          </button>
          <button class="btn-action" onclick={() => navigateToTab('reports')}>
            📄 Generate Report
          </button>
        </div>
      </div>

      {#if caseData.primary_offense_codes && caseData.primary_offense_codes.length > 0}
        <div class="case-charges">
          <strong>Charges:</strong>
          {#each caseData.primary_offense_codes as code}
            <span class="charge-badge">{code}</span>
          {/each}
        </div>
      {/if}
    {/if}
  </header>

  <!-- Tab Navigation -->
  <nav class="case-tabs">
    {#each tabs as tab}
      <button
        class="tab-button"
        class:active={activeTab === tab.id}
        onclick={() => navigateToTab(tab.id)}
      >
        <span class="tab-icon">{tab.icon}</span>
        <span class="tab-label">{tab.label}</span>
      </button>
    {/each}
  </nav>

  <!-- Tab Content -->
  <main class="case-content">
    {#if loading}
      <div class="loading-content">
        <div class="spinner"></div>
        <p>Loading case data...</p>
      </div>
    {:else if error}
      <div class="error-content">
        <h2>Failed to load case</h2>
        <p>{error}</p>
        <button onclick={loadCase}>Retry</button>
      </div>
    {:else}
      <slot />
    {/if}
  </main>
</div>

<style>
  .case-layout {
    background: var(--yorha-bg);
    color: var(--yorha-ink);
    font-family: var(--yorha-font);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .case-header {
    background: var(--yorha-paper);
    border-bottom: 3px solid var(--yorha-crimson);
    padding: 1.5rem 2rem;
  }

  .case-header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 2rem;
  }

  .case-title-section h1 {
    margin: 0 0 0.5rem 0;
    font-size: 1.75rem;
    color: var(--yorha-ink);
    font-weight: bold;
  }

  .case-meta {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .case-status,
  .case-severity {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 3px;
    font-size: 0.75rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .case-status.status-open {
    background: #2196f3;
    color: white;
  }

  .case-status.status-charged {
    background: #ff9800;
    color: white;
  }

  .case-status.status-closed {
    background: #9e9e9e;
    color: white;
  }

  .case-severity.severity-high {
    background: var(--yorha-crimson);
    color: white;
  }

  .case-severity.severity-medium {
    background: #ff9800;
    color: white;
  }

  .case-severity.severity-low {
    background: #4caf50;
    color: white;
  }

  .case-date {
    font-size: 0.875rem;
    color: #666;
  }

  .case-actions {
    display: flex;
    gap: 1rem;
  }

  .btn-action {
    padding: 0.75rem 1.5rem;
    background: var(--yorha-crimson);
    color: white;
    border: none;
    border-radius: 3px;
    font-family: var(--yorha-font);
    font-size: 0.875rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-action:hover {
    background: #8a1625;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .case-charges {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #ddd;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .charge-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 3px;
    font-size: 0.875rem;
    font-weight: bold;
    color: var(--yorha-ink);
  }

  .case-tabs {
    background: var(--yorha-panel);
    border-bottom: 2px solid var(--yorha-ink);
    display: flex;
    gap: 0;
    padding: 0 2rem;
  }

  .tab-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    font-family: var(--yorha-font);
    font-size: 0.9rem;
    font-weight: bold;
    color: var(--yorha-ink);
    cursor: pointer;
    transition: all 0.2s ease;
    opacity: 0.7;
  }

  .tab-button:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.05);
  }

  .tab-button.active {
    opacity: 1;
    border-bottom-color: var(--yorha-crimson);
    background: var(--yorha-paper);
  }

  .tab-icon {
    font-size: 1.25rem;
  }

  .case-content {
    flex: 1;
    padding: 2rem;
    overflow-y: auto;
  }

  .loading-header,
  .error-header {
    padding: 1rem 0;
  }

  .skeleton-title {
    width: 60%;
    height: 2rem;
    background: #e0e0e0;
    border-radius: 3px;
    margin-bottom: 0.5rem;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .skeleton-subtitle {
    width: 40%;
    height: 1rem;
    background: #e0e0e0;
    border-radius: 3px;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .loading-content,
  .error-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    text-align: center;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid var(--yorha-crimson);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-content h2 {
    color: var(--yorha-crimson);
    margin-bottom: 1rem;
  }

  .error-content button {
    padding: 0.75rem 1.5rem;
    background: var(--yorha-crimson);
    color: white;
    border: none;
    border-radius: 3px;
    font-family: var(--yorha-font);
    font-weight: bold;
    cursor: pointer;
  }
</style>
