<!--
  Case Evidence Organization Page
  
  Complete evidence organization interface for legal cases featuring:
  - Multiple organization modes (category, timeline, priority, AI clusters, chain of custody)
  - Real-time collaboration via WebSocket
  - AI-powered clustering with Gemma embeddings
  - Comprehensive analytics and metrics
  - Interactive evidence management
-->

<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import CaseEvidenceOrganizer from '$lib/components/evidence/CaseEvidenceOrganizer.svelte';
  
  // Get case ID from route parameters
  const caseId = $page.params.caseId;
  
  // State
  let caseData = $state<any>(null);
  let organizationHistory = $state<any[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let selectedEvidence = $state<any[]>([]);
  let organizationStats = $state<any>({});
  
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
    await loadOrganizationHistory();
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
   * Load organization history for the case
   */
  async function loadOrganizationHistory() {
    try {
      // This would be a separate API endpoint to track organization changes
      // For now, we'll initialize with empty history
      organizationHistory = [];
    } catch (err) {
      console.warn('Failed to load organization history:', err);
    }
  }
  
  /**
   * Handle evidence reorganization
   */
  function handleEvidenceReorganized(event: CustomEvent<{ evidence: any[]; organization: any }>) {
    const { evidence, organization } = event.detail;
    
    // Add to organization history
    organizationHistory = [{
      timestamp: new Date().toISOString(),
      mode: organization.type,
      evidenceCount: evidence.length,
      structure: organization
    }, ...organizationHistory].slice(0, 10); // Keep last 10 organization attempts
    
    console.log('[Evidence Organization] Evidence reorganized:', organization.type);
  }
  
  /**
   * Handle evidence selection
   */
  function handleEvidenceSelected(event: CustomEvent<{ evidence: any; context: string }>) {
    const { evidence, context } = event.detail;
    
    if (selectedEvidence.find(e => e.id === evidence.id)) {
      selectedEvidence = selectedEvidence.filter(e => e.id !== evidence.id);
    } else {
      selectedEvidence = [...selectedEvidence, { ...evidence, selectionContext: context }];
    }
    
    console.log('[Evidence Selection] Evidence selected:', evidence.title, 'Context:', context);
  }
  
  /**
   * Handle organization mode changes
   */
  function handleOrganizationChanged(event: CustomEvent<{ mode: string; structure: any }>) {
    const { mode, structure } = event.detail;
    
    // Update organization stats
    organizationStats = {
      ...organizationStats,
      currentMode: mode,
      lastUpdate: new Date().toISOString(),
      structure: structure
    };
    
    console.log('[Organization Change] Mode changed to:', mode);
  }
  
  /**
   * Export organization results
   */
  async function exportOrganization() {
    if (!organizationStats.structure) {
      alert('No organization data to export');
      return;
    }
    
    try {
      const exportData = {
        caseId,
        caseTitle: caseData?.title,
        organizationMode: organizationStats.currentMode,
        structure: organizationStats.structure,
        selectedEvidence,
        exportedAt: new Date().toISOString(),
        exportedBy: 'user' // Would be actual user ID in production
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evidence-organization-${caseId}-${organizationStats.currentMode}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('[Export] Organization exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export organization data');
    }
  }
  
  /**
   * Generate organization report
   */
  async function generateReport() {
    if (!organizationStats.structure) {
      alert('No organization data to generate report');
      return;
    }
    
    try {
      const response = await fetch('/api/v1/reports/evidence-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          organizationData: organizationStats,
          selectedEvidence,
          includeCharts: true,
          includeRecommendations: true
        })
      });
      
      if (response.ok) {
        const reportData = await response.json();
        // Would open report in new tab or download
        console.log('[Report] Organization report generated:', reportData);
        alert('Report generated successfully!');
      } else {
        throw new Error('Report generation failed');
      }
    } catch (error) {
      console.error('Report generation failed:', error);
      alert('Failed to generate report');
    }
  }
  
  /**
   * Clear selections
   */
  function clearSelections() {
    selectedEvidence = [];
  }
  
  /**
   * Refresh organization
   */
  function refreshOrganization() {
    window.location.reload();
  }
</script>

<svelte:head>
  <title>Evidence Organization - Case {caseId}</title>
  <meta name="description" content="Organize and manage evidence for case {caseId} using AI-powered clustering and multiple organization methods" />
</svelte:head>

{#if isLoading}
  <div class="loading-container">
    <div class="loading-spinner"></div>
    <p>Loading case and evidence data...</p>
  </div>
{:else if error}
  <div class="error-container">
    <div class="error-icon">⚠️</div>
    <h1>Error</h1>
    <p>{error}</p>
    <button type="button" onclick={refreshOrganization}>Try Again</button>
  </div>
{:else if caseData}
  <div class="evidence-organization-page">
    <!-- Page header with case info and actions -->
    <header class="page-header">
      <div class="header-content">
        <div class="case-info">
          <h1>Evidence Organization</h1>
          <div class="case-details">
            <span class="case-title">{caseData.title}</span>
            <span class="case-number">Case #{caseData.case_number}</span>
            <span class="case-status status-{caseData.status}">{caseData.status}</span>
          </div>
        </div>
        
        <div class="page-actions">
          {#if selectedEvidence.length > 0}
            <div class="selection-info">
              <span class="selection-count">{selectedEvidence.length} selected</span>
              <button type="button" onclick={clearSelections} class="clear-btn">
                Clear Selection
              </button>
            </div>
          {/if}
          
          <div class="action-buttons">
            <button type="button" onclick={exportOrganization} class="export-btn">
              📥 Export Organization
            </button>
            <button type="button" onclick={generateReport} class="report-btn">
              📊 Generate Report
            </button>
            <a href="/cases/{caseId}" class="view-case-btn">
              👁️ View Case
            </a>
          </div>
        </div>
      </div>
      
      <!-- Organization stats -->
      {#if organizationStats.currentMode}
        <div class="stats-bar">
          <div class="stat">
            <span class="stat-label">Current Mode:</span>
            <span class="stat-value">{organizationStats.currentMode}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Last Updated:</span>
            <span class="stat-value">
              {new Date(organizationStats.lastUpdate).toLocaleString()}
            </span>
          </div>
          <div class="stat">
            <span class="stat-label">Organization History:</span>
            <span class="stat-value">{organizationHistory.length} attempts</span>
          </div>
        </div>
      {/if}
    </header>

    <!-- Main evidence organizer component -->
    <main class="organizer-main">
      <CaseEvidenceOrganizer
        {caseId}
        organizationMode="category"
        enableCollaboration={true}
        showMetrics={true}
        on:evidenceReorganized={handleEvidenceReorganized}
        on:evidenceSelected={handleEvidenceSelected}
        on:organizationChanged={handleOrganizationChanged}
      />
    </main>

    <!-- Sidebar with organization history and selected evidence -->
    <aside class="sidebar">
      <!-- Selected evidence panel -->
      {#if selectedEvidence.length > 0}
        <div class="sidebar-panel">
          <h3>Selected Evidence ({selectedEvidence.length})</h3>
          <div class="selected-evidence-list">
            {#each selectedEvidence as evidence}
              <div class="selected-evidence-item">
                <div class="evidence-info">
                  <h4>{evidence.title}</h4>
                  <span class="evidence-type">{evidence.evidenceType}</span>
                  <span class="selection-context">
                    Selected from: {evidence.selectionContext}
                  </span>
                </div>
                <button 
                  type="button" 
                  class="remove-btn"
                  onclick={() => handleEvidenceSelected({ detail: { evidence, context: 'removal' } })}
                >
                  ✕
                </button>
              </div>
            {/each}
          </div>
          
          <div class="selection-actions">
            <button type="button" class="bulk-action-btn">
              🏷️ Bulk Tag
            </button>
            <button type="button" class="bulk-action-btn">
              📋 Create Report
            </button>
            <button type="button" class="bulk-action-btn">
              🔗 Link Evidence
            </button>
          </div>
        </div>
      {/if}
      
      <!-- Organization history panel -->
      {#if organizationHistory.length > 0}
        <div class="sidebar-panel">
          <h3>Organization History</h3>
          <div class="history-list">
            {#each organizationHistory as attempt}
              <div class="history-item">
                <div class="history-info">
                  <span class="history-mode">{attempt.mode}</span>
                  <span class="history-time">
                    {new Date(attempt.timestamp).toLocaleString()}
                  </span>
                  <span class="history-count">
                    {attempt.evidenceCount} items
                  </span>
                </div>
                <button type="button" class="restore-btn" title="Restore this organization">
                  ↺
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}
      
      <!-- Quick stats panel -->
      <div class="sidebar-panel">
        <h3>Quick Stats</h3>
        <div class="quick-stats">
          <div class="quick-stat">
            <span class="stat-number">{selectedEvidence.length}</span>
            <span class="stat-description">Evidence Selected</span>
          </div>
          <div class="quick-stat">
            <span class="stat-number">{organizationHistory.length}</span>
            <span class="stat-description">Organizations Tried</span>
          </div>
          <div class="quick-stat">
            <span class="stat-number">
              {organizationStats.structure?.type === 'ai_clusters' 
                ? organizationStats.structure.clusters?.length || 0 
                : organizationStats.structure?.categories?.length || 0}
            </span>
            <span class="stat-description">Groups Created</span>
          </div>
        </div>
      </div>
    </aside>
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

  .evidence-organization-page {
    display: grid;
    grid-template-areas: 
      "header header"
      "main sidebar";
    grid-template-columns: 1fr 350px;
    grid-template-rows: auto 1fr;
    height: 100vh;
    background: #f8fafc;
  }

  .page-header {
    grid-area: header;
    background: white;
    border-bottom: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 1.5rem 2rem;
    gap: 2rem;
  }

  .case-info h1 {
    margin: 0 0 0.75rem 0;
    font-size: 1.75rem;
    color: #1e293b;
    font-weight: 700;
  }

  .case-details {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
  }

  .case-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #374151;
  }

  .case-number {
    font-size: 0.875rem;
    color: #6b7280;
    font-family: monospace;
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

  .page-actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: flex-end;
  }

  .selection-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
  }

  .selection-count {
    color: #3b82f6;
    font-weight: 600;
  }

  .clear-btn {
    padding: 0.25rem 0.75rem;
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.75rem;
  }

  .clear-btn:hover {
    background: #e5e7eb;
  }

  .action-buttons {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .action-buttons button, .action-buttons a {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.875rem;
    border: none;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .export-btn {
    background: #059669;
    color: white;
  }

  .export-btn:hover {
    background: #047857;
  }

  .report-btn {
    background: #7c3aed;
    color: white;
  }

  .report-btn:hover {
    background: #6d28d9;
  }

  .view-case-btn {
    background: #3b82f6;
    color: white;
  }

  .view-case-btn:hover {
    background: #2563eb;
  }

  .stats-bar {
    display: flex;
    gap: 2rem;
    padding: 0.75rem 2rem;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .stat-label {
    color: #6b7280;
    font-weight: 500;
  }

  .stat-value {
    color: #1e293b;
    font-weight: 600;
  }

  .organizer-main {
    grid-area: main;
    overflow: hidden;
  }

  .sidebar {
    grid-area: sidebar;
    background: #f8fafc;
    border-left: 1px solid #e2e8f0;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .sidebar-panel {
    background: white;
    border-radius: 0.5rem;
    padding: 1.25rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .sidebar-panel h3 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
  }

  .selected-evidence-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 300px;
    overflow-y: auto;
  }

  .selected-evidence-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 0.75rem;
    background: #f8fafc;
    border-radius: 0.375rem;
    border: 1px solid #e2e8f0;
  }

  .evidence-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .evidence-info h4 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #1e293b;
    line-height: 1.2;
  }

  .evidence-type {
    font-size: 0.75rem;
    color: #3b82f6;
    font-weight: 500;
  }

  .selection-context {
    font-size: 0.7rem;
    color: #6b7280;
    font-style: italic;
  }

  .remove-btn {
    background: none;
    border: none;
    color: #ef4444;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: background-color 0.2s;
  }

  .remove-btn:hover {
    background: #fef2f2;
  }

  .selection-actions {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .bulk-action-btn {
    padding: 0.5rem;
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #cbd5e1;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .bulk-action-btn:hover {
    background: #e2e8f0;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 200px;
    overflow-y: auto;
  }

  .history-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: #f8fafc;
    border-radius: 0.375rem;
    border: 1px solid #e2e8f0;
  }

  .history-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .history-mode {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1e293b;
  }

  .history-time, .history-count {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .restore-btn {
    background: none;
    border: none;
    color: #3b82f6;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    font-size: 1rem;
    transition: background-color 0.2s;
  }

  .restore-btn:hover {
    background: #eff6ff;
  }

  .quick-stats {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .quick-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 0.375rem;
    border: 1px solid #e2e8f0;
  }

  .stat-number {
    font-size: 1.5rem;
    font-weight: 700;
    color: #3b82f6;
  }

  .stat-description {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.25rem;
  }

  /* Mobile responsive */
  @media (max-width: 1024px) {
    .evidence-organization-page {
      grid-template-areas: 
        "header"
        "main";
      grid-template-columns: 1fr;
    }
    
    .sidebar {
      display: none;
    }
    
    .header-content {
      flex-direction: column;
      gap: 1rem;
    }
    
    .page-actions {
      align-items: stretch;
    }
    
    .action-buttons {
      justify-content: center;
    }
  }
</style>