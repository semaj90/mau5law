<!-- @migration-task Error while migrating Svelte code: Mixing old (on:click) and new syntaxes for event handling is not allowed. Use only the onclick syntax -->
<!--
  Case Scoring Dashboard
  Integrates with /api/ai/case-scoring API using Enhanced-Bits UI components
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '$lib/components/ui/card';
  import * as Dialog from '$lib/components/ui/dialog';
  // Removed Button import; using native <button> elements to avoid event typing issues

  // Case scoring state
  let cases = $state<CaseScore[]>([]);
  let selectedCase = $state<CaseScore | null>(null);
  let isLoading = $state(false);
  let scoringInProgress = $state(false);
  let showScoreDetails = $state(false);

  // Filters and sorting
  let scoreFilter = $state<'all' | 'high' | 'medium' | 'low'>('all');
  let sortBy = $state<'score' | 'priority' | 'date'>('score');
  let searchQuery = $state('');

  interface CaseScore {
    id: string;
    title: string;
    description: string;
    score: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
    confidence: number;
    dateCreated: string;
    lastUpdated: string;
    factors: ScoreFactor[];
    recommendations: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }

  interface ScoreFactor {
    category: string;
    weight: number;
    impact: number;
    description: string;
    confidence: number;
  }

  interface ScoringRequest {
    caseId: string;
    evidence?: string[];
    context?: Record<string, any>;
    scoringModel?: 'comprehensive' | 'priority' | 'risk';
  }

  onMount(() => {
    loadCaseScores();
  });

  async function loadCaseScores() {
    isLoading = true;
    try {
      const response = await fetch('/api/ai/case-scoring', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        cases = data.cases || [];
      } else {
        console.error('Failed to load case scores:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading case scores:', error);
    } finally {
      isLoading = false;
    }
  }

  async function scoreCase(caseId: string, options: Partial<ScoringRequest> = {}) {
    scoringInProgress = true;
    try {
      const request: ScoringRequest = {
        caseId,
        scoringModel: 'comprehensive',
        ...options
      };

      const response = await fetch('/api/ai/case-scoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (response.ok) {
        const result = await response.json();
        // Update case score in the list
        const caseIndex = cases.findIndex(c => c.id === caseId);
        if (caseIndex !== -1) {
          cases[caseIndex] = { ...cases[caseIndex], ...result.caseScore };
        } else {
          cases = [...cases, result.caseScore];
        }
        return result;
      } else {
        throw new Error(`Scoring failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error scoring case:', error);
      throw error;
    } finally {
      scoringInProgress = false;
    }
  }

  function getScoreColor(score: number): string {
    if (score >= 85) return 'text-red-600';
    if (score >= 70) return 'text-orange-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-green-600';
  }

  function getPriorityBadgeClass(priority: string): string {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  let filteredCases = $derived(() => {
    let filtered = cases;

    // Apply score filter
    if (scoreFilter !== 'all') {
      filtered = filtered.filter(case_ => {
        switch (scoreFilter) {
          case 'high': return case_.score >= 70;
          case 'medium': return case_.score >= 40 && case_.score < 70;
          case 'low': return case_.score < 40;
          default: return true;
        }
      });
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(case_ =>
        case_.title.toLowerCase().includes(query) ||
        case_.description.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'score': return b.score - a.score;
        case 'priority': {
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        case 'date': return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        default: return 0;
      }
    });

    return filtered;
  });

  function openScoreDetails(caseItem: CaseScore) {
    selectedCase = caseItem;
    showScoreDetails = true;
  }
</script>

<svelte:head>
  <title>Case Scoring Dashboard - Legal AI Platform</title>
</svelte:head>

<div class="case-scoring-dashboard">
  <header class="dashboard-header">
    <div class="header-content">
      <h1 class="dashboard-title">Case Scoring Dashboard</h1>
      <p class="dashboard-subtitle">AI-powered case analysis and priority scoring</p>
    </div>
    <div class="header-actions">
      <button type="button" on:click={loadCaseScores} disabled={isLoading} class="px-3 py-2 rounded border text-sm font-medium bg-white hover:bg-gray-50 disabled:opacity-50">
        {isLoading ? 'Loading...' : 'Refresh'}
      </button>
    </div>
  </header>

  <!-- Filters and Controls -->
  <section class="controls-section">
    <div class="filters-row">
      <div class="search-group">
        <label for="case-search" class="sr-only">Search cases</label>
        <input
          id="case-search"
          type="text"
          placeholder="Search cases..."
          bind:value={searchQuery}
          class="search-input"
        />
      </div>

      <div class="filter-group">
        <label for="score-filter">Score Range:</label>
        <select id="score-filter" bind:value={scoreFilter} class="filter-select">
          <option value="all">All Scores</option>
          <option value="high">High Risk (70-100)</option>
          <option value="medium">Medium Risk (40-69)</option>
          <option value="low">Low Risk (0-39)</option>
        </select>
      </div>

      <div class="filter-group">
        <label for="sort-by">Sort By:</label>
        <select id="sort-by" bind:value={sortBy} class="filter-select">
          <option value="score">Score</option>
          <option value="priority">Priority</option>
          <option value="date">Last Updated</option>
        </select>
      </div>
    </div>
  </section>

  <!-- Cases Grid -->
  <main class="cases-grid">
    {#if isLoading}
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading case scores...</p>
      </div>
    {:else if filteredCases.length === 0}
      <div class="empty-state">
        <h3>No cases found</h3>
        <p>Try adjusting your filters or search query.</p>
      </div>
    {:else}
      {#each filteredCases as caseItem}
        <Card class="case-score-card">
          <CardHeader>
            <div class="case-header">
              <CardTitle class="case-title">{caseItem.title}</CardTitle>
              <div class="case-badges">
                <span class="priority-badge {getPriorityBadgeClass(caseItem.priority)}">
                  {caseItem.priority.toUpperCase()}
                </span>
                <span class="score-badge {getScoreColor(caseItem.score)}">
                  {caseItem.score}
                </span>
              </div>
            </div>
            <CardDescription class="case-description">
              {caseItem.description}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div class="score-metrics">
              <div class="metric">
                <span class="metric-label">Risk Score</span>
                <span class="metric-value {getScoreColor(caseItem.score)}">{caseItem.score}/100</span>
              </div>
              <div class="metric">
                <span class="metric-label">Confidence</span>
                <span class="metric-value">{caseItem.confidence}%</span>
              </div>
              <div class="metric">
                <span class="metric-label">Risk Level</span>
                <span class="metric-value risk-{caseItem.riskLevel}">{caseItem.riskLevel}</span>
              </div>
            </div>

            <div class="top-factors">
              <h4>Top Risk Factors:</h4>
              <ul class="factors-list">
                {#each caseItem.factors.slice(0, 3) as factor}
                  <li class="factor-item">
                    <span class="factor-category">{factor.category}</span>
                    <span class="factor-impact">Impact: {(factor.impact * 100).toFixed(0)}%</span>
                  </li>
                {/each}
              </ul>
            </div>
          </CardContent>

            <CardFooter>
              <div class="card-actions">
                <button type="button" on:click={() => openScoreDetails(caseItem)} class="px-2 py-1 text-sm rounded border bg-white hover:bg-gray-50">
                  View Details
                </button>
                <button
                  type="button"
                  on:click={() => scoreCase(caseItem.id)}
                  disabled={scoringInProgress}
                  class="px-2 py-1 text-sm rounded bg-blue-600 text-white disabled:opacity-50"
                >
                  {scoringInProgress ? 'Rescoring...' : 'Rescore'}
                </button>
              </div>
            </CardFooter>
        </Card>
      {/each}
    {/if}
  </main>
</div>

<!-- Score Details Dialog -->
<Dialog.Root bind:open={showScoreDetails}>
  <Dialog.Content class="score-details-dialog">
    {#if selectedCase}
      <Dialog.Title>Case Score Analysis: {selectedCase.title}</Dialog.Title>
      <Dialog.Description>
        Detailed scoring breakdown and recommendations
      </Dialog.Description>

      <div class="score-details-content">
        <!-- Overall Score -->
        <section class="score-overview">
          <h3>Overall Score</h3>
          <div class="score-display">
            <span class="large-score {getScoreColor(selectedCase.score)}">{selectedCase.score}</span>
            <div class="score-metadata">
              <p>Risk Level: <span class="risk-{selectedCase.riskLevel}">{selectedCase.riskLevel}</span></p>
              <p>Confidence: {selectedCase.confidence}%</p>
              <p>Last Updated: {new Date(selectedCase.lastUpdated).toLocaleDateString()}</p>
            </div>
          </div>
        </section>

        <!-- Scoring Factors -->
        <section class="scoring-factors">
          <h3>Scoring Factors</h3>
          <div class="factors-grid">
            {#each selectedCase.factors as factor}
              <div class="factor-card">
                <h4>{factor.category}</h4>
                <div class="factor-metrics">
                  <div class="factor-bar">
                    <div class="factor-fill" style="width: {factor.impact * 100}%"></div>
                  </div>
                  <span class="factor-percentage">{(factor.impact * 100).toFixed(1)}%</span>
                </div>
                <p class="factor-description">{factor.description}</p>
                <p class="factor-confidence">Confidence: {factor.confidence}%</p>
              </div>
            {/each}
          </div>
        </section>

        <!-- Recommendations -->
        <section class="recommendations">
          <h3>AI Recommendations</h3>
          <ul class="recommendations-list">
            {#each selectedCase.recommendations as recommendation}
              <li class="recommendation-item">{recommendation}</li>
            {/each}
          </ul>
        </section>
      </div>
      <div class="dialog-actions">
        <button type="button" onclick={() => showScoreDetails = false} class="px-3 py-2 rounded border text-sm bg-white hover:bg-gray-50">
          Close
        </button>
        <button type="button" onclick={() => scoreCase(selectedCase.id)} class="px-3 py-2 rounded bg-blue-600 text-white">
          Rescore Case
        </button>
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<style>
  .case-scoring-dashboard {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .dashboard-title {
    font-size: 2rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
  }

  .dashboard-subtitle {
    color: #64748b;
    margin: 0.5rem 0 0 0;
  }

  .controls-section {
    margin-bottom: 2rem;
  }

  .filters-row {
    display: flex;
    gap: 1.5rem;
    align-items: end;
    flex-wrap: wrap;
  }

  .search-group {
    flex: 1;
    min-width: 250px;
  }

  .search-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 0.875rem;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .filter-select {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    min-width: 140px;
  }

  .cases-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 1.5rem;
  }

  .case-score-card {
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    overflow: hidden;
    transition: box-shadow 0.2s;
  }

  .case-score-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .case-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .case-title {
    flex: 1;
    margin: 0;
  }

  .case-badges {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .priority-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    border: 1px solid;
  }

  .score-badge {
    padding: 0.25rem 0.5rem;
    background: #f1f5f9;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-weight: 700;
  }

  .case-description {
    margin: 0.5rem 0 0 0;
    color: #64748b;
  }

  .score-metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .metric {
    text-align: center;
  }

  .metric-label {
    display: block;
    font-size: 0.75rem;
    color: #64748b;
    margin-bottom: 0.25rem;
  }

  .metric-value {
    display: block;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .risk-low { color: #059669; }
  .risk-medium { color: #d97706; }
  .risk-high { color: #dc2626; }
  .risk-critical { color: #991b1b; }

  .top-factors h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    color: #374151;
  }

  .factors-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .factor-item {
    display: flex;
    justify-content: space-between;
    padding: 0.25rem 0;
    font-size: 0.75rem;
  }

  .factor-category {
    font-weight: 500;
    color: #374151;
  }

  .factor-impact {
    color: #64748b;
  }

  .card-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .loading-state, .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 3rem;
    color: #64748b;
  }

  .loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid #e2e8f0;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Dialog Styles */
  .score-details-dialog {
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .score-details-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .score-overview {
    text-align: center;
    padding: 1.5rem;
    background: #f8fafc;
    border-radius: 0.5rem;
  }

  .score-display {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2rem;
  }

  .large-score {
    font-size: 4rem;
    font-weight: 700;
  }

  .score-metadata p {
    margin: 0.25rem 0;
    font-size: 0.875rem;
  }

  .factors-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .factor-card {
    padding: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    background: #fafafa;
  }

  .factor-card h4 {
    margin: 0 0 0.5rem 0;
    color: #374151;
  }

  .factor-metrics {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .factor-bar {
    flex: 1;
    height: 0.5rem;
    background: #e2e8f0;
    border-radius: 0.25rem;
    overflow: hidden;
  }

  .factor-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #f59e0b, #ef4444);
    transition: width 0.3s;
  }

  .factor-percentage {
    font-size: 0.75rem;
    font-weight: 600;
    color: #374151;
  }

  .factor-description {
    font-size: 0.75rem;
    color: #64748b;
    margin: 0.5rem 0;
  }

  .factor-confidence {
    font-size: 0.75rem;
    color: #6b7280;
    margin: 0;
  }

  .recommendations-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .recommendation-item {
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    background: #f0f9ff;
    border-left: 4px solid #3b82f6;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    color: #374151;
  }

  .dialog-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e2e8f0;
  }

  @media (max-width: 768px) {
    .dashboard-header {
      flex-direction: column;
      gap: 1rem;
    }

    .filters-row {
      flex-direction: column;
      align-items: stretch;
    }

    .cases-grid {
      grid-template-columns: 1fr;
    }

    .score-display {
      flex-direction: column;
      gap: 1rem;
    }

    .factors-grid {
      grid-template-columns: 1fr;
    }
  }
</style>