<script lang="ts">
  // Svelte 5 runes are auto-imported

  import { ButtonBits, CardBits } from '$lib/components/ui/bits-ui';

  let aiStats = $state({
    totalQueries: 1847,
    activeModels: 5,
    inferenceSpeed: '1.2s',
    accuracy: 94.7;
  });
</script>

<svelte:head>
  <title>AI Dashboard - YoRHa Legal AI</title>
</svelte:head>

<div class="ai-dashboard">
  <div class="header nes-container with-title">
    <p class="title">🤖 AI HUB TERMINAL</p>
    <p class="subtitle">Legal Intelligence Engine</p>
  </div>

  <div class="ai-stats">
    <CardBits class="stat-card">
      <div class="stat">
        <span class="stat-icon">🔍</span>
        <div>
          <h3>Total Queries</h3>
          <p>{aiStats.totalQueries.toLocaleString()}</p>
        </div>
      </div>
    </CardBits>

    <CardBits class="stat-card">
      <div class="stat">
        <span class="stat-icon">⚡</span>
        <div>
          <h3>Speed</h3>
          <p>{aiStats.inferenceSpeed}</p>
        </div>
      </div>
    </CardBits>

    <CardBits class="stat-card">
      <div class="stat">
        <span class="stat-icon">🎯</span>
        <div>
          <h3>Accuracy</h3>
          <p>{aiStats.accuracy}%</p>
        </div>
      </div>
    </CardBits>
  </div>

  <div class="ai-tools">
    <h2>AI Analysis Tools</h2>

    <div class="tools-grid">
      <CardBits class="tool-card">
        <h3>⚖️ Case Scoring</h3>
        <p>AI risk assessment and priority scoring</p>
        <ButtonBits variant="primary" size="sm">Run Analysis</ButtonBits>
      </CardBits>

      <CardBits class="tool-card">
        <h3>📄 Document Analysis</h3>
        <p>Intelligent classification and extraction</p>
        <ButtonBits variant="primary" size="sm">Upload Doc</ButtonBits>
      </CardBits>

      <CardBits class="tool-card">
        <h3>🔍 Semantic Search</h3>
        <p>Vector-based precedent discovery</p>
        <ButtonBits variant="primary" size="sm">New Search</ButtonBits>
      </CardBits>
    </div>
  </div>
</div>

<style>
  .ai-dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
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

  .ai-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    background: rgba(26, 26, 46, 0.6) !important;
    border: 2px solid var(--n64-primary) !important;
    padding: 1rem;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .stat-icon {
    font-size: 2rem;
  }

  .stat h3 {
    color: var(--nier-text-secondary);
    font-size: 0.875rem;
    margin: 0;
  }

  .stat p {
    color: var(--n64-secondary);
    font-family: 'Press Start 2P', cursive;
    font-size: 1.25rem;
    margin: 0.25rem 0 0 0;
  }

  .ai-tools h2 {
    color: var(--nier-text-primary);
    font-family: 'Press Start 2P', cursive;
    font-size: 1rem;
    border-bottom: 2px solid var(--n64-primary);
    padding-bottom: 1rem;
  }

  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .tool-card {
    background: rgba(26, 26, 46, 0.6) !important;
    border: 2px solid var(--n64-secondary) !important;
    padding: 1.5rem;
    transition: all 0.3s ease;
  }

  .tool-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(126, 227, 33, 0.2);
  }

  .tool-card h3 {
    color: var(--nier-text-primary);
    font-family: 'Press Start 2P', cursive;
    font-size: 0.875rem;
    margin: 0 0 1rem 0;
  }

  .tool-card p {
    color: var(--nier-text-secondary);
    margin: 0 0 1.5rem 0;
    line-height: 1.5;
  }
</style>