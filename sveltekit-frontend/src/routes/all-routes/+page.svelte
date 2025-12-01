<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  type RouteEntry = {
    id: string;
    path: string;
    files: Record<string, string>;
    methods: string[];
    tags: string[];
    kind: 'page' | 'endpoint' | 'layout';
    icon?: string;
    packages?: string[];
    relatedRoutes?: string[];
    category?: string;
    version?: string;
  };

  let dialog: HTMLDialogElement;
  let routes = $state<RouteEntry[]>([]);
  let stats = $state({ total: 0, pages: 0, endpoints: 0, layouts: 0, demos: 0 });
  let loading = $state(true);
  let searchQuery = $state('');
  let selectedTag = $state<string>('all');
  let selectedKind = $state<string>('all');
  let selectedCategory = $state<string>('all');
  let sortBy = $state<'path' | 'kind'>('path');
  let selectedRoute = $state<RouteEntry | null>(null);

  // Icon mapping for routes
  const routeIcons = [
    '🏆', '⭐', '💰', '❤️', '👾', '🎮', '⚔️', '🛡️', '📜', '🔑',
    '💎', '🎯', '🚀', '⚡', '🌟', '🎪', '🏰', '🗡️', '🎲', '🔮'
  ];

  let allTags = $derived.by(() => {
    const tagSet = new Set<string>();
    routes.forEach(r => r.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  });

  // Check if route is a demo
  function isDemo(route: RouteEntry): boolean {
    return route.path.includes('demo') ||
           route.path.includes('test') ||
           route.path.includes('showcase') ||
           route.tags.includes('demo');
  }

  // Infer packages used by route
  function inferPackages(route: RouteEntry): string[] {
    const packages: string[] = [];
    const path = route.path.toLowerCase();
    const tags = route.tags.map(t => t.toLowerCase());

    // AI/ML packages
    if (tags.includes('ai') || path.includes('ai') || path.includes('chat')) {
      packages.push('ollama', '@ai-sdk/svelte');
    }
    if (tags.includes('gpu') || path.includes('gpu')) {
      packages.push('cuda', 'tensorrt');
    }
    if (tags.includes('vector') || path.includes('vector')) {
      packages.push('pgvector', 'qdrant');
    }
    if (path.includes('rag') || tags.includes('rag')) {
      packages.push('langchain', 'pgvector');
    }

    // UI packages
    if (path.includes('yorha') || path.includes('nier')) {
      packages.push('bits-ui', 'unocss');
    }
    if (path.includes('nes') || path.includes('gaming')) {
      packages.push('nes.css');
    }

    // Data packages
    if (tags.includes('legal') || path.includes('legal')) {
      packages.push('drizzle-orm', 'lucia');
    }
    if (path.includes('evidence') || tags.includes('evidence')) {
      packages.push('fabric.js', 'neo4j');
    }
    if (path.includes('graph')) {
      packages.push('neo4j', 'd3');
    }

    // Storage
    if (path.includes('upload') || path.includes('minio')) {
      packages.push('minio', 'sharp');
    }

    // Always include core packages for pages
    if (route.kind === 'page') {
      packages.push('svelte', 'sveltekit');
    }

    return [...new Set(packages)];
  }

  // Find related routes
  function findRelatedRoutes(route: RouteEntry, allRoutes: RouteEntry[]): string[] {
    const related: string[] = [];
    const pathParts = route.path.split('/').filter(Boolean);
    const basePath = pathParts[0];

    // Find routes with same base path
    allRoutes.forEach(r => {
      if (r.id === route.id) return;

      // Same base path
      if (r.path.startsWith(`/${basePath}`) && r.path !== route.path) {
        related.push(r.path);
      }

      // Shared tags
      const sharedTags = route.tags.filter(t => r.tags.includes(t));
      if (sharedTags.length >= 2 && !related.includes(r.path)) {
        related.push(r.path);
      }
    });

    return related.slice(0, 5); // Limit to 5 related routes
  }

  // Categorize route
  function categorizeRoute(route: RouteEntry): string {
    const path = route.path.toLowerCase();

    if (isDemo(route)) return 'Demo';
    if (path.startsWith('/api')) return 'API';
    if (path.startsWith('/admin') || route.tags.includes('admin')) return 'Admin';
    if (route.tags.includes('auth') || path.includes('login') || path.includes('register')) return 'Auth';
    if (route.tags.includes('ai')) return 'AI';
    if (route.tags.includes('legal')) return 'Legal';
    if (route.tags.includes('evidence')) return 'Evidence';
    if (path.startsWith('/dev')) return 'Development';

    return 'Core';
  }

  // Determine version (v1-v4 for demos)
  function getVersion(route: RouteEntry): string {
    if (!isDemo(route)) return '';

    const path = route.path.toLowerCase();

    // V1 - Basic demos
    if (path.includes('/simple') || path.includes('/basic') || path === '/test') {
      return 'v1';
    }
    // V2 - Feature demos
    if (path.includes('agent') || path.includes('mcp') || path.includes('rag')) {
      return 'v2';
    }
    // V3 - Advanced demos
    if (path.includes('canvas') || path.includes('graph') || path.includes('yorha')) {
      return 'v3';
    }
    // V4 - Integration demos
    if (path.includes('integration') || path.includes('system') || path.includes('all-routes')) {
      return 'v4';
    }

    return 'v1';
  }

  let filteredRoutes = $derived.by(() => {
    let filtered = routes.filter(route => {
      const matchesSearch = route.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           route.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTag = selectedTag === 'all' || route.tags.includes(selectedTag);
      const matchesKind = selectedKind === 'all' || route.kind === selectedKind;
      const matchesCategory = selectedCategory === 'all' ||
                             (selectedCategory === 'demos' && isDemo(route)) ||
                             (selectedCategory === 'production' && !isDemo(route));
      return matchesSearch && matchesTag && matchesKind && matchesCategory;
    });

    // Sort routes
    if (sortBy === 'path') {
      filtered.sort((a, b) => a.path.localeCompare(b.path));
    } else if (sortBy === 'kind') {
      filtered.sort((a, b) => {
        if (a.kind === b.kind) return a.path.localeCompare(b.path);
        return a.kind.localeCompare(b.kind);
      });
    }

    return filtered;
  });

  onMount(async () => {
    try {
      const res = await fetch('/api/routes/all');
      const data = await res.json();

      // Enrich routes with metadata
      const enrichedRoutes = data.routes.map((route: RouteEntry, idx: number) => ({
        ...route,
        icon: routeIcons[idx % routeIcons.length],
        packages: inferPackages(route),
        category: categorizeRoute(route),
        version: getVersion(route)
      }));

      // Add related routes
      routes = enrichedRoutes.map((route: RouteEntry) => ({
        ...route,
        relatedRoutes: findRelatedRoutes(route, enrichedRoutes)
      }));

      // Calculate demo count
      const demoCount = routes.filter(r => isDemo(r)).length;
      stats = { ...data.stats, demos: demoCount };
      loading = false;
    } catch (e) {
      console.error('Failed to load routes:', e);
      loading = false;
    }
  });

  function openModal(route: RouteEntry) {
    selectedRoute = route;
    dialog?.showModal();
  }

  function closeModal() {
    dialog?.close();
    selectedRoute = null;
  }

  function navigateToRoute(path: string) {
    closeModal();
    goto(path);
  }

  function getRouteSummary(route: RouteEntry): string {
    const hasPage = route.files.page;
    const hasServer = route.files.server || route.files.page_server;

    if (route.kind === 'endpoint') {
      return `API endpoint supporting ${route.methods.join(', ')} methods.`;
    } else if (route.kind === 'layout') {
      return `Layout component providing shared UI structure.`;
    } else if (hasPage && hasServer) {
      return `Interactive page with server-side data loading and processing.`;
    } else if (hasPage) {
      return `Client-side rendered page component.`;
    }
    return `Route component in the application.`;
  }
</script>

<svelte:head>
  <title>NES Route Explorer</title>
</svelte:head>

<div class="page-wrapper">
  <!-- Header -->
  <header class="header-section">
    <div class="nes-container is-dark with-title">
      <p class="title">Route Explorer</p>
      <div class="header-content">
        <div class="header-info">
          <p class="nes-text">Explore all {stats.total} routes</p>
        </div>
        <div class="header-actions">
          <a href="/graph-mode" class="nes-btn is-success">📊 Graph Mode</a>
          <a href="/test-route-discovery" class="nes-btn is-warning">Test</a>
          <a href="/command/routes" class="nes-btn is-primary">Command</a>
        </div>
      </div>
    </div>
  </header>

  <div class="main-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="nes-container is-rounded with-title">
        <p class="title">Filters</p>

        <!-- Search -->
        <div class="filter-group">
          <label for="search-input" class="nes-text">Search</label>
          <input
            id="search-input"
            type="text"
            class="nes-input"
            bind:value={searchQuery}
            placeholder="Search..."
          />
        </div>

        <!-- Category Filter (Demos) -->
        <div class="filter-group">
          <label for="category-select" class="nes-text">Category</label>
          <div class="nes-select">
            <select id="category-select" bind:value={selectedCategory}>
              <option value="all">All Routes</option>
              <option value="demos">🎮 Demos ({stats.demos})</option>
              <option value="production">⚙️ Production</option>
            </select>
          </div>
        </div>

        <!-- Kind Filter -->
        <div class="filter-group">
          <label for="kind-select" class="nes-text">Type</label>
          <div class="nes-select">
            <select id="kind-select" bind:value={selectedKind}>
              <option value="all">All Types</option>
              <option value="page">Pages ({stats.pages})</option>
              <option value="endpoint">Endpoints ({stats.endpoints})</option>
              <option value="layout">Layouts ({stats.layouts})</option>
            </select>
          </div>
        </div>

        <!-- Tag Filter -->
        <div class="filter-group">
          <label for="tag-select" class="nes-text">Tags</label>
          <div class="nes-select">
            <select id="tag-select" bind:value={selectedTag}>
              <option value="all">All Tags</option>
              {#each allTags as tag}
                <option value={tag}>{tag}</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- Sort By -->
        <div class="filter-group">
          <label for="sort-select" class="nes-text">Sort By</label>
          <div class="nes-select">
            <select id="sort-select" bind:value={sortBy}>
              <option value="path">Path (A-Z)</option>
              <option value="kind">Type</option>
            </select>
          </div>
        </div>

        <!-- Stats -->
        <div class="stats-box">
          <p class="nes-text is-primary">Statistics</p>
          <div class="stat-row">
            <span>Total</span>
            <span class="nes-text is-success">{stats.total}</span>
          </div>
          <div class="stat-row">
            <span>Demos</span>
            <span class="nes-text is-warning">{stats.demos}</span>
          </div>
          <div class="stat-row">
            <span>Filtered</span>
            <span class="nes-text is-success">{filteredRoutes.length}</span>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <button
            type="button"
            class="nes-btn is-warning btn-small"
            onclick={() => selectedCategory = 'demos'}
          >
            Show Demos
          </button>
          <button
            type="button"
            class="nes-btn btn-small"
            onclick={() => { selectedCategory = 'all'; selectedTag = 'all'; selectedKind = 'all'; searchQuery = ''; }}
          >
            Reset
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      {#if loading}
        <div class="loading-state">
          <i class="nes-icon is-large heart"></i>
          <p class="nes-text is-primary">Loading routes...</p>
        </div>
      {:else}
        <div class="routes-grid">
          {#each filteredRoutes as route (route.id)}
            <button
              onclick={() => openModal(route)}
              class="route-card nes-container is-rounded"
            >
              <div class="card-icon">{route.icon}</div>
              <div class="card-badge">
                <span class="nes-badge {route.kind === 'page' ? 'is-success' : route.kind === 'endpoint' ? 'is-primary' : 'is-warning'}">
                  <span>{route.kind}</span>
                </span>
              </div>
              <div class="card-path">{route.path}</div>
              {#if route.methods.length > 0}
                <div class="card-methods">
                  {route.methods.slice(0, 2).join(' • ')}
                </div>
              {/if}
              {#if route.tags.length > 0}
                <div class="card-tags">
                  {#each route.tags.slice(0, 2) as tag}
                    <span class="tag-item">{tag}</span>
                  {/each}
                  {#if route.tags.length > 2}
                    <span class="tag-item">+{route.tags.length - 2}</span>
                  {/if}
                </div>
              {/if}
            </button>
          {/each}
        </div>

        {#if filteredRoutes.length === 0}
          <div class="no-results">
            <i class="nes-icon is-large close"></i>
            <p class="nes-text is-error">No routes found!</p>
            <p>Try adjusting your filters</p>
          </div>
        {/if}
      {/if}
    </main>
  </div>
</div>

<!-- Modal -->
<dialog bind:this={dialog} class="nes-dialog route-modal">
  {#if selectedRoute}
    <form method="dialog">
      <div class="modal-header">
        <div class="modal-title-section">
          <div class="modal-icon">{selectedRoute.icon}</div>
          <div>
            <span class="nes-badge {selectedRoute.kind === 'page' ? 'is-success' : selectedRoute.kind === 'endpoint' ? 'is-primary' : 'is-warning'}">
              <span>{selectedRoute.kind}</span>
            </span>
            <h2 class="modal-path">{selectedRoute.path}</h2>
          </div>
        </div>
        <button type="button" class="nes-btn is-error" onclick={closeModal}>✕</button>
      </div>

      <div class="modal-body">
        <!-- Summary -->
        <div class="modal-section">
          <p class="nes-text is-primary">Summary</p>
          <p>{getRouteSummary(selectedRoute)}</p>
        </div>

        <!-- Files -->
        {#if Object.keys(selectedRoute.files).length > 0}
          <div class="modal-section">
            <p class="nes-text is-primary">Files</p>
            <div class="files-list">
              {#each Object.entries(selectedRoute.files) as [type, path]}
                <div class="nes-container is-rounded file-item">
                  <p class="file-type">{type}</p>
                  <p class="file-path">{path}</p>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Methods -->
        {#if selectedRoute.methods.length > 0}
          <div class="modal-section">
            <p class="nes-text is-primary">HTTP Methods</p>
            <div class="methods-list">
              {#each selectedRoute.methods as method}
                <span class="nes-badge is-success">
                  <span>{method}</span>
                </span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Tags -->
        {#if selectedRoute.tags.length > 0}
          <div class="modal-section">
            <p class="nes-text is-primary">Tags</p>
            <div class="tags-list">
              {#each selectedRoute.tags as tag}
                <span class="nes-badge">
                  <span>{tag}</span>
                </span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Category & Version -->
        <div class="modal-section">
          <p class="nes-text is-primary">Metadata</p>
          <div class="metadata-grid">
            <div class="metadata-item">
              <span class="metadata-label">Category:</span>
              <span class="nes-badge is-warning">
                <span>{selectedRoute.category}</span>
              </span>
            </div>
            {#if selectedRoute.version}
              <div class="metadata-item">
                <span class="metadata-label">Version:</span>
                <span class="nes-badge is-success">
                  <span>{selectedRoute.version}</span>
                </span>
              </div>
            {/if}
          </div>
        </div>

        <!-- Packages -->
        {#if selectedRoute.packages && selectedRoute.packages.length > 0}
          <div class="modal-section">
            <p class="nes-text is-primary">Required Packages</p>
            <div class="packages-list">
              {#each selectedRoute.packages as pkg}
                <span class="nes-badge is-primary">
                  <span>{pkg}</span>
                </span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Related Routes -->
        {#if selectedRoute.relatedRoutes && selectedRoute.relatedRoutes.length > 0}
          <div class="modal-section">
            <p class="nes-text is-primary">Related Routes</p>
            <div class="related-routes-list">
              {#each selectedRoute.relatedRoutes as relatedPath}
                <button
                  type="button"
                  class="related-route-btn"
                  onclick={() => {
                    const related = routes.find(r => r.path === relatedPath);
                    if (related) openModal(related);
                  }}
                >
                  {relatedPath}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Actions -->
        <div class="modal-actions">
          {#if selectedRoute.kind === 'page'}
            <button
              type="button"
              class="nes-btn is-primary"
              onclick={() => navigateToRoute(selectedRoute.path)}
            >
              Visit Page →
            </button>
          {/if}
          <a
            href="/dev/ast-graph?route={encodeURIComponent(selectedRoute.path)}"
            class="nes-btn is-warning"
          >
            View AST Graph
          </a>
        </div>
      </div>
    </form>
  {/if}
</dialog>

<style>
  .page-wrapper {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem;
  }

  .header-section {
    margin-bottom: 2rem;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
  }

  .header-actions {
    display: flex;
    gap: 1rem;
  }

  .main-layout {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 2rem;
  }

  .sidebar {
    position: sticky;
    top: 2rem;
    height: fit-content;
  }

  .filter-group {
    margin-bottom: 1.5rem;
  }

  .filter-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .stats-box {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 2px solid #000;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    margin: 0.5rem 0;
  }

  .quick-actions {
    margin-top: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .btn-small {
    font-size: 0.75rem;
    padding: 0.5rem;
  }

  .loading-state {
    text-align: center;
    padding: 4rem;
  }

  .loading-state i {
    margin-bottom: 1rem;
  }

  /* Routes Grid - 3 Columns */
  .routes-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .route-card {
    padding: 1.5rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    background: white;
  }

  .route-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  }

  .card-icon {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .card-badge {
    margin: 0.5rem 0;
  }

  .card-path {
    font-size: 0.875rem;
    font-weight: bold;
    margin: 0.75rem 0;
    word-break: break-word;
    min-height: 2.5rem;
  }

  .card-methods {
    font-size: 0.75rem;
    opacity: 0.7;
    margin: 0.5rem 0;
  }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    justify-content: center;
    margin-top: 0.5rem;
  }

  .tag-item {
    font-size: 0.7rem;
    opacity: 0.7;
  }

  .no-results {
    text-align: center;
    padding: 4rem;
  }

  .no-results i {
    margin-bottom: 1rem;
  }

  .no-results p {
    margin: 0.5rem 0;
  }

  /* Modal Styles */
  .route-modal {
    max-width: 800px;
    width: 90vw;
    max-height: 80vh;
    padding: 0;
    border: 4px solid #000;
  }

  dialog::backdrop {
    backdrop-filter: blur(4px);
    background: rgba(0, 0, 0, 0.7);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 1.5rem;
    border-bottom: 2px solid #000;
    background: #f7f7f7;
  }

  .modal-title-section {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .modal-icon {
    font-size: 2.5rem;
  }

  .modal-path {
    font-size: 1rem;
    margin: 0.5rem 0 0 0;
    word-break: break-word;
  }

  .modal-body {
    padding: 1.5rem;
    max-height: calc(80vh - 150px);
    overflow-y: auto;
    background: #fff;
  }

  .modal-section {
    margin-bottom: 1.5rem;
  }

  .modal-section > p:first-child {
    margin-bottom: 0.75rem;
  }

  .files-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .file-item {
    padding: 0.75rem;
  }

  .file-type {
    font-size: 0.75rem;
    opacity: 0.7;
    margin: 0 0 0.25rem 0;
  }

  .file-path {
    font-size: 0.875rem;
    word-break: break-all;
    margin: 0;
  }

  .methods-list,
  .tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .modal-actions {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 2px solid #000;
  }

  .modal-actions {
    display: flex;
    gap: 0.5rem;
  }

  .modal-actions button,
  .modal-actions a {
    flex: 1;
  }

  .metadata-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .metadata-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .metadata-label {
    font-size: 0.875rem;
    opacity: 0.8;
  }

  .packages-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .related-routes-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .related-route-btn {
    padding: 0.5rem;
    text-align: left;
    background: #f0f0f0;
    border: 2px solid #000;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s ease;
  }

  .related-route-btn:hover {
    background: #e0e0e0;
    transform: translateX(4px);
  }

  /* Responsive */
  @media (max-width: 1200px) {
    .routes-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 1024px) {
    .main-layout {
      grid-template-columns: 1fr;
    }

    .sidebar {
      position: static;
    }
  }

  @media (max-width: 768px) {
    .routes-grid {
      grid-template-columns: 1fr;
    }

    .header-content {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .page-wrapper {
      padding: 1rem;
    }
  }

  /* Custom Scrollbar */
  .modal-body::-webkit-scrollbar {
    width: 8px;
  }

  .modal-body::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  .modal-body::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  .modal-body::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
</style>
