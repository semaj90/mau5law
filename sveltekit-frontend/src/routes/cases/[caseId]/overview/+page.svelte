<script lang="ts">
  import { page } from '$app/stores';

  let caseId = $derived($page.params.caseId);
  let caseData = $state<any>(null);
  let timeline = $state<any[]>([]);
  let loading = $state(true);

  async function loadCaseOverview() {
    loading = true;
    try {
      const res = await fetch(`/api/cases/${caseId}`);
      if (res.ok) {
        caseData = await res.json();

        // Mock timeline for now
        timeline = [
          {
            date: '2024-03-15',
            time: '23:30',
            event: 'Incident occurred at 7-Eleven, 456 Main St',
            type: 'incident'
          },
          {
            date: '2024-03-16',
            time: '01:30',
            event: 'Suspect arrested at residence',
            type: 'arrest'
          },
          {
            date: '2024-03-16',
            time: '09:00',
            event: 'Evidence collected and logged',
            type: 'evidence'
          },
          {
            date: '2024-03-16',
            time: '14:00',
            event: 'Witness statement recorded',
            type: 'witness'
          }
        ];
      }
    } catch (err) {
      console.error('Failed to load case overview:', err);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (caseId) {
      loadCaseOverview();
    }
  });
</script>

<div class="case-overview">
  {#if loading}
    <div class="loading">Loading overview...</div>
  {:else if caseData}
    <!-- Case Summary -->
    <section class="overview-section">
      <h2>Case Summary</h2>
      <div class="summary-card">
        <div class="summary-row">
          <span class="summary-label">Case ID:</span>
          <span class="summary-value">{caseId}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Title:</span>
          <span class="summary-value">{caseData.title}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Status:</span>
          <span class="summary-value status-{caseData.status}">
            {caseData.status?.toUpperCase()}
          </span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Severity:</span>
          <span class="summary-value severity-{caseData.severity}">
            {caseData.severity?.toUpperCase()}
          </span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Created:</span>
          <span class="summary-value">
            {new Date(caseData.created_at).toLocaleString()}
          </span>
        </div>
        {#if caseData.description}
          <div class="summary-row full-width">
            <span class="summary-label">Description:</span>
            <p class="summary-description">{caseData.description}</p>
          </div>
        {/if}
      </div>
    </section>

    <!-- Timeline -->
    <section class="overview-section">
      <h2>Timeline</h2>
      <div class="timeline">
        {#each timeline as event}
          <div class="timeline-item timeline-{event.type}">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <div class="timeline-time">
                {event.date} at {event.time}
              </div>
              <div class="timeline-event">{event.event}</div>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- Quick Stats -->
    <section class="overview-section">
      <h2>Quick Stats</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-value">0</div>
          <div class="stat-label">Persons</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📎</div>
          <div class="stat-value">0</div>
          <div class="stat-label">Evidence Items</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📄</div>
          <div class="stat-value">1</div>
          <div class="stat-label">Reports</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⚖️</div>
          <div class="stat-value">{caseData.primary_offense_codes?.length || 0}</div>
          <div class="stat-label">Charges</div>
        </div>
      </div>
    </section>
  {/if}
</div>

<style>
  .case-overview {
    max-width: 1200px;
    margin: 0 auto;
  }

  .loading {
    text-align: center;
    padding: 3rem;
    color: #666;
  }

  .overview-section {
    background: var(--yorha-paper);
    border: 2px solid var(--yorha-ink);
    border-radius: 4px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .overview-section h2 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: var(--yorha-crimson);
    font-weight: bold;
    border-bottom: 2px solid var(--yorha-crimson);
    padding-bottom: 0.5rem;
  }

  .summary-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .summary-row {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }

  .summary-row.full-width {
    flex-direction: column;
  }

  .summary-label {
    font-weight: bold;
    min-width: 120px;
    color: #666;
  }

  .summary-value {
    flex: 1;
    color: var(--yorha-ink);
  }

  .summary-value.status-open {
    color: #2196f3;
    font-weight: bold;
  }

  .summary-value.status-charged {
    color: #ff9800;
    font-weight: bold;
  }

  .summary-value.status-closed {
    color: #9e9e9e;
    font-weight: bold;
  }

  .summary-value.severity-high {
    color: var(--yorha-crimson);
    font-weight: bold;
  }

  .summary-value.severity-medium {
    color: #ff9800;
    font-weight: bold;
  }

  .summary-value.severity-low {
    color: #4caf50;
    font-weight: bold;
  }

  .summary-description {
    margin: 0.5rem 0 0 0;
    line-height: 1.6;
    color: var(--yorha-ink);
  }

  .timeline {
    position: relative;
    padding-left: 2rem;
  }

  .timeline::before {
    content: '';
    position: absolute;
    left: 0.5rem;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #ddd;
  }

  .timeline-item {
    position: relative;
    padding-bottom: 1.5rem;
  }

  .timeline-marker {
    position: absolute;
    left: -1.5rem;
    top: 0.25rem;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--yorha-crimson);
    border: 2px solid var(--yorha-paper);
  }

  .timeline-incident .timeline-marker {
    background: var(--yorha-crimson);
  }

  .timeline-arrest .timeline-marker {
    background: #ff9800;
  }

  .timeline-evidence .timeline-marker {
    background: #2196f3;
  }

  .timeline-witness .timeline-marker {
    background: #4caf50;
  }

  .timeline-time {
    font-size: 0.875rem;
    color: #666;
    margin-bottom: 0.25rem;
  }

  .timeline-event {
    font-size: 0.95rem;
    color: var(--yorha-ink);
    line-height: 1.5;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    background: var(--yorha-bg);
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 1.5rem;
    text-align: center;
    transition: all 0.2s ease;
  }

  .stat-card:hover {
    border-color: var(--yorha-crimson);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .stat-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: bold;
    color: var(--yorha-crimson);
    margin-bottom: 0.25rem;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
</style>
