<!-- YoRHa Interface Layout -->
<script lang="ts">
  import '../../app.css'; // Add this line to import the global Tailwind CSS
  // Svelte 5 runes are auto-imported
  let { children } = $props(); // Corrected: Removed explicit type annotation
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { yorhaAPI } from '$lib/components/three/yorha-ui/api/YoRHaAPIClient';
  import { onDestroy } from 'svelte';
  import {
    Home,
    Terminal,
    Monitor,
    Settings,
    Database,
    Activity,
    Cpu,
    Search,
    FileText,
    Bot,
    ChevronRight,
    ChevronLeft,
  } from 'lucide-svelte';
  import type { ComponentType } from 'svelte'; // Added: Import ComponentType

  // Added: Define NavItem interface
  interface NavItem {
    path: string;
    label: string;
    icon: ComponentType;
    description: string;
  }

  // System status and navigation
  let systemStatus = $state({
    connected: false,
    services: 0,
    errors: 0,
  });
  let sidebarOpen = $state(false);
  let currentPath = $state('');
  // Navigation structure
  const navItems: NavItem[] = [
    // Modified: Applied NavItem interface
    {
      path: '/yorha',
      label: 'Command Center',
      icon: Terminal,
      description: 'Main YoRHa interface hub',
    },
    {
      path: '/yorha/dashboard',
      label: 'System Dashboard',
      icon: Monitor,
      description: 'Live system monitoring',
    },
    {
      path: '/yorha/components',
      label: 'UI Components',
      icon: Bot,
      description: '3D UI component gallery',
    },
    {
      path: '/yorha/api-test',
      label: 'API Testing',
      icon: Cpu,
      description: 'Live API integration tests',
    },
    {
      path: '/yorha/terminal',
      label: 'Terminal',
      icon: Terminal,
      description: 'YoRHa command terminal',
    },
    {
      path: '/yorha/data-grid',
      label: 'Data Grid',
      icon: Database,
      description: 'Advanced data visualization',
    },
    {
      path: '/yorha/search',
      label: 'Vector Search',
      icon: Search,
      description: 'Semantic search interface',
    },
    {
      path: '/yorha/chat',
      label: 'AI Chat',
      icon: Bot,
      description: 'Enhanced AI conversation',
    },
  ];
  // System status monitoring
  $effect(() => {
    // reactive sync to current page url
    currentPath = $page.url.pathname;

    // Initialize YoRHa API and check system status (fire-and-forget inside effect)
    (async () => {
      try {
        const status = await yorhaAPI.getSystemStatus();
        const services = (() => {
          const s = status as any;
          if (Array.isArray(s?.services)) return s.services.length;
          if (typeof s?.serviceCount === 'number') return s.serviceCount;
          if (typeof s?.servicesCount === 'number') return s.servicesCount;
          return 0;
        })();

        systemStatus = {
          connected: true,
          services,
          errors: 0,
        };
      } catch (error) {
        console.warn('YoRHa API not available:', error);
        systemStatus.connected = false;
      }
    })();
  });
  onDestroy(() => {
    // yorhaAPI.dispose(); // Temporarily commented out as dispose() might not exist or be needed here
  });
  function navigateTo(path: string) {
    goto(path);
    sidebarOpen = false;
  }
  function isActivePath(path: string): boolean {
    return currentPath === path || (path !== '/yorha' && currentPath.startsWith(path));
  }
</script>

<svelte:head>
  <title>YoRHa Interface - Legal AI System</title>
  <meta name="description" content="YoRHa-themed interface for Legal AI system access and control." />
</svelte:head>
<div class="yorha-layout">
  <!-- Top Navigation Bar -->
  <header class="yorha-header">
    <div class="yorha-header-content">
      <!-- Logo and Title -->
      <div class="yorha-brand">
        <button class="yorha-menu-toggle" on:click={() => (sidebarOpen = !sidebarOpen)} aria-label="Toggle sidebar">
          <Terminal size={20} />
        </button>
        <h1 class="yorha-brand-title">
          <span class="yorha-brand-icon">⬢</span>
          YoRHa SYSTEM
        </h1>
      </div>
      <!-- System Status -->
      <div class="yorha-status-bar">
        <div class="yorha-status-item" class:yorha-status-connected={systemStatus.connected}>
          <Activity size={16} />
          <span>{systemStatus.connected ? 'CONNECTED' : 'OFFLINE'}</span>
        </div>
        <div class="yorha-status-item">
          <Monitor size={16} />
          <span>{systemStatus.services} SERVICES</span>
        </div>
        {#if systemStatus.errors > 0}
          <div class="yorha-status-item yorha-status-error">
            <span>⚠ {systemStatus.errors} ERRORS</span>
          </div>
        {/if}
      </div>
      <!-- Quick Actions -->
      <div class="yorha-quick-actions">
        <button class="yorha-quick-btn" on:click={() => goto('/')}>
          <Home size={16} />
          <span>MAIN</span>
        </button>
        <button class="yorha-quick-btn" on:click={() => goto('/demos')}>
          <FileText size={16} />
          <span>DEMOS</span>
        </button>
      </div>
    </div>
  </header>
  <!-- Sidebar Navigation -->
  <aside class="yorha-sidebar" class:yorha-sidebar-open={sidebarOpen}>
    <nav class="yorha-nav">
      <div class="yorha-nav-header">
        <h2>NAVIGATION</h2>
        <button class="yorha-sidebar-close" on:click={() => (sidebarOpen = false)}>
          <ChevronLeft size={20} />
        </button>
      </div>
      <ul class="yorha-nav-list">
        {#each navItems as item}
          {@const Icon = item.icon}
          <li class="yorha-nav-item">
            <button
              class="yorha-nav-link"
              class:yorha-nav-active={isActivePath(item.path)}
              on:click={() => navigateTo(item.path)}
            >
              <Icon size={18} />
              <div class="yorha-nav-content">
                <span class="yorha-nav-label">{item.label}</span>
                <span class="yorha-nav-desc">{item.description}</span>
              </div>
              <ChevronRight size={16} class="yorha-nav-arrow" />
            </button>
          </li>
        {/each}
      </ul>
    </nav>
  </aside>
  <!-- Main Content Area -->
  <main class="yorha-main" class:yorha-main-sidebar-open={sidebarOpen}>
    {@render children()}
  </main>
  <!-- Sidebar Overlay -->
  {#if sidebarOpen}
    <div
      class="yorha-overlay"
      role="button"
      tabindex="0"
      on:click={() => (sidebarOpen = false)}
      onkeydown={e => (e.key === 'Enter' || e.key === ' ' ? (sidebarOpen = false) : null)}
      aria-label="Close sidebar"
    ></div>
  {/if}
</div>

<style>
  /* Rewritten plain CSS to replace Tailwind @apply usage and fix stray closing tags */
  :global(.yorha-layout) {
    min-height: 100vh;
    background-color: #000;
    color: #f59e0b; /* amber-400 */
    font-family: 'Courier New', monospace;
    background-image:
      radial-gradient(circle at 20% 50%, rgba(255, 191, 0, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255, 191, 0, 0.03) 0%, transparent 50%);
  }

  /* Header */
  :global(.yorha-header) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 40;
    border-bottom: 1px solid rgba(245, 158, 11, 0.3); /* amber-400 30% */
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(255, 191, 0, 0.05) 100%);
    backdrop-filter: blur(8px);
  }
  :global(.yorha-header-content) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
  }
  :global(.yorha-brand) {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  :global(.yorha-menu-toggle) {
    padding: 0.5rem;
    color: #f59e0b;
    background: transparent;
    border: 1px solid rgba(245, 158, 11, 0.3);
    transition:
      color 0.15s ease,
      border-color 0.15s ease;
    cursor: pointer;
  }
  :global(.yorha-menu-toggle:hover) {
    color: #fbbf24; /* amber-300 */
    border-color: rgba(245, 158, 11, 0.6);
  }
  :global(.yorha-brand-title) {
    font-size: 1.125rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  :global(.yorha-brand-icon) {
    color: #f59e0b;
    font-size: 1.25rem;
  }
  :global(.yorha-status-bar) {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }
  :global(.yorha-status-item) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #f59e0b;
    opacity: 0.6;
  }
  :global(.yorha-status-connected) {
    color: #10b981; /* green-400 */
    opacity: 1;
  }
  :global(.yorha-status-error) {
    color: #f43f5e; /* red-400 */
    opacity: 1;
  }
  :global(.yorha-quick-actions) {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  :global(.yorha-quick-btn) {
    padding: 0.375rem 0.75rem;
    background: #f59e0b;
    color: #000;
    font-size: 0.75rem;
    font-family: monospace;
    letter-spacing: 0.04em;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    border-radius: 3px;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  :global(.yorha-quick-btn:hover) {
    background: #fbbf24;
  }

  /* Sidebar */
  :global(.yorha-sidebar) {
    position: fixed;
    top: 73px;
    left: 0;
    bottom: 0;
    width: 20rem; /* w-80 */
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(255, 191, 0, 0.05) 100%);
    border-right: 1px solid rgba(245, 158, 11, 0.3);
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    z-index: 30;
    overflow: auto;
  }
  :global(.yorha-sidebar-open) {
    transform: translateX(0);
  }
  :global(.yorha-nav) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  :global(.yorha-nav-header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    border-bottom: 1px solid rgba(245, 158, 11, 0.3);
  }
  :global(.yorha-nav-header h2) {
    font-size: 1rem;
    font-weight: 700;
    color: #f59e0b;
    letter-spacing: 0.04em;
    margin: 0;
  }
  :global(.yorha-sidebar-close) {
    padding: 0.5rem;
    color: #f59e0b;
    background: transparent;
    border: none;
    cursor: pointer;
  }
  :global(.yorha-nav-list) {
    flex: 1;
    padding: 1rem 0;
    margin: 0;
    list-style: none;
  }
  :global(.yorha-nav-item) {
    border-bottom: 1px solid rgba(245, 158, 11, 0.1);
  }
  :global(.yorha-nav-link) {
    width: 100%;
    padding: 1rem;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 1rem;
    background: transparent;
    color: #f59e0b;
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      color 0.15s ease;
  }
  :global(.yorha-nav-link:hover) {
    background: rgba(245, 158, 11, 0.1);
    color: #fbbf24;
  }
  :global(.yorha-nav-active) {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
    border-right: 2px solid #f59e0b;
  }
  :global(.yorha-nav-arrow) {
    opacity: 0.4;
    transition: opacity 0.15s ease;
  }
  :global(.yorha-nav-link:hover .yorha-nav-arrow) {
    opacity: 1;
  }
  :global(.yorha-nav-content) {
    flex: 1;
    min-width: 0;
  }
  :global(.yorha-nav-label) {
    display: block;
    font-weight: 600;
    font-size: 0.875rem;
  }
  :global(.yorha-nav-desc) {
    display: block;
    font-size: 0.75rem;
    opacity: 0.6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Main content */
  :global(.yorha-main) {
    display: block;
    flex: 1 1 auto;
    padding-top: 73px;
    padding-left: 2rem;
    padding-right: 2rem;
    padding-bottom: 2rem;
    transition: all 0.3s ease;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    :global(.yorha-header-content) {
      padding: 0.75rem 1rem;
    }
    :global(.yorha-brand-title) {
      font-size: 1rem;
    }
    :global(.yorha-status-bar) {
      gap: 1rem;
    }
    :global(.yorha-quick-actions) {
      display: none;
    }
    :global(.yorha-sidebar) {
      width: 100%;
    }
    :global(.yorha-overlay) {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 20;
    }
  }
</style>
