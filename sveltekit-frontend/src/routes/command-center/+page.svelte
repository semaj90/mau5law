<script lang="ts">
  import LegalAILayout from '$lib/components/legal-ai/LegalAILayout.svelte';
  import NesModal from '$lib/components/NesModal.svelte';
  import RoutesList from '$lib/components/RoutesList.svelte';

  interface ActiveCase {
    id: string;
    number: string;
    defendant: string;
    charges: string[];
    status: 'active' | 'pending' | 'closed';
    lastUpdated: Date;
  }

  let activeCases: ActiveCase[] = $state([
    {
      id: '1',
      number: 'CASE-2024-001',
      defendant: 'John Doe',
      charges: ['Murder', 'Assault'],
      status: 'active',
      lastUpdated: new Date(),
    },
    {
      id: '2',
      number: 'CASE-2024-002',
      defendant: 'Jane Smith',
      charges: ['Theft', 'Fraud'],
      status: 'pending',
      lastUpdated: new Date(Date.now() - 86400000),
    },
  ]);

  let recentActivity: Array<{ action: string; case: string; time: Date }> = $state([
    { action: 'Summary Generated', case: 'CASE-2024-001', time: new Date() },
    { action: 'Evidence Uploaded', case: 'CASE-2024-002', time: new Date(Date.now() - 3600000) },
    { action: 'Citation Extracted', case: 'CASE-2024-001', time: new Date(Date.now() - 7200000) },
  ]);

  let modal: NesModal;
</script>

<LegalAILayout title="Command Center" subtitle="Manage cases, evidence, and legal analysis">
    <div class="controls">
        <button on:click={() => modal.open()}>Show Routes</button>
    </div>
  <div class="dashboard-grid">
    <!-- Active Cases Section -->
    <section class="dashboard-section">
      <h2 class="section-title">Active Cases</h2>
      <div class="cases-list">
        {#each activeCases as caseItem (caseItem.id)}
          <div class="case-card">
            <div class="case-header">
              <div class="case-info">
                <span class="case-number">{caseItem.number}</span>
                <span class="case-defendant">{caseItem.defendant}</span>
              </div>
              <span class="case-status" class:active={caseItem.status === 'active'}>
                {caseItem.status}
              </span>
            </div>
            <div class="case-charges">
              {#each caseItem.charges as charge}
                <span class="charge-badge">{charge}</span>
              {/each}
            </div>
            <div class="case-footer">
              <span class="last-updated">
                Updated {caseItem.lastUpdated.toLocaleDateString()}
              </span>
              <button class="case-action-btn">View →</button>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- Recent Activity Section -->
    <section class="dashboard-section">
      <h2 class="section-title">Recent Activity</h2>
      <div class="activity-list">
        {#each recentActivity as activity (activity.case + activity.time.getTime())}
          <div class="activity-item">
            <div class="activity-dot"></div>
            <div class="activity-content">
              <span class="activity-action">{activity.action}</span>
              <span class="activity-case">{activity.case}</span>
            </div>
            <span class="activity-time">
              {activity.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        {/each}
      </div>
    </section>

    <!-- Statistics Section -->
    <section class="dashboard-section">
      <h2 class="section-title">Statistics</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">12</span>
          <span class="stat-label">Active Cases</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">847</span>
          <span class="stat-label">Evidence Items</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">2.3K</span>
          <span class="stat-label">Citations</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">94%</span>
          <span class="stat-label">Cache Hit Rate</span>
        </div>
      </div>
    </section>
  </div>
</LegalAILayout>

<NesModal bind:this={modal}>
    <h2 slot="header">App Routes</h2>
    <RoutesList />
</NesModal>

<style>
    .controls {
        margin-bottom: 1rem;
    }
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1.5rem;
  }

  .dashboard-section {
    background-color: white;
    border: 2px solid #d4a574;
    border-radius: 6px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .section-title {
    font-family: 'Crimson Text', Georgia, serif;
    font-size: 1.3rem;
    font-weight: 600;
    margin: 0;
    color: #2c2c2c;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid #d4a574;
  }

  .cases-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .case-card {
    padding: 1rem;
    background-color: #f5f1e8;
    border: 1px solid #e0d5c7;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    transition: all 0.2s;
  }

  .case-card:hover {
    border-color: #8b4513;
    box-shadow: 0 2px 8px rgba(139, 69, 19, 0.1);
  }

  .case-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .case-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .case-number {
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 0.9rem;
    font-weight: 600;
    color: #8b4513;
  }

  .case-defendant {
    font-size: 0.95rem;
    color: #2c2c2c;
    font-weight: 500;
  }

  .case-status {
    padding: 0.25rem 0.75rem;
    background-color: #ffc107;
    color: #2c2c2c;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .case-status.active {
    background-color: #44ff44;
    color: #000;
  }

  .case-charges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .charge-badge {
    padding: 0.25rem 0.5rem;
    background-color: #e0d5c7;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    color: #2c2c2c;
  }

  .case-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 0.5rem;
    border-top: 1px solid #e0d5c7;
    font-size: 0.8rem;
  }

  .last-updated {
    color: #666;
  }

  .case-action-btn {
    background: none;
    border: none;
    color: #8b4513;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .case-action-btn:hover {
    color: #a0522d;
  }

  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .activity-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    background-color: #f5f1e8;
    border-radius: 4px;
  }

  .activity-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #8b4513;
    flex-shrink: 0;
  }

  .activity-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .activity-action {
    font-size: 0.9rem;
    font-weight: 500;
    color: #2c2c2c;
  }

  .activity-case {
    font-size: 0.8rem;
    color: #666;
    font-family: 'Monaco', 'Courier New', monospace;
  }

  .activity-time {
    font-size: 0.75rem;
    color: #999;
    white-space: nowrap;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .stat-card {
    padding: 1rem;
    background-color: #f5f1e8;
    border: 1px solid #e0d5c7;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    text-align: center;
  }

  .stat-value {
    font-family: 'Crimson Text', Georgia, serif;
    font-size: 1.75rem;
    font-weight: 700;
    color: #8b4513;
  }

  .stat-label {
    font-size: 0.8rem;
    color: #666;
    text-transform: uppercase;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    .dashboard-grid {
      grid-template-columns: 1fr;
    }
  }
</style>