<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { ButtonBits, CardBits, InputBits, SelectBits, TabsBits } from '$lib/components/ui/bits-ui';

  interface RouteStatus {
    path: string;
    status: number;
    description: string;
    category: string;
    loadTime: number;
    error?: string;
  }

  let routes = $state<RouteStatus[]>([]);
  let isLoading = $state(false);
  let progress = $state(0);
  let filter = $state('all');
  let searchQuery = $state('');

  // Comprehensive route list organized by category
  const ALL_ROUTES = [
    // Core Pages
    { path: '/', description: 'Homepage', category: 'core' },
    { path: '/chat', description: 'AI Chat Interface', category: 'core' },
    { path: '/dashboard/cases', description: 'Cases Dashboard', category: 'core' },

    // Authentication
    { path: '/auth/login', description: 'User Login', category: 'auth' },
    { path: '/auth/register', description: 'User Registration', category: 'auth' },
    { path: '/auth/test', description: 'Auth Testing', category: 'auth' },

    // Admin Panel
    { path: '/admin', description: 'Admin Dashboard', category: 'admin' },
    { path: '/admin/cluster', description: 'Cluster Management', category: 'admin' },
    { path: '/admin/gpu-demo', description: 'GPU Demo', category: 'admin' },
    { path: '/admin/performance-dashboard', description: 'Performance Dashboard', category: 'admin' },
    { path: '/admin/users', description: 'User Management', category: 'admin' },

    // AI Features
    { path: '/ai/dashboard', description: 'AI Dashboard', category: 'ai' },
    { path: '/ai/case-scoring', description: 'Case Scoring AI', category: 'ai' },
    { path: '/ai/document-drafting', description: 'Document Drafting', category: 'ai' },
    { path: '/ai/orchestrator', description: 'AI Orchestrator', category: 'ai' },
    { path: '/ai/pattern-detection', description: 'Pattern Detection', category: 'ai' },
    { path: '/ai/processing', description: 'AI Processing', category: 'ai' },
    { path: '/ai/recommendations', description: 'AI Recommendations', category: 'ai' },
    { path: '/ai-assistant', description: 'AI Assistant', category: 'ai' },
    { path: '/ai-demo', description: 'AI Demo', category: 'ai' },
    { path: '/ai-summary', description: 'AI Summary', category: 'ai' },
    { path: '/ai-test', description: 'AI Testing', category: 'ai' },
    { path: '/ai-upload-demo', description: 'AI Upload Demo', category: 'ai' },

    // Legal Cases
    { path: '/cases/new', description: 'Create New Case', category: 'cases' },
    { path: '/citations', description: 'Legal Citations', category: 'cases' },

    // Demo Pages - GPU & Graphics
    { path: '/demo/webgpu-acceleration', description: 'WebGPU Acceleration', category: 'demo-gpu' },
    { path: '/demo/nes-gpu-quantization', description: 'NES GPU Quantization', category: 'demo-gpu' },
    { path: '/demo/gpu-assistant', description: 'GPU Assistant', category: 'demo-gpu' },
    { path: '/demo/gpu-cache-integration', description: 'GPU Cache Integration', category: 'demo-gpu' },
    { path: '/demo/gpu-chat', description: 'GPU Chat', category: 'demo-gpu' },
    { path: '/demo/gpu-inference', description: 'GPU Inference', category: 'demo-gpu' },
    { path: '/demo/gpu-legal-ai', description: 'GPU Legal AI', category: 'demo-gpu' },
    { path: '/demo/retro-gpu-metrics', description: 'Retro GPU Metrics', category: 'demo-gpu' },
    { path: '/demo/shader-cache', description: 'Shader Cache', category: 'demo-gpu' },

    // Demo Pages - Gaming/Graphics
    { path: '/demo/gaming-evolution/8bit', description: '8-bit Gaming Evolution', category: 'demo-gaming' },
    { path: '/demo/nes-bits-ui', description: 'NES Bits UI', category: 'demo-gaming' },
    { path: '/demo/nes-yorha-hybrid', description: 'NES YoRHa Hybrid', category: 'demo-gaming' },
    { path: '/demo/neural-sprite', description: 'Neural Sprite', category: 'demo-gaming' },
    { path: '/demo/neural-sprite-engine', description: 'Neural Sprite Engine', category: 'demo-gaming' },
    { path: '/demo/progressive-gaming-ui', description: 'Progressive Gaming UI', category: 'demo-gaming' },
    { path: '/demo/ps1-effects-advanced', description: 'PS1 Effects Advanced', category: 'demo-gaming' },

    // Demo Pages - AI Systems
    { path: '/demo/ai-dashboard', description: 'AI Dashboard Demo', category: 'demo-ai' },
    { path: '/demo/ai-pipeline', description: 'AI Pipeline', category: 'demo-ai' },
    { path: '/demo/ai-summary', description: 'AI Summary Demo', category: 'demo-ai' },
    { path: '/demo/ai-test', description: 'AI Test Demo', category: 'demo-ai' },
    { path: '/demo/document-ai', description: 'Document AI', category: 'demo-ai' },
    { path: '/demo/legal-ai-complete', description: 'Legal AI Complete', category: 'demo-ai' },
    { path: '/demo/ollama-integration', description: 'Ollama Integration', category: 'demo-ai' },
    { path: '/demo/productivity-ai-integration', description: 'Productivity AI Integration', category: 'demo-ai' },
    { path: '/demo/webasm-ai-complete', description: 'WebAssembly AI Complete', category: 'demo-ai' },

    // Demo Pages - UI Components
    { path: '/demo/component-gallery', description: 'Component Gallery', category: 'demo-ui' },
    { path: '/demo/bits-ui', description: 'Bits UI Demo', category: 'demo-ui' },
    { path: '/demo/headless-ui-showcase', description: 'Headless UI Showcase', category: 'demo-ui' },
    { path: '/demo/professional-editor', description: 'Professional Editor', category: 'demo-ui' },
    { path: '/demo/ui-components', description: 'UI Components', category: 'demo-ui' },
    { path: '/demo/unocss-svelte5', description: 'UnoCSS Svelte 5', category: 'demo-ui' },

    // Demo Pages - Search & Vector
    { path: '/demo/semantic-search', description: 'Semantic Search', category: 'demo-search' },
    { path: '/demo/legal-search', description: 'Legal Search', category: 'demo-search' },
    { path: '/demo/instant-search', description: 'Instant Search', category: 'demo-search' },
    { path: '/demo/real-time-search', description: 'Real-time Search', category: 'demo-search' },
    { path: '/demo/vector-intelligence', description: 'Vector Intelligence', category: 'demo-search' },
    { path: '/demo/vector-pipeline', description: 'Vector Pipeline', category: 'demo-search' },
    { path: '/demo/vector-search', description: 'Vector Search', category: 'demo-search' },
    { path: '/demo/unified-vector', description: 'Unified Vector', category: 'demo-search' },

    // Demo Pages - Integration
    { path: '/demo/full-stack-integration', description: 'Full Stack Integration', category: 'demo-integration' },
    { path: '/demo/integrated-system', description: 'Integrated System', category: 'demo-integration' },
    { path: '/demo/system-integration', description: 'System Integration', category: 'demo-integration' },
    { path: '/demo/unified-architecture', description: 'Unified Architecture', category: 'demo-integration' },
    { path: '/demo/unified-integration', description: 'Unified Integration', category: 'demo-integration' },
    { path: '/demo/hybrid-cache-architecture', description: 'Hybrid Cache Architecture', category: 'demo-integration' },

    // Demo Pages - Advanced Features
    { path: '/demo/chat-stream', description: 'Chat Streaming', category: 'demo-advanced' },
    { path: '/demo/drag-drop', description: 'Drag & Drop', category: 'demo-advanced' },
    { path: '/demo/embedding-chat', description: 'Embedding Chat', category: 'demo-advanced' },
    { path: '/demo/enhanced-legal-upload', description: 'Enhanced Legal Upload', category: 'demo-advanced' },
    { path: '/demo/cuda-minio-upload', description: 'CUDA MinIO Upload', category: 'demo-advanced' },
    { path: '/demo/cuda-rtx-integration', description: 'CUDA RTX Integration', category: 'demo-advanced' },
    { path: '/demo/streaming-workflow', description: 'Streaming Workflow', category: 'demo-advanced' },
    { path: '/demo/upload-analytics', description: 'Upload Analytics', category: 'demo-advanced' },
    { path: '/demo/wasm-parser', description: 'WebAssembly Parser', category: 'demo-advanced' },

    // Demo Pages - Cache & Performance
    { path: '/demo/glyph-cache', description: 'Glyph Cache', category: 'demo-cache' },
    { path: '/demo/simd-glyphs', description: 'SIMD Glyphs', category: 'demo-cache' },
    { path: '/demo/semantic-3d', description: 'Semantic 3D', category: 'demo-cache' },

    // Demo Pages - Misc
    { path: '/demo/langextract-ollama', description: 'Language Extract Ollama', category: 'demo-misc' },
    { path: '/demo/notes', description: 'Notes Demo', category: 'demo-misc' },
    { path: '/demo/phase5', description: 'Phase 5 Demo', category: 'demo-misc' },
    { path: '/demo/phase14', description: 'Phase 14 Demo', category: 'demo-misc' },
    { path: '/demo/recommendation-system', description: 'Recommendation System', category: 'demo-misc' },
    { path: '/demo/simple-test', description: 'Simple Test', category: 'demo-misc' },
    { path: '/demo/system-summary', description: 'System Summary', category: 'demo-misc' },

    // Other
    { path: '/authenticated-crud-test', description: 'Authenticated CRUD Test', category: 'other' },
    { path: '/bits-uno-demo', description: 'Bits UNO Demo', category: 'other' },
    { path: '/chat-demo', description: 'Chat Demo', category: 'other' },
    { path: '/complete-demo', description: 'Complete Demo', category: 'other' },
    { path: '/context7-demo', description: 'Context7 Demo', category: 'other' },
    { path: '/copilot/autonomous', description: 'Autonomous Copilot', category: 'other' },
    { path: '/crud-dashboard', description: 'CRUD Dashboard', category: 'other' }
  ];

  const categories = [
    { id: 'all', name: 'All Routes', color: 'bg-blue-500' },
    { id: 'core', name: 'Core', color: 'bg-green-500' },
    { id: 'auth', name: 'Authentication', color: 'bg-purple-500' },
    { id: 'admin', name: 'Admin', color: 'bg-red-500' },
    { id: 'ai', name: 'AI Features', color: 'bg-cyan-500' },
    { id: 'cases', name: 'Legal Cases', color: 'bg-yellow-500' },
    { id: 'demo-gpu', name: 'GPU Demos', color: 'bg-pink-500' },
    { id: 'demo-gaming', name: 'Gaming Demos', color: 'bg-indigo-500' },
    { id: 'demo-ai', name: 'AI Demos', color: 'bg-teal-500' },
    { id: 'demo-ui', name: 'UI Demos', color: 'bg-orange-500' },
    { id: 'demo-search', name: 'Search Demos', color: 'bg-lime-500' },
    { id: 'demo-integration', name: 'Integration Demos', color: 'bg-emerald-500' },
    { id: 'demo-advanced', name: 'Advanced Demos', color: 'bg-violet-500' },
    { id: 'demo-cache', name: 'Cache Demos', color: 'bg-amber-500' },
    { id: 'demo-misc', name: 'Misc Demos', color: 'bg-slate-500' },
    { id: 'other', name: 'Other', color: 'bg-gray-500' }
  ];

  const filteredRoutes = $derived(() => {
    let filtered = routes;

    if (filter !== 'all') {
      filtered = filtered.filter(route => route.category === filter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(route =>
        route.path.toLowerCase().includes(query) ||
        route.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  const stats = $derived(() => {
    const total = routes.length;
    const working = routes.filter(r => r.status >= 200 && r.status < 300).length;
    const redirects = routes.filter(r => r.status >= 300 && r.status < 400).length;
    const errors = routes.filter(r => r.status >= 400).length;

    return { total, working, redirects, errors };
  });

  async function testRoute(route: typeof ALL_ROUTES[0]): Promise<RouteStatus> {
    const startTime = Date.now();

    try {
      const response = await fetch(route.path, {
        method: 'GET',
        headers: { 'Accept': 'text/html,*/*' }
      });

      const loadTime = Date.now() - startTime;

      return {
        path: route.path,
        status: response.status,
        description: route.description,
        category: route.category,
        loadTime
      };
    } catch (error) {
      const loadTime = Date.now() - startTime;

      return {
        path: route.path,
        status: 0,
        description: route.description,
        category: route.category,
        loadTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async function testAllRoutes() {
    if (!browser || isLoading) return;

    isLoading = true;
    routes = [];
    progress = 0;

    const batchSize = 5; // Test 5 routes at a time
    const batches: (typeof ALL_ROUTES[number])[][] = [];

    for (let i = 0; i < ALL_ROUTES.length; i += batchSize) {
      batches.push(ALL_ROUTES.slice(i, i + batchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      const batchResults = await Promise.all(
        batch.map(route => testRoute(route))
      );

      routes = [...routes, ...batchResults];
      progress = Math.round(((batchIndex + 1) / batches.length) * 100);

      // Small delay between batches to avoid overwhelming the server
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    isLoading = false;
  }

  function getStatusColor(status: number): string {
    if (status === 0) return 'text-gray-400';
    if (status >= 200 && status < 300) return 'text-green-400';
    if (status >= 300 && status < 400) return 'text-yellow-400';
    if (status >= 400 && status < 500) return 'text-red-400';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-400';
  }

  function getStatusText(status: number, error?: string): string {
    if (status === 0) return error || 'Network Error';
    return status.toString();
  }

  function getCategoryInfo(categoryId: string) {
    return categories.find(c => c.id === categoryId) || categories[0];
  }

  onMount(() => {
    if (browser) {
      testAllRoutes();
    }
  });
</script>

<!-- Page Header -->
<CardBits variant="elevated" class="nes-container with-title">
  <p class="title">🚀 All Routes Testing Dashboard</p>

  <div class="route-dashboard">
    <p class="dashboard-description nes-text is-primary">
      Comprehensive testing and monitoring of all application routes
    </p>

    <!-- Stats -->
    {#if routes.length > 0}
      <div class="stats-grid">
        <div class="stat-nier-bits-card nes-badge">
          <span class="is-success">✅ Working: {stats.working}</span>
        </div>
        <div class="stat-nier-bits-card nes-badge">
          <span class="is-warning">🔄 Redirects: {stats.redirects}</span>
        </div>
        <div class="stat-nier-bits-card nes-badge">
          <span class="is-error">❌ Errors: {stats.errors}</span>
        </div>
        <div class="stat-nier-bits-card nes-badge">
          <span class="is-primary">📊 Total: {stats.total}</span>
        </div>
      </div>
    {/if}
  </div>
</CardBits>

<!-- Controls -->
<CardBits variant="outlined" class="nes-container is-rounded">
  <div class="controls-section">
    <div class="control-row">
      <!-- Test Button -->
      <ButtonBits
        variant={isLoading ? "secondary" : "success"}
        size="lg"
        loading={isLoading}
        disabled={isLoading}
        onclick={testAllRoutes}
        class="nes-btn {isLoading ? 'is-disabled' : 'is-success'}"
      >
        {#if isLoading}
          🔄 Testing... {progress}%
        {:else}
          🧪 Test All Routes
        {/if}
      </ButtonBits>

      <!-- Search -->
      <div class="search-control">
        <InputBits
          label="Search Routes"
          bind:value={searchQuery}
          placeholder="Filter routes..."
          variant="outlined"
          size="md"
          class="nes-input"
        />
      </div>
    </div>

    <!-- Category Filter -->
    <div class="category-filters">
      {#each categories as category}
        <ButtonBits
          variant={filter === category.id ? 'primary' : 'ghost'}
          size="sm"
          onclick={() => filter = category.id}
          class="category-btn nes-btn {filter === category.id ? 'is-primary' : 'is-dark'}"
        >
          {category.name}
          {#if routes.length > 0}
            <span class="category-count">
              ({routes.filter(r => category.id === 'all' || r.category === category.id).length})
            </span>
          {/if}
        </ButtonBits>
      {/each}
    </div>
  </div>
</CardBits>

<!-- Progress Bar -->
{#if isLoading}
  <CardBits variant="filled" class="nes-container is-rounded">
    <div class="progress-section">
      <div class="nes-container is-dark progress-bar-container">
        <div
          class="progress-bar"
          style="width: {progress}%"
        ></div>
      </div>
      <p class="progress-text nes-text is-primary">
        Testing routes... {progress}%
      </p>
    </div>
  </CardBits>
{/if}

<!-- Routes Table -->
{#if routes.length > 0}
  <CardBits variant="elevated" class="nes-container with-title">
    <p class="title">Route Test Results ({filteredRoutes.length} routes)</p>

    <div class="routes-table-container">
      <div class="routes-grid">
        {#each filteredRoutes as route (route.path)}
          <div class="route-nier-bits-card nes-container is-rounded">
            <div class="route-header">
              <div class="route-status">
                <span class="status-indicator {getStatusColor(route.status)} nes-badge">
                  <span class={route.status >= 200 && route.status < 300 ? 'is-success' : route.status >= 400 ? 'is-error' : 'is-warning'}>
                    {getStatusText(route.status, route.error)}
                  </span>
                </span>
              </div>
              <div class="route-actions">
                {#if route.status >= 200 && route.status < 400}
                  <ButtonBits
                    to={route.path}
                    variant="primary"
                    size="xs"
                    class="nes-btn is-primary action-btn"
                  >
                    Visit
                  </ButtonBits>
                {/if}
                <ButtonBits
                  variant="ghost"
                  size="xs"
                  onclick={() => testRoute(route).then(result => {
                    const index = routes.findIndex(r => r.path === route.path);
                    if (index >= 0) routes[index] = result;
                  })}
                  class="nes-btn is-dark action-btn"
                >
                  Retest
                </ButtonBits>
              </div>
            </div>

            <div class="route-details">
              <div class="route-path nes-text is-primary">
                <code>{route.path}</code>
              </div>
              <div class="route-description">
                {route.description}
              </div>
              <div class="route-meta">
                <span class="category-badge nes-badge">
                  <span class="is-dark">{getCategoryInfo(route.category).name}</span>
                </span>
                <span class="load-time nes-text is-disabled">
                  {route.loadTime}ms
                </span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </CardBits>
{:else if !isLoading}
  <CardBits variant="outlined" class="nes-container is-rounded empty-state">
    <div class="empty-content">
      <p class="nes-text is-disabled">No routes tested yet.</p>
      <ButtonBits
        variant="primary"
        size="lg"
        onclick={testAllRoutes}
        class="nes-btn is-primary"
      >
        🚀 Start Testing Routes
      </ButtonBits>
    </div>
  </CardBits>
{/if}

<!-- Footer -->
<CardBits variant="outlined" class="nes-container is-rounded footer-nier-bits-card">
  <div class="footer-content">
    <p class="nes-text is-warning">🎮 YoRHa Legal AI Platform - Route Testing Dashboard</p>
    <div class="footer-stats">
      <span class="nes-badge">
        <span class="is-primary">Total Routes: {ALL_ROUTES.length}</span>
      </span>
      <span class="nes-badge">
        <span class="is-dark">Categories: {categories.length - 1}</span>
      </span>
      {#if routes.length > 0}
        <span class="nes-badge">
          <span class="is-success">Success Rate: {Math.round((stats.working / stats.total) * 100)}%</span>
        </span>
      {/if}
    </div>
  </div>
</CardBits>

<style>
  /* Page Layout */
  .route-dashboard {
    padding: 1rem 0;
  }

  .dashboard-description {
    font-size: 0.875rem !important;
    margin-bottom: 1.5rem !important;
    text-align: center;
  }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin: 1.5rem 0;
  }

  .stat-card {
    text-align: center;
    font-size: 0.75rem !important;
  }

  /* Controls Section */
  .controls-section {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .control-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  @media (min-width: 768px) {
    .control-row {
      flex-direction: row;
      justify-content: space-between;
    }
  }

  .search-control {
    min-width: 250px;
  }

  /* Category Filters */
  .category-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
  }

  :global(.category-btn) {
    font-size: 0.625rem !important;
    padding: 0.375rem 0.75rem !important;
  }

  .category-count {
    font-size: 0.5rem;
    opacity: 0.8;
    margin-left: 0.25rem;
  }

  /* Progress Section */
  .progress-section {
    padding: 1rem;
    text-align: center;
  }

  .progress-bar-container {
    position: relative;
    height: 20px !important;
    margin-bottom: 1rem !important;
    background: rgba(26, 26, 46, 0.8) !important;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--n64-primary), var(--n64-secondary));
    transition: width 0.3s ease;
    position: relative;
  }

  .progress-bar::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .progress-text {
    font-size: 0.875rem !important;
    margin: 0 !important;
  }

  /* Routes Grid */
  .routes-table-container {
    padding: 1rem 0;
  }

  .routes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1rem;
  }

  @media (max-width: 768px) {
    .routes-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Route Cards */
  .route-card {
    background: rgba(26, 26, 46, 0.5) !important;
    border: 2px solid var(--n64-primary) !important;
    transition: all 0.3s ease;
  }

  .route-card:hover {
    border-color: var(--n64-secondary) !important;
    box-shadow: 0 0 15px rgba(74, 144, 226, 0.3);
    transform: translateY(-2px);
  }

  .route-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .route-status {
    flex-shrink: 0;
  }

  .status-indicator {
    font-size: 0.75rem !important;
    font-family: 'Press Start 2P', cursive !important;
  }

  .route-actions {
    display: flex;
    gap: 0.5rem;
  }

  :global(.action-btn) {
    font-size: 0.5rem !important;
    padding: 0.25rem 0.5rem !important;
  }

  /* Route Details */
  .route-details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .route-path {
    font-size: 0.75rem !important;
    word-break: break-all;
    margin: 0 !important;
  }

  .route-path code {
    background: rgba(74, 144, 226, 0.1);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
  }

  .route-description {
    font-size: 0.625rem;
    color: var(--nier-text-secondary);
    line-height: 1.4;
  }

  .route-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .category-badge {
    font-size: 0.5rem !important;
  }

  .load-time {
    font-size: 0.5rem !important;
    margin: 0 !important;
  }

  /* Empty State */
  .empty-state {
    padding: 3rem 1rem !important;
    text-align: center;
    background: rgba(26, 26, 46, 0.3) !important;
  }

  .empty-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  .empty-content p {
    font-size: 0.875rem !important;
    margin: 0 !important;
  }

  /* Footer */
  .footer-card {
    margin-top: 2rem;
    background: rgba(26, 26, 46, 0.3) !important;
  }

  .footer-content {
    text-align: center;
    padding: 1rem;
  }

  .footer-content p {
    font-size: 0.875rem !important;
    margin-bottom: 1rem !important;
  }

  .footer-stats {
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .footer-stats .nes-badge {
    font-size: 0.625rem !important;
  }

  /* Gaming Enhancements */
  :global(.nes-container.with-title .title) {
    font-family: 'Press Start 2P', cursive !important;
    font-size: 1rem !important;
    color: var(--nes-warning, #f5a623) !important;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  /* Legacy styles preserved */
  .nes-input {
    width: 250px;
  }

  table {
    border-collapse: collapse;
  }

  .nes-container {
    margin: 1rem 0;
  }

  /* Responsive Design */
  @media (max-width: 640px) {
    .control-row {
      align-items: stretch;
    }

    .search-control {
      min-width: auto;
      width: 100%;
    }

    .category-filters {
      gap: 0.25rem;
    }

    :global(.category-btn) {
      font-size: 0.5rem !important;
      padding: 0.25rem 0.5rem !important;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
    }

    .footer-stats {
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
  }
</style>