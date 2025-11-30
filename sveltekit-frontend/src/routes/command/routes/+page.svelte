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
    iconClass?: string;
  };

  let dialog: HTMLDialogElement;
  let routes = $state<RouteEntry[]>([]);
  let stats = $state({ total: 0, pages: 0, endpoints: 0, layouts: 0, byTag: {} as Record<string, number> });
  let loading = $state(true);
  let searchQuery = $state('');

  // Icon mapping for routes
  const routeIcons = [
    { icon: '🏆', class: 'nes-icon trophy' },
    { icon: '⭐', class: 'nes-icon star' },
    { icon: '💰', class: 'nes-icon coin' },
    { icon: '❤️', class: 'nes-icon heart' },
    { icon: '👾', class: 'nes-mario' },
    { icon: '🎮', class: 'nes-icon gamepad' },
    { icon: '⚔️', class: 'nes-icon sword' },
    { icon: '🛡️', class: 'nes-icon shield' },
    { icon: '📜', class: 'nes-icon scroll' },
    { icon: '🔑', class: 'nes-icon key' },
    { icon: '💎', class: 'nes-icon gem' },
    { icon: '🎯', class: 'nes-icon target' },
    { icon: '🚀', class: 'nes-icon rocket' },
    { icon: '⚡', class: 'nes-icon bolt' },
    { icon: '🌟', class: 'nes-icon star-full' },
    { icon: '🎪', class: 'nes-icon tent' },
    { icon: '🏰', class: 'nes-icon castle' },
    { icon: '🗡️', class: 'nes-icon blade' },
    { icon: '🎲', class: 'nes-icon dice' },
    { icon: '🔮', class: 'nes-icon orb' }
  ];

  let filteredRoutes = $derived.by(() => {
    if (!searchQuery) return routes;
    const query = searchQuery.toLowerCase();
    return routes.filter(route =>
      route.path.toLowerCase().includes(query) ||
      route.tags.some(t => t.toLowerCase().includes(query)) ||
      route.kind.toLowerCase().includes(query)
    );
  });

  onMount(async () => {
    try {
      const res = await fetch('/api/routes/all');
      const data = await res.json();
      // Assign icons to routes
      routes = data.routes.map((route: RouteEntry, idx: number) => ({
        ...route,
        icon: routeIcons[idx % routeIcons.length].icon,
        iconClass: routeIcons[idx % routeIcons.length].class
      }));
      stats = data.stats;
      loading = false;
    } catch (e) {
      console.error('Failed to load routes:', e);
      loading = false;
    }
  });

  function openDialog() {
    dialog?.showModal();
  }

  function closeDialog() {
    dialog?.close();
  }

  function navigateToRoute(path: string) {
    closeDialog();
    goto(path);
  }
</script>

<svelte:head>
  <title>NES Route Level Select</title>
</svelte:head>

<div class="center-container">
  <div class="nes-container is-dark with-title">
    <p class="title">Route Discovery</p>

    <div class="stats-grid">
      <div class="nes-container is-rounded stat-box">
        <p class="stat-label">Total</p>
        <p class="stat-value">{stats.total}</p>
      </div>
      <div class="nes-container is-rounded stat-box">
        <p class="stat-label">Pages</p>
        <p class="stat-value">{stats.pages}</p>
      </div>
      <div class="nes-container is-rounded stat-box">
        <p class="stat-label">Endpoints</p>
        <p class="stat-value">{stats.endpoints}</p>
      </div>
      <div class="nes-container is-rounded stat-box">
        <p class="stat-label">Layouts</p>
        <p class="stat-value">{stats.layouts}</p>
      </div>
    </div>

    {#if loading}
      <div class="loading-state">
        <p class="nes-text is-primary">Loading routes...</p>
      </div>
    {:else}
      <button type="button" class="nes-btn is-primary btn-large" onclick={openDialog}>
        <i class="nes-icon trophy is-small"></i>
        Select Level ({routes.length} Routes)
      </button>
    {/if}

    <div class="nav-links">
      <a href="/test-route-discovery" class="nes-btn is-warning">Test View</a>
      <a href="/all-routes" class="nes-btn is-success">Gaming View</a>
    </div>
  </div>
</div>

<dialog bind:this={dialog} class="nes-dialog route-dialog">
  <form method="dialog">
    <div class="dialog-header">
      <h2 class="nes-text is-primary">
        <i class="nes-icon trophy is-small"></i>
        Level Select
      </h2>
      <button type="button" class="nes-btn is-error" onclick={closeDialog}>✕</button>
    </div>

    <div class="search-box">
      <div class="nes-field">
        <input
          type="text"
          class="nes-input"
          bind:value={searchQuery}
          placeholder="Search routes..."
        />
      </div>
      <p class="search-count">{filteredRoutes.length} / {routes.length}</p>
    </div>

    <div class="level-grid-container">
      <div class="level-grid">
        {#each filteredRoutes as route (route.id)}
          <a
            href={route.kind === 'page' ? route.path : '#'}
            class="level-link nes-container is-rounded"
            onclick={(e) => {
              if (route.kind === 'page') {
                e.preventDefault();
                navigateToRoute(route.path);
              } else {
                e.preventDefault();
              }
            }}
          >
            <div class="level-icon">{route.icon}</div>
            <div class="level-kind nes-badge">
              <span class={route.kind === 'page' ? 'is-success' : route.kind === 'endpoint' ? 'is-primary' : 'is-warning'}>
                {route.kind}
              </span>
            </div>
            <div class="level-path">{route.path}</div>
            {#if route.methods.length > 0}
              <div class="level-methods">
                {route.methods.join(' • ')}
              </div>
            {/if}
          </a>
        {/each}
      </div>

      {#if filteredRoutes.length === 0}
        <div class="no-results">
          <p class="nes-text is-error">No routes found!</p>
          <p>Try a different search term</p>
        </div>
      {/if}
    </div>
  </form>
</dialog>

<style>
  .center-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 2rem;
    background: linear-gradient(135deg, #209cee 0%, #667eea 100%);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin: 1.5rem 0;
  }

  .stat-box {
    text-align: center;
    padding: 1rem;
  }

  .stat-label {
    font-size: 0.75rem;
    margin: 0 0 0.5rem 0;
    opacity: 0.8;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: bold;
    margin: 0;
  }

  .btn-large {
    width: 100%;
    margin: 1.5rem 0;
    padding: 1rem;
    font-size: 1.1rem;
  }

  .nav-links {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 1rem;
  }

  .loading-state {
    text-align: center;
    padding: 2rem;
  }

  /* Dialog Styles */
  .route-dialog {
    max-width: 90vw;
    width: 1200px;
    max-height: 80vh;
    border: 4px solid #000;
    padding: 0;
  }

  dialog::backdrop {
    backdrop-filter: blur(4px);
    background: rgba(0, 0, 0, 0.7);
  }

  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 2px solid #000;
    background: #f7f7f7;
  }

  .dialog-header h2 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .search-box {
    padding: 1rem 1.5rem;
    background: #fff;
    border-bottom: 2px solid #000;
  }

  .search-count {
    margin: 0.5rem 0 0 0;
    font-size: 0.875rem;
    text-align: right;
    opacity: 0.7;
  }

  /* Scrollable Grid Container */
  .level-grid-container {
    max-height: calc(80vh - 250px);
    overflow-y: auto;
    padding: 1.5rem;
    background: #fff;
  }

  /* 3-Column Grid */
  .level-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  /* Clickable Level Blocks */
  .level-link {
    display: block;
    padding: 1.5rem;
    text-align: center;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s ease;
    cursor: pointer;
    position: relative;
  }

  .level-link:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    background: #f0f0f0;
  }

  .level-link:active {
    transform: translateY(-2px);
  }

  .level-icon {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .level-kind {
    margin: 0.5rem 0;
  }

  .level-kind span {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
  }

  .level-path {
    font-size: 0.875rem;
    font-weight: bold;
    margin: 0.5rem 0;
    word-break: break-word;
    min-height: 2.5rem;
  }

  .level-methods {
    font-size: 0.7rem;
    opacity: 0.7;
    margin-top: 0.5rem;
  }

  .no-results {
    text-align: center;
    padding: 3rem;
  }

  .no-results p {
    margin: 0.5rem 0;
  }

  /* Mobile Responsive */
  @media (max-width: 1024px) {
    .level-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .level-grid {
      grid-template-columns: 1fr;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .route-dialog {
      max-width: 95vw;
    }

    .nav-links {
      flex-direction: column;
    }
  }

  /* Custom Scrollbar */
  .level-grid-container::-webkit-scrollbar {
    width: 8px;
  }

  .level-grid-container::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  .level-grid-container::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  .level-grid-container::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
</style>
