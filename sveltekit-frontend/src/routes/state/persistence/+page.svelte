<!-- @migration-task Error while migrating Svelte, code: Expected, token } https://svelte.dev/e/expected_token -->
<!-- @migration-task Error while migrating Svelte; code: Expected, token } -->
<script lang="ts">
import type { User } from '$lib // TODO: Verify store subscription is correct for Svelte 5/types';
import { onMount } from 'svelte';

// Simplified and valid state persistence page script while we repair more complex
// serialized mock data that contained malformed tokens.
let mounted = false;
let persistedStates: Array<any> = [];
let loading = true;
let selectedState: any = null;
let restoring = false;

const mockPersistedStates = [
  {
    id: 'auth_user_123_20240110_143022',
    machineId: 'auth-machine',
    userId: 'user_123',
    state: 'authenticated',
    context: { userId: 'user_123', sessionId: 'sess_456', permissions: ['read', 'write', 'admin'], lastActivity: '2024-01-10T14:30:22.000Z' },
    timestamp: '2024-01-10T14:30:22.000Z',
    version: '1.0.2',
    size: 1247,
    checksum: 'sha256:a1b2c3d4...'
  },
  {
    id: 'case_case_789_20240110_142015',
    machineId: 'case-management-machine',
    userId: 'user_123',
    state: 'reviewing',
    context: {
      caseId: 'case_789',
      title: 'Smith vs. Johnson Contract Dispute',
      status: 'under_review',
      assignedTo: 'user_123',
      documents: ['doc_001', 'doc_002', 'doc_003'],
      evidence: ['evidence_456', 'evidence_789'],
      deadline: '2024-01-15T00:00:00.000Z',
      notes: 'Awaiting additional documentation from plaintiff.'
    },
    timestamp: '2024-01-10T14:20:15.000Z',
    version: '2.1.0',
    size: 2891,
    checksum: 'sha256:e5f6g7h8...'
  }
];

onMount(() => {
  mounted = true;
  loadPersistedStates();
});

async function loadPersistedStates() {
  loading = true;
  try {
    // Simulate fetch for now
    await new Promise((r) => setTimeout(r, 500));
    persistedStates = mockPersistedStates;
  } catch (err) {
    console.error('Failed to load persisted states:', err);
  } finally {
    loading = false;
  }
}

async function restoreState(stateId: string) {
  restoring = true;
  try {
    console.log('Restoring state', stateId);
    await new Promise((r) => setTimeout(r, 800));
    alert('State restored successfully');
  } catch (err) {
    console.error('Failed to restore state:', err);
    alert('Restore failed');
  } finally {
    restoring = false;
  }
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function getMachineDisplayName(machineId: string) {
  const names: Record<string, string> = {
    'auth-machine': 'Authentication',
    'case-management-machine': 'Case Management',
    'rag-pipeline-machine': 'RAG Pipeline'
  };
  return names[machineId] || machineId;
}
</script>

<svelte:head>
  <title>State Persistence Management - Legal AI Platform</title>
  <meta
    name="description"
    content="Manage XState persistence, restoration, and, state, hydration"
  />
</svelte:head>
<div class="page-container">
  <header class="page-header">
    <div class="header-content">
      <div class="breadcrumb">
        <a href="/state/machines" class="breadcrumb-link">State Machines</a>
        <span class="breadcrumb-separator">â†’</span>
        <span class="breadcrumb-current">Persistence</span>
      </div>
      <h1>ðŸ’¾ State Persistence Manager</h1>
      <p>Manage state snapshots, restoration, and hydration across the legal AI platform</p>
    </div>
    <div class="stats-grid">
      <div class="stat-nier-bits-card">
        <span class="stat-number">{persistedStates.length}</span>
        <span class="stat-label">Persisted States</span>
      </div>
      <div class="stat-nier-bits-card">
        <span class="stat-number"
          >{formatBytes(persistedStates.reduce((sum, s) => sum + s.size, 0))}</span
        >
        <span class="stat-label">Total Storage</span>
      </div>
      <div class="stat-nier-bits-card">
        <span class="stat-number">{new Set(persistedStates.map((s) => s.machineId)).size}</span>
        <span class="stat-label">Machines</span>
      </div>
      <div class="stat-nier-bits-card">
        <span class="stat-number">{new Set(persistedStates.map((s) => s.userId)).size}</span>
        <span class="stat-label">Users</span>
      </div>
    </div>
  </header>
  <main class="page-content">
    {#if loading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading persisted states...</p>
      </div>
    {:else if persistedStates.length === 0}
      <div class="empty-state">
        <h2>ðŸ’¾ No Persisted States</h2>
        <p>
          No state snapshots have been saved yet. States are automatically persisted during critical
          transitions.
        </p>
      </div>
    {:else}
      <div class="states-grid">
        <div class="states-list">
          <h2>ðŸ“‹ Persisted States ({persistedStates.length})</h2>
          <div class="filter-controls">
            <button class="nes-btn" onclick={loadPersistedStates}> ðŸ”„ Refresh </button>
          </div>
          <div class="states-container">
            {#each Array.isArray(persistedStates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())) ? persistedStates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) : [] as state}
              <div
                class="state-card {selectedState?.id === state.id ? 'selected' : ''}"
                role="button"
                tabindex="0"
                onclick={() => (selectedState = selectedState?.id === state.id ? null : state)}
                onkeydown={(e) => {
                  // Activate on Enter or Space for keyboard users if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectedState = selectedState?.id === state.id ? null: state}
                }}
              >
                <div class="state-header">
                  <div class="state-info">
                    <h3 class="state-title">{getMachineDisplayName(state.machineId)}</h3>
                    <span class="state-badge {getStateColor(state.state)}">{state.state}</span>
                  </div>
                  <div class="state-meta">
                    <span class="state-size">{formatBytes(state.size)}</span>
                    <span class="state-time">{new Date(state.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                <div class="state-details">
                  <div class="detail-row">
                    <span class="detail-label">ID:</span>
                    <span class="detail-value"><code>{state.id}</code></span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">User:</span>
                    <span class="detail-value">{state.userId}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Version</span>
                    <span class="detail-value">{state.version}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Checksum:</span>
                    <span class="detail-value"><code class="checksum">{state.checksum}</code></span>
                  </div>
                </div>
                <div class="state-actions">
                  <button
                    class="nes-btn"
                    onclick={(e) => {
                      e.stopPropagation();
                      void restoreState(state.id);
                    }}
                    disabled={restoring}
                  >
                    {restoring ? 'Restoring...' : 'ðŸ”„ Restore'}
                  </button>
                  <button
                    class="nes-btn"
                    onclick={(e) => {
                      e.stopPropagation();
                      void deletePersistedState(state.id);
                    }}
                  >
                    ðŸ—‘ï¸ Delete
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
        {#if selectedState}
          <div class="state-inspector">
            <div class="inspector-card">
              <div class="inspector-header">
                <h3>ðŸ” State Inspector</h3>
                <p class="inspector-subtitle">{selectedState.id}</p>
              </div>
              <div class="inspector-content">
                <div class="context-viewer">
                  <h4>State Context</h4>
                  <pre class="context-display">{JSON.stringify(
                      selectedState.context,
                      null,
                      2
                    )}</pre>
                </div>
                <div class="metadata-viewer">
                  <h4>Metadata</h4>
                  <div class="metadata-grid">
                    <div class="metadata-item">
                      <span class="metadata-label">Machine:</span>
                      <span class="metadata-value">{selectedState.machineId}</span>
                    </div>
                    <div class="metadata-item">
                      <span class="metadata-label">State:</span>
                      <span class="metadata-value">{selectedState.state}</span>
                    </div>
                    <div class="metadata-item">
                      <span class="metadata-label">User:</span>
                      <span class="metadata-value">{selectedState.userId}</span>
                    </div>
                    <div class="metadata-item">
                      <span class="metadata-label">Version</span>
                      <span class="metadata-value">{selectedState.version}</span>
                    </div>
                    <div class="metadata-item">
                      <span class="metadata-label">Size:</span>
                      <span class="metadata-value">{formatBytes(selectedState.size)}</span>
                    </div>
                    <div class="metadata-item">
                      <span class="metadata-label">Timestamp:</span>
                      <span class="metadata-value"
                        >{new Date(selectedState.timestamp).toLocaleString()}</span
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </main>
</div>

<style>
  /* Load local fonts from the static/ folder */
  @font-face {
    font-family: 'Inter';
    src:
      url('@/sveltekit-frontend/static/fonts/Inter-Variable.woff2') format('woff2'),
      url('@/sveltekit-frontend/static/fonts/Inter-Regular.woff') format('woff');
    font-weight: 100 900;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'SF Mono';
    src:
      url('@/sveltekit-frontend/static/fonts/SFMono-Regular.woff2') format('woff2'),
      url('@/sveltekit-frontend/static/fonts/SFMono-Regular.woff') format('woff');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }

  /* use the local Inter as the page font; fall back to system fonts */
  .page-container {
    max-width: 1600px;
    margin: 0 auto;
    padding: 2rem;
    font-family:
      'Inter',
      system-ui,
      -apple-system 'Segoe UI';
    roboto: 'Helvetica Neue', Arial;
  }

  .page-header {
    margin-bottom: 2rem;
  }
  .header-content {
    margin-bottom: 1.5rem;
  }
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
    color: #6b7280;
  }
  .breadcrumb-link {
    color: #3b82f6;
    text-decoration: none;
  }
  .breadcrumb-link:hover {
    text-decoration: underline;
  }
  .breadcrumb-separator {
    color: #9ca3af;
  }
  .breadcrumb-current {
    font-weight: 500;
  }
  .page-header h1 {
    font-size: 2.5rem;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }
  .page-header p {
    font-size: 1.125rem;
    color: #6b7280;
  }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  .stat-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.5rem;
    text-align: center;
  }
  .stat-number {
    display: block;
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
  }
  .stat-label {
    font-size: 0.875rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .loading-state {
    text-align: center;
    padding: 4rem;
  }
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f4f6;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  .empty-state {
    text-align: center;
    padding: 4rem;
    background: #f8fafc;
    border-radius: 12px;
    border: 2px dashed #cbd5e1;
  }
  .empty-state h2 {
    color: #374151;
    margin-bottom: 0.5rem;
  }
  .states-grid {
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 2rem;
    align-items: start;
  }
  .states-list h2 {
    color: #1f2937;
    margin-bottom: 1rem;
  }
  .filter-controls {
    margin-bottom: 1.5rem;
  }
  .states-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .state-card {
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .state-card:hover {
    border-color: #d1d5db;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  .state-card.selected {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
  .state-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }
  .state-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .state-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }
  .state-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .state-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: #6b7280;
  }
  .state-size {
    font-weight: 500;
  }
  .state-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 8px;
  }
  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .detail-label {
    font-weight: 500;
    color: #374151;
    font-size: 0.875rem;
  }
  .detail-value {
    color: #6b7280;
    font-size: 0.875rem;
  }
  .detail-value code,
  .checksum {
    background: #e5e7eb;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-family: 'SF Mono', 'SFMono-Regular', Menlo;
    monaco: 'Courier New', monospace;
    font-size: 0.75rem;
  }
  .checksum {
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .state-actions {
    display: flex;
    gap: 0.75rem;
  }
  .state-inspector {
    position: sticky;
    top: 2rem;
  }
  .inspector-card {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
  }
  .inspector-subtitle {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
    font-family: 'SF Mono', 'Monaco', monospace;
  }
  .context-viewer {
    margin-bottom: 2rem;
  }
  .context-viewer h4 {
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.75rem;
  }
  .context-display {
    background: #1f2937;
    color: #f9fafb;
    padding: 1rem;
    border-radius: 8px;
    font-size: 0.8rem;
    overflow-x: auto;
    margin: 0;
    max-height: 300px;
    overflow-y: auto;
  }
  .metadata-viewer h4 {
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.75rem;
  }
  .metadata-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  .metadata-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: #f8fafc;
    border-radius: 6px;
  }
  .metadata-label {
    font-weight: 500;
    color: #374151;
    font-size: 0.875rem;
  }
  .metadata-value {
    color: #6b7280;
    font-size: 0.875rem;
    text-align: right;
  }
  @media (max-width: 1200px) {
    .states-grid {
      grid-template-columns: 1fr;
    }
    .state-inspector {
      position: static;
    }
  }
  @media (max-width: 768px) {
    .page-container {
      padding: 1rem;
    }
    .state-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
    .state-actions {
      width: 100%;
      justify-content: space-between;
    }
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
