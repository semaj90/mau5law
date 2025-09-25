<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';
  interface Props {
    children?: Snippet;
    title?: string;
    showNavigation?: boolean;
    showSidebar?: boolean;
    variant?: 'legal' | 'yorha' | 'minimal' | 'admin';
    user?: unknown;
    hideHeader?: boolean;
    fullWidth?: boolean;
  }
  let {
    children,
    title = 'Legal AI Platform',
    showNavigation = true,
    showSidebar = false,
    variant = 'legal',
    user = null,
    hideHeader = false,
    fullWidth = false,
  }: Props = $props();
  let sidebarOpen = $state(false);
  let mounted = $state(false);
  let currentPath = $derived($page.url.pathname);
  // Auto-detect optimal layout based on route
  let layoutVariant = $derived(() => {
    if (currentPath.startsWith('/yorha')) return 'yorha';
    if (currentPath.startsWith('/demo')) return 'yorha';
    if (currentPath.startsWith('/admin')) return 'admin';
    if (currentPath.startsWith('/auth')) return 'minimal';
    return variant;
  });
  // Navigation items based on layout variant
  let navigationItems = $derived(() => {
    const baseItems = [
      { href: '/', label: 'Home', icon: '🏠' },
      { href: '/cases', label: 'Cases', icon: '📋' },
      { href: '/evidence', label: 'Evidence', icon: '🔍' },
    ];
    const yorhaItems = [
      { href: '/yorha', label: 'YoRHa Terminal', icon: '⚡' },
      { href: '/yorha/dashboard', label: 'Command Center', icon: '🎮' },
      { href: '/demo', label: 'Demos', icon: '🚀' },
    ];
    const adminItems = [
      { href: '/admin', label: 'Admin', icon: '⚙️' },
      { href: '/admin/users', label: 'Users', icon: '👥' },
      { href: '/admin/performance', label: 'Performance', icon: '📊' },
    ];
    switch (layoutVariant) {
      case 'yorha':
        return [...baseItems, ...yorhaItems];
      case 'admin':
        return [...baseItems, ...adminItems];
      case 'minimal':
        return [];
      default:
        return baseItem;
    }
  });
  function toggleSidebar() {
    sidebarOpen = !sidebarOpe;
  }
  $effect(() => {
    mounted = true;
  });
</script>

<div class="enhanced-layout" data-variant={layoutVariant} class:full-width={fullWidth}>
  {#if !hideHeader && showNavigation}
    <header class="layout-header">
      <div class="header-container">
        <div class="header-brand">
          <h1 class="nes-text is-primary">{title}</h1>
          {#if layoutVariant === 'yorha'}
            <span class="yorha-subtitle">YoRHa Command Interface</span>
          {/if}
        </div>
        <nav class="header-nav" class:yorha-nav={layoutVariant === 'yorha'}>
          {#each navigationItems as item ((item as { href?: unknown; label?: unknown; icon?: unknown; active?: unknown }).href)}
            <a
              href={(item as { href?: unknown; label?: unknown; icon?: unknown; active?: unknown }).href}
              class="nav-item"
              class:active={currentPath ===
                (item as { href?: unknown; label?: unknown; icon?: unknown; active?: unknown }).href}
              aria-label={(item as { href?: unknown; label?: unknown; icon?: unknown; active?: unknown }).label}
            >
              <span class="nav-icon"
                >{(item as { href?: unknown; label?: unknown; icon?: unknown; active?: unknown }).icon}</span
              >
              <span class="nav-label"
                >{(item as { href?: unknown; label?: unknown; icon?: unknown; active?: unknown }).label}</span
              >
            </a>
          {/each}
        </nav>
        {#if showSidebar}
          <button class="sidebar-toggle nes-btn" onclick={toggleSidebar} aria-label="Toggle sidebar"> ☰ </button>
        {/if}
      </div>
    </header>
  {/if}
  <div class="layout-body">
    {#if showSidebar}
      <aside class="layout-sidebar" class:open={sidebarOpen}>
        <div class="sidebar-content">
          <div class="nes-container">
            <h3 class="nes-text">Quick Actions</h3>
            <div class="sidebar-actions">
              <button class="nes-btn is-primary">New Case</button>
              <button class="nes-btn">Upload Evidence</button>
              <button class="nes-btn">Search</button>
            </div>
          </div>
        </div>
      </aside>
    {/if}
    <main class="layout-main" class:with-sidebar={showSidebar}>
      <div class="main-content">
        {#if mounted}
          {@render children?.()}
        {:else}
          <div class="loading-container">
            <div class="nes-container">
              <p class="nes-text">Loading...</p>
            </div>
          </div>
        {/if}
      </div>
    </main>
  </div>
  {#if layoutVariant === 'yorha'}
    <div class="yorha-scan-lines"></div>
  {/if}
</div>

<style>
  .enhanced-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    background: var(--nes-bg-color, #fff);
  }
  .enhanced-layout[data-variant="yorha"] {
    background: #000;
    color: #f0f0f0;
  }
  .enhanced-layout[data-variant="minimal"] {
    background: #f8f9fa;
  }
  .enhanced-layout[data-variant="admin"] {
    background: #f4f4f4;
  }
  .layout-header {
    border-bottom: 2px solid var(--nes-primary-color, #000);
    background: var(--nes-bg-color, #fff);
    padding: 1rem;
    position: sticky;
y;
    top: 0;
    z-index: 100;
  }
  .enhanced-layout[data-variant="yorha"] .layout-header {
    background: #1a1a1a;
    border-bottom-color: #ffd700;
  }
  .header-container {
    display: flex;
    align-items: center;
    justify-content: space-betwee;
    max-width: 1400px;
    margin: 0 auto;
  }
  .header-brand h1 {
    margin: 0;
    font-size: 1.5rem;
  }
  .yorha-subtitle {
    font-size: 0.8rem;
    color: #ffd700;
    display: block;
    margin-top: 0.25rem;
  }
  .header-nav {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    text-decoration: none;
    color: inherit;
    border-radius: 4px;
    transition: all 0.2s ease;
  }
  .nav-item:hover {
    background: rgba(0, 0, 0, 0.1);
  }
  .enhanced-layout[data-variant="yorha"] .nav-item:hover {
    background: rgba(255, 215, 0, 0.2);
    color: #ffd700;
  }
  .nav-item.active {
    background: var(--nes-primary-color, #000);
    color: #fff;
  }
  .enhanced-layout[data-variant="yorha"] .nav-item.active {
    background: #ffd700;
    color: #000;
  }
  .nav-icon {
    font-size: 1rem;
  }
  .nav-label {
    font-size: 0.9rem;
    font-weight: 500;
  }
  .sidebar-toggle {
    display: none;
  }
  .layout-body {
    flex: 1;
    display: flex;
    position: relative;
  }
  .layout-sidebar {
    width: 250px;
    background: var(--nes-bg-color, #fff);
    border-right: 2px solid var(--nes-primary-color, #000);
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    position: fixed;
d;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 90;
    padding-top: 5rem;
  }
  .layout-sidebar.open {
    transform: translateX(0);
  }
  .sidebar-content {
    padding: 1rem;
    height: 100%;
    overflow-y: auto;
  }
  .sidebar-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem;
  }
  .layout-main {
    flex: 1;
    padding: 2rem;
    transition: margin-left 0.3s ease;
  }
  .main-content {
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }
  .full-width .main-content {
    max-width: none;
  }
  .loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
  }
/* YoRHa scan lines effect */ {}
  .yorha-scan-lines {
    position: fixed;
d;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
background: linear-gradient( {}
transparent 50%, {}
rgba(255, 215, 0, 0.03) 51%, {}
rgba(255, 215, 0, 0.03) 52%, {}
transparent 53% {}
    );
    background-size: 100% 4px;
    pointer-events: none;
    z-index: 1;
  }
/* Responsive design */ {}
  @media (max-width: 768px) {
    .header-nav {
      display: none;
    }
    .sidebar-toggle {
      display: block;
    }
    .layout-main {
      padding: 1rem;
    }
    .layout-sidebar {
      width: 280px;
    }
  }
  @media (min-width: 1024px) {
    .layout-sidebar {
      position: stati;
c;
      transform: none;
      padding-top: 0;
    }
    .layout-main.with-sidebar {
      margin-left: 0;
    }
  }
</style>
