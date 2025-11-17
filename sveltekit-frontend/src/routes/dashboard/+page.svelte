<script lang="ts">
  import { goto } from '$app // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/navigation';
  import EvidenceCard from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/ui/EvidenceCard.svelte';
  import { Activity, BarChart, FileText, Plus, Search, Users } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import type { PageData } from './$types // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5';

  // Page data from server
  let { data }: { data: PageData } = $props // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5();

  // State management
  let user = $derived // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5(data?.user);
  let stats = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5({
    totalCases: 0,
    totalEvidence: 0,
    activeCases: 0,
    recentActivity: []
  });
  let recentEvidence = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5([]);
  let searchQuery = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5('');
  let loading = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5(true);

  // Load dashboard data
  async function loadDashboardData() {
    try {
      loading = true;

      // Load stats
      const statsResponse = await fetch('/api/dashboard/stats');
      if (statsResponse.ok) {
        stats = await statsResponse.json();
      }

      // Load recent evidence
      const evidenceResponse = await fetch('/api/evidence/recent?limit=6');
      if (evidenceResponse.ok) {
        recentEvidence = await evidenceResponse.json();
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      loading = false;
    }
  }

  // Handle search
  function handleSearch() {
    if (searchQuery.trim()) {
      goto(`/evidence?q=${encodeURIComponent(searchQuery)}`);
    }
  }

  // Handle evidence click
  function handleEvidenceClick(evidenceId: string) {
    goto(`/evidence/${evidenceId}`);
  }

  // Handle create new case
  function handleCreateCase() {
    goto('/cases/new');
  }

  // Handle view all cases
  function handleViewCases() {
    goto('/cases');
  }

  // Handle view all evidence
  function handleViewEvidence() {
    goto('/evidence');
  }

  // Mount effect
  onMount(() => {
    loadDashboardData();
  });
</script>

<svelte:head>
  <title>Dashboard - Legal AI Platform</title>
  <meta name="description" content="Legal AI Platform Dashboard - Manage cases and evidence" />
</svelte:head>

<div class="dashboard">
  <!-- Header -->
  <header class="dashboard-header">
    <div class="header-content">
      <h1 class="dashboard-title">Dashboard</h1>
      <p class="dashboard-subtitle">Welcome back, {user?.email || 'User'}</p>
    </div>

    <div class="header-actions">
      <button class="btn btn-primary" onclick={handleCreateCase}>
        <Plus size={16} />
        New Case
      </button>
    </div>
  </header>

  <!-- Search Bar -->
  <div class="search-section">
    <div class="search-container">
      <div class="search-input-wrapper">
        <Search size={20} class="search-icon" />
        <input
          type="text"
          placeholder="Search evidence, cases, or documents..."
          bind:value={searchQuery}
          onkeydown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
          class="search-input"
        />
      </div>
      <button class="btn btn-secondary" onclick={handleSearch}>
        Search
      </button>
    </div>
  </div>

  <!-- Stats Cards -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon">
        <FileText size={24} />
      </div>
      <div class="stat-content">
        <h3 class="stat-number">{stats.totalCases}</h3>
        <p class="stat-label">Total Cases</p>
      </div>
      <button class="stat-action" onclick={handleViewCases} aria-label="View all cases">
        View All
      </button>
    </div>

    <div class="stat-card">
      <div class="stat-icon">
        <BarChart size={24} />
      </div>
      <div class="stat-content">
        <h3 class="stat-number">{stats.totalEvidence}</h3>
        <p class="stat-label">Evidence Items</p>
      </div>
      <button class="stat-action" onclick={handleViewEvidence} aria-label="View all evidence">
        View All
      </button>
    </div>

    <div class="stat-card">
      <div class="stat-icon">
        <Activity size={24} />
      </div>
      <div class="stat-content">
        <h3 class="stat-number">{stats.activeCases}</h3>
        <p class="stat-label">Active Cases</p>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon">
        <Users size={24} />
      </div>
      <div class="stat-content">
        <h3 class="stat-number">{stats.recentActivity.length}</h3>
        <p class="stat-label">Recent Activity</p>
      </div>
    </div>
  </div>

  <!-- Main Content Grid -->
  <div class="content-grid">
    <!-- Recent Evidence -->
    <section class="recent-evidence">
      <div class="section-header">
        <h2 class="section-title">Recent Evidence</h2>
        <button class="btn btn-link" onclick={handleViewEvidence}>
          View All Evidence
        </button>
      </div>

      {#if loading}
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading recent evidence...</p>
        </div>
      {:else if recentEvidence.length === 0}
        <div class="empty-state">
          <FileText size={48} />
          <h3>No evidence yet</h3>
          <p>Upload your first evidence item to get started</p>
          <button class="btn btn-primary" onclick={() => goto('/evidence')}>
            Upload Evidence
          </button>
        </div>
      {:else}
        <div class="evidence-grid">
          {#each recentEvidence as evidence (evidence.id)}
            <EvidenceCard
              {evidence}
              onSelect={handleEvidenceClick}
              showActions={false}
            />
          {/each}
        </div>
      {/if}
    </section>

    <!-- Recent Activity -->
    <section class="recent-activity">
      <div class="section-header">
        <h2 class="section-title">Recent Activity</h2>
      </div>

      {#if loading}
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading activity...</p>
        </div>
      {:else if stats.recentActivity.length === 0}
        <div class="empty-state">
          <Activity size={48} />
          <h3>No recent activity</h3>
          <p>Your recent actions will appear here</p>
        </div>
      {:else}
        <div class="activity-list">
          {#each stats.recentActivity as activity (activity.id)}
            <div class="activity-item">
              <div class="activity-icon">
                <Activity size={16} />
              </div>
              <div class="activity-content">
                <p class="activity-text">{activity.description}</p>
                <span class="activity-time">{activity.timestamp}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</div>

<style>
  .dashboard {
    min-height: 100vh;
    background: #f8f9fa;
    padding: 2rem;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e9ecef;
  }

  .header-content h1 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0;
    color: #212529;
  }

  .header-content p {
    color: #6c757d;
    margin: 0.5rem 0 0 0;
  }

  .header-actions {
    display: flex;
    gap: 1rem;
  }

  .search-section {
    margin-bottom: 2rem;
  }

  .search-container {
    display: flex;
    gap: 1rem;
    max-width: 600px;
  }

  .search-input-wrapper {
    flex: 1;
    position: relative;
  }

  .search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #6c757d;
  }

  .search-input {
    width: 100%;
    padding: 0.75rem 0.75rem 0.75rem 2.5rem;
    border: 1px solid #ced4da;
    border-radius: 0.375rem;
    font-size: 1rem;
  }

  .search-input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: white;
    padding: 1.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    gap: 1rem;
    position: relative;
  }

  .stat-icon {
    color: #007bff;
    background: #e7f3ff;
    padding: 0.75rem;
    border-radius: 0.5rem;
  }

  .stat-content {
    flex: 1;
  }

  .stat-number {
    font-size: 2rem;
    font-weight: 700;
    margin: 0;
    color: #212529;
  }

  .stat-label {
    margin: 0.25rem 0 0 0;
    color: #6c757d;
    font-size: 0.875rem;
  }

  .stat-action {
    background: none;
    border: none;
    color: #007bff;
    font-size: 0.875rem;
    cursor: pointer;
    text-decoration: underline;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    color: #212529;
  }

  .evidence-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }

  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .activity-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    background: white;
    border-radius: 0.375rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .activity-icon {
    color: #6c757d;
    margin-top: 0.125rem;
  }

  .activity-content {
    flex: 1;
  }

  .activity-text {
    margin: 0 0 0.25rem 0;
    font-size: 0.875rem;
    color: #212529;
  }

  .activity-time {
    font-size: 0.75rem;
    color: #6c757d;
  }

  .loading-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    text-align: center;
    color: #6c757d;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  .empty-state h3 {
    margin: 1rem 0 0.5rem 0;
    color: #495057;
  }

  .empty-state p {
    margin: 0 0 1.5rem 0;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid transparent;
    text-decoration: none;
  }

  .btn-primary {
    background: #007bff;
    color: white;
    border-color: #007bff;
  }

  .btn-primary:hover {
    background: #0056b3;
    border-color: #0056b3;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
    border-color: #6c757d;
  }

  .btn-secondary:hover {
    background: #545b62;
    border-color: #545b62;
  }

  .btn-link {
    background: none;
    color: #007bff;
    border: none;
    padding: 0;
    text-decoration: underline;
  }

  .btn-link:hover {
    color: #0056b3;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Responsive design */
  @media (max-width: 1024px) {
    .content-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .dashboard {
      padding: 1rem;
    }

    .dashboard-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .header-actions {
      width: 100%;
      justify-content: flex-end;
    }

    .search-container {
      flex-direction: column;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .evidence-grid {
      grid-template-columns: 1fr;
    }
  }
</style>