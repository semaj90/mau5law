<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

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
    const batches: typeof ALL_ROUTES[][] = [];

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

<div class="min-h-screen bg-nier-bg-primary text-nier-text-primary p-8">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-nier-accent-warm mb-4 font-mono">
        🚀 All Routes Testing Dashboard
      </h1>
      <p class="text-nier-text-secondary mb-6">
        Comprehensive testing and monitoring of all application routes
      </p>

      <!-- Stats -->
      {#if routes.length > 0}
        <div class="flex justify-center gap-6 mb-6">
          <div class="bg-green-500/20 text-green-400 px-4 py-2 rounded border border-green-500/30">
            ✅ Working: {stats.working}
          </div>
          <div class="bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded border border-yellow-500/30">
            🔄 Redirects: {stats.redirects}
          </div>
          <div class="bg-red-500/20 text-red-400 px-4 py-2 rounded border border-red-500/30">
            ❌ Errors: {stats.errors}
          </div>
          <div class="bg-blue-500/20 text-blue-400 px-4 py-2 rounded border border-blue-500/30">
            📊 Total: {stats.total}
          </div>
        </div>
      {/if}
    </div>

    <!-- Controls -->
    <div class="mb-8 space-y-4">
      <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
        <!-- Test Button -->
        <button
          class="nes-btn is-success"
          on:click={testAllRoutes}
          disabled={isLoading}
        >
          {#if isLoading}
            🔄 Testing... {progress}%
          {:else}
            🧪 Test All Routes
          {/if}
        </button>

        <!-- Search -->
        <div class="flex gap-4 items-center">
          <label class="text-nier-text-secondary">Search:</label>
          <input
            type="text"
            class="nes-input"
            bind:value={searchQuery}
            placeholder="Filter routes..."
          />
        </div>
      </div>

      <!-- Category Filter -->
      <div class="flex flex-wrap gap-2 justify-center">
        {#each categories as category}
          <button
            class="px-3 py-1 rounded text-sm border transition-colors {filter === category.id
              ? `${category.color} text-white`
              : 'bg-nier-bg-secondary text-nier-text-secondary border-nier-border-muted hover:bg-nier-bg-tertiary'}"
            on:click={() => filter = category.id}
          >
            {category.name}
            {#if routes.length > 0}
              ({routes.filter(r => category.id === 'all' || r.category === category.id).length})
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- Progress Bar -->
    {#if isLoading}
      <div class="mb-6">
        <div class="bg-nier-bg-secondary rounded-full h-4 overflow-hidden">
          <div
            class="bg-nier-accent-warm h-full transition-all duration-300"
            style="width: {progress}%"
          ></div>
        </div>
        <p class="text-center text-sm text-nier-text-secondary mt-2">
          Testing routes... {progress}%
        </p>
      </div>
    {/if}

    <!-- Routes Table -->
    {#if routes.length > 0}
      <div class="nes-container with-title">
        <h3 class="title">Route Test Results ({filteredRoutes.length} routes)</h3>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-nier-border-muted">
                <th class="text-left py-2 px-3">Status</th>
                <th class="text-left py-2 px-3">Route</th>
                <th class="text-left py-2 px-3">Description</th>
                <th class="text-left py-2 px-3">Category</th>
                <th class="text-left py-2 px-3">Load Time</th>
                <th class="text-left py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredRoutes as route (route.path)}
                <tr class="border-b border-nier-border-muted/50 hover:bg-nier-bg-secondary/50">
                  <td class="py-3 px-3">
                    <span class="font-mono font-bold {getStatusColor(route.status)}">
                      {getStatusText(route.status, route.error)}
                    </span>
                  </td>
                  <td class="py-3 px-3">
                    <code class="text-nier-accent-cool text-sm">{route.path}</code>
                  </td>
                  <td class="py-3 px-3">
                    {route.description}
                  </td>
                  <td class="py-3 px-3">
                    <span class="px-2 py-1 rounded text-xs {getCategoryInfo(route.category).color} text-white">
                      {getCategoryInfo(route.category).name}
                    </span>
                  </td>
                  <td class="py-3 px-3">
                    <span class="text-nier-text-secondary">
                      {route.loadTime}ms
                    </span>
                  </td>
                  <td class="py-3 px-3">
                    <div class="flex gap-2">
                      {#if route.status >= 200 && route.status < 400}
                        <a
                          href={route.path}
                          target="_blank"
                          class="text-nier-accent-cool hover:text-nier-accent-warm text-sm underline"
                        >
                          Visit
                        </a>
                      {/if}
                      <button
                        class="text-nier-text-secondary hover:text-nier-text-primary text-sm underline"
                        on:click={() => testRoute(route).then(result => {
                          const index = routes.findIndex(r => r.path === route.path);
                          if (index >= 0) routes[index] = result;
                        })}
                      >
                        Retest
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {:else if !isLoading}
      <div class="text-center py-12">
        <p class="text-nier-text-secondary mb-4">No routes tested yet.</p>
        <button class="nes-btn is-primary" on:click={testAllRoutes}>
          🚀 Start Testing Routes
        </button>
      </div>
    {/if}

    <!-- Footer -->
    <div class="mt-8 text-center text-nier-text-secondary text-sm">
      <p>🎮 YoRHa Legal AI Platform - Route Testing Dashboard</p>
      <p>Total Routes Discovered: {ALL_ROUTES.length}</p>
    </div>
  </div>
</div>

<style>
  .nes-input {
    width: 250px;
  }

  table {
    border-collapse: collapse;
  }

  .nes-container {
    margin: 0;
  }
</style>