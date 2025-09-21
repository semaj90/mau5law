<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import NavBar from './NavBar.svelte';
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
    variant?: 'full' | 'minimal' | 'demo' | 'admin';
    user?: unknown;
    showSidebar?: boolean;
    title?: string;
    hideNav?: boolean;
  }

  let {
    children,
    variant = 'full',
    user = null,
    showSidebar = true,
    title = '',
    hideNav = false
  }: Props = $props();

  let sidebarOpen = $state(false);
  let mounted = $state(false);
  let currentPath = $derived($page.url.pathname);

  // Auto-detect variant based on route
  let autoVariant = $derived(() => {
    if (currentPath.startsWith('/demo')) return 'demo';
    if (currentPath.startsWith('/admin')) return 'admin';
    if (currentPath.startsWith('/auth')) return 'minimal';
    return variant;
  });

  // Check if we're in a demo route
  let isDemoRoute = $derived(currentPath.startsWith('/demo'));
  let isAuthRoute = $derived(currentPath.startsWith('/auth'));
  let isAdminRoute = $derived(currentPath.startsWith('/admin'));

  onMount(() => {
    mounted = true;
  });
</script>

<div class="unified-layout" data-variant={autoVariant}>
  {#if !hideNav}
    <NavBar
      bind:sidebarOpen
      {user}
      variant={autoVariant}
    />
  {/if}

  <!-- Skip Navigation Link for Accessibility -->
  <a
    href="#main-content"
    class="skip-nav"
  >
    Skip to main content
  </a>

  <!-- Main Content Area -->
  <div class="content-wrapper" class:no-nav={hideNav}>
    <!-- Sidebar Overlay for Mobile -->
    {#if sidebarOpen && browser}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="sidebar-overlay nes-container is-dark"
        onclick={() => sidebarOpen = false}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === 'Enter' && (sidebarOpen = false)}
      ></div>
    {/if}

    <!-- Main Content -->
    <main
      id="main-content"
      class="main-content"
      class:demo-theme={isDemoRoute}
      class:admin-theme={isAdminRoute}
      class:auth-theme={isAuthRoute}
      aria-label="Main content"
    >
      {#if title}
        <div class="page-header nes-container with-title">
          <p class="title">{title}</p>
        </div>
      {/if}

      <div class="content-container">
        {#if mounted && children}
          {@render children()}
        {:else if mounted}
          <div class="loading-fallback nes-container is-rounded">
            <p class="nes-text is-primary">Loading...</p>
          </div>
        {/if}
      </div>
    </main>
  </div>
</div>

<style>
  /* Root Layout Styles */
  .unified-layout {
    min-height: 100vh;
    background: linear-gradient(135deg,
      var(--nier-bg-primary, #0f0f23),
      var(--nier-bg-secondary, #1a1a2e)
    );
    color: var(--nier-text-primary, #e2e8f0);
    font-family: 'JetBrains Mono', 'Press Start 2P', monospace;
  }

  /* Skip Navigation */
  .skip-nav {
    position: absolute;
    top: -40px;
    left: 6px;
    background: var(--n64-primary, #4a90e2);
    color: white;
    padding: 8px;
    text-decoration: none;
    border-radius: 4px;
    z-index: 100;
    font-size: 14px;
  }

  .skip-nav:focus {
    top: 6px;
  }

  /* Content Wrapper */
  .content-wrapper {
    display: flex;
    min-height: calc(100vh - 64px); /* Account for navbar */
    margin-top: 64px; /* Navbar height */
  }

  .content-wrapper.no-nav {
    margin-top: 0;
    min-height: 100vh;
  }

  /* Sidebar Overlay for Mobile */
  .sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 25;
    cursor: pointer;
  }

  @media (min-width: 768px) {
    .sidebar-overlay {
      display: none;
    }
  }

  /* Main Content */
  .main-content {
    flex: 1;
    padding: 1.5rem;
    overflow-y: auto;
    background: transparent;
  }

  /* Page Header */
  .page-header {
    margin-bottom: 1.5rem;
    background: linear-gradient(135deg,
      var(--n64-primary, #4a90e2),
      var(--n64-secondary, #7ed321)
    ) !important;
  }

  .page-header .title {
    color: white !important;
    font-family: 'Press Start 2P', cursive !important;
    font-size: 1rem !important;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 0 !important;
  }

  /* Content Container */
  .content-container {
    max-width: 100%;
    margin: 0 auto;
  }

  /* Loading Fallback */
  .loading-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    background: rgba(26, 26, 46, 0.8) !important;
    border: 2px solid var(--n64-primary, #4a90e2) !important;
  }

  /* Theme Variants */

  /* Demo Theme */
  .main-content.demo-theme {
    background: linear-gradient(135deg,
      rgba(74, 144, 226, 0.05),
      rgba(126, 227, 33, 0.05)
    );
  }

  .main-content.demo-theme .content-container {
    background: rgba(26, 26, 46, 0.3);
    border-radius: 8px;
    padding: 1.5rem;
    border: 1px solid var(--n64-primary, #4a90e2);
  }

  /* Admin Theme */
  .main-content.admin-theme {
    background: linear-gradient(135deg,
      rgba(208, 2, 27, 0.05),
      rgba(245, 166, 35, 0.05)
    );
  }

  .main-content.admin-theme .content-container {
    background: rgba(46, 26, 26, 0.3);
    border-radius: 8px;
    padding: 1.5rem;
    border: 1px solid var(--nes-error, #d0021b);
  }

  /* Auth Theme */
  .main-content.auth-theme {
    background: linear-gradient(135deg,
      rgba(15, 15, 35, 0.9),
      rgba(26, 26, 46, 0.9)
    );
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 64px);
  }

  .main-content.auth-theme .content-container {
    max-width: 400px;
    width: 100%;
    background: rgba(26, 26, 46, 0.8);
    border-radius: 12px;
    padding: 2rem;
    border: 2px solid var(--n64-primary, #4a90e2);
    backdrop-filter: blur(10px);
  }

  /* Layout Variants */

  /* Minimal Layout */
  [data-variant="minimal"] .main-content {
    padding: 1rem;
  }

  /* Full Layout */
  [data-variant="full"] .content-container {
    max-width: 1200px;
  }

  /* Demo Layout */
  [data-variant="demo"] .main-content {
    background: linear-gradient(135deg,
      rgba(26, 26, 46, 0.8),
      rgba(22, 33, 62, 0.8)
    );
  }

  [data-variant="demo"] .content-container {
    background: rgba(74, 144, 226, 0.05);
    border-radius: 12px;
    padding: 2rem;
    border: 2px solid var(--n64-primary, #4a90e2);
    backdrop-filter: blur(5px);
  }

  /* Admin Layout */
  [data-variant="admin"] .main-content {
    background: linear-gradient(135deg,
      rgba(46, 26, 26, 0.8),
      rgba(60, 35, 35, 0.8)
    );
  }

  [data-variant="admin"] .content-container {
    background: rgba(208, 2, 27, 0.05);
    border-radius: 12px;
    padding: 2rem;
    border: 2px solid var(--nes-error, #d0021b);
    backdrop-filter: blur(5px);
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .main-content {
      padding: 1rem;
    }

    .page-header .title {
      font-size: 0.875rem !important;
    }

    .content-container {
      padding: 1rem;
    }

    .auth-theme .content-container {
      margin: 1rem;
      padding: 1.5rem;
    }
  }

  /* Custom scrollbar for content areas */
  .main-content ::-webkit-scrollbar {
    width: 8px;
  }

  .main-content ::-webkit-scrollbar-track {
    background: rgba(26, 26, 46, 0.3);
    border-radius: 4px;
  }

  .main-content ::-webkit-scrollbar-thumb {
    background: var(--n64-primary, #4a90e2);
    border-radius: 4px;
    border: 1px solid var(--n64-secondary, #7ed321);
  }

  .main-content ::-webkit-scrollbar-thumb:hover {
    background: var(--n64-secondary, #7ed321);
    box-shadow: 0 0 8px var(--n64-secondary, #7ed321);
  }

  /* Print styles */
  @media print {
    .unified-layout {
      background: white !important;
      color: black !important;
    }

    .skip-nav,
    .sidebar-overlay {
      display: none !important;
    }

    .main-content {
      background: white !important;
      color: black !important;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .unified-layout {
      background: #000 !important;
      color: #fff !important;
    }

    .page-header,
    .content-container {
      border-width: 3px !important;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
      animation: none !important;
    }
  }
</style>