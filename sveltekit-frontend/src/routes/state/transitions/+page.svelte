<script lang="ts">
</script>
  // XState Transition Monitoring & Visualization
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import Button from '$lib/components/ui/Button.svelte';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  
  let mounted = $state(false);
  let machineId = $state($page.url.searchParams.get('machine') || 'auth-machine');
  let transitions = $state([]);
  let currentState = $state('');
  let loading = $state(true);
  let selectedTransition = $state(null);
  
  // Mock transition data - replace with actual XState introspection
  let mockTransitions = {
    'auth-machine': {
      currentState: 'authenticated',
      transitions: [
        {
          id: 'logout',
          event: 'LOGOUT',
          from: 'authenticated',
          to: 'unauthenticated',
          timestamp: new Date().toISOString(),
          duration: 150,
          context: { userId: 'user_123', sessionId: 'sess_456' },
          guards: ['isValidSession'],
          actions: ['clearToken', 'redirectToLogin']
        },
        {
          id: 'refresh',
          event: 'REFRESH_TOKEN',
          from: 'authenticated',
          to: 'refreshing',
          timestamp: new Date(Date.now() - 30000).toISOString(),
          duration: 300,
          context: { userId: 'user_123', tokenExp: 1642435200 },
          guards: ['tokenNearExpiry'],
          actions: ['refreshAuthToken']
        },
        {
          id: 'profile',
          event: 'VIEW_PROFILE',
          from: 'authenticated',
          to: 'authenticated.profile',
          timestamp: new Date(Date.now() - 60000).toISOString(),
          duration: 50,
          context: { userId: 'user_123', route: '/profile' },
          guards: [],
          actions: ['navigateToProfile', 'trackPageView']
        }
      ]
    },
    'case-management-machine': {
      currentState: 'reviewing',
      transitions: [
        {
          id: 'submit',
          event: 'SUBMIT_CASE',
          from: 'reviewing',
          to: 'submitting',
          timestamp: new Date().toISOString(),
          duration: 500,
          context: { caseId: 'case_789', reviewerId: 'user_123' },
          guards: ['allFieldsComplete', 'hasPermission'],
          actions: ['validateCase', 'submitToDatabase', 'notifyStakeholders']
        },
        {
          id: 'save-draft',
          event: 'SAVE_DRAFT',
          from: 'reviewing',
          to: 'draft',
          timestamp: new Date(Date.now() - 45000).toISOString(),
          duration: 200,
          context: { caseId: 'case_789', autosave: true },
          guards: [],
          actions: ['saveToDraft', 'updateTimestamp']
        }
      ]
    }
  };
  
  $effect(() => {
    mounted = true;
    loadTransitions();
  });
  
  $effect(() => {
    if (machineId) {
      loadTransitions();
    }
  });
  
  async function loadTransitions() {
    loading = true;
    try {
      // In production: const response = await fetch(`/api/state/machines/${machineId}/transitions`);
      await new Promise(resolve => setTimeout(resolve, 800);
      const machineData = mockTransitions[machineId] || { currentState: 'unknown', transitions: [] };
      currentState = machineData.currentState;
      transitions = machineData.transitions;
    } catch (error) {
      console.error('Failed to load transitions:', error);
    } finally {
      loading = false;
    }
  }
  
  async function triggerTransition(event: string) {
    try {
      // await fetch(`/api/state/machines/${machineId}/trigger`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ event })
      // });
      console.log('Triggering transition:', event);
      await loadTransitions();
    } catch (error) {
      console.error('Failed to trigger transition:', error);
    }
  }
  
  function formatDuration(ms: number) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }
  
  function getTransitionColor(transition: any) {
    const age = Date.now() - new Date(transition.timestamp).getTime();
    if (age < 30000) return 'border-green-200 bg-green-50';
    if (age < 300000) return 'border-blue-200 bg-blue-50';
    return 'border-gray-200 bg-gray-50';
  }
  
  function getStateColor(state: string) {
    if (state.includes('error')) return 'bg-red-100 text-red-800';
    if (state.includes('loading') || state.includes('submitting')) return 'bg-yellow-100 text-yellow-800';
    if (state.includes('authenticated') || state.includes('completed')) return 'bg-green-100 text-green-800';
    return 'bg-blue-100 text-blue-800';
  }
</script>

<svelte:head>
  <title>State Transitions - {machineId} - Legal AI Platform</title>
  <meta name="description" content="Monitor and visualize XState machine transitions" />
</svelte:head>

<div class="page-container">
  <header class="page-header">
    <div class="header-content">
      <div class="breadcrumb">
        <a href="/state/machines" class="breadcrumb-link">State Machines</a>
        <span class="breadcrumb-separator">→</span>
        <span class="breadcrumb-current">{machineId}</span>
      </div>
      
      <h1>🔄 Transition Monitor</h1>
      <p>Real-time transitions for <strong>{machineId}</strong></p>
      
      <div class="current-state-display">
        <span class="state-label">Current State:</span>
        <span class="current-state {getStateColor(currentState)}">{currentState}</span>
      </div>
    </div>
    
    <div class="machine-selector">
      <select bind:value={machineId} class="machine-select">
        <option value="auth-machine">Authentication Machine</option>
        <option value="case-management-machine">Case Management Machine</option>
        <option value="rag-pipeline-machine">RAG Pipeline Machine</option>
        <option value="gpu-allocation-machine">GPU Allocation Machine</option>
      </select>
      
      <Button variant="outline" onclick={loadTransitions}>
        Refresh
      </Button>
    </div>
  </header>

  <main class="page-content">
    {#if loading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading transitions for {machineId}...</p>
      </div>
    {:else if transitions.length === 0}
      <div class="empty-state">
        <h2>🎯 No Transitions Recorded</h2>
        <p>This state machine hasn't recorded any transitions yet.</p>
      </div>
    {:else}
      <div class="transitions-timeline">
        <div class="timeline-header">
          <h2>📊 Transition History ({transitions.length})</h2>
          <div class="timeline-stats">
            <span>Avg Duration: {Math.round(transitions.reduce((sum, t) => sum + t.duration, 0) / transitions.length)}ms</span>
          </div>
        </div>
        
        <div class="timeline-container">
          {#each transitions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) as transition, index}
            <div class="transition-card {getTransitionColor(transition)} {selectedTransition?.id === transition.id ? 'selected' : ''}"
                 role="button" tabindex="0"
                onclick={() => selectedTransition = selectedTransition?.id === transition.id ? null : transition}>
              <div class="transition-header">
                <div class="transition-flow">
                  <span class="state-from">{transition.from}</span>
                  <div class="transition-arrow">
                    <span class="arrow">→</span>
                    <span class="event-label">{transition.event}</span>
                  </div>
                  <span class="state-to">{transition.to}</span>
                </div>
                
                <div class="transition-meta">
                  <span class="duration">{formatDuration(transition.duration)}</span>
                  <span class="timestamp">{new Date(transition.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
              
              {#if selectedTransition?.id === transition.id}
                <div class="transition-details">
                  <div class="details-grid">
                    <div class="detail-section">
                      <h4>Context</h4>
                      <pre class="context-display">{JSON.stringify(transition.context, null, 2)}</pre>
                    </div>
                    
                    <div class="detail-section">
                      <h4>Guards ({transition.guards.length})</h4>
                      <div class="guards-list">
                        {#each transition.guards as guard}
                          <span class="guard-badge">✓ {guard}</span>
                        {/each}
                        {#if transition.guards.length === 0}
                          <span class="no-guards">No guards</span>
                        {/if}
                      </div>
                    </div>
                    
                    <div class="detail-section">
                      <h4>Actions ({transition.actions.length})</h4>
                      <div class="actions-list">
                        {#each transition.actions as action}
                          <span class="action-badge">⚡ {action}</span>
                        {/each}
                      </div>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
    
    <div class="transition-controls">
      <Card class="controls-card">
        <CardHeader>
          <CardTitle>Trigger Transitions</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="control-buttons">
            <Button onclick={() => triggerTransition('LOGOUT')}>
              Trigger Logout
            </Button>
            <Button variant="outline" onclick={() => triggerTransition('REFRESH_TOKEN')}>
              Refresh Token
            </Button>
            <Button variant="outline" onclick={() => triggerTransition('VIEW_PROFILE')}>
              View Profile
            </Button>
          </div>
          <p class="control-note">
            ⚠️ These are test triggers. In production, transitions are triggered by application events.
          </p>
        </CardContent>
      </Card>
    </div>
  </main>
</div>

<style>
  .page-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
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
    margin-bottom: 1rem;
  }

  .current-state-display {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .state-label {
    font-weight: 500;
    color: #374151;
  }

  .current-state {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-weight: 500;
    font-size: 1rem;
  }

  .machine-selector {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
  }

  .machine-select {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    color: #374151;
    min-width: 200px;
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
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
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

  .transitions-timeline {
    margin-bottom: 2rem;
  }

  .timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .timeline-header h2 {
    color: #1f2937;
    margin: 0;
  }

  .timeline-stats {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .timeline-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .transition-card {
    border: 2px solid;
    border-radius: 12px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .transition-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .transition-card.selected {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }

  .transition-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .transition-flow {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .state-from,
  .state-to {
    padding: 0.25rem 0.75rem;
    border-radius: 6px;
    background: #e5e7eb;
    color: #374151;
    font-weight: 500;
    font-size: 0.875rem;
  }

  .state-to {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .transition-arrow {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .arrow {
    font-size: 1.25rem;
    color: #6b7280;
  }

  .event-label {
    font-size: 0.75rem;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .transition-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .duration {
    font-weight: 500;
    color: #059669;
  }

  .transition-details {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1.5rem;
  }

  .detail-section h4 {
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .context-display {
    background: #1f2937;
    color: #f9fafb;
    padding: 0.75rem;
    border-radius: 6px;
    font-size: 0.75rem;
    overflow-x: auto;
    margin: 0;
  }

  .guards-list,
  .actions-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .guard-badge {
    background: #dcfce7;
    color: #166534;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    border: 1px solid #bbf7d0;
  }

  .action-badge {
    background: #fef3c7;
    color: #92400e;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    border: 1px solid #fde68a;
  }

  .no-guards {
    color: #9ca3af;
    font-style: italic;
    font-size: 0.75rem;
  }

  .transition-controls {
    margin-top: 2rem;
  }

  .controls-card {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
  }

  .control-buttons {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .control-note {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }

  @media (max-width: 768px) {
    .page-container {
      padding: 1rem;
    }

    .details-grid {
      grid-template-columns: 1fr;
    }

    .transition-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .machine-selector {
      flex-direction: column;
      align-items: stretch;
    }

    .control-buttons {
      flex-direction: column;
    }
  }
</style>