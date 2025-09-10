<script lang="ts">
  import RoutesList from '../RoutesList.svelte';
  import type { RoutePageData } from './+page.server';
  import { CheckCircle, AlertTriangle, Clock, Target, Zap, Database, Brain, Shield } from 'lucide-svelte';
  
  export let data: RoutePageData;

  const inv = data.routeInventory;
  
  // Phase 1-15 Implementation Status
  let phaseData = [
    {
      phase: 1,
      title: "Core SvelteKit Foundation",
      description: "Basic routing, layout, error handling",
      status: "complete",
      routes: ["/", "/+layout.svelte", "/+error.svelte"],
      completedFeatures: ["SvelteKit setup", "Routing", "Error boundaries"],
      progress: 100
    },
    {
      phase: 2,
      title: "Authentication System", 
      description: "User login, registration, session management",
      status: "complete",
      routes: ["/auth/login", "/auth/register", "/auth/logout"],
      completedFeatures: ["Login system", "Registration", "Session handling"],
      progress: 100
    },
    {
      phase: 3,
      title: "Legal Document Management",
      description: "Document upload, storage, basic metadata",
      status: "complete",
      routes: ["/legal/documents", "/cases", "/cases/create"],
      completedFeatures: ["Document upload", "Case management", "File storage"],
      progress: 100
    },
    {
      phase: 4,
      title: "AI Integration - Basic",
      description: "OpenAI/Ollama integration, basic chat",
      status: "complete",
      routes: ["/ai", "/ai-assistant", "/chat"],
      completedFeatures: ["OpenAI integration", "Ollama local models", "Chat interface"],
      progress: 100
    },
    {
      phase: 5,
      title: "Vector Search & RAG",
      description: "pgvector, embedding search, RAG implementation",
      status: "complete",
      routes: ["/demo/legal-search", "/dashboard/search", "/api/ai/vector-search"],
      completedFeatures: ["pgvector integration", "Semantic search", "RAG pipeline"],
      progress: 100
    },
    {
      phase: 6,
      title: "Advanced AI Processing",
      description: "Document analysis, entity extraction, risk assessment",
      status: "complete",
      routes: ["/ai/processing", "/demo/hybrid-legal-analysis"],
      completedFeatures: ["Document analysis", "Entity extraction", "Risk assessment"],
      progress: 100
    },
    {
      phase: 7,
      title: "GPU Acceleration",
      description: "WebGPU integration, CUDA support, performance optimization",
      status: "complete",
      routes: ["/demo/gpu-legal-ai", "/cuda-streaming"],
      completedFeatures: ["WebGPU integration", "GPU benchmarking", "NES-GPU bridge"],
      progress: 100
    },
    {
      phase: 8,
      title: "Real-time Features",
      description: "WebSocket connections, live updates, streaming",
      status: "complete",
      routes: ["/system-status", "/cache/redis-admin"],
      completedFeatures: ["WebSocket support", "Real-time updates", "Redis integration"],
      progress: 100
    },
    {
      phase: 9,
      title: "Admin Dashboard",
      description: "System administration, user management, monitoring",
      status: "complete",
      routes: ["/admin", "/admin/users", "/admin/cluster"],
      completedFeatures: ["Admin interface", "User management", "System monitoring"],
      progress: 100
    },
    {
      phase: 10,
      title: "Advanced UI Components",
      description: "Headless UI, gaming-inspired components, accessibility",
      status: "complete",
      routes: ["/test/n64-legal-progress", "/demo/component-gallery"],
      completedFeatures: ["Headless UI library", "N64-inspired components", "Accessibility features"],
      progress: 100
    },
    {
      phase: 11,
      title: "Data Visualization",
      description: "Charts, graphs, legal document visualization",
      status: "complete",
      routes: ["/demo/webgpu-graph", "/demo/glyph-generator"],
      completedFeatures: ["WebGPU visualization", "Glyph generation", "Interactive graphs"],
      progress: 100
    },
    {
      phase: 12,
      title: "Caching & Performance",
      description: "Redis caching, query optimization, CDN integration",
      status: "complete",
      routes: ["/cache-demo", "/api/cache/metrics"],
      completedFeatures: ["Redis caching", "Query optimization", "Performance monitoring"],
      progress: 100
    },
    {
      phase: 13,
      title: "Testing & Quality Assurance",
      description: "Unit tests, integration tests, performance testing",
      status: "in-progress",
      routes: ["/auth/test", "/test-integration", "/validation"],
      completedFeatures: ["Test infrastructure", "Integration testing", "Validation system"],
      progress: 85
    },
    {
      phase: 14,
      title: "Production Deployment",
      description: "Docker, CI/CD, monitoring, logging",
      status: "in-progress",
      routes: ["/admin/cluster", "/system-status"],
      completedFeatures: ["Docker setup", "Health monitoring"],
      progress: 70
    },
    {
      phase: 15,
      title: "Advanced Features & Polish",
      description: "Recommendations system, advanced analytics, mobile optimization",
      status: "planned",
      routes: ["/demo/recommendation-system"],
      completedFeatures: ["Recommendation framework"],
      progress: 40,
      note: "Neo4j integration deferred as requested"
    }
  ];
  
  let selectedPhase = $state(null);
  let showOnlyIncomplete = $state(false);
  
  // Filter phases based on toggle
  let filteredPhases = $derived(() => {
    if (!showOnlyIncomplete) return phaseData;
    return phaseData.filter(phase => phase.status !== 'complete');
  });
  
  function getStatusColor(status) {
    switch (status) {
      case 'complete': return 'text-green-600 bg-green-100';
      case 'in-progress': return 'text-yellow-600 bg-yellow-100';
      case 'planned': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }
  
  function getStatusIcon(status) {
    switch (status) {
      case 'complete': return CheckCircle;
      case 'in-progress': return Clock;
      case 'planned': return Target;
      default: return AlertTriangle;
    }
  }
  
  function getProgressColor(progress) {
    if (progress >= 90) return 'bg-green-500';
    if (progress >= 70) return 'bg-yellow-500';
    if (progress >= 50) return 'bg-blue-500';
    return 'bg-gray-500';
  }
  
  // Overall completion statistics
  let overallStats = $derived(() => {
    const totalPhases = phaseData.length;
    const completedPhases = phaseData.filter(p => p.status === 'complete').length;
    const inProgressPhases = phaseData.filter(p => p.status === 'in-progress').length;
    const avgProgress = phaseData.reduce((sum, p) => sum + p.progress, 0) / totalPhases;
    
    return {
      totalPhases,
      completedPhases,
      inProgressPhases,
      avgProgress: Math.round(avgProgress),
      completionRate: Math.round((completedPhases / totalPhases) * 100)
    };
  });
</script>

<svelte:head>
  <title>All Routes - Legal AI Platform</title>
  <meta name="description" content="Browse all available routes and pages in the Legal AI Platform" />
</svelte:head>

<div class="page-container">
  <header class="page-header">
    <h1>Legal AI Platform - Phase Implementation Status</h1>
    <p>Comprehensive tracking of Phase 1-15 implementation progress and route inventory</p>
    
    <!-- Overall Progress Summary -->
    <div class="progress-summary">
      <div class="summary-stats">
        <div class="stat">
          <div class="stat-value">{overallStats.completedPhases}/{overallStats.totalPhases}</div>
          <div class="stat-label">Phases Complete</div>
        </div>
        <div class="stat">
          <div class="stat-value">{overallStats.avgProgress}%</div>
          <div class="stat-label">Overall Progress</div>
        </div>
        <div class="stat">
          <div class="stat-value">{overallStats.inProgressPhases}</div>
          <div class="stat-label">In Progress</div>
        </div>
        <div class="stat">
          <div class="stat-value">{inv?.counts?.fileBased || 0}</div>
          <div class="stat-label">Routes Built</div>
        </div>
      </div>
      
      <!-- Overall Progress Bar -->
      <div class="overall-progress">
        <div class="progress-bar-container">
          <div class="progress-bar {getProgressColor(overallStats.avgProgress)}" style="width: {overallStats.avgProgress}%"></div>
        </div>
        <div class="progress-text">{overallStats.avgProgress}% Complete - {overallStats.completedPhases} of {overallStats.totalPhases} phases finished</div>
      </div>
    </div>
  </header>
  
  <!-- Phase Implementation Tracker -->
  <section class="phase-tracker">
    <div class="tracker-header">
      <h2>Phase Implementation Status</h2>
      <div class="tracker-controls">
        <label class="toggle">
          <input type="checkbox" bind:checked={showOnlyIncomplete} />
          Show only incomplete phases
        </label>
      </div>
    </div>
    
    <div class="phases-grid">
      {#each filteredPhases as phase}
        <div class="phase-card {phase.status}" class:selected={selectedPhase === phase.phase}>
          <div class="phase-header" role="button" tabindex="0" on:click={() => selectedPhase = selectedPhase === phase.phase ? null : phase.phase}>
            <div class="phase-number">
              <span class="phase-label">Phase {phase.phase}</span>
              {@const StatusIcon = getStatusIcon(phase.status)}
              <StatusIcon class="status-icon w-5 h-5" />
            </div>
            <div class="phase-title">{phase.title}</div>
            <div class="phase-progress">
              <div class="progress-bar-small">
                <div class="progress-fill {getProgressColor(phase.progress)}" style="width: {phase.progress}%"></div>
              </div>
              <span class="progress-percentage">{phase.progress}%</span>
            </div>
          </div>
          
          <div class="phase-description">{phase.description}</div>
          
          <div class="phase-status">
            <span class="status-badge {getStatusColor(phase.status)}">
              {phase.status === 'complete' ? 'Complete' : phase.status === 'in-progress' ? 'In Progress' : 'Planned'}
            </span>
            {#if phase.note}
              <span class="phase-note">{phase.note}</span>
            {/if}
          </div>
          
          {#if selectedPhase === phase.phase}
            <div class="phase-details">
              <div class="features-section">
                <h4>Completed Features:</h4>
                <ul class="features-list">
                  {#each phase.completedFeatures as feature}
                    <li class="feature-item">
                      <CheckCircle class="feature-icon w-4 h-4 text-green-600" />
                      {feature}
                    </li>
                  {/each}
                </ul>
              </div>
              
              <div class="routes-section">
                <h4>Key Routes:</h4>
                <ul class="routes-list">
                  {#each phase.routes as route}
                    <li class="route-item">
                      <a href={route} class="route-link">{route}</a>
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </section>

  <!-- Route Discovery System -->
  <section class="route-discovery">
    <h2>Route Discovery & Inventory</h2>
    <RoutesList />
  </section>

  {#if inv}
    <section class="inventory-summary">
      <h2>Route Inventory Snapshot</h2>
      <p class="generated">Generated: {new Date(inv.generated).toLocaleString()}</p>
      <div class="counts-grid">
        <div><strong>Config</strong><span>{inv.counts.config}</span></div>
        <div><strong>File-based</strong><span>{inv.counts.fileBased}</span></div>
        <div><strong>API</strong><span>{inv.counts.api}</span></div>
        <div class="warn"><strong>Config Missing File</strong><span>{inv.counts.configMissingFiles}</span></div>
        <div class="warn"><strong>File Missing Config</strong><span>{inv.counts.filesMissingConfig}</span></div>
      </div>
      {#if inv.configMissingFiles.length || inv.filesMissingConfig.length}
        <details class="diff-block" open>
          <summary>Differences</summary>
          {#if inv.configMissingFiles.length}
            <h3>Config routes without page file ({inv.configMissingFiles.length})</h3>
            <ul>
              {#each inv.configMissingFiles as r}<li>{r}</li>{/each}
            </ul>
          {/if}
          {#if inv.filesMissingConfig.length}
            <h3>File-based routes not in config ({inv.filesMissingConfig.length})</h3>
            <ul>
              {#each inv.filesMissingConfig.slice(0,50) as r}<li>{r}</li>{/each}
            </ul>
            {#if inv.filesMissingConfig.length > 50}
              <p class="truncate-note">Showing first 50 of {inv.filesMissingConfig.length}.</p>
            {/if}
          {/if}
        </details>
      {/if}
      <details class="sample" open>
        <summary>Sample File-based Routes (first {inv.fileRoutesSample.length})</summary>
        <ul>
          {#each inv.fileRoutesSample as fr}
            <li>{fr.route}{fr.title ? ` — ${fr.title}` : ''}</li>
          {/each}
        </ul>
      </details>
    </section>
  {/if}
</div>

<style>
  .page-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .page-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .page-header h1 {
    font-size: 2.5rem;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .page-header p {
    font-size: 1.125rem;
    color: #6b7280;
  }
  
  /* Progress Summary Styles */
  .progress-summary {
    margin-top: 2rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 1rem;
    color: white;
  }
  
  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .stat {
    text-align: center;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 0.5rem;
    backdrop-filter: blur(10px);
  }
  
  .stat-value {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 0.25rem;
  }
  
  .stat-label {
    font-size: 0.875rem;
    opacity: 0.9;
  }
  
  .overall-progress {
    margin-top: 1rem;
  }
  
  .progress-bar-container {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }
  
  .progress-bar {
    height: 100%;
    transition: width 0.3s ease;
    border-radius: 4px;
  }
  
  .progress-text {
    font-size: 0.875rem;
    text-align: center;
    opacity: 0.9;
  }
  
  /* Phase Tracker Styles */
  .phase-tracker {
    margin: 3rem 0;
  }
  
  .tracker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .tracker-header h2 {
    font-size: 1.75rem;
    color: #1f2937;
    margin: 0;
  }
  
  .toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #6b7280;
  }
  
  .phases-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  }
  
  .phase-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 1rem;
    padding: 1.5rem;
    transition: all 0.2s ease;
    cursor: pointer;
  }
  
  .phase-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: #3b82f6;
  }
  
  .phase-card.selected {
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  }
  
  .phase-card.complete {
    border-left: 4px solid #10b981;
  }
  
  .phase-card.in-progress {
    border-left: 4px solid #f59e0b;
  }
  
  .phase-card.planned {
    border-left: 4px solid #6b7280;
  }
  
  .phase-header {
    margin-bottom: 1rem;
  }
  
  .phase-number {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .phase-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .status-icon {
    opacity: 0.7;
  }
  
  .phase-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.75rem;
  }
  
  .phase-progress {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .progress-bar-small {
    flex: 1;
    height: 6px;
    background: #e5e7eb;
    border-radius: 3px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    transition: width 0.3s ease;
  }
  
  .progress-percentage {
    font-size: 0.875rem;
    font-weight: 600;
    color: #6b7280;
    min-width: 3rem;
    text-align: right;
  }
  
  .phase-description {
    color: #6b7280;
    font-size: 0.875rem;
    margin-bottom: 1rem;
    line-height: 1.5;
  }
  
  .phase-status {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  .phase-note {
    font-size: 0.75rem;
    font-style: italic;
    color: #6b7280;
  }
  
  .phase-details {
    border-top: 1px solid #e5e7eb;
    padding-top: 1rem;
    margin-top: 1rem;
    display: grid;
    gap: 1.5rem;
  }
  
  .features-section h4,
  .routes-section h4 {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .features-list,
  .routes-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.5rem;
  }
  
  .feature-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #4b5563;
  }
  
  .feature-icon {
    flex-shrink: 0;
  }
  
  .route-item {
    font-size: 0.875rem;
  }
  
  .route-link {
    color: #3b82f6;
    text-decoration: none;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    padding: 0.25rem 0.5rem;
    background: #f3f4f6;
    border-radius: 0.375rem;
    transition: all 0.2s ease;
  }
  
  .route-link:hover {
    background: #e5e7eb;
    color: #1d4ed8;
  }
  
  .route-discovery {
    margin: 3rem 0;
  }
  
  .route-discovery h2 {
    font-size: 1.75rem;
    color: #1f2937;
    margin-bottom: 1.5rem;
  }

  .inventory-summary { margin-top: 3rem; border-top: 1px solid #e5e7eb; padding-top: 2rem; }
  .inventory-summary h2 { font-size: 1.75rem; margin-bottom: 0.75rem; }
  .counts-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(160px,1fr)); gap: 0.75rem; margin: 1rem 0 1.5rem; }
  .counts-grid div { background:#f3f4f6; padding:0.75rem 0.9rem; border-radius:8px; display:flex; flex-direction:column; gap:0.25rem; }
  .counts-grid div span { font-size:1.25rem; font-weight:600; color:#111827; }
  .counts-grid div.warn { background:#fff7ed; border:1px solid #fdba74; }
  details.diff-block, details.sample { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:0.75rem 1rem; margin-bottom:1rem; }
  details.diff-block summary, details.sample summary { cursor:pointer; font-weight:600; }
  details ul { list-style:disc; padding-left:1.25rem; margin:0.5rem 0 1rem; max-height:260px; overflow:auto; }
  .truncate-note { font-size:0.85rem; color:#6b7280; }
  .generated { font-size:0.8rem; color:#6b7280; }
</style>
