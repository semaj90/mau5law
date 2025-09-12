<!-- @migration-task Error while migrating Svelte code: Expected a valid element or component name. Components must have a valid variable name or dot notation expression
https://svelte.dev/e/tag_invalid_name -->
<!-- @migration-task Error while migrating Svelte code: Expected a valid element or component name. Components must have a valid variable name or dot notation expression -->
<!--
  Enhanced Dashboard Layout - Modern SvelteKit 2 + Drizzle ORM + pgvector
  Features: Responsive grid, real-time data, vector search integration
-->
<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import type { Snippet } from 'svelte';
  // Modern UI Components
  import * as Card from '$lib/components/ui/card';
  import {
    Button
  } from '$lib/components/ui/enhanced-bits';;
  import {
    Input
  } from '$lib/components/ui/enhanced-bits';;
  import { Badge } from '$lib/components/ui/badge';
  // Icons from Lucide
  import {
    Search, Bell, Settings, User, Menu,
    BarChart3, Database, Zap, Shield,
    ChevronDown, Filter, Calendar,
    Activity, TrendingUp, Eye
  } from 'lucide-svelte';
  // Stores and utilities
  import { browser } from '$app/environment';
  interface Props {
    children: Snippet;
  }
  let { children }: Props = $props();
  // Dashboard state
  let sidebarOpen = $state(true);
  let searchQuery = $state('');
  let notifications = $state(3);
  let systemHealth = $state<'healthy' | 'warning' | 'critical'>('healthy');
  // Real-time metrics (would connect to your API)
  let metrics = $state({
    totalCases: 1247,
    activeSearches: 23,
    vectorQueries: 156,
    systemLoad: 67
  });
  // Dashboard navigation structure
  const dashboardSections = [
    {
      title: 'Overview',
      href: '/dashboard',
      icon: BarChart3,
      active: true
    },
    {
      title: 'Cases',
      href: '/dashboard/cases',
      icon: Database,
      badge: metrics.totalCases
    },
    {
      title: 'Vector Search',
      href: '/dashboard/search',
      icon: Search,
      badge: metrics.vectorQueries
    },
    {
      title: 'AI Processing',
      href: '/dashboard/ai',
      icon: Zap,
      badge: metrics.activeSearches
    },
    {
      title: 'Evidence',
      href: '/dashboard/evidence',
      icon: Shield
    },
    {
      title: 'Analytics',
      href: '/dashboard/analytics',
      icon: TrendingUp
    },
    {
      title: 'System Monitor',
      href: '/dashboard/system',
      icon: Activity,
      status: systemHealth
    }
  ];
  // Real-time updates simulation (replace with actual WebSocket/SSE)
  let updateInterval: NodeJS.Timeout;
  onMount(() => {
    if (browser) {
      updateInterval = setInterval(() => {
        metrics.activeSearches = Math.floor(Math.random() * 50) + 10;
        metrics.vectorQueries += Math.floor(Math.random() * 3);
        metrics.systemLoad = Math.floor(Math.random() * 40) + 50;
      }, 5000);
    }
  });
  onDestroy(() => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  });
  function handleNavigation(href: string) {
    goto(href);
  }
  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }
  $effect(() => {
    // Update active state based on current route
    dashboardSections.forEach(section => {
      section.active = page.url.pathname === section.href;
    });
  });
</script>

<!-- Dashboard Shell -->
<div class="min-h-screen bg-nier-bg-primary flex">
  <!-- Sidebar -->
  <aside
    class="bg-nier-bg-secondary border-r border-nier-border-primary transition-all duration-300 {sidebarOpen ? 'w-64' : 'w-16'}"
    class:shadow-xl={sidebarOpen}
  >
    <!-- Sidebar Header -->
    <div class="p-4 border-b border-nier-border-muted">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-nier-accent-warm rounded-lg flex items-center justify-center">
          <Shield class="w-5 h-5 text-nier-bg-primary" />
        </div>
        {#if sidebarOpen}
          <div>
            <h2 class="font-bold text-nier-text-primary">Legal AI</h2>
            <p class="text-xs text-nier-text-muted">Dashboard v2.0</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Navigation -->
    <nav class="p-2 space-y-1">
      {#each dashboardSections as section}
        <button
          onclick={() => handleNavigation(section.href)}
          class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                 hover:bg-nier-bg-tertiary group relative
                 {section.active ? 'bg-nier-accent-warm/10 text-nier-accent-warm border-l-2 border-nier-accent-warm' : 'text-nier-text-secondary'}"
        >
          <svelte:component this={section.icon} class="w-5 h-5 flex-shrink-0" />

          {#if sidebarOpen}
            <span class="flex-1 font-medium">{section.title}</span>

            {#if section.badge}
              <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">{section.badge}</span>
            {/if}

            {#if section.status}
              <div class="w-2 h-2 rounded-full
                          {section.status === 'healthy' ? 'bg-green-500' :
                           section.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}">
              </div>
            {/if}
          {:else}
            <!-- Tooltip for collapsed sidebar -->
            <div class="absolute left-full ml-2 px-2 py-1 bg-nier-bg-secondary text-nier-text-primary
                        text-sm rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none
                        transition-opacity z-50">
              {section.title}
            </div>

            {#if section.badge}
              <div class="absolute -top-1 -right-1 w-4 h-4 bg-nier-accent-warm text-nier-bg-primary
                          text-xs rounded-full flex items-center justify-center">
                {section.badge > 99 ? '99+' : section.badge}
              </div>
            {/if}
          {/if}
        </button>
      {/each}
    </nav>

    <!-- Sidebar Footer -->
    <div class="absolute bottom-4 left-2 right-2">
      <div class="p-2 bg-nier-bg-tertiary rounded-lg">
        {#if sidebarOpen}
          <div class="flex items-center gap-2 mb-2">
            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span class="text-xs text-nier-text-muted">System Healthy</span>
          </div>
          <div class="text-xs text-nier-text-muted">
            Load: {metrics.systemLoad}%
          </div>
        {:else}
          <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse mx-auto"></div>
        {/if}
      </div>
    </div>
  </aside>

  <!-- Main Content Area -->
  <div class="flex-1 flex flex-col min-w-0">
    <!-- Top Header -->
    <header class="bg-nier-bg-secondary border-b border-nier-border-primary px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onclick={toggleSidebar}
            class="p-2 enhanced-bits-btn nes-dashboard-control n64-enhanced lod-optimized retro-nav-btn"
            aria-label={sidebarOpen ? 'Collapse sidebar navigation' : 'Expand sidebar navigation'}
            aria-describedby="sidebar-toggle-help"
            role="button"
            data-nes-theme="dashboard-nav"
            data-enhanced-bits="true"
            data-sidebar-state={sidebarOpen ? 'open' : 'closed'}
          >
            <Menu class="w-5 h-5" aria-hidden="true" role="img" aria-label="Menu toggle icon" />
          </Button>
          <div id="sidebar-toggle-help" class="sr-only">
            Toggle sidebar navigation panel visibility
          </div>

          <!-- Breadcrumb -->
          <div class="flex items-center gap-2 text-sm">
            <span class="text-nier-text-muted">Dashboard</span>
            <ChevronDown class="w-4 h-4 text-nier-text-muted rotate-[-90deg]" />
            <span class="text-nier-text-primary font-medium">
              {page.url.pathname.split('/').pop() || 'Overview'}
            </span>
          </div>
        </div>

        <!-- Top Actions -->
        <div class="flex items-center gap-4">
          <!-- Global Search -->
          <div class="relative">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-nier-text-muted" />
            <Input
              type="search"
              placeholder="Search cases, evidence..."
              bind:value={searchQuery}
              class="pl-10 w-64 bg-nier-bg-primary border-nier-border-muted"
            />
          </div>

          <!-- Quick Actions -->
          <Button
            variant="ghost"
            size="sm"
            class="relative enhanced-bits-btn nes-dashboard-control n64-enhanced lod-optimized retro-notification-btn"
            aria-label={notifications > 0 ? `${notifications} new notifications available` : 'No new notifications'}
            aria-describedby="notifications-help"
            role="button"
            data-nes-theme="dashboard-notifications"
            data-enhanced-bits="true"
            data-notification-count={notifications}
            data-has-notifications={notifications > 0}
          >
            <Bell class="w-5 h-5" aria-hidden="true" role="img" aria-label="Notification bell icon" />
            {#if notifications > 0}
              <span
                class="px-2 py-1 rounded text-xs font-medium bg-red-500 text-white"
                aria-live="polite"
                aria-atomic="true"
                role="status"
              >{notifications}</span>
            {/if}
          </Button>
          <div id="notifications-help" class="sr-only">
            View system notifications and alerts
          </div>

          <Button
            class="enhanced-bits-btn nes-dashboard-control n64-enhanced lod-optimized retro-settings-btn"
            variant="ghost"
            size="sm"
            aria-label="Open settings and configuration panel"
            aria-describedby="settings-help"
            role="button"
            data-nes-theme="dashboard-settings"
            data-enhanced-bits="true"
          >
            <Settings class="w-5 h-5" aria-hidden="true" role="img" aria-label="Settings icon" />
          </Button>
          <div id="settings-help" class="sr-only">
            Access system settings, preferences, and configuration options
          </div>

          <Button
            class="enhanced-bits-btn nes-dashboard-control n64-enhanced lod-optimized retro-user-btn"
            variant="ghost"
            size="sm"
            aria-label="Open user profile and account options"
            aria-describedby="user-profile-help"
            role="button"
            data-nes-theme="dashboard-user"
            data-enhanced-bits="true"
          >
            <User class="w-5 h-5" aria-hidden="true" role="img" aria-label="User profile icon" />
          </Button>
          <div id="user-profile-help" class="sr-only">
            View user profile, account settings, and authentication options
          </div>
        </div>
      </div>

      <!-- Quick Stats Bar -->
      <div class="mt-4 grid grid-cols-4 gap-4">
  <Card.Root class="p-3">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-nier-text-muted">Total Cases</p>
              <p class="text-lg font-bold text-nier-text-primary">{metrics.totalCases}</p>
            </div>
            <Database class="w-5 h-5 text-nier-accent-warm" />
          </div>
  </Card.Root>

        <Card.Root class="p-3">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-nier-text-muted">Active Searches</p>
              <p class="text-lg font-bold text-nier-text-primary">{metrics.activeSearches}</p>
            </div>
            <Eye class="w-5 h-5 text-nier-accent-cool" />
          </div>
        </Card.Root>

        <Card.Root class="p-3">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-nier-text-muted">Vector Queries</p>
              <p class="text-lg font-bold text-nier-text-primary">{metrics.vectorQueries}</p>
            </div>
            <Zap class="w-5 h-5 text-purple-400" />
          </div>
        </Card.Root>

        <Card.Root class="p-3">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-nier-text-muted">System Load</p>
              <p class="text-lg font-bold text-nier-text-primary">{metrics.systemLoad}%</p>
            </div>
            <Activity class="w-5 h-5 text-green-400" />
          </div>
        </Card.Root>
      </div>
    </header>

    <!-- Page Content -->
    <main class="flex-1 p-6 bg-nier-bg-primary overflow-auto">
      <div class="max-w-7xl mx-auto">
        {@render children()}
      </div>
    </main>
  </div>
</div>

<style>/* Custom scrollbar styling */
  :global(.dashboard-content) {
    scrollbar-width: thin;
    scrollbar-color: var(--nier-accent-warm) var(--nier-bg-tertiary);
  }

  :global(.dashboard-content::-webkit-scrollbar) {
    width: 6px;
  }

  :global(.dashboard-content::-webkit-scrollbar-track) {
    background: var(--nier-bg-tertiary);
  }

  :global(.dashboard-content::-webkit-scrollbar-thumb) {
    background: var(--nier-accent-warm);
    border-radius: 3px;
  }

  :global(.dashboard-content::-webkit-scrollbar-thumb:hover) {
    background: var(--nier-accent-cool);
  }
</style>
