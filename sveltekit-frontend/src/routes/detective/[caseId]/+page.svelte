<!--
  Detective Analysis Page for Specific Case
  
  Integrates all detective functionality:
  - ContextualDetectiveBoard with XState typing behavior
  - Connection mapping with Gemma embeddings
  - Real-time evidence analysis and contextual prompting
  - Case management integration
-->

<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import ContextualDetectiveBoard from '$lib/components/detective/ContextualDetectiveBoard.svelte';
  import type { TypingContext } from '$lib/machines/userTypingStateMachine.js';
  
  // Get case ID from route parameters
  const caseId = $page.params.caseId;
  
  // State
  let caseData = $state<any>(null);
  let evidenceList = $state<any[]>([]);
  let connectionMap = $state<any>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let analytics = $state<any>({});
  
  // Event handlers
  let connectionMapGenerated = false;
  let lastContextualPrompts: string[] = [];
  
  /**
   * Initialize the page
   */
  onMount(async () => {
    if (!caseId) {
      error = 'Case ID is required';
      isLoading = false;
      return;
    }
    
    await loadCaseData();
    await loadCaseEvidence();
    isLoading = false;
  });
  
  /**
   * Load case information
   */
  async function loadCaseData() {
    try {
      const response = await fetch(`/api/v1/cases/${caseId}`);
      if (response.ok) {
        const data = await response.json();
        caseData = data.data;
      } else {
        throw new Error('Failed to load case data');
      }
    } catch (err) {
      console.error('Error loading case:', err);
      error = 'Failed to load case information';
    }
  }
  
  /**
   * Load evidence for the case
   */
  async function loadCaseEvidence() {
    try {
      const response = await fetch(`/api/v1/evidence/by-case/${caseId}?includeAnalysis=true&limit=100`);
      if (response.ok) {
        const data = await response.json();
        evidenceList = data.data.evidence || [];
      } else {
        throw new Error('Failed to load evidence');
      }
    } catch (err) {
      console.error('Error loading evidence:', err);
      // Don't set error here as evidence might be empty
    }
  }
  
  /**
   * Handle connection map generation
   */
  function handleConnectionMapGenerated(event: CustomEvent<{ map: any; metadata: any }>) {
    connectionMap = event.detail.map;
    connectionMapGenerated = true;
    
    // Log analytics
    analytics = {
      ...analytics,
      lastConnectionMap: {
        timestamp: new Date().toISOString(),
        nodes: connectionMap.nodes?.length || 0,
        edges: connectionMap.edges?.length || 0,
        clusters: connectionMap.clusters?.length || 0
      }
    };
    
    console.log('[Detective Page] Connection map generated:', event.detail.metadata);
  }
  
  /**
   * Handle contextual prompts
   */
  function handleContextualPromptTriggered(event: CustomEvent<{ prompts: string[]; context: TypingContext }>) {
    lastContextualPrompts = event.detail.prompts;
    
    // Update analytics with user behavior
    analytics = {
      ...analytics,
      userBehavior: {
        ...analytics.userBehavior,
        lastPrompts: lastContextualPrompts,
        engagement: event.detail.context.analytics?.userEngagement || 'medium',
        typingSpeed: event.detail.context.userBehavior?.avgTypingSpeed || 0,
        lastActivity: new Date().toISOString()
      }
    };
    
    console.log('[Detective Page] Contextual prompts triggered:', lastContextualPrompts);
  }
  
  /**
   * Handle evidence analysis
   */
  function handleEvidenceAnalyzed(event: CustomEvent<{ evidence: any; analysis: any }>) {
    const { evidence, analysis } = event.detail;
    
    // Update evidence in the list with new analysis
    evidenceList = evidenceList.map(item => 
      item.id === evidence.id 
        ? { ...item, metadata: { ...item.metadata, aiAnalysis: analysis } }
        : item
    );
    
    console.log('[Detective Page] Evidence analyzed:', evidence.id);
  }
  
  /**
   * Refresh case data
   */
  async function refreshCase() {
    isLoading = true;
    await loadCaseData();
    await loadCaseEvidence();
    isLoading = false;
  }
</script>

<svelte:head>
  <title>Detective Analysis - Case {caseId}</title>
  <meta name="description" content="Detective analysis board for case {caseId} with AI-powered connection mapping and evidence analysis" />
</svelte:head>

{#if isLoading}
  <div class="loading-container">
    <div class="loading-spinner"></div>
    <p>Loading case data...</p>
  </div>
{:else if error}
  <div class="error-container">
    <div class="error-icon">⚠️</div>
    <h1>Error</h1>
    <p>{error}</p>
    <button type="button" on:click={refreshCase}>Try Again</button>
  </div>
{:else if caseData}
  <div class="detective-page">
    <!-- Case header -->
    <header class="case-header">
      <div class="case-info">
        <h1>{caseData.title}</h1>
        <p class="case-description">{caseData.description}</p>
        <div class="case-meta">
          <span class="case-status status-{caseData.status}">{caseData.status}</span>
          <span class="evidence-count">{evidenceList.length} evidence items</span>
          {#if connectionMapGenerated}
            <span class="connection-status">Map generated</span>
          {/if}
        </div>
      </div>
      
      <div class="case-actions">
        <button type="button" on:click={refreshCase}>Refresh</button>
        <a href="/cases/{caseId}" class="view-case-btn">View Case Details</a>
      </div>
    </header>

    <!-- Main detective board -->
    <main class="detective-main">
      <ContextualDetectiveBoard
        {caseId}
        initialEvidence={evidenceList}
        enableContextualPrompts={true}
        enableAnalytics={true}
        on:connectionMapGenerated={handleConnectionMapGenerated}
        on:contextualPromptTriggered={handleContextualPromptTriggered}
        on:evidenceAnalyzed={handleEvidenceAnalyzed}
      />
    </main>

    <!-- Analytics sidebar (optional) -->
    {#if Object.keys(analytics).length > 0}
      <aside class="analytics-sidebar">
        <h3>Session Analytics</h3>
        
        {#if analytics.lastConnectionMap}
          <div class="analytics-section">
            <h4>Connection Map</h4>
            <div class="analytics-grid">
              <div class="metric">
                <span class="value">{analytics.lastConnectionMap.nodes}</span>
                <span class="label">Nodes</span>
              </div>
              <div class="metric">
                <span class="value">{analytics.lastConnectionMap.edges}</span>
                <span class="label">Edges</span>
              </div>
              <div class="metric">
                <span class="value">{analytics.lastConnectionMap.clusters}</span>
                <span class="label">Clusters</span>
              </div>
            </div>
          </div>
        {/if}
        
        {#if analytics.userBehavior}
          <div class="analytics-section">
            <h4>User Behavior</h4>
            <div class="analytics-grid">
              <div class="metric">
                <span class="value engagement-{analytics.userBehavior.engagement}">
                  {analytics.userBehavior.engagement}
                </span>
                <span class="label">Engagement</span>
              </div>
              <div class="metric">
                <span class="value">{Math.round(analytics.userBehavior.typingSpeed || 0)}</span>
                <span class="label">CPM</span>
              </div>
            </div>
            
            {#if analytics.userBehavior.lastPrompts?.length > 0}
              <div class="recent-prompts">
                <h5>Recent Prompts</h5>
                <ul>
                  {#each analytics.userBehavior.lastPrompts.slice(0, 3) as prompt}
                    <li>{prompt}</li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        {/if}
      </aside>
    {/if}
  </div>
{:else}
  <div class="error-container">
    <div class="error-icon">❓</div>
    <h1>Case Not Found</h1>
    <p>The requested case could not be found.</p>
    <a href="/cases" class="back-link">Back to Cases</a>
  </div>
{/if}

<style>
  .loading-container, .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 1rem;
    text-align: center;
  }

  .loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid #f3f4f6;
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-icon {
    font-size: 3rem;
  }

  .error-container button, .back-link {
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    text-decoration: none;
    cursor: pointer;
    font-weight: 500;
  }

  .error-container button:hover, .back-link:hover {
    background: #2563eb;
  }

  .detective-page {
    display: grid;
    grid-template-areas: 
      "header header"
      "main sidebar";
    grid-template-columns: 1fr 300px;
    grid-template-rows: auto 1fr;
    height: 100vh;
    background: #f8fafc;
  }

  .case-header {
    grid-area: header;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    background: white;
    border-bottom: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .case-info h1 {
    margin: 0 0 0.5rem 0;
    font-size: 1.75rem;
    color: #1e293b;
    font-weight: 700;
  }

  .case-description {
    margin: 0 0 1rem 0;
    color: #64748b;
    line-height: 1.5;
  }

  .case-meta {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .case-status {
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-active { background: #dcfce7; color: #166534; }
  .status-closed { background: #fef2f2; color: #991b1b; }
  .status-pending { background: #fef3c7; color: #92400e; }

  .evidence-count, .connection-status {
    font-size: 0.875rem;
    color: #64748b;
  }

  .connection-status {
    color: #059669;
    font-weight: 500;
  }

  .case-actions {
    display: flex;
    gap: 0.75rem;
  }

  .case-actions button, .view-case-btn {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .case-actions button {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .case-actions button:hover {
    background: #e5e7eb;
  }

  .view-case-btn {
    background: #3b82f6;
    color: white;
    border: 1px solid #3b82f6;
  }

  .view-case-btn:hover {
    background: #2563eb;
  }

  .detective-main {
    grid-area: main;
    overflow: hidden;
  }

  .analytics-sidebar {
    grid-area: sidebar;
    background: white;
    border-left: 1px solid #e2e8f0;
    padding: 1.5rem;
    overflow-y: auto;
  }

  .analytics-sidebar h3 {
    margin: 0 0 1.5rem 0;
    font-size: 1.125rem;
    color: #1e293b;
    font-weight: 600;
  }

  .analytics-section {
    margin-bottom: 2rem;
  }

  .analytics-section h4 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    color: #374151;
    font-weight: 600;
  }

  .analytics-section h5 {
    margin: 1rem 0 0.5rem 0;
    font-size: 0.875rem;
    color: #4b5563;
    font-weight: 600;
  }

  .analytics-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }

  .metric {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 0.75rem;
    background: #f8fafc;
    border-radius: 0.375rem;
  }

  .metric .value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
  }

  .metric .label {
    font-size: 0.75rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.25rem;
  }

  .value.engagement-high { color: #dc2626; }
  .value.engagement-medium { color: #d97706; }
  .value.engagement-low { color: #64748b; }

  .recent-prompts ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .recent-prompts li {
    padding: 0.5rem;
    background: #f1f5f9;
    border-radius: 0.25rem;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    color: #475569;
    line-height: 1.4;
  }

  /* Mobile responsive */
  @media (max-width: 1024px) {
    .detective-page {
      grid-template-areas: 
        "header"
        "main";
      grid-template-columns: 1fr;
    }
    
    .analytics-sidebar {
      display: none;
    }
  }
</style>