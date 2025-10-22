<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/core';

  const aiStats = $state({
    activeChats: 3,
    ragQueries: 47,
    documentsAnalyzed: 234,
    citationsFound: 89,
    casesProcessed: 12,
    assistantSessions: 8
  });

  const aiServices = [
    {
      name: 'AI Chat',
      icon: '💬',
      href: '/ai/chat',
      description: 'Interactive AI chat with legal document context.',
      status: 'active',
      stats: () => `${aiStats.activeChats} active chats`
    },
    {
      name: 'AI Assistant',
      icon: '🤖',
      href: '/ai/assistant',
      description: 'Legal AI assistant for document analysis.',
      status: 'active',
      stats: () => `${aiStats.assistantSessions} sessions`
    },
    {
      name: 'RAG Query System',
      icon: '📚',
      href: '/ai/rag',
      description: 'Retrieval-Augmented Generation for legal research.',
      status: 'active',
      stats: () => `${aiStats.ragQueries} queries processed`
    },
    {
      name: 'GPU Chat',
      icon: '⚡',
      href: '/ai/gpu-chat',
      description: 'High-performance GPU-accelerated chat.',
      status: 'active',
      stats: () => 'RTX acceleration enabled'
    },
    {
      name: 'Vector Search',
      icon: '🔍',
      href: '/ai/vector-search',
      description: 'Semantic search across legal documents.',
      status: 'active',
      stats: () => `${aiStats.citationsFound} citations tracked`
    },
    {
      name: 'Document Analysis',
      icon: '📝',
      href: '/ai/processing',
      description: 'AI-powered document processing and analysis.',
      status: 'active',
      stats: () => `${aiStats.documentsAnalyzed} documents`
    },
    {
      name: 'Case Scoring',
      icon: '⚖️',
      href: '/ai/case-scoring',
      description: 'AI-driven case strength assessment.',
      status: 'active',
      stats: () => `${aiStats.casesProcessed} cases scored`
    },
    {
      name: 'Pattern Detection',
      icon: '🧠',
      href: '/ai/pattern-detection',
      description: 'Legal pattern and anomaly detection.',
      status: 'active',
      stats: () => 'ML models active'
    }
  ];

  const recentActivities = $state([
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

  const systemHealth = $state({
    aiModels: 'online',
    vectorDB: 'online',
    gpuAcceleration: 'active',
    ragPipeline: 'healthy'
  });

  function badgeClass(condition: boolean, positive: string, negative: string) {
    return condition ? positive : negative;
  }

  function umamiAttrs(serviceName: string) {
    return {
      'data-umami-event': 'ai-service-access',
      'data-umami-event-service': serviceName
    } as const;
  }

  function activityIcon(type: string): string {
    switch (type) {
      case 'chat':
        return '💬';
      case 'rag':
        return '📚';
      case 'analysis':
        return '🧪';
      case 'assistant':
        return '🤖';
      default:
        return '⚙️';
    }
  }
</script>

<svelte:head>
  <title>AI Dashboard - YoRHa Legal AI Platform</title>
</svelte:head>

<div class="ai-dashboard">
  <div class="dashboard-header">
    <h1>🤖 AI Dashboard</h1>
    <p class="subtitle">Comprehensive AI-powered legal intelligence platform.</p>
  </div>

  <section class="status-section">
    <Card class="status-card">
      <CardHeader>
        <CardTitle>System Health</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="status-grid">
          <div class="status-item">
            <span>AI Models</span>
            <Badge class={badgeClass(systemHealth.aiModels === 'online', 'status-online', 'status-offline')}>
              {systemHealth.aiModels}
            </Badge>
          </div>
          <div class="status-item">
            <span>Vector DB</span>
            <Badge class={badgeClass(systemHealth.vectorDB === 'online', 'status-online', 'status-offline')}>
              {systemHealth.vectorDB}
            </Badge>
          </div>
          <div class="status-item">
            <span>GPU Acceleration</span>
            <Badge class={badgeClass(systemHealth.gpuAcceleration === 'active', 'status-active', 'status-inactive')}>
              {systemHealth.gpuAcceleration}
            </Badge>
          </div>
          <div class="status-item">
            <span>RAG Pipeline</span>
            <Badge class={badgeClass(systemHealth.ragPipeline === 'healthy', 'status-healthy', 'status-degraded')}>
              {systemHealth.ragPipeline}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  </section>

  <section class="stats-section">
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
  </section>

  <section class="services-section">
    <header class="section-header">
      <h2>Available Services</h2>
      <p>Launch tools and workflows across the AI platform.</p>
    </header>

    <div class="services-grid">
      {#each aiServices as service}
        <Card class="service-card">
          <CardHeader>
            <CardTitle>
              <span class="service-icon">{service.icon}</span>
              {service.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p class="service-description">{service.description}</p>
            <div class="service-meta">
              <Badge class="service-status">{service.status}</Badge>
              <span class="service-stats">{service.stats()}</span>
            </div>
            <Button href={service.href} variant="outline" {...umamiAttrs(service.name)}>
              Open {service.name}
            </Button>
          </CardContent>
        </Card>
      {/each}
    </div>
  </section>

  <section class="activity-section">
    <header class="section-header">
      <h2>Recent Activity</h2>
      <p>Latest interactions tracked across AI systems.</p>
    </header>
    <div class="activity-list">
      {#each recentActivities as activity}
        <div class="activity-item">
          <div class="activity-icon">{activityIcon(activity.type)}</div>
          <div class="activity-content">
            <h3>{activity.title}</h3>
            <p>{activity.user} • {activity.time}</p>
          </div>
          <Badge class="activity-status">{activity.status}</Badge>
        </div>
      {/each}
    </div>
  </section>
</div>

<style>
  .ai-dashboard {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 2rem;
    min-height: 100%;
  }

  .dashboard-header h1 {
    font-size: 2rem;
    margin: 0;
  }

  .subtitle {
    margin: 0.5rem 0 0;
    color: var(--text-muted);
  }

  .status-section {
    display: flex;
  }

  :global(.status-card) {
    width: 100%;
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
  }

  .status-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  :global(.status-online) {
    background: rgba(34, 197, 94, 0.1);
    color: rgb(34, 197, 94);
  }

  :global(.status-offline) {
    background: rgba(248, 113, 113, 0.1);
    color: rgb(248, 113, 113);
  }

  :global(.status-active) {
    background: rgba(14, 165, 233, 0.1);
    color: rgb(14, 165, 233);
  }

  :global(.status-inactive) {
    background: rgba(148, 163, 184, 0.1);
    color: rgb(100, 116, 139);
  }

  :global(.status-healthy) {
    background: rgba(132, 204, 22, 0.1);
    color: rgb(132, 204, 22);
  }

  :global(.status-degraded) {
    background: rgba(251, 191, 36, 0.1);
    color: rgb(251, 191, 36);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
  }

  :global(.stat-card) {
    text-align: center;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: bold;
  }

  .stat-label {
    margin-top: 0.5rem;
    color: var(--text-muted);
  }

  .section-header h2 {
    margin: 0;
    font-size: 1.5rem;
  }

  .section-header p {
    margin: 0.25rem 0 1rem;
    color: var(--text-muted);
  }

  .services-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem;
  }

  :global(.service-card) {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  :global(.service-card) :global(.card-content) {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1;
  }

  .service-icon {
    margin-right: 0.75rem;
  }

  .service-description {
    margin: 0;
    color: var(--text-muted);
  }

  .service-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
  }

  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .activity-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid var(--border-muted);
    border-radius: 0.75rem;
  }

  .activity-icon {
    font-size: 1.5rem;
  }

  .activity-content h3 {
    margin: 0;
    font-size: 1rem;
  }

  .activity-content p {
    margin: 0.25rem 0 0;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  :global(.activity-status) {
    margin-left: auto;
    text-transform: capitalize;
  }

  @media (max-width: 768px) {
    .ai-dashboard {
      padding: 1.5rem;
    }

    .services-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
