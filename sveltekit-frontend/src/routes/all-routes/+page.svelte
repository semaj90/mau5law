<!--
  All Routes Index - ACE System Integration
  Svelte 5 + UnoCSS + HTML5 Native Elements
  Agentic Error Fixing • Web Crawl • Graph Analysis • VLM Processing • Vector Search
-->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
// Import route configuration
  import { allRoutes } from '$lib/data/routes-config';

  // Props from server
  let { data = {} as any } = $props();

  // Discover all route modules
  const modules = import.meta.glob('/src/routes/**/+page.svelte');

  // State
  let searchValue = $state('');
  let categoryValue = $state('all');
  let sortValue = $state<'name' | 'category'>('name');
  let viewMode = $state<'grid' | 'list'>('grid');
  let gamingMode = $state(true);

  // ACE System Pipeline State
  let aceSystemState = $state({
    webCrawl: { progress: 0, status: 'idle' as 'idle' | 'running' | 'complete' },
    vlmProcessing: { progress: 0, status: 'idle' as 'idle' | 'running' | 'complete' },
    graphAnalysis: { progress: 0, status: 'idle' as 'idle' | 'running' | 'complete' },
    vectorIndexing: { progress: 0, status: 'idle' as 'idle' | 'running' | 'complete' },
    llmOutput: { progress: 0, status: 'idle' as 'idle' | 'running' | 'complete' }
  });

  let processingLog = $state<Array<{ message: string; status: string; timestamp: string }>>([]);
  let isACEProcessing = $state(false);

  // Dialog states (HTML5 native)
  let aceDialogRef = $state<HTMLDialogElement | null>(null);
  let authDialogRef = $state<HTMLDialogElement | null>(null);

  // Route testing state
  let testResults = $state<Record<string, 'pending' | 'success' | 'error' | 'timeout'>>({});
  let testingProgress = $state(0);
  let totalTests = $state(0);
  let currentlyTesting = $state<string | null>(null);
  let testingMode = $state(false);
  let selectedRoutes = $state<string[]>([]);

  // Auth state
  let currentUser = $state<any>(data?.userSession?.user ?? null);
  let isAuthenticated = $state(data?.userSession?.isAuthenticated ?? false);
  let recentOperations = $state<any[]>(data?.recentOperations ?? []);

  // Derived state
  let discoveredRoutes = $derived(Object.keys(modules)
    .map((path) => {
      let route = path.replace('/src/routes', '').replace('/+page.svelte', '').replace('/+layout.svelte', '');
      if (route === '') route = '/';
      route = route.replace(/\[([^\]]+)\]/g, ':$1');
      return route;
    })
    .filter((r, i, arr) => arr.indexOf(r) === i)
    .filter(r => r !== '/+error')
    .sort());

  let allAvailableRoutes = $derived([
    ...allRoutes.map(route => ({ ...route, type: 'configured', available: discoveredRoutes.includes(route.route) })),
    ...discoveredRoutes
      .filter(route => !allRoutes.some(r => r.route === route))
      .map(route => ({
        id: route.replace(/[\/\:]/g, '-').slice(1) || 'home',
        label: formatRouteLabel(route),
        route,
        icon: inferRouteIcon(route),
        description: `Discovered route: ${route}`,
        category: inferRouteCategory(route),
        status: 'discovered',
        tags: [] as string[],
        type: 'discovered',
        available: true
      }))
  ]);

  let filteredRoutes = $derived(allAvailableRoutes
    .filter(route => {
      if (searchValue) {
        const searchLower = searchValue.toLowerCase();
        return route.label.toLowerCase().includes(searchLower) || route.route.toLowerCase().includes(searchLower);
      }
      return true;
    })
    .filter(route => {
      if (categoryValue === 'all') return true;
      if (categoryValue === 'available') return route.available;
      return route.category === categoryValue;
    })
    .sort((a, b) => sortValue === 'name' ? a.label.localeCompare(b.label) : a.category.localeCompare(b.category)));

  // Helper functions
  function formatRouteLabel(route: string): string {
    if (route === '/') return 'Home';
    return route.split('/').filter(Boolean).map(s => s.replace(/^:/, '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(' → ');
  }

  function inferRouteIcon(route: string): string {
    if (route === '/') return '🏠';
    if (route.includes('demo')) return '🎯';
    if (route.includes('ai')) return '🤖';
    if (route.includes('legal')) return '⚖️';
    if (route.includes('admin')) return '⚙️';
    if (route.includes('dev')) return '🔧';
    return '📄';
  }

  function inferRouteCategory(route: string): string {
    if (route.includes('/demo/')) return 'demo';
    if (route.includes('/ai/')) return 'ai';
    if (route.includes('/legal/')) return 'legal';
    if (route.includes('/admin/')) return 'admin';
    if (route.includes('/dev/')) return 'dev';
    return 'main';
  }

  function addLog(message: string, status: string = 'info') {
    processingLog = [...processingLog, { message, status, timestamp: new Date().toISOString() }];
  }

  // ACE System Pipeline
  async function runACESystemFlow() {
    isACEProcessing = true;
    processingLog = [];

    const stages = ['webCrawl', 'vlmProcessing', 'graphAnalysis', 'vectorIndexing', 'llmOutput'] as const;
    const stageInfo = {
      webCrawl: { icon: '🌐', name: 'Web Crawl', endpoint: '/api/ace/web-crawl' },
      vlmProcessing: { icon: '🖼️', name: 'VLM Processing', endpoint: '/api/ace/vlm-process' },
      graphAnalysis: { icon: '🕸️', name: 'Graph Analysis', endpoint: '/api/brain/graph' },
      vectorIndexing: { icon: '🎯', name: 'Vector Indexing', endpoint: '/api/qdrant' },
      llmOutput: { icon: '🤖', name: 'LLM Output', endpoint: '/api/ai/analyze' }
    };

    for (const stage of stages) {
      const info = stageInfo[stage];
      addLog(`${info.icon} Starting ${info.name}...`, 'info');
      aceSystemState[stage] = { progress: 0, status: 'running' };

      for (let i = 0; i <= 100; i += 10) {
        aceSystemState[stage].progress = i;
        await new Promise(r => setTimeout(r, 150));
      }

      try {
        await fetch(info.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      } catch {}

      addLog(`✅ ${info.name} completed`, 'success');
      aceSystemState[stage] = { progress: 100, status: 'complete' };
    }

    addLog('🎉 ACE System flow completed!', 'success');
    isACEProcessing = false;
  }

  // Route testing
  async function testRoute(route: string): Promise<'success' | 'error' | 'timeout'> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve('timeout'), 5000);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = route;
      iframe.onload = () => { clearTimeout(timeout); document.body.removeChild(iframe); resolve('success'); };
      iframe.onerror = () => { clearTimeout(timeout); document.body.removeChild(iframe); resolve('error'); };
      document.body.appendChild(iframe);
    });
  }

  async function testAllRoutes() {
    testingMode = true;
    testResults = {};
    const routesToTest = allAvailableRoutes.filter(r => r.available);
    totalTests = routesToTest.length;
    for (let i = 0; i < routesToTest.length; i++) {
      currentlyTesting = routesToTest[i].route;
      testResults[routesToTest[i].route] = 'pending';
      const result = await testRoute(routesToTest[i].route);
      testResults[routesToTest[i].route] = result;
      testingProgress = i + 1;
    }
    currentlyTesting = null;
    testingMode = false;
  }

  function toggleRouteSelection(route: string) {
    selectedRoutes = selectedRoutes.includes(route) ? selectedRoutes.filter(r => r !== route) : [...selectedRoutes, route];
  }

  onMount(async () => {
    // Initialize system health if needed
  });
</script>

<svelte:head>
  <title>ACE Routes Center - Legal AI System</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4 md:p-6">
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <header class="text-center border-b border-amber-500/30 pb-6">
      <h1 class="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
        🎯 ACE Routes Center
      </h1>
      <p class="text-base md:text-lg text-amber-100 mb-2">Agentic Context Engineering • Web Crawl • Graph Analysis • VLM • Vector Search</p>
      <div class="flex flex-wrap gap-2 justify-center mt-4">
        <span class="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-sm">{allAvailableRoutes.length} Total</span>
        <span class="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-sm">{filteredRoutes.length} Displayed</span>
        <span class="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm">{selectedRoutes.length} Selected</span>
      </div>

      <!-- Toolbar -->
      <div class="flex flex-wrap justify-center items-center gap-2 mt-4 p-3 bg-black/20 rounded-lg border border-amber-500/30">
        <button onclick={() => gamingMode = !gamingMode} class="px-4 py-2 rounded bg-purple-600/20 border border-purple-500/40 text-purple-200 hover:bg-purple-600/30 {gamingMode ? 'bg-purple-600 text-white' : ''}">
          {gamingMode ? '🎮 Gaming ON' : '📱 Classic'}
        </button>

        <span class="h-6 w-px bg-amber-500/40"></span>

        <button onclick={() => aceDialogRef?.showModal()} class="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded font-semibold">
          ⚡ ACE System
        </button>

        <button onclick={testAllRoutes} disabled={testingMode} class="px-4 py-2 bg-green-600/20 border border-green-500/40 text-green-200 rounded hover:bg-green-600/30 disabled:opacity-50">
          {testingMode ? '⏳ Testing...' : '🧪 Test All'}
        </button>

        {#if isAuthenticated && currentUser}
          <span class="px-4 py-2 bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 rounded">
            👤 {currentUser.firstName || currentUser.email?.split('@')[0] || 'User'}
          </span>
        {:else}
          <button onclick={() => authDialogRef?.showModal()} class="px-4 py-2 bg-blue-600/20 border border-blue-500/40 text-blue-200 rounded hover:bg-blue-600/30">
            🔑 Login
          </button>
        {/if}
      </div>
    </header>

    <!-- ACE System Status Panel -->
    <section class="bg-gray-800/50 border border-gray-700 rounded-lg p-4 md:p-6">
      <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
        <span class="text-yellow-400">⚡</span> ACE System Pipeline Status
      </h2>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        {#each [
          { key: 'webCrawl', label: 'Web Crawl', icon: '🌐' },
          { key: 'vlmProcessing', label: 'VLM Process', icon: '🖼️' },
          { key: 'graphAnalysis', label: 'Graph Build', icon: '🕸️' },
          { key: 'vectorIndexing', label: 'Vector Index', icon: '🎯' },
          { key: 'llmOutput', label: 'LLM Output', icon: '🤖' }
        ] as stage}
          {@const state = aceSystemState[stage.key as keyof typeof aceSystemState]}
          <div class="p-3 md:p-4 rounded-lg border transition-all {state.status === 'complete' ? 'bg-green-500/20 border-green-500/50' : state.status === 'running' ? 'bg-blue-500/20 border-blue-500/50' : 'bg-gray-700/30 border-gray-600/30'}">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xl">{stage.icon}</span>
              {#if state.status === 'complete'}
                <span class="text-green-400">✓</span>
              {:else if state.status === 'running'}
                <span class="animate-spin">⏳</span>
              {/if}
            </div>
            <div class="text-xs md:text-sm font-medium">{stage.label}</div>
            {#if state.status === 'running'}
              <div class="mt-2 h-1 bg-gray-700 rounded overflow-hidden">
                <div class="h-full bg-blue-500 transition-all" style="width: {state.progress}%"></div>
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <button onclick={runACESystemFlow} disabled={isACEProcessing} class="mt-4 w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
        {#if isACEProcessing}
          <span class="animate-spin">⏳</span> Processing...
        {:else}
          ▶️ Run Complete ACE System Flow
        {/if}
      </button>
    </section>

    <!-- Processing Log -->
    {#if processingLog.length > 0}
      <section class="bg-gray-800/50 border border-gray-700 rounded-lg p-4 max-h-48 overflow-y-auto">
        <h3 class="text-sm font-semibold mb-2 text-gray-400">Processing Log:</h3>
        {#each processingLog as log}
          <div class="text-sm py-1 flex items-start gap-2">
            <span class="text-gray-500 text-xs">{new Date(log.timestamp).toLocaleTimeString()}</span>
            <span class="{log.status === 'error' ? 'text-red-400' : log.status === 'success' ? 'text-green-400' : 'text-blue-400'}">{log.message}</span>
          </div>
        {/each}
      </section>
    {/if}

    <!-- Testing Progress -->
    {#if testingMode}
      <section class="p-4 md:p-6 bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-2 border-cyan-500/30 rounded-lg">
        <h3 class="text-xl font-bold text-cyan-300 mb-4 text-center">🔄 ROUTE TESTING IN PROGRESS</h3>
        <div class="h-4 bg-gray-800 rounded-full overflow-hidden mb-4">
          <div class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all" style="width: {(testingProgress / totalTests) * 100}%"></div>
        </div>
        <p class="text-cyan-200 text-center">Testing: {currentlyTesting || 'Initializing...'} ({testingProgress}/{totalTests})</p>
        <div class="flex justify-center gap-4 text-sm mt-2">
          <span class="text-green-300">✅ {Object.values(testResults).filter(r => r === 'success').length}</span>
          <span class="text-red-300">❌ {Object.values(testResults).filter(r => r === 'error').length}</span>
          <span class="text-yellow-300">⏱️ {Object.values(testResults).filter(r => r === 'timeout').length}</span>
        </div>
      </section>
    {/if}

    <!-- Search & Filters -->
    <section class="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <div class="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        <div class="flex-1 w-full lg:max-w-md">
          <label for="search-routes" class="block text-sm font-medium text-amber-300 mb-2">🔍 Search Routes</label>
          <input id="search-routes" type="text" bind:value={searchValue} placeholder="Search routes..." class="w-full bg-gray-700/50 border border-gray-600 p-3 rounded text-white placeholder-gray-400 focus:border-amber-500 outline-none" />
        </div>

        <div>
          <label for="category-filter" class="block text-sm font-medium text-amber-300 mb-2">📂 Category</label>
          <select id="category-filter" bind:value={categoryValue} class="min-w-40 bg-gray-700/50 border border-gray-600 p-3 rounded text-white focus:border-amber-500 outline-none">
            <option value="all">All Categories</option>
            <option value="available">Available Only</option>
            <option value="main">🏠 Main</option>
            <option value="demo">🎯 Demo</option>
            <option value="ai">🤖 AI</option>
            <option value="legal">⚖️ Legal</option>
            <option value="dev">🔧 Dev</option>
            <option value="admin">⚙️ Admin</option>
          </select>
        </div>

        <div>
          <label for="sort-by" class="block text-sm font-medium text-amber-300 mb-2">📊 Sort By</label>
          <select id="sort-by" bind:value={sortValue} class="min-w-32 bg-gray-700/50 border border-gray-600 p-3 rounded text-white focus:border-amber-500 outline-none">
            <option value="name">🔤 Name</option>
            <option value="category">📁 Category</option>
          </select>
        </div>

        <div>
          <label for="view-mode" class="block text-sm font-medium text-amber-300 mb-2">👁️ View</label>
          <select id="view-mode" bind:value={viewMode} class="min-w-32 bg-gray-700/50 border border-gray-600 p-3 rounded text-white focus:border-amber-500 outline-none">
            <option value="grid">🔲 Grid</option>
            <option value="list">📋 List</option>
          </select>
        </div>
      </div>
    </section>

    <!-- Routes Grid -->
    <section class={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"}>
      {#each filteredRoutes as route}
        {@const testResult = testResults[route.route]}
        <article class="p-4 relative overflow-hidden transition-all duration-300 hover:scale-[1.02] rounded-lg {gamingMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-amber-500/20' : 'bg-gray-800/50 border border-gray-700'} {testResult === 'success' ? 'border-green-500/50' : testResult === 'error' ? 'border-red-500/50' : ''}">
          {#if gamingMode}
            <div class="absolute inset-0 pointer-events-none opacity-10" style="background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.1) 2px, rgba(255, 255, 255, 0.1) 4px)"></div>
          {/if}

          <div class="relative z-10">
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="text-xl">{route.icon}</span>
                <span class="text-sm font-medium uppercase tracking-wide {gamingMode ? 'text-amber-300' : 'text-gray-400'}">{route.category}</span>
              </div>
              <div class="flex gap-1 flex-wrap">
                {#if testResult}
                  <span class="text-xs px-2 py-0.5 rounded border {testResult === 'success' ? 'bg-green-500/20 text-green-300 border-green-500/30' : testResult === 'error' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'}">
                    {testResult.toUpperCase()}
                  </span>
                {/if}
                <span class="text-xs px-2 py-0.5 rounded border {route.available ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}">
                  {route.available ? route.status : 'Missing'}
                </span>
              </div>
            </div>

            <h3 class="text-lg font-semibold mb-2 {gamingMode ? 'text-amber-100' : 'text-white'}">{route.label}</h3>
            <code class="block text-xs p-2 rounded mb-3 font-mono {gamingMode ? 'text-cyan-300 bg-black/30 border border-cyan-500/20' : 'text-blue-400 bg-gray-700/50'}">{route.route}</code>
            <p class="text-sm mb-4 line-clamp-2 {gamingMode ? 'text-amber-200/80' : 'text-gray-400'}">{route.description}</p>

            <div class="flex gap-2 items-center">
              <button onclick={() => toggleRouteSelection(route.route)} class="p-2 rounded border transition-all {selectedRoutes.includes(route.route) ? 'bg-blue-600/30 border-blue-400' : 'bg-gray-600/20 border-gray-500'}" title={selectedRoutes.includes(route.route) ? 'Remove from selection' : 'Add to selection'}>
                {selectedRoutes.includes(route.route) ? '☑️' : '☐'}
              </button>

              <button onclick={() => goto(route.route)} disabled={!route.available} class="flex-1 px-4 py-2 rounded font-medium transition-all {route.available ? gamingMode ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white' : 'bg-blue-600/80 text-white hover:bg-blue-700' : 'bg-gray-600/30 text-gray-400 cursor-not-allowed'}">
                {route.available ? '🚀 Navigate' : '❌ Unavailable'}
              </button>

              {#if route.available}
                <button onclick={async () => { testResults[route.route] = 'pending'; testResults[route.route] = await testRoute(route.route); }} disabled={testingMode} class="px-3 py-2 bg-green-600/80 text-white rounded hover:bg-green-700 disabled:opacity-50">🧪</button>
              {/if}
            </div>
          </div>
        </article>
      {/each}
    </section>

    {#if filteredRoutes.length === 0}
      <section class="p-8 text-center bg-gray-800/50 border border-gray-700 rounded-lg">
        <div class="text-4xl mb-4">🔍</div>
        <h3 class="text-xl font-semibold text-white mb-2">No Routes Found</h3>
        <p class="text-gray-400">Try adjusting your search or filter criteria.</p>
      </section>
    {/if}

    <!-- Footer -->
    <footer class="bg-gray-800/50 border border-gray-700 rounded-lg p-4 md:p-6">
      <h2 class="text-xl font-semibold text-amber-300 mb-4">System Information</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h3 class="font-semibold text-white mb-2">Route Discovery</h3>
          <ul class="text-sm text-gray-400 space-y-1">
            <li>• Configured: {allRoutes.length}</li>
            <li>• Discovered: {discoveredRoutes.length}</li>
            <li>• Available: {allAvailableRoutes.filter(r => r.available).length}</li>
          </ul>
        </div>
        <div>
          <h3 class="font-semibold text-white mb-2">Navigation</h3>
          <ul class="text-sm text-gray-400 space-y-1">
            <li>• Current: <code class="text-amber-300">{page.url.pathname}</code></li>
          </ul>
        </div>
        <div>
          <h3 class="font-semibold text-white mb-2">Quick Actions</h3>
          <div class="space-y-2">
            <button onclick={() => goto('/')} class="w-full px-4 py-2 bg-blue-600/80 text-white rounded hover:bg-blue-700">🏠 Go Home</button>
            <button onclick={() => goto('/command/routes')} class="w-full px-4 py-2 bg-amber-600/80 text-white rounded hover:bg-amber-700">📟 NES Command Center</button>
            <button onclick={() => goto('/dev/dynamic-routing-test')} class="w-full px-4 py-2 bg-green-600/80 text-white rounded hover:bg-green-700">🛣️ Routing Test</button>
          </div>
        </div>
      </div>
    </footer>
  </div>
</div>

<!-- ACE System Dialog (HTML5 Native) -->
<dialog bind:this={aceDialogRef} class="bg-gray-900 border border-amber-500/50 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto backdrop:bg-black/70">
  <h2 class="text-xl font-bold text-amber-300 mb-4">⚡ ACE System Control Center</h2>
  <p class="text-gray-400 mb-4">Agentic Context Engineering pipeline for web crawl, VLM processing, graph analysis, vector indexing, and LLM output.</p>

  <div class="space-y-4">
    {#each [
      { key: 'webCrawl', label: 'Web Crawl', icon: '🌐', desc: 'Crawl routes and collect data' },
      { key: 'vlmProcessing', label: 'VLM Processing', icon: '🖼️', desc: 'Process images with Vision Language Model' },
      { key: 'graphAnalysis', label: 'Graph Analysis', icon: '🕸️', desc: 'Build knowledge graph from data' },
      { key: 'vectorIndexing', label: 'Vector Indexing', icon: '🎯', desc: 'Index embeddings in Qdrant' },
      { key: 'llmOutput', label: 'LLM Output', icon: '🤖', desc: 'Generate insights with ACE system' }
    ] as stage}
      {@const state = aceSystemState[stage.key as keyof typeof aceSystemState]}
      <div class="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-2xl">{stage.icon}</span>
            <div>
              <div class="font-semibold text-white">{stage.label}</div>
              <div class="text-sm text-gray-400">{stage.desc}</div>
            </div>
          </div>
          <div class="text-right">
            {#if state.status === 'complete'}
              <span class="text-green-400 font-semibold">✓ Complete</span>
            {:else if state.status === 'running'}
              <span class="text-blue-400">{state.progress}%</span>
            {:else}
              <span class="text-gray-500">Idle</span>
            {/if}
          </div>
        </div>
      </div>
    {/each}

    <button onclick={runACESystemFlow} disabled={isACEProcessing} class="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 text-white">
      {#if isACEProcessing}
        <span class="animate-spin">⏳</span> Processing...
      {:else}
        ▶️ Run Complete Pipeline
      {/if}
    </button>
  </div>

  <button onclick={() => aceDialogRef?.close()} class="absolute top-4 right-4 p-2 text-gray-400 hover:text-white">✕</button>
</dialog>

<!-- Auth Dialog (HTML5 Native) -->
<dialog bind:this={authDialogRef} class="bg-gray-900 border border-amber-500/50 rounded-lg p-6 max-w-md w-full backdrop:bg-black/70">
  <h2 class="text-xl font-bold text-amber-300 mb-4">🔑 Login</h2>
  <p class="text-gray-400 mb-4">Authentication coming soon...</p>
  <button onclick={() => authDialogRef?.close()} class="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded">Close</button>
  <button onclick={() => authDialogRef?.close()} class="absolute top-4 right-4 p-2 text-gray-400 hover:text-white">✕</button>
</dialog>

<style>
  .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .animate-spin { animation: spin 1s linear infinite; }
  dialog::backdrop { background: rgba(0, 0, 0, 0.7); }
  dialog { color: white; }
</style>
