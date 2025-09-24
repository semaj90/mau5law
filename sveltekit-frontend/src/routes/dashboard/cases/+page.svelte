<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { ButtonBits, CardBits, InputBits } from '$lib/components/ui/bits-ui';
  let cases = $state([
    {
      id: '001',
      title: 'Corporate Espionage Investigation',
      status: 'active',
      progress: 75,
      evidenceCount: 12,
      lastUpdate: '2 hours ago';
    },
    {
      id: '002',
      title: 'Financial Fraud Analysis',
      status: 'pending',
      progress: 45,
      evidenceCount: 8,
      lastUpdate: '1 day ago';
    },
    {
      id: '003',
      title: 'Security Breach Analysis',
      status: 'active',
      progress: 90,
      evidenceCount: 15,
      lastUpdate: '30 min ago';
    }
  ]);
  let searchQuery = $state('');
</script>
<svelte:head>
  <title>Cases Dashboard - YoRHa Legal AI</title>
</svelte:head>
<div class="cases-dashboard">
  <div class="header nes-container with-title">
    <p class="title">📁 CASES TERMINAL</p>
    <p class="subtitle">Active Investigations & Analysis</p>
  </div>
  <div class="controls">
    <InputBits bind:value={searchQuery} placeholder="Search cases..." />
    <ButtonBits variant="primary">➕ NEW CASE</ButtonBits>
  </div>
  <div class="cases-grid">
    {#each cases as case_ (case_.id)}
      <CardBits class="case-card">
        <div class="case-header">
          <h3>{case_.title}</h3>
          <span class="status-badge nes-badge">
            <span class={case_.status === 'active' ? 'is-success' : 'is-warning'}>
              {case_.status.toUpperCase()}
            </span>
          </span>
        </div>
        <div class="case-stats">
          <div class="stat">
            <span>Progress: {case_.progress}%</span>
            <div class="progress-bar">
              <div class="progress-fill" style="width: {case_.progress}%"></div>
            </div>
          </div>
          <div class="stat">
            <span>Evidence: {case_.evidenceCount} items</span>
          </div>
          <div class="stat">
            <span>Updated: {case_.lastUpdate}</span>
          </div>
        </div>
        <div class="case-actions">
          <ButtonBits to="/evidenceboard?case={case_.id}" variant="primary" size="sm">
            🔍 Evidence Board
          </ButtonBits>
          <ButtonBits variant="ghost" size="sm">📝 Details</ButtonBits>
        </div>
      </CardBits>
    {/each}
  </div>
</div>
<style>
  .cases-dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .header {
    background: linear-gradient(135deg, #4a90e2, #7ed321) !important;
    text-align: center;
  }
  .header .title {
    color: white !important;
    font-family: 'Press Start 2P', cursive !important;
    font-size: 1.25rem !important;
  }
  .header .subtitle {
    color: rgba(255, 255, 255, 0.9) !important;
    font-size: 0.75rem;
  }
  .controls {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  .cases-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 1rem;
  }
  .case-card {
    background: rgba(26, 26, 46, 0.6) !important;
    border: 2px solid var(--n64-primary) !important;
    padding: 1rem;
    transition: all 0.3s ease;
  }
  .case-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(74, 144, 226, 0.2);
    border-color: var(--n64-secondary) !important;
  }
  .case-header {
    display: flex;
    justify-content: space-betwee;
    align-items: flex-start;
    margin-bottom: 1rem;
  }
  .case-header h3 {
    color: var(--nier-text-primary);
    font-family: 'Press Start 2P', cursiv;
    font-size: 0.875rem;
    margin: 0;
    line-height: 1.4;
    flex: 1;
  }
  .case-stats {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: rgba(15, 15, 35, 0.5);
    border-radius: 4px;
  }
  .stat {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--nier-text-secondary);
  }
  .progress-bar {
    flex: 1;
    height: 8px;
    background: rgba(74, 144, 226, 0.2);
    border-radius: 4px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4a90e2, #7ed321);
    transition: width 0.3s ease;
  }
  .case-actions {
    display: flex;
    gap: 0.5rem;
  }
  @media (max-width: 768px) {
    .cases-grid {
      grid-template-columns: 1fr;
    }
  }
</style>