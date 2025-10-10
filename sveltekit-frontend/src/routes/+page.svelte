<script lang="ts">
  import { browser } from '$app/environment';

  // Svelte 5 runes for reactive state
  let loading = $state(true);
  let systemStatus = $state({
    database: 'checking',
    redis: 'checking',
    ollama: 'checking',
    gpu: 'checking',
    workers: 'checking' // NEW: Worker health status
  });

  let stats = $state({
    totalCases: 0,
    totalEvidence: 0,
    processingJobs: 0
  });

  let workerDetails = $state({
    ocr: { status: 'offline', healthy: false, queueDepth: 0 },
    embedding: { status: 'offline', healthy: false, queueDepth: 0 },
    autotag: { status: 'offline', healthy: false, queueDepth: 0 }
  });

  // Check system health on mount
  $effect(() => {
    if (browser) {
      checkSystemHealth();
      const interval = setInterval(checkSystemHealth, 30000); // Check every 30s
      return () => clearInterval(interval);
    }
  });

  async function checkSystemHealth() {
    try {
      // Check database
      const dbCheck = await fetch('/api/health/database').catch(() => ({ ok: false }));
      systemStatus.database = dbCheck.ok ? 'online' : 'offline';

      // Check Redis
      const redisCheck = await fetch('/api/health/redis').catch(() => ({ ok: false }));
      systemStatus.redis = redisCheck.ok ? 'online' : 'offline';

      // Check Ollama
      const ollamaCheck = await fetch('/api/health/ollama').catch(() => ({ ok: false }));
      systemStatus.ollama = ollamaCheck.ok ? 'online' : 'offline';

      // Check GPU
      const gpuCheck = await fetch('/api/health/gpu').catch(() => ({ ok: false }));
      systemStatus.gpu = gpuCheck.ok ? 'online' : 'offline';

      // Check Workers (NEW)
      const workersCheck = await fetch('/api/health/workers').catch(() => null);
      if (workersCheck?.ok) {
        const workersData = await workersCheck.json();
        systemStatus.workers = workersData.success && workersData.status === 'online' ? 'online' :
                                workersData.status === 'degraded' ? 'degraded' : 'offline';

        // Update worker details
        if (workersData.workers) {
          workersData.workers.forEach((worker: any) => {
            if (worker.name.includes('OCR')) {
              workerDetails.ocr = {
                status: worker.status,
                healthy: worker.healthy,
                queueDepth: worker.queueDepth || 0,
                processedJobs: worker.processedJobs || 0
              };
            } else if (worker.name.includes('Embedding')) {
              workerDetails.embedding = {
                status: worker.status,
                healthy: worker.healthy,
                queueDepth: worker.queueDepth || 0,
                processedJobs: worker.processedJobs || 0
              };
            } else if (worker.name.includes('Autotag')) {
              workerDetails.autotag = {
                status: worker.status,
                healthy: worker.healthy,
                queueDepth: 0,
                processedJobs: worker.processedJobs || 0
              };
            }
          });
        }
      } else {
        systemStatus.workers = 'offline';
      }

      // Get stats
      const statsResponse = await fetch('/api/dashboard/stats').catch(() => null);
      if (statsResponse?.ok) {
        const data = await statsResponse.json();
        if (data.success) {
          stats.totalCases = data.data.totalCases || 0;
          stats.totalEvidence = data.data.totalEvidence || 0;
          stats.processingJobs = data.data.activeJobs || 0;
        }
      }

      loading = false;
    } catch (err) {
      console.error('Health check error:', err);
      loading = false;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'online': return 'text-green-400';
      case 'offline': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'online': return '✅';
      case 'offline': return '❌';
      default: return '⏳';
    }
  }
</script>

<svelte:head>
  <title>YoRHa Legal AI Platform - Home</title>
  <meta name="description" content="Advanced legal AI platform with GPU-accelerated processing" />
</svelte:head>

<div class="home-page">
  <!-- Hero Section -->
  <div class="hero-section">
    <h1>⚖️ YoRHa Legal AI Platform</h1>
    <p class="subtitle">GPU-Accelerated Legal Intelligence System</p>
    <p class="tech-stack">
      SvelteKit 2 · Svelte 5 · PostgreSQL 17 · Redis · Gemma3 Legal · RTX GPU
    </p>
  </div>

  <!-- System Status -->
  <div class="status-section">
    <h2>🔧 System Status</h2>
    <div class="status-grid">
      <div class="status-item">
        <span class="status-label">Database</span>
        <span class={getStatusColor(systemStatus.database)}>
          {getStatusIcon(systemStatus.database)} {systemStatus.database}
        </span>
      </div>
      <div class="status-item">
        <span class="status-label">Redis Cache</span>
        <span class={getStatusColor(systemStatus.redis)}>
          {getStatusIcon(systemStatus.redis)} {systemStatus.redis}
        </span>
      </div>
      <div class="status-item">
        <span class="status-label">Ollama AI</span>
        <span class={getStatusColor(systemStatus.ollama)}>
          {getStatusIcon(systemStatus.ollama)} {systemStatus.ollama}
        </span>
      </div>
      <div class="status-item">
        <span class="status-label">GPU Compute</span>
        <span class={getStatusColor(systemStatus.gpu)}>
          {getStatusIcon(systemStatus.gpu)} {systemStatus.gpu}
        </span>
      </div>
      <div class="status-item">
        <span class="status-label">Background Workers</span>
        <span class={getStatusColor(systemStatus.workers)}>
          {getStatusIcon(systemStatus.workers)} {systemStatus.workers}
        </span>
      </div>
    </div>

    <!-- Worker Details Panel -->
    {#if systemStatus.workers !== 'checking'}
      <div class="worker-details">
        <h3>🔧 Worker Status Details</h3>
        <div class="workers-grid">
          <div class="worker-card {workerDetails.ocr.healthy ? 'healthy' : 'unhealthy'}">
            <div class="worker-header">
              <span class="worker-icon">📄</span>
              <h4>OCR Worker</h4>
            </div>
            <div class="worker-stats">
              <p>Status: <strong>{workerDetails.ocr.status}</strong></p>
              <p>Processed: <strong>{workerDetails.ocr.processedJobs || 0}</strong></p>
              <p>Queue: <strong>{workerDetails.ocr.queueDepth || 0}</strong></p>
            </div>
            <div class="worker-tech">
              <span class="tech-badge">GPU Tesseract</span>
              <span class="tech-badge">MinIO</span>
            </div>
          </div>

          <div class="worker-card {workerDetails.embedding.healthy ? 'healthy' : 'unhealthy'}">
            <div class="worker-header">
              <span class="worker-icon">🧠</span>
              <h4>Embedding Worker</h4>
            </div>
            <div class="worker-stats">
              <p>Status: <strong>{workerDetails.embedding.status}</strong></p>
              <p>Processed: <strong>{workerDetails.embedding.processedJobs || 0}</strong></p>
              <p>Queue: <strong>{workerDetails.embedding.queueDepth || 0}</strong></p>
            </div>
            <div class="worker-tech">
              <span class="tech-badge">embeddinggemma:latest</span>
              <span class="tech-badge">Qdrant</span>
              <span class="tech-badge">pgvector</span>
            </div>
          </div>

          <div class="worker-card {workerDetails.autotag.healthy ? 'healthy' : 'unhealthy'}">
            <div class="worker-header">
              <span class="worker-icon">🏷️</span>
              <h4>Autotag Worker</h4>
            </div>
            <div class="worker-stats">
              <p>Status: <strong>{workerDetails.autotag.status}</strong></p>
              <p>Processed: <strong>{workerDetails.autotag.processedJobs || 0}</strong></p>
              <p>Type: <strong>Optional</strong></p>
            </div>
            <div class="worker-tech">
              <span class="tech-badge">gemma3-legal:latest</span>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Quick Stats -->
  <div class="stats-section">
    <h2>📊 Platform Statistics</h2>
    <div class="quick-stats">
      <div class="stat-card">
        <div class="stat-icon">📁</div>
        <div class="stat-content">
          <h3>Total Cases</h3>
          <p class="stat-value">{loading ? '...' : stats.totalCases}</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📄</div>
        <div class="stat-content">
          <h3>Evidence Items</h3>
          <p class="stat-value">{loading ? '...' : stats.totalEvidence}</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⚙️</div>
        <div class="stat-content">
          <h3>Processing Jobs</h3>
          <p class="stat-value">{loading ? '...' : stats.processingJobs}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Featured: YoRHa Detective Interface -->
  <div class="featured-section">
    <a href="/yorha-detective" class="featured-card">
      <div class="featured-badge">✨ NEW</div>
      <div class="featured-icon">🎮⚔️</div>
      <h2>YoRHa Detective Command Center</h2>
      <p class="featured-description">
        Full-featured AI detective interface with real-time Ollama chat, PostgreSQL chat history,
        and retro gaming aesthetic. Stream responses from Gemma3-Legal with 30 GPU layers!
      </p>
      <div class="featured-tech">
        <span class="tech-badge">Ollama Streaming</span>
        <span class="tech-badge">PostgreSQL</span>
        <span class="tech-badge">pgvector</span>
        <span class="tech-badge">GPU 30 Layers</span>
      </div>
      <span class="featured-button">Launch Detective Interface →</span>
    </a>
  </div>

  <!-- Feature Grid -->
  <div class="features-section">
    <h2>🚀 Platform Features</h2>
    <div class="action-grid">
      <a href="/cases" class="action-card">
        <div class="card-icon">⚖️</div>
        <h3>Case Management</h3>
        <p>Organize and track legal cases with AI-powered insights</p>
        <span class="card-button">Open Cases →</span>
      </a>

      <a href="/evidence" class="action-card">
        <div class="card-icon">📁</div>
        <h3>Evidence Processing</h3>
        <p>Upload, analyze, and extract insights from legal documents</p>
        <span class="card-button">Manage Evidence →</span>
      </a>

  <a href="/ai/chat" class="action-card">
        <div class="card-icon">💬</div>
        <h3>AI Assistant</h3>
        <p>Interactive legal AI chat with Gemma3 Legal model</p>
        <span class="card-button">Start Chat →</span>
      </a>

  <a href="/rag" class="action-card">
        <div class="card-icon">🤖</div>
        <h3>RAG Knowledge Base</h3>
        <p>Upload documents, semantic search with embeddinggemma + MinIO + Qdrant</p>
        <span class="card-button">Open RAG System →</span>
      </a>

      <a href="/yorha" class="action-card">
        <div class="card-icon">🎮</div>
        <h3>YoRHa Command</h3>
        <p>Advanced command center with real-time monitoring</p>
        <span class="card-button">Open Command →</span>
      </a>

      <a href="/endpoints" class="action-card">
        <div class="card-icon">📊</div>
        <h3>API Status</h3>
        <p>Monitor backend services and health endpoints</p>
        <span class="card-button">View Status →</span>
      </a>
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="quick-actions">
    <h2>⚡ Quick Actions</h2>
    <div class="action-buttons">
      <a href="/yorha-detective" class="quick-button detective">🎮 Detective Interface</a>
      <a href="/cases/create" class="quick-button success">+ New Case</a>
      <a href="/evidence/upload" class="quick-button legal">📤 Upload Evidence</a>
  <a href="/ai/chat" class="quick-button neural">💬 Ask AI</a>
    </div>
  </div>
</div>

<style>
  .home-page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    min-height: 100vh;
  }

  /* Hero Section */
  .hero-section {
    text-align: center;
    margin-bottom: 3rem;
    padding: 3rem 1rem;
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(0, 255, 65, 0.05) 100%);
    border-radius: 16px;
    border: 2px solid rgba(255, 215, 0, 0.3);
  }

  .hero-section h1 {
    font-size: 3rem;
    color: #ffd700;
    margin-bottom: 1rem;
    text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
    font-weight: 800;
  }

  .subtitle {
    font-size: 1.4rem;
    color: #00ff41;
    margin-bottom: 1rem;
    font-weight: 600;
  }

  .tech-stack {
    font-size: 0.95rem;
    color: #888;
    font-family: 'JetBrains Mono', monospace;
  }

  /* Status Section */
  .status-section {
    margin-bottom: 3rem;
  }

  .status-section h2 {
    color: #ffd700;
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    padding: 1.5rem;
    background: rgba(42, 42, 42, 0.5);
    border-radius: 12px;
    border: 1px solid #444;
  }

  .status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: rgba(26, 26, 26, 0.8);
    border-radius: 8px;
    border: 1px solid #333;
  }

  .status-label {
    font-weight: 600;
    color: #b0b0b0;
  }

  /* Stats Section */
  .stats-section {
    margin-bottom: 3rem;
  }

  .stats-section h2 {
    color: #ffd700;
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
  }

  .quick-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .stat-card {
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    border: 2px solid #444;
    border-radius: 12px;
    padding: 2rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    transition: all 0.3s ease;
  }

  .stat-card:hover {
    border-color: #ffd700;
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
    transform: translateY(-4px);
  }

  .stat-icon {
    font-size: 3rem;
    filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.5));
  }

  .stat-content h3 {
    margin: 0 0 0.5rem 0;
    color: #b0b0b0;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: bold;
    color: #00ff41;
    margin: 0;
    font-family: 'JetBrains Mono', monospace;
  }

  /* Features Section */
  .features-section {
    margin-bottom: 3rem;
  }

  .features-section h2 {
    color: #ffd700;
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
  }

  .action-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .action-card {
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    border: 2px solid #444;
    border-radius: 12px;
    padding: 2rem;
    text-decoration: none;
    color: inherit;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .action-card:hover {
    border-color: #ffd700;
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
    transform: translateY(-4px);
  }

  .action-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #ffd700, #00ff41);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .action-card:hover::before {
    opacity: 1;
  }

  .card-icon {
    font-size: 3rem;
    filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.5));
  }

  .action-card h3 {
    margin: 0;
    color: #ffd700;
    font-size: 1.3rem;
    font-weight: 700;
  }

  .action-card p {
    margin: 0;
    color: #b0b0b0;
    line-height: 1.6;
    flex-grow: 1;
  }

  .card-button {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
    color: #000;
    font-weight: 700;
    border-radius: 6px;
    transition: all 0.3s ease;
    margin-top: 0.5rem;
  }

  .action-card:hover .card-button {
    background: linear-gradient(135deg, #ffed4e 0%, #ffd700 100%);
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.6);
  }

  /* Quick Actions */
  .quick-actions {
    text-align: center;
    padding: 2rem;
    background: linear-gradient(135deg, rgba(42, 42, 42, 0.5) 0%, rgba(26, 26, 26, 0.5) 100%);
    border-radius: 16px;
    border: 2px solid #444;
  }

  .quick-actions h2 {
    color: #ffd700;
    margin-bottom: 2rem;
    font-size: 1.5rem;
  }

  .action-buttons {
    display: flex;
    gap: 1.5rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .quick-button {
    display: inline-block;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    font-weight: 700;
    border-radius: 8px;
    text-decoration: none;
    transition: all 0.3s ease;
    border: 2px solid transparent;
  }

  .quick-button.success {
    background: linear-gradient(135deg, #00ff41 0%, #00cc33 100%);
    color: #000;
  }

  .quick-button.success:hover {
    background: linear-gradient(135deg, #00cc33 0%, #00ff41 100%);
    box-shadow: 0 0 20px rgba(0, 255, 65, 0.5);
    transform: translateY(-2px);
  }

  .quick-button.legal {
    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
    color: #000;
  }

  .quick-button.legal:hover {
    background: linear-gradient(135deg, #ffed4e 0%, #ffd700 100%);
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
    transform: translateY(-2px);
  }

  .quick-button.neural {
    background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%);
    color: #fff;
  }

  .quick-button.neural:hover {
    background: linear-gradient(135deg, #3b82f6 0%, #a855f7 100%);
    box-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
    transform: translateY(-2px);
  }

  .quick-button.detective {
    background: linear-gradient(135deg, #00ff41 0%, #00cc34 100%);
    color: #000;
    border: 2px solid #00ff41;
    font-weight: 900;
    text-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
  }

  .quick-button.detective:hover {
    background: linear-gradient(135deg, #00cc34 0%, #00ff41 100%);
    box-shadow: 0 0 30px rgba(0, 255, 65, 0.8);
    transform: translateY(-2px) scale(1.05);
  }

  /* Featured Section */
  .featured-section {
    margin-bottom: 3rem;
  }

  .featured-card {
    position: relative;
    display: block;
    padding: 3rem;
    background: linear-gradient(135deg, rgba(0, 255, 65, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%);
    border: 3px solid #00ff41;
    border-radius: 16px;
    text-decoration: none;
    color: inherit;
    transition: all 0.3s ease;
    overflow: hidden;
  }

  .featured-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6px;
    background: linear-gradient(90deg, #00ff41, #ffd700, #00ff41);
    background-size: 200% 100%;
    animation: shimmer 3s linear infinite;
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  /* Worker Details Panel - NEW */
  .worker-details {
    margin-top: 2rem;
    padding: 1.5rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 12px;
    border: 1px solid #333;
  }

  .worker-details h3 {
    color: #ffd700;
    margin-bottom: 1.5rem;
    font-size: 1.2rem;
  }

  .workers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .worker-card {
    padding: 1.5rem;
    background: linear-gradient(135deg, rgba(42, 42, 42, 0.6) 0%, rgba(26, 26, 26, 0.6) 100%);
    border-radius: 12px;
    border: 2px solid #444;
    transition: all 0.3s ease;
  }

  .worker-card.healthy {
    border-color: #00ff41;
    box-shadow: 0 0 10px rgba(0, 255, 65, 0.2);
  }

  .worker-card.unhealthy {
    border-color: #ff4444;
    box-shadow: 0 0 10px rgba(255, 68, 68, 0.2);
  }

  .worker-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #333;
  }

  .worker-icon {
    font-size: 1.5rem;
  }

  .worker-header h4 {
    color: #fff;
    margin: 0;
    font-size: 1.1rem;
  }

  .worker-stats {
    margin-bottom: 1rem;
  }

  .worker-stats p {
    margin: 0.5rem 0;
    color: #ccc;
    font-size: 0.9rem;
  }

  .worker-stats strong {
    color: #00ff41;
    font-weight: 600;
  }

  .worker-tech {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tech-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background: rgba(168, 85, 247, 0.2);
    border: 1px solid #a855f7;
    border-radius: 12px;
    font-size: 0.75rem;
    color: #a855f7;
    font-weight: 600;
  }

  .featured-card:hover {
    border-color: #ffd700;
    box-shadow: 0 0 40px rgba(0, 255, 65, 0.4), 0 0 60px rgba(255, 215, 0, 0.2);
    transform: translateY(-8px) scale(1.02);
  }

  .featured-badge {
    position: absolute;
    top: 1rem;
    right: 1rem;
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, #00ff41 0%, #00cc34 100%);
    color: #000;
    font-weight: 900;
    font-size: 0.75rem;
    border-radius: 20px;
    box-shadow: 0 0 20px rgba(0, 255, 65, 0.5);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.9; }
  }

  .featured-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    text-shadow: 0 0 20px rgba(0, 255, 65, 0.5);
  }

  .featured-card h2 {
    font-size: 2rem;
    color: #00ff41;
    margin-bottom: 1rem;
    text-shadow: 0 0 15px rgba(0, 255, 65, 0.3);
  }

  .featured-description {
    font-size: 1.1rem;
    color: #b0b0b0;
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }

  .featured-tech {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .tech-badge {
    padding: 0.5rem 1rem;
    background: rgba(0, 255, 65, 0.1);
    border: 1px solid rgba(0, 255, 65, 0.3);
    color: #00ff41;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
  }

  .featured-button {
    display: inline-block;
    padding: 1rem 2rem;
    background: linear-gradient(135deg, #00ff41 0%, #00cc34 100%);
    color: #000;
    font-weight: 900;
    font-size: 1.2rem;
    border-radius: 8px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(0, 255, 65, 0.3);
  }

  .featured-card:hover .featured-button {
    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
    box-shadow: 0 6px 25px rgba(255, 215, 0, 0.5);
    transform: scale(1.05);
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .hero-section h1 {
      font-size: 2rem;
    }

    .subtitle {
      font-size: 1.1rem;
    }

    .action-grid {
      grid-template-columns: 1fr;
    }

    .quick-stats {
      grid-template-columns: 1fr;
    }

    .action-buttons {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>