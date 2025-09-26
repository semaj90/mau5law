<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/core';
  import { routeGroups, getRouteGroupByTheme } from '$lib/data/route-groups-config';

  // Get AI route group
  const aiGroup = getRouteGroupByTheme('cyberpunk');
  const aiRoutes = aiGroup?.routes || [];

  // AI system statistics (mock data)
  const aiStats = {
    modelsActive: 5,
    inferencesPerHour: 1247,
    gpuUtilization: 78,
    averageResponseTime: 0.85
  };

  // Recent AI activities
  const recentActivities = [
    { type: 'analysis', document: 'Contract_2025_001.pdf', confidence: 94 },
    { type: 'embedding', document: 'Evidence_Photo_Set.zip', confidence: 89 },
    { type: 'chat', query: 'Legal precedent analysis', confidence: 96 },
    { type: 'cuda', operation: 'Vector similarity search', confidence: 92 }
  ];
</script>

<svelte:head>
  <title>AI Assistant Hub | YoRHa Legal AI</title>
  <meta name="description" content="Advanced AI assistant with GPU acceleration and legal analysis capabilities" />
</svelte:head>

<div class="ai-dashboard">
  <div class="dashboard-header">
    <h1>🤖 AI Assistant Command Hub</h1>
    <p>Advanced artificial intelligence for legal analysis and case processing</p>
  </div>

  <!-- AI Statistics -->
  <div class="stats-grid">
    <Card class="stat-card">
      <CardHeader>
        <CardTitle>🧠 Active Models</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="stat-number">{aiStats.modelsActive}</div>
        <div class="stat-label">Gemma3, TensorRT, Embeddings</div>
      </CardContent>
    </Card>

    <Card class="stat-card">
      <CardHeader>
        <CardTitle>⚡ Inferences/Hour</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="stat-number">{aiStats.inferencesPerHour.toLocaleString()}</div>
        <div class="stat-label">Real-time processing</div>
      </CardContent>
    </Card>

    <Card class="stat-card">
      <CardHeader>
        <CardTitle>🎮 GPU Utilization</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="stat-number">{aiStats.gpuUtilization}%</div>
        <div class="stat-label">RTX 3060 Ti CUDA cores</div>
      </CardContent>
    </Card>

    <Card class="stat-card">
      <CardHeader>
        <CardTitle>⏱️ Response Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="stat-number">{aiStats.averageResponseTime}s</div>
        <div class="stat-label">Average inference speed</div>
      </CardContent>
    </Card>
  </div>

  <!-- AI Capabilities */
  <div class="capabilities-section">
    <h2>🚀 AI Capabilities</h2>
    <div class="capabilities-grid">
      {#each aiRoutes as route}
        <Card class="capability-card">
          <CardHeader>
            <CardTitle>{route.icon} {route.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p class="capability-description">{route.description}</p>
            <div class="capability-tags">
              {#each route.tags as tag}
                <span class="tag">{tag}</span>
              {/each}
            </div>
            <div class="capability-footer">
              <Button href={route.route} class="capability-button">
                Launch {route.label}
              </Button>
              {#if route.status === 'beta'}
                <span class="beta-badge">BETA</span>
              {/if}
            </div>
          </CardContent>
        </Card>
      {/each}
    </div>
  </div>

  <!-- Recent AI Activities -->
  <div class="activities-section">
    <h2>📈 Recent AI Activities</h2>
    <Card class="activities-card">
      <CardContent>
        <div class="activities-list">
          {#each recentActivities as activity}
            <div class="activity-item">
              <div class="activity-icon">
                {#if activity.type === 'analysis'}🔍
                {:else if activity.type === 'embedding'}🌐
                {:else if activity.type === 'chat'}💬
                {:else if activity.type === 'cuda'}⚡
                {/if}
              </div>
              <div class="activity-details">
                <div class="activity-title">
                  {activity.type.toUpperCase()}: {activity.document || activity.query || activity.operation}
                </div>
                <div class="activity-confidence">Confidence: {activity.confidence}%</div>
              </div>
              <div class="activity-status">
                <span class="status-complete">✓</span>
              </div>
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>
  </div>

  <!-- AI System Health -->
  <div class="health-section">
    <h2>🏥 AI System Health</h2>
    <Card class="health-card">
      <CardContent>
        <div class="health-indicators">
          <div class="health-item">
            <span class="status-dot green"></span>
            <span>TensorRT-LLM: Online</span>
          </div>
          <div class="health-item">
            <span class="status-dot green"></span>
            <span>Ollama Server: Running</span>
          </div>
          <div class="health-item">
            <span class="status-dot green"></span>
            <span>CUDA Kernels: Active</span>
          </div>
          <div class="health-item">
            <span class="status-dot amber"></span>
            <span>Memory Usage: 6.2GB/8GB</span>
          </div>
          <div class="health-item">
            <span class="status-dot green"></span>
            <span>Vector Database: Connected</span>
          </div>
          <div class="health-item">
            <span class="status-dot green"></span>
            <span>WebGPU Acceleration: Ready</span>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</div>

<style>
  .ai-dashboard {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .dashboard-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .dashboard-header h1 {
    font-size: 2.5rem;
    color: var(--text-primary, #00ccff);
    margin-bottom: 0.5rem;
    text-shadow: 0 0 15px currentColor;
  }

  .dashboard-header p {
    color: var(--text-secondary, #888888);
    font-size: 1.1rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  .stat-card {
    background: var(--surface-secondary, #111111);
    border: 1px solid var(--border-primary, #00ccff);
    position: relative;
    overflow: hidden;
  }

  .stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #00ccff, transparent);
    animation: scan 2s infinite;
  }

  @keyframes scan {
    0%, 100% { opacity: 0; }
    50% { opacity: 1; }
  }

  .stat-number {
    font-size: 2.5rem;
    font-weight: bold;
    color: var(--text-primary, #00ccff);
    text-align: center;
    font-family: 'JetBrains Mono', monospace;
  }

  .stat-label {
    text-align: center;
    color: var(--text-secondary, #888888);
    font-size: 0.9rem;
    margin-top: 0.5rem;
  }

  .capabilities-section {
    margin-bottom: 3rem;
  }

  .capabilities-section h2 {
    color: var(--text-primary, #00ccff);
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
  }

  .capabilities-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .capability-card {
    background: var(--surface-secondary, #111111);
    border: 1px solid var(--border-primary, #00ccff);
    transition: all 0.3s ease;
  }

  .capability-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 204, 255, 0.2);
    border-color: #00ffff;
  }

  .capability-description {
    color: var(--text-secondary, #888888);
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .capability-tags {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .tag {
    background: rgba(0, 204, 255, 0.2);
    color: var(--text-primary, #00ccff);
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
    font-size: 0.7rem;
    font-weight: bold;
  }

  .capability-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .capability-button {
    background: var(--surface-primary, #00ccff);
    color: var(--surface-secondary, #000000);
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-weight: bold;
    transition: all 0.2s;
  }

  .capability-button:hover {
    background: var(--text-primary, #00ccff);
    transform: scale(1.05);
    box-shadow: 0 0 10px rgba(0, 204, 255, 0.5);
  }

  .beta-badge {
    background: var(--warning, #ff6600);
    color: var(--surface-secondary, #000000);
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
    font-size: 0.7rem;
    font-weight: bold;
  }

  .activities-section {
    margin-bottom: 3rem;
  }

  .activities-section h2 {
    color: var(--text-primary, #00ccff);
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }

  .activities-card {
    background: var(--surface-secondary, #111111);
    border: 1px solid var(--border-primary, #00ccff);
  }

  .activities-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .activity-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem;
    background: rgba(0, 204, 255, 0.05);
    border-radius: 4px;
  }

  .activity-icon {
    font-size: 1.5rem;
  }

  .activity-details {
    flex: 1;
  }

  .activity-title {
    color: var(--text-primary, #00ccff);
    font-weight: bold;
    font-size: 0.9rem;
  }

  .activity-confidence {
    color: var(--text-secondary, #888888);
    font-size: 0.8rem;
  }

  .status-complete {
    color: #00ff00;
    font-size: 1.2rem;
  }

  .health-section {
    margin-bottom: 2rem;
  }

  .health-section h2 {
    color: var(--text-primary, #00ccff);
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }

  .health-card {
    background: var(--surface-secondary, #111111);
    border: 1px solid var(--border-primary, #00ccff);
  }

  .health-indicators {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .health-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary, #888888);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .status-dot.green {
    background: #00ff00;
    box-shadow: 0 0 6px #00ff00;
  }

  .status-dot.amber {
    background: #ff6600;
    box-shadow: 0 0 6px #ff6600;
  }

  @media (max-width: 768px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }

    .capabilities-grid {
      grid-template-columns: 1fr;
    }

    .dashboard-header h1 {
      font-size: 2rem;
    }
  }
</style>