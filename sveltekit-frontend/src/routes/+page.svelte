<script lang="ts">
  // Minimal home page for HMR testing
  let systemInfo = $state({
    uptime: '6 hours, 23 minutes',
    activeServices: 7,
    lastSync: '2 minutes ago'
  });

  $effect(() => {
    console.log('✅ YoRHa Legal AI Platform loaded successfully');
  });
</script>

<svelte:head>
  <title>YoRHa Legal AI Platform</title>
</svelte:head>

<div class="home-page">
  <div class="hero-section">
    <h1>🚀 YoRHa Legal AI Platform - HMR ACTIVE & WORKING! ✅</h1>
    <p class="subtitle">Advanced evidence processing with AI-powered analysis</p>
    <p class="status">Status: <span class="text-green-400">System Online ✅ HMR Active</span></p>
  </div>

  <div class="quick-stats">
    <div class="stat-card">
      <h3>System Uptime</h3>
      <p class="stat-value">{systemInfo.uptime}</p>
    </div>
    <div class="stat-card">
      <h3>Active Services</h3>
      <p class="stat-value">{systemInfo.activeServices}</p>
    </div>
    <div class="stat-card">
      <h3>Last Sync</h3>
      <p class="stat-value">{systemInfo.lastSync}</p>
    </div>
  </div>

  <div class="action-grid">
    <a href="/endpoints" class="action-card">
      <h3>📊 Service Status</h3>
      <p>Monitor backend services and API endpoints</p>
    </a>
    <a href="/evidence" class="action-card">
      <h3>📁 Evidence Manager</h3>
      <p>Upload and analyze legal documents</p>
    </a>
    <a href="/chat" class="action-card">
      <h3>💬 AI Assistant</h3>
      <p>Interactive legal AI chat interface</p>
    </a>
  </div>
</div>

<style>
  .home-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .hero-section {
    text-align: center;
    margin-bottom: 3rem;
  }

  .hero-section h1 {
    font-size: 2.5rem;
    color: #ffd700;
    margin-bottom: 1rem;
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
  }

  .subtitle {
    font-size: 1.2rem;
    color: #b0b0b0;
    margin-bottom: 1rem;
  }

  .status {
    font-size: 1rem;
    color: #888;
  }

  .quick-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 3rem;
  }

  .stat-card {
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
  }

  .stat-card h3 {
    margin: 0 0 0.5rem 0;
    color: #ffd700;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #00ff41;
    margin: 0;
    font-family: 'JetBrains Mono', monospace;
  }

  .action-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .action-card {
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    border: 1px solid #444;
    border-radius: 8px;
    padding: 2rem;
    text-decoration: none;
    color: inherit;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .action-card:hover {
    border-color: #ffd700;
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
    transform: translateY(-2px);
  }

  .action-card h3 {
    margin: 0 0 1rem 0;
    color: #ffd700;
    font-size: 1.2rem;
  }

  .action-card p {
    margin: 0;
    color: #b0b0b0;
    line-height: 1.5;
  }
</style>