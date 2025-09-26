<script lang="ts">
  import { Button } from '$lib/components/ui/core';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { onMount } from 'svelte';

  interface LegalCase {
    id: string;
    title: string;
    status: 'active' | 'closed' | 'pending' | 'review';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    created: Date;
    updated: Date;
    assignedTo: string;
    description: string;
    evidenceCount: number;
    documentsCount: number;
    aiAnalysisComplete: boolean;
  }

  let cases = $state<LegalCase[]>([]);
  let loading = $state(true);
  let error = $state('');
  let filterStatus = $state<string>('all');
  let searchQuery = $state('');

  // Mock data for demonstration
  const mockCases: LegalCase[] = [
    {
      id: 'case-001',
      title: 'Contract Dispute - TechCorp vs. Innovation Ltd',
      status: 'active',
      priority: 'high',
      created: new Date('2025-01-15'),
      updated: new Date('2025-01-20'),
      assignedTo: 'Legal Team Alpha',
      description: 'Breach of contract regarding software licensing agreement',
      evidenceCount: 12,
      documentsCount: 28,
      aiAnalysisComplete: true
    },
    {
      id: 'case-002',
      title: 'Employment Law - Wrongful Termination',
      status: 'pending',
      priority: 'medium',
      created: new Date('2025-01-10'),
      updated: new Date('2025-01-18'),
      assignedTo: 'Legal Team Beta',
      description: 'Employee claims wrongful termination and seeks damages',
      evidenceCount: 8,
      documentsCount: 15,
      aiAnalysisComplete: false
    },
    {
      id: 'case-003',
      title: 'IP Infringement - Patent Violation Case',
      status: 'review',
      priority: 'urgent',
      created: new Date('2025-01-05'),
      updated: new Date('2025-01-19'),
      assignedTo: 'Legal Team Alpha',
      description: 'Technology patent infringement claim requiring immediate attention',
      evidenceCount: 25,
      documentsCount: 45,
      aiAnalysisComplete: true
    }
  ];

  onMount(async () => {
    try {
      // Simulate API call - replace with actual endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      cases = mockCases;
    } catch (e) {
      error = 'Failed to load cases';
    } finally {
      loading = false;
    }
  });

  // Computed filtered cases
  const filteredCases = $derived(() => {
    let filtered = cases;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.assignedTo.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  function getStatusColor(status: string): string {
    switch (status) {
      case 'active': return '#00ff00';
      case 'pending': return '#ffaa00';
      case 'review': return '#ff6600';
      case 'closed': return '#888888';
      default: return '#cccccc';
    }
  }

  function getPriorityColor(priority: string): string {
    switch (priority) {
      case 'urgent': return '#ff0000';
      case 'high': return '#ff6600';
      case 'medium': return '#ffaa00';
      case 'low': return '#00ff00';
      default: return '#cccccc';
    }
  }

  async function createNewCase() {
    // Navigate to case creation or open modal
    console.log('Create new case');
  }

  async function openCase(caseId: string) {
    // Navigate to case details
    window.location.href = `/(legal)/cases/${caseId}`;
  }
</script>

<svelte:head>
  <title>Legal Cases | YoRHa Legal AI</title>
  <meta name="description" content="Legal case management with AI-powered analysis and tracking" />
</svelte:head>

<div class="cases-page">
  <div class="page-header">
    <h1>📁 Legal Case Management</h1>
    <p>AI-powered case tracking and analysis system</p>

    <div class="header-actions">
      <Button onclick={createNewCase} class="create-button">
        ➕ Create New Case
      </Button>
    </div>
  </div>

  {#if error}
    <div class="error-banner">
      ⚠️ {error}
    </div>
  {/if}

  <!-- Search and Filters -->
  <div class="controls-section">
    <Card class="controls-card">
      <CardContent>
        <div class="controls-grid">
          <div class="search-box">
            <label for="search">🔍 Search Cases</label>
            <input
              id="search"
              type="text"
              bind:value={searchQuery}
              placeholder="Search by title, description, or assignee..."
              class="search-input"
            />
          </div>

          <div class="filter-box">
            <label for="status">📊 Filter by Status</label>
            <select id="status" bind:value={filterStatus} class="filter-select">
              <option value="all">All Cases</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="review">Review</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  <!-- Cases Grid -->
  {#if loading}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading legal cases...</p>
    </div>
  {:else if filteredCases.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📁</div>
      <h3>No cases found</h3>
      <p>
        {searchQuery ? 'Try adjusting your search criteria' : 'Create your first legal case to get started'}
      </p>
    </div>
  {:else}
    <div class="cases-grid">
      {#each filteredCases as case_item}
        <Card class="case-card" onclick={() => openCase(case_item.id)}>
          <CardHeader>
            <CardTitle class="case-title">
              {case_item.title}
            </CardTitle>
            <div class="case-meta">
              <span
                class="status-badge"
                style="border-color: {getStatusColor(case_item.status)}; color: {getStatusColor(case_item.status)}"
              >
                {case_item.status.toUpperCase()}
              </span>
              <span
                class="priority-badge"
                style="border-color: {getPriorityColor(case_item.priority)}; color: {getPriorityColor(case_item.priority)}"
              >
                {case_item.priority.toUpperCase()}
              </span>
            </div>
          </CardHeader>

          <CardContent>
            <p class="case-description">{case_item.description}</p>

            <div class="case-stats">
              <div class="stat-item">
                <span class="stat-icon">🔍</span>
                <span class="stat-text">{case_item.evidenceCount} Evidence</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">📄</span>
                <span class="stat-text">{case_item.documentsCount} Documents</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">{case_item.aiAnalysisComplete ? '🧠' : '⏳'}</span>
                <span class="stat-text">
                  {case_item.aiAnalysisComplete ? 'AI Complete' : 'AI Pending'}
                </span>
              </div>
            </div>

            <div class="case-footer">
              <div class="case-assignee">
                👤 {case_item.assignedTo}
              </div>
              <div class="case-updated">
                🕒 {case_item.updated.toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      {/each}
    </div>
  {/if}

  <!-- Quick Actions -->
  <div class="quick-actions">
    <h2>⚡ Quick Actions</h2>
    <div class="actions-grid">
      <Button class="action-button">
        📊 Generate Case Report
      </Button>
      <Button class="action-button">
        🔍 Bulk Evidence Analysis
      </Button>
      <Button class="action-button">
        🧠 AI Case Insights
      </Button>
      <Button class="action-button">
        📈 Performance Analytics
      </Button>
    </div>
  </div>
</div>

<style>
  .cases-page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .page-header {
    text-align: center;
    margin-bottom: 2rem;
    position: relative;
  }

  .page-header h1 {
    font-size: 2.5rem;
    color: var(--text-primary, #00ff00);
    margin-bottom: 0.5rem;
    text-shadow: 0 0 15px currentColor;
  }

  .page-header p {
    color: var(--text-secondary, #888888);
    font-size: 1.1rem;
    margin-bottom: 1.5rem;
  }

  .header-actions {
    display: flex;
    justify-content: center;
  }

  .create-button {
    background: var(--text-primary, #00ff00);
    color: var(--surface-secondary, #000000);
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    font-weight: bold;
    transition: all 0.2s;
  }

  .create-button:hover {
    transform: scale(1.05);
    box-shadow: 0 0 15px rgba(0, 255, 0, 0.5);
  }

  .error-banner {
    background: rgba(255, 0, 0, 0.1);
    color: #ff6666;
    padding: 0.75rem;
    border-radius: 4px;
    border: 1px solid #ff6666;
    margin-bottom: 2rem;
    text-align: center;
  }

  .controls-section {
    margin-bottom: 2rem;
  }

  .controls-card {
    background: var(--surface-secondary, #111111);
    border: 1px solid var(--border-primary, #00ff00);
  }

  .controls-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;
    align-items: end;
  }

  .search-box,
  .filter-box {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .search-box label,
  .filter-box label {
    color: var(--text-primary, #00ff00);
    font-weight: bold;
  }

  .search-input,
  .filter-select {
    background: var(--surface-primary, #0a0a0a);
    border: 1px solid rgba(0, 255, 0, 0.3);
    border-radius: 4px;
    padding: 0.75rem;
    color: var(--text-primary, #ffffff);
    font-family: inherit;
  }

  .search-input:focus,
  .filter-select:focus {
    outline: none;
    border-color: var(--text-primary, #00ff00);
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
  }

  .search-input::placeholder {
    color: var(--text-secondary, #888888);
  }

  .loading-state,
  .empty-state {
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

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .cases-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  .case-card {
    background: var(--surface-secondary, #111111);
    border: 1px solid var(--border-primary, #00ff00);
    transition: all 0.3s ease;
    cursor: pointer;
  }

  .case-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 255, 0, 0.2);
    border-color: #00ffff;
  }

  .case-title {
    color: var(--text-primary, #00ff00);
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
  }

  .case-meta {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .status-badge,
  .priority-badge {
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
    font-size: 0.7rem;
    font-weight: bold;
    border: 1px solid;
    background: rgba(0, 0, 0, 0.3);
  }

  .case-description {
    color: var(--text-secondary, #888888);
    margin-bottom: 1rem;
    line-height: 1.4;
    font-size: 0.9rem;
  }

  .case-stats {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1rem;
    padding: 0.5rem 0;
    border-top: 1px solid rgba(0, 255, 0, 0.2);
    border-bottom: 1px solid rgba(0, 255, 0, 0.2);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .stat-icon {
    font-size: 1.2rem;
  }

  .stat-text {
    font-size: 0.8rem;
    color: var(--text-secondary, #888888);
  }

  .case-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    color: var(--text-secondary, #888888);
  }

  .quick-actions {
    margin-bottom: 2rem;
  }

  .quick-actions h2 {
    color: var(--text-primary, #00ff00);
    margin-bottom: 1rem;
    font-size: 1.3rem;
  }

  .actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .action-button {
    background: rgba(0, 255, 0, 0.1);
    color: var(--text-primary, #00ff00);
    border: 1px solid rgba(0, 255, 0, 0.3);
    padding: 0.75rem;
    border-radius: 4px;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .action-button:hover {
    background: rgba(0, 255, 0, 0.2);
    border-color: var(--text-primary, #00ff00);
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    .controls-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .cases-grid {
      grid-template-columns: 1fr;
    }

    .actions-grid {
      grid-template-columns: 1fr;
    }

    .case-stats {
      flex-direction: column;
      gap: 0.5rem;
    }

    .stat-item {
      flex-direction: row;
      justify-content: flex-start;
    }
  }
</style>