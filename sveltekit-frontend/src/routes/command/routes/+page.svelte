<!--
  /command/routes - NES-Style Command Center
  All Routes Index with ACE System Integration
  UnoCSS shortcuts (no NES.css import) + Svelte 5
-->
<script lang="ts">
  import { goto } from '$app/navigation';

  type RouteEntry = {
    id: string;
    path: string;
    files: {
      page?: string;
      page_server?: string;
      server?: string;
      layout?: string;
      layout_server?: string;
    };
    methods: string[];
    tags: string[];
    kind: 'page' | 'endpoint' | 'layout';
  };

  let { data } = $props();

  // State
  let search = $state('');
  let filterTag = $state('all');
  let filterKind = $state('all');
  let showInspector = $state(false);
  let selectedRoute = $state<RouteEntry | null>(null);
  let testResults = $state<Record<string, 'pending' | 'success' | 'error'>>({});

  // ACE Pipeline state
  let aceStatus = $state({
    indexed: 0,
    vectorized: 0,
    lastRun: null as string | null
  });

  // Per-route ACE details (simulated for now)
  let routeDetails = $state({
    loading: false,
    vector: [] as number[],
    graphNodeId: null as string | null,
    lastIndexed: null as string | null,
    status: 'unknown' as 'indexed' | 'pending' | 'missing'
  });

  // Derived filtered routes
  let filtered = $derived(data.routes.filter((r: RouteEntry) => {
    const q = search.toLowerCase();
    const haystack = `${r.path} ${r.id} ${Object.values(r.files).join(' ')}`.toLowerCase();
    const matchesSearch = !q || haystack.includes(q);
    const matchesTag = filterTag === 'all' || r.tags?.includes(filterTag);
    const matchesKind = filterKind === 'all' || r.kind === filterKind;
    return matchesSearch && matchesTag && matchesKind;
  }));

  // Get unique tags from all routes
  let allTags = $derived([...new Set(data.routes.flatMap((r: RouteEntry) => r.tags as string[]))].sort());

  // Trigger/test a route
  async function triggerRoute(route: RouteEntry) {
    testResults[route.path] = 'pending';
    try {
      const res = await fetch(route.path, { method: 'GET' });
      testResults[route.path] = res.ok ? 'success' : 'error';
    } catch {
      testResults[route.path] = 'error';
    }
  }

  // Open route inspector & fetch details
  async function inspectRoute(route: RouteEntry) {
    selectedRoute = route;
    showInspector = true;
    routeDetails.loading = true;

    // Simulate fetching ACE details (Vector, Graph Node, etc.)
    // In a real app, this would call /api/ace/inspect?route=...
    await new Promise(r => setTimeout(r, 600)); // Fake network delay

    // Generate mock 16-dim feature vector summary
    const mockVector = Array.from({ length: 16 }, () => Math.random());
    const isIndexed = Math.random() > 0.3;

    routeDetails = {
      loading: false,
      vector: mockVector,
      graphNodeId: isIndexed ? `node:${route.id}:${Math.floor(Math.random() * 10000)}` : null,
      lastIndexed: isIndexed ? new Date(Date.now() - Math.random() * 100000000).toISOString() : null,
      status: isIndexed ? 'indexed' : 'pending'
    };
  }

  // Run ACE indexing on selected routes
  async function runACEIndex() {
    try {
      const res = await fetch('/api/ace/web-crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routes: filtered.map((r: RouteEntry) => r.path) })
      });
      if (res.ok) {
        const result = await res.json();
        aceStatus.indexed = result.documentsIndexed || filtered.length;
        aceStatus.lastRun = new Date().toISOString();
      }
    } catch (e) {
      console.error('ACE indexing failed:', e);
    }
  }

  // Get badge class for tag
  function getTagBadgeClass(tag: string): string {
    const tagClasses: Record<string, string> = {
      api: 'nes-badge-api',
      ace: 'nes-badge-ace',
      ai: 'nes-badge-ace',
      legal: 'nes-badge',
      demo: 'nes-badge-warning',
      dev: 'nes-badge-warning',
      gpu: 'nes-badge-success',
      vector: 'nes-badge-success'
    };
    return tagClasses[tag] || 'nes-badge';
  }
</script>

<svelte:head>
  <title>Command Center - Routes Index</title>
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
</svelte:head>

<div class="screen-nes">
  <!-- Header -->
  <header class="screen-nes-header">
    <div>
      <h1 class="screen-nes-title">📟 /all-routes Command Center</h1>
      <p class="screen-nes-subtitle">
        Visualize and control all SvelteKit routes • ACE System Integration
      </p>
    </div>
    <div class="flex gap-2">
      <button class="nes-btn nes-btn-primary" onclick={runACEIndex}>
        ⚡ Run ACE Index
      </button>
      <button class="nes-btn nes-btn-ghost" onclick={() => goto('/')}>
        🏠 Home
      </button>
    </div>
  </header>

  <!-- Stats Row -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div class="nes-stat">
      <div class="nes-stat-value">{data.stats?.total || data.routes.length}</div>
      <div class="nes-stat-label">Total Routes</div>
    </div>
    <div class="nes-stat">
      <div class="nes-stat-value">{data.stats?.endpoints || 0}</div>
      <div class="nes-stat-label">API Endpoints</div>
    </div>
    <div class="nes-stat">
      <div class="nes-stat-value">{data.stats?.pages || 0}</div>
      <div class="nes-stat-label">Pages</div>
    </div>
    <div class="nes-stat">
      <div class="nes-stat-value">{aceStatus.indexed}</div>
      <div class="nes-stat-label">ACE Indexed</div>
    </div>
  </div>

  <!-- Controls -->
  <div class="screen-nes-controls">
    <input
      bind:value={search}
      placeholder="🔍 Search path, file, or segment…"
      class="nes-input flex-1 min-w-64"
    />

    <select bind:value={filterTag} class="nes-select">
      <option value="all">All tags</option>
      {#each allTags as tag}
        <option value={tag}>{String(tag).toUpperCase()}</option>
      {/each}
    </select>

    <select bind:value={filterKind} class="nes-select">
      <option value="all">All types</option>
      <option value="page">Pages</option>
      <option value="endpoint">Endpoints</option>
      <option value="layout">Layouts</option>
    </select>

    <div class="screen-nes-meta">
      Showing {filtered.length} of {data.routes.length} routes
    </div>
  </div>

  <!-- Routes Panel -->
  <div class="nes-panel nes-panel-scroll">
    <div class="nes-panel-header">
      <div>Path</div>
      <div>Files</div>
      <div>Tags</div>
      <div class="text-right pr-1">Actions</div>
    </div>

    <div class="nes-panel-body">
      {#each filtered as route}
        {@const testStatus = testResults[route.path]}
        <div class="nes-row {testStatus === 'success' ? 'bg-nes-success/10' : testStatus === 'error' ? 'bg-nes-danger/10' : ''}">
          <div class="nes-path flex items-center gap-2">
            {#if route.kind === 'endpoint'}
              <span class="text-nes-accent2">⚡</span>
            {:else if route.kind === 'layout'}
              <span class="text-nes-muted">📐</span>
            {:else}
              <span class="text-nes-accent">📄</span>
            {/if}
            <span class="truncate">{route.path}</span>
            {#if testStatus === 'success'}
              <span class="text-nes-success">✓</span>
            {:else if testStatus === 'error'}
              <span class="text-nes-danger">✗</span>
            {:else if testStatus === 'pending'}
              <span class="animate-spin">⏳</span>
            {/if}
          </div>

          <div class="nes-files">
            {#if route.files.page}<div class="text-nes-accent">+page.svelte</div>{/if}
            {#if route.files.page_server}<div class="text-nes-accent2">+page.server.ts</div>{/if}
            {#if route.files.server}<div class="text-cyan-400">+server.ts</div>{/if}
            {#if route.files.layout}<div class="text-nes-muted">+layout.svelte</div>{/if}
            {#if route.files.layout_server}<div class="text-nes-muted">+layout.server.ts</div>{/if}
          </div>

          <div class="nes-tags">
            {#each route.tags.slice(0, 3) as tag}
              <span class={getTagBadgeClass(tag)}>{tag}</span>
            {/each}
            {#if route.tags.length > 3}
              <span class="nes-badge">+{route.tags.length - 3}</span>
            {/if}
          </div>

          <div class="nes-actions">
            <button class="nes-btn nes-btn-sm nes-btn-ghost" onclick={() => inspectRoute(route)} title="Inspect">
              🔍
            </button>
            <button class="nes-btn nes-btn-sm nes-btn-primary" onclick={() => triggerRoute(route)} title="Test">
              ▶
            </button>
            <button class="nes-btn nes-btn-sm nes-btn-success" onclick={() => goto(route.path)} title="Navigate">
              →
            </button>
          </div>
        </div>
      {/each}

      {#if filtered.length === 0}
        <div class="p-8 text-center text-nes-muted">
          <div class="text-4xl mb-4">🔍</div>
          <div>No routes found matching your filters</div>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Route Inspector Dialog (HTML5 native modal) -->
{#if showInspector && selectedRoute}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div class="nes-dialog" role="dialog" aria-modal="true" tabindex="-1" onclick={() => showInspector = false} onkeydown={(e) => e.key === 'Escape' && (showInspector = false)}>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="nes-dialog-content" onclick={(e) => e.stopPropagation()}>
      <button class="nes-dialog-close" onclick={() => showInspector = false}>✕</button>

      <h2 class="nes-dialog-title">🔍 Route Inspector</h2>

      <div class="space-y-4">
        <!-- Path -->
        <div class="nes-panel-dark p-4">
          <div class="text-[10px] text-nes-muted uppercase mb-1">Path</div>
          <code class="text-nes-accent2 text-sm">{selectedRoute.path}</code>
        </div>

        <!-- Files -->
        <div class="nes-panel-dark p-4">
          <div class="text-[10px] text-nes-muted uppercase mb-2">Files</div>
          <div class="space-y-1 text-[11px]">
            {#if selectedRoute.files.page}
              <div class="flex items-center gap-2">
                <span class="text-nes-accent">📄</span>
                <code>{selectedRoute.files.page}</code>
              </div>
            {/if}
            {#if selectedRoute.files.page_server}
              <div class="flex items-center gap-2">
                <span class="text-nes-accent2">⚙️</span>
                <code>{selectedRoute.files.page_server}</code>
              </div>
            {/if}
            {#if selectedRoute.files.server}
              <div class="flex items-center gap-2">
                <span class="text-cyan-400">⚡</span>
                <code>{selectedRoute.files.server}</code>
              </div>
            {/if}
            {#if selectedRoute.files.layout}
              <div class="flex items-center gap-2">
                <span class="text-nes-muted">📐</span>
                <code>{selectedRoute.files.layout}</code>
              </div>
            {/if}
            {#if selectedRoute.files.layout_server}
              <div class="flex items-center gap-2">
                <span class="text-nes-muted">⚙️</span>
                <code>{selectedRoute.files.layout_server}</code>
              </div>
            {/if}
          </div>
        </div>

        <!-- Tags & Methods -->
        <div class="grid grid-cols-2 gap-4">
          <div class="nes-panel-dark p-4">
            <div class="text-[10px] text-nes-muted uppercase mb-2">Tags</div>
            <div class="flex flex-wrap gap-1">
              {#each selectedRoute.tags as tag}
                <span class={getTagBadgeClass(tag)}>{tag}</span>
              {/each}
              {#if selectedRoute.tags.length === 0}
                <span class="text-nes-muted text-[10px]">No tags</span>
              {/if}
            </div>
          </div>

          <div class="nes-panel-dark p-4">
            <div class="text-[10px] text-nes-muted uppercase mb-2">HTTP Methods</div>
            <div class="flex flex-wrap gap-1">
              {#each selectedRoute.methods as method}
                <span class="nes-badge-success">{method}</span>
              {/each}
              {#if selectedRoute.methods.length === 0}
                <span class="text-nes-muted text-[10px]">GET (default)</span>
              {/if}
            </div>
          </div>
        </div>

        <!-- ACE Status (Dynamic) -->
        <div class="nes-panel-dark p-4">
          <div class="text-[10px] text-nes-muted uppercase mb-2">ACE System Status</div>

          {#if routeDetails.loading}
            <div class="text-center py-4">
              <span class="animate-spin text-2xl">⏳</span>
              <div class="text-xs text-nes-muted mt-2">Fetching vector data...</div>
            </div>
          {:else}
            <div class="grid grid-cols-3 gap-4 text-center mb-4">
              <div>
                <div class="nes-status-dot {routeDetails.status === 'indexed' ? 'nes-status-online' : 'nes-status-offline'} mx-auto mb-1"></div>
                <div class="text-[9px] text-nes-muted">Indexed</div>
              </div>
              <div>
                <div class="nes-status-dot {routeDetails.vector.length > 0 ? 'nes-status-pending' : 'nes-status-offline'} mx-auto mb-1"></div>
                <div class="text-[9px] text-nes-muted">Vectorized</div>
              </div>
              <div>
                <div class="nes-status-dot {routeDetails.graphNodeId ? 'nes-status-online' : 'nes-status-offline'} mx-auto mb-1"></div>
                <div class="text-[9px] text-nes-muted">Graph Node</div>
              </div>
            </div>

            <!-- Feature Vector Visualization -->
            {#if routeDetails.vector.length > 0}
              <div class="mb-2">
                <div class="text-[9px] text-nes-muted mb-1 flex justify-between">
                  <span>Feature Vector (1024-dim summary)</span>
                  <span class="text-nes-accent2">v1.2</span>
                </div>
                <div class="flex items-end gap-[2px] h-8 bg-black/20 p-1 rounded">
                  {#each routeDetails.vector as val}
                    <div class="flex-1 bg-cyan-500/60 hover:bg-cyan-400 transition-all" style="height: {val * 100}%"></div>
                  {/each}
                </div>
              </div>
            {/if}

            <div class="text-[9px] text-nes-muted font-mono truncate">
              ID: {routeDetails.graphNodeId || 'N/A'}
            </div>
          {/if}
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <button class="nes-btn nes-btn-primary flex-1" onclick={() => triggerRoute(selectedRoute!)}>
            ▶ Test Route
          </button>
          <button class="nes-btn nes-btn-success flex-1" onclick={() => { showInspector = false; goto(selectedRoute!.path); }}>
            → Navigate
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .animate-spin { animation: spin 1s linear infinite; }

  /* Scanline effect for NES aesthetic */
  .screen-nes::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.1) 2px,
      rgba(0, 0, 0, 0.1) 4px
    );
    z-index: 1000;
    opacity: 0.3;
  }
</style>
