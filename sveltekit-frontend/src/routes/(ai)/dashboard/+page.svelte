<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/core';
  import { Badge } from '$lib/components/ui/badge';

  // AI Dashboard Statistics
  let aiStats = $state({
    activeChats: 3,
    ragQueries: 47,
    documentsAnalyzed: 234,
    citationsFound: 89,
    casesProcessed: 12,
    assistantSessions: 8
  });

  // Available AI Services
  const aiServices = [
    {
      name: 'AI Chat',
      icon: '💬',
      href: '/ai/chat',
      description: 'Interactive AI chat with legal document context',
      status: 'active',
      stats: `${aiStats.activeChats} active chats`
    },
    {
      name: 'AI Assistant',
      icon: '🤖',
      href: '/ai/assistant',
      description: 'Legal AI assistant for document analysis',
      status: 'active',
      stats: `${aiStats.assistantSessions} sessions`
    },
    {
      name: 'RAG Query System',
      icon: '🧠',
      href: '/ai/rag',
      description: 'Retrieval-Augmented Generation for legal research',
      status: 'active',
      stats: `${aiStats.ragQueries} queries processed`
    },
    {
      name: 'GPU Chat',
      icon: '⚡',
      href: '/ai/gpu-chat',
      description: 'High-performance GPU-accelerated chat',
      status: 'active',
      stats: 'RTX 3060 Ti enabled'
    },
    {
      name: 'Vector Search',
      icon: '🔍',
      href: '/ai/vector-search',
      description: 'Semantic search across legal documents',
      status: 'active',
      stats: 'pgvector enabled'
    },
    {
      name: 'Document Analysis',
      icon: '📄',
      href: '/ai/processing',
      description: 'AI-powered document processing and analysis',
      status: 'active',
      stats: `${aiStats.documentsAnalyzed} documents`
    },
    {
      name: 'Case Scoring',
      icon: '⚖️',
      href: '/ai/case-scoring',
      description: 'AI-driven case strength assessment',
      status: 'active',
      stats: `${aiStats.casesProcessed} cases scored`
    },
    {
      name: 'Pattern Detection',
      icon: '🔬',
      href: '/ai/pattern-detection',
      description: 'Legal pattern and anomaly detection',
      status: 'active',
      stats: 'ML models active'
    }
  ];

  // Recent AI Activities
  let recentActivities = $state([
    {
      type: 'chat',
      title: 'Contract Review Session',
      time: '2 minutes ago',
      user: 'Legal Analyst',
      status: 'completed'
    },
    {
      type: 'rag',
      title: 'Precedent Research Query',
      time: '5 minutes ago',
      user: 'Senior Associate',
      status: 'completed'
    },
    {
      type: 'analysis',
      title: 'Document Classification',
      time: '8 minutes ago',
      user: 'Paralegal',
      status: 'processing'
    },
    {
      type: 'assistant',
      title: 'Case Strategy Discussion',
      time: '12 minutes ago',
      user: 'Partner',
      status: 'completed'
    }
  ]);

  // System Health
  let systemHealth = $state({
    aiModels: 'online',
    vectorDB: 'online',
    gpuAcceleration: 'active',
    ragPipeline: 'healthy'
  });
</script>

<svelte:head>
  <title>AI Dashboard - YoRHa Legal AI Platform</title>
</svelte:head>

<div class="ai-dashboard">
  <div class="dashboard-header">
    <h1>🤖 AI Dashboard</h1>
    <p class="subtitle">Comprehensive AI-powered legal intelligence platform</p>
  </div>

  <!-- System Status -->
  <div class="status-section">
    <Card class="status-card">
      <CardHeader>
        <CardTitle>System Health</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="status-grid">
          <div class="status-item">
            <span>AI Models</span>
            <Badge class={systemHealth.aiModels === 'online' ? 'status-online' : 'status-offline'}>
              {systemHealth.aiModels}
            </Badge>
          </div>
          <div class="status-item">
            <span>Vector DB</span>
            <Badge class={systemHealth.vectorDB === 'online' ? 'status-online' : 'status-offline'}>
              {systemHealth.vectorDB}
            </Badge>
          </div>
          <div class="status-item">
            <span>GPU Acceleration</span>
            <Badge class={systemHealth.gpuAcceleration === 'active' ? 'status-active' : 'status-inactive'}>
              {systemHealth.gpuAcceleration}
            </Badge>
          </div>
          <div class="status-item">
            <span>RAG Pipeline</span>
            <Badge class={systemHealth.ragPipeline === 'healthy' ? 'status-healthy' : 'status-degraded'}>
              {systemHealth.ragPipeline}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  <!-- AI Statistics -->
  <div class="stats-section">
    <div class="stats-grid">
      <Card class="stat-card">
        <CardContent>
          <div class="stat-value">{aiStats.activeChats}</div>
          <div class="stat-label">Active Chats</div>
        </CardContent>
      </Card>

      <Card class="stat-card">
        <CardContent>
          <div class="stat-value">{aiStats.ragQueries}</div>
          <div class="stat-label">RAG Queries</div>
        </CardContent>
      </Card>

      <Card class="stat-card">
        <CardContent>
          <div class="stat-value">{aiStats.documentsAnalyzed}</div>
          <div class="stat-label">Documents Analyzed</div>
        </CardContent>
      </Card>

      <Card class="stat-card">
        <CardContent>
          <div class="stat-value">{aiStats.citationsFound}</div>
          <div class="stat-label">Citations Found</div>
        </CardContent>
      </Card>
    </div>
  </div>

  <!-- AI Services Grid -->
  <div class="services-section">
    <h2>🚀 AI Services</h2>
    <div class="services-grid">
      {#each aiServices as service}
        <Card class="service-card">
          <CardHeader>
            <CardTitle class="service-title">
              <span class="service-icon">{service.icon}</span>
              {service.name}
              <Badge class="service-status status-{service.status}">{service.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p class="service-description">{service.description}</p>
            <div class="service-stats">{service.stats}</div>
            <Button
              href={service.href}
              class="service-button"
              data-umami-event="ai-service-access"
              data-umami-event-service={service.name}
            >
              Launch Service
            </Button>
          </CardContent>
        </Card>
      {/each}
    </div>
  </div>

  <!-- Recent Activities -->
  <div class="activities-section">
    <h2>📊 Recent AI Activities</h2>
    <div class="activities-list">
      {#each recentActivities as activity}
        <Card class="activity-card">
          <CardContent>
            <div class="activity-header">
              <div class="activity-info">
                <div class="activity-type">
                  {#if activity.type === 'chat'}
                    💬 AI Chat
                  {:else if activity.type === 'rag'}
                    🧠 RAG Query
                  {:else if activity.type === 'analysis'}
                    📄 Document Analysis
                  {:else if activity.type === 'assistant'}
                    🤖 AI Assistant
                  {/if}
                </div>
                <div class="activity-title">{activity.title}</div>
                <div class="activity-meta">
                  <span class="activity-user">{activity.user}</span>
                  <span class="activity-time">{activity.time}</span>
                </div>
              </div>
              <Badge class="activity-status status-{activity.status}">
                {activity.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      {/each}
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="quick-actions">
    <h2>⚡ Quick Actions</h2>
    <div class="actions-grid">
      <Button href="/ai/chat" class="action-button">
        💬 Start New Chat
      </Button>
      <Button href="/ai/rag" class="action-button">
        🧠 RAG Query
      </Button>
      <Button href="/ai/processing" class="action-button">
        📄 Analyze Document
      </Button>
      <Button href="/cases" class="action-button">
        ⚖️ Review Cases
      </Button>
    </div>
  </div>
</div>

<style>
  .ai-dashboard {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    background: linear-gradient(135deg, rgba(0, 212, 170, 0.05), rgba(255, 255, 255, 0.02));
    min-height: 100vh;
  }

  .dashboard-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .dashboard-header h1 {
    font-size: 3rem;
    font-weight: bold;
    color: #00d4aa;
    margin-bottom: 1rem;
    text-shadow: 0 0 20px rgba(0, 212, 170, 0.3);
  }

  .subtitle {
    font-size: 1.3rem;
    color: #a1a1aa;
    margin-bottom: 2rem;
  }

  .status-section {
    margin-bottom: 3rem;
  }

  .status-card {
    background: rgba(0, 212, 170, 0.1);
    border: 1px solid rgba(0, 212, 170, 0.3);
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 0.5rem;
  }

  .stats-section {
    margin-bottom: 3rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
  }

  .stat-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    text-align: center;
  }

  .stat-value {
    font-size: 2.5rem;
    font-weight: bold;
    color: #00d4aa;
    margin-bottom: 0.5rem;
  }

  .stat-label {
    color: #a1a1aa;
    font-size: 0.9rem;
  }

  .services-section {
    margin-bottom: 3rem;
  }

  .services-section h2 {
    font-size: 2rem;
    color: #00d4aa;
    margin-bottom: 2rem;
  }

  .services-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .service-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
  }

  .service-card:hover {
    background: rgba(0, 212, 170, 0.1);
    border-color: rgba(0, 212, 170, 0.3);
    transform: translateY(-5px);
  }

  .service-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.2rem;
  }

  .service-icon {
    font-size: 1.5rem;
  }

  .service-status {
    margin-left: auto;
  }

  .service-description {
    color: #a1a1aa;
    margin-bottom: 1rem;
    line-height: 1.5;
  }

  .service-stats {
    color: #00d4aa;
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .service-button {
    width: 100%;
    background: #00d4aa;
    color: #000;
    border: none;
    padding: 0.75rem;
    border-radius: 0.5rem;
    font-weight: 600;
    transition: all 0.3s ease;
  }

  .service-button:hover {
    background: #00b89a;
    transform: translateY(-2px);
  }

  .activities-section {
    margin-bottom: 3rem;
  }

  .activities-section h2 {
    font-size: 2rem;
    color: #00d4aa;
    margin-bottom: 2rem;
  }

  .activities-list {
    display: grid;
    gap: 1rem;
  }

  .activity-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .activity-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .activity-type {
    font-weight: 600;
    color: #00d4aa;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .activity-title {
    font-size: 1.1rem;
    color: #fff;
    margin-bottom: 0.5rem;
  }

  .activity-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.85rem;
    color: #a1a1aa;
  }

  .quick-actions {
    margin-top: 3rem;
  }

  .quick-actions h2 {
    font-size: 2rem;
    color: #00d4aa;
    margin-bottom: 2rem;
  }

  .actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .action-button {
    background: rgba(0, 212, 170, 0.2);
    border: 1px solid rgba(0, 212, 170, 0.4);
    color: #00d4aa;
    padding: 1rem;
    border-radius: 0.5rem;
    font-weight: 600;
    transition: all 0.3s ease;
  }

  .action-button:hover {
    background: rgba(0, 212, 170, 0.3);
    transform: translateY(-2px);
  }

  /* Status Badge Styles */
  :global(.status-online) {
    background: #22c55e;
    color: white;
  }

  :global(.status-offline) {
    background: #ef4444;
    color: white;
  }

  :global(.status-active) {
    background: #3b82f6;
    color: white;
  }

  :global(.status-inactive) {
    background: #6b7280;
    color: white;
  }

  :global(.status-healthy) {
    background: #10b981;
    color: white;
  }

  :global(.status-degraded) {
    background: #f59e0b;
    color: white;
  }

  :global(.status-completed) {
    background: #22c55e;
    color: white;
  }

  :global(.status-processing) {
    background: #3b82f6;
    color: white;
  }

  @media (max-width: 768px) {
    .dashboard-header h1 {
      font-size: 2rem;
    }

    .services-grid {
      grid-template-columns: 1fr;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .actions-grid {
      grid-template-columns: 1fr;
    }

    .activity-header {
      flex-direction: column;
      gap: 1rem;
    }

    .activity-meta {
      flex-direction: column;
      gap: 0.25rem;
    }
  }
</style>