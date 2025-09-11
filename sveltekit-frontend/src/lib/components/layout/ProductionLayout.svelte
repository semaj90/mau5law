<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { 
    Home, Users, Search, Database, Eye, Folder, BarChart3, 
    Terminal, Settings, Bell, Menu, X, Zap,
    ChevronDown, LogOut, User, Calendar, Activity, MessageSquare
  } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import { authStore } from '$lib/stores/auth-store.svelte.js';
  import ClientSideAIChat from '$lib/components/ai/ClientSideAIChat.svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    title?: string;
    subtitle?: string;
    showBreadcrumbs?: boolean;
    fullWidth?: boolean;
  }

  let { 
    children, 
    title = 'YoRHa Legal AI', 
    subtitle = 'Advanced Investigation Platform',
    showBreadcrumbs = true,
    fullWidth = false 
  }: Props = $props();

  // Navigation configuration
  const mainNavItems = [
    { 
      id: 'dashboard',
      href: '/', 
      label: 'Command Center', 
      icon: Database, 
      description: 'Main dashboard and overview'
    },
    { 
      id: 'cases',
      href: '/cases', 
      label: 'Cases', 
      icon: Folder,
      description: 'Legal case management'
    },
    { 
      id: 'evidence',
      href: '/evidence', 
      label: 'Evidence', 
      icon: Eye,
      description: 'Evidence collection and analysis'
    },
    { 
      id: 'persons',
      href: '/persons', 
      label: 'Persons', 
      icon: Users,
      description: 'Persons of interest tracking'
    },
    { 
      id: 'analysis',
      href: '/analysis', 
      label: 'Analysis', 
      icon: BarChart3,
      description: 'Data analysis and insights'
    },
    { 
      id: 'search',
      href: '/search', 
      label: 'Search', 
      icon: Search,
      description: 'Universal search interface'
    }
  ];

  const toolsNavItems = [
    { 
      id: 'terminal',
      href: '/terminal', 
      label: 'Terminal', 
      icon: Terminal,
      description: 'Command line interface'
    },
    { 
      id: 'settings',
      href: '/settings', 
      label: 'Settings', 
      icon: Settings,
      description: 'System configuration'
    }
  ];

  // State
  let isSidebarOpen = $state(true);
  let isMobileMenuOpen = $state(false);
  let showNotifications = $state(false);
  let showClientChat = $state(false);
  let currentTime = $state(new Date());
  let systemStatus = $state({
    ai: true,
    database: true,
    search: true,
    gpu: false
  });

  // Derived state
  let currentPath = $derived(browser && page.url ? page.url.pathname : '/');
  let currentNavItem = $derived(
    mainNavItems.find(item => currentPath === item.href || currentPath.startsWith(item.href + '/'))
  );

  // Update time every second
  onMount(() => {
    const timer = setInterval(() => {
      currentTime = new Date();
    }, 1000);

    // Check system status periodically
    const statusTimer = setInterval(async () => {
      // Mock system status check - replace with real API calls
      systemStatus = {
        ai: Math.random() > 0.1,
        database: Math.random() > 0.05,
        search: Math.random() > 0.1,
        gpu: Math.random() > 0.3
      };
    }, 10000);

    return () => {
      clearInterval(timer);
      clearInterval(statusTimer);
    };
  });

  // Functions
  function handleNavigation(href: string, event?: MouseEvent) {
    event?.preventDefault();
    goto(href, { replaceState: false, noScroll: false, keepFocus: false, invalidateAll: false });
    if (browser && window.innerWidth < 1024) {
      isMobileMenuOpen = false;
    }
  }

  function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
  }

  function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
  }

  function handleLogout() {
    authStore.logout();
    goto('/auth/login');
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }

  function formatDate(date: Date) {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  function getStatusColor(status: boolean) {
    return status ? 'text-green-400' : 'text-red-400';
  }

  // Breadcrumbs generation
  let breadcrumbs = $derived(() => {
    const pathSegments = currentPath.split('/').filter(Boolean);
    const crumbs = [{ label: 'Home', href: '/' }];
    
    let currentHref = '';
    pathSegments.forEach((segment, index) => {
      currentHref += '/' + segment;
      const navItem = mainNavItems.find(item => item.href === currentHref);
      crumbs.push({
        label: navItem ? navItem.label : segment.charAt(0).toUpperCase() + segment.slice(1),
        href: currentHref
      });
    });
    
    return crumbs;
  });
</script>

<div class="yorha-production-layout">
  <!-- Mobile Menu Overlay -->
  {#if isMobileMenuOpen}
    <div 
      class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden"
      role="button" 
      tabindex="-1"
      onclick={toggleMobileMenu}
      onkeydown={(e) => e.key === 'Escape' && toggleMobileMenu()}
    ></div>
  {/if}

  <!-- Sidebar Navigation -->
  <aside class={cn(
    "fixed top-0 left-0 h-full bg-slate-900 border-r border-slate-700 transition-all duration-300 z-40 shadow-xl",
    isSidebarOpen ? "w-72" : "w-16",
    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
  )}>
    <div class="flex flex-col h-full">
      <!-- Sidebar Header -->
      <div class="p-4 border-b border-slate-700 bg-gradient-to-r from-slate-900 to-slate-800">
        <div class="flex items-center justify-between">
          <div class={cn("flex items-center gap-3", !isSidebarOpen && "justify-center")}>
            <div class="professional-logo-container p-2 bg-slate-800/50 rounded-lg">
              <Zap class="w-6 h-6 text-amber-400" />
            </div>
            {#if isSidebarOpen}
              <div class="flex flex-col">
                <h1 class="text-lg font-semibold text-amber-400 tracking-wide">Legal AI Platform</h1>
                <p class="text-xs text-slate-400">Professional Investigation Suite</p>
              </div>
            {/if}
          </div>
          {#if isSidebarOpen}
            <button 
              class="p-1 text-gray-400 hover:text-yellow-400 transition-colors lg:hidden"
              onclick={toggleMobileMenu}
            >
              <X class="w-5 h-5" />
            </button>
          {/if}
        </div>
      </div>

      <!-- Navigation Menu -->
      <nav class="flex-1 p-4 space-y-6 overflow-y-auto">
        <!-- Main Navigation -->
        <div class="space-y-2">
          {#if isSidebarOpen}
            <h3 class="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3">Navigation</h3>
          {/if}
          {#each mainNavItems as item}
            <button
              class={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group",
                currentPath === item.href || currentPath.startsWith(item.href + '/') 
                  ? "bg-yellow-600/20 border border-yellow-600/50 text-yellow-400" 
                  : "text-gray-400 hover:text-yellow-400 hover:bg-gray-800/50",
                !isSidebarOpen && "justify-center"
              )}
              onclick={(e) => handleNavigation(item.href, e)}
              title={!isSidebarOpen ? item.label : ''}
            >
              <item.icon class="w-5 h-5 flex-shrink-0" />
              {#if isSidebarOpen}
                <div class="flex-1 text-left">
                  <div class="font-medium">{item.label}</div>
                  <div class="text-xs text-gray-500 group-hover:text-gray-400">{item.description}</div>
                </div>
              {/if}
            </button>
          {/each}
        </div>

        <!-- Tools Section -->
        <div class="space-y-2">
          {#if isSidebarOpen}
            <h3 class="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3">Tools</h3>
          {/if}
          {#each toolsNavItems as item}
            <button
              class={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200",
                currentPath === item.href || currentPath.startsWith(item.href + '/') 
                  ? "bg-yellow-600/20 border border-yellow-600/50 text-yellow-400" 
                  : "text-gray-400 hover:text-yellow-400 hover:bg-gray-800/50",
                !isSidebarOpen && "justify-center"
              )}
              onclick={(e) => handleNavigation(item.href, e)}
              title={!isSidebarOpen ? item.label : ''}
            >
              <item.icon class="w-5 h-5 flex-shrink-0" />
              {#if isSidebarOpen}
                <span class="font-medium">{item.label}</span>
              {/if}
            </button>
          {/each}
        </div>

        <!-- System Status -->
        {#if isSidebarOpen}
          <div class="space-y-3 pt-6 border-t border-yellow-600/30">
            <h3 class="text-xs uppercase tracking-wider text-gray-500 font-bold">System Status</h3>
            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-400">AI Engine</span>
                <div class="flex items-center gap-1">
                  <div class={cn("w-2 h-2 rounded-full", systemStatus.ai ? "bg-green-400" : "bg-red-400")}></div>
                  <span class={getStatusColor(systemStatus.ai)}>{systemStatus.ai ? 'Online' : 'Offline'}</span>
                </div>
              </div>
              
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-400">Database</span>
                <div class="flex items-center gap-1">
                  <div class={cn("w-2 h-2 rounded-full", systemStatus.database ? "bg-green-400" : "bg-red-400")}></div>
                  <span class={getStatusColor(systemStatus.database)}>{systemStatus.database ? 'Active' : 'Error'}</span>
                </div>
              </div>
              
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-400">GPU Accel</span>
                <div class="flex items-center gap-1">
                  <div class={cn("w-2 h-2 rounded-full", systemStatus.gpu ? "bg-green-400" : "bg-yellow-400")}></div>
                  <span class={getStatusColor(systemStatus.gpu)}>{systemStatus.gpu ? 'Enabled' : 'Limited'}</span>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </nav>

      <!-- Sidebar Footer -->
      {#if isSidebarOpen}
        <div class="p-4 border-t border-yellow-600/30">
          <div class="text-xs text-gray-500 space-y-1">
            <div class="flex justify-between">
              <span>Time:</span>
              <span class="text-yellow-400 font-mono">{formatTime(currentTime)}</span>
            </div>
            <div class="flex justify-between">
              <span>Date:</span>
              <span class="text-gray-300">{formatDate(currentTime)}</span>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </aside>

  <!-- Main Content Area -->
  <div class={cn(
    "min-h-screen transition-all duration-300",
    isSidebarOpen ? "ml-72" : "ml-16"
  )}>
    <!-- Top Header Bar -->
    <header class="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-700 shadow-sm">
      <div class="flex items-center justify-between p-4">
        <!-- Header Left -->
        <div class="flex items-center gap-4">
          <button 
            class="p-2 text-gray-400 hover:text-yellow-400 transition-colors"
            onclick={toggleSidebar}
          >
            <Menu class="w-5 h-5" />
          </button>

          <button 
            class="p-2 text-gray-400 hover:text-yellow-400 transition-colors lg:hidden"
            onclick={toggleMobileMenu}
          >
            <Menu class="w-5 h-5" />
          </button>

          <!-- Breadcrumbs -->
          {#if showBreadcrumbs}
            <nav class="hidden md:flex items-center space-x-2 text-sm">
              {#each breadcrumbs as crumb, index}
                {#if index > 0}
                  <ChevronDown class="w-4 h-4 text-gray-500 rotate-[-90deg]" />
                {/if}
                <button 
                  class={cn(
                    "hover:text-yellow-400 transition-colors",
                    index === breadcrumbs.length - 1 ? "text-yellow-400 font-medium" : "text-gray-400"
                  )}
                  onclick={(e) => handleNavigation(crumb.href, e)}
                >
                  {crumb.label}
                </button>
              {/each}
            </nav>
          {/if}
        </div>

        <!-- Header Center - Page Title -->
        <div class="flex-1 text-center hidden lg:block">
          <h1 class="text-lg font-semibold text-amber-400 tracking-wide">{title}</h1>
          {#if subtitle}
            <p class="text-sm text-slate-400">{subtitle}</p>
          {/if}
        </div>

        <!-- Header Right -->
        <div class="flex items-center gap-3">
          <!-- Client-Side AI Chat Toggle -->
          <div class="relative">
            <button 
              class="p-2 text-gray-400 hover:text-green-400 transition-colors relative group"
              onclick={() => showClientChat = !showClientChat}
              title="Client-Side AI Chat (Gemma 270MB)"
            >
              <MessageSquare class="w-5 h-5" />
              <div class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full group-hover:animate-pulse"></div>
            </button>
          </div>

          <!-- Notifications -->
          <div class="relative">
            <button 
              class="p-2 text-gray-400 hover:text-yellow-400 transition-colors relative"
              onclick={() => showNotifications = !showNotifications}
            >
              <Bell class="w-5 h-5" />
              <div class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
            </button>
          </div>

          <!-- User Menu -->
          {#if authStore.isAuthenticated}
            <div class="relative group">
              <button class="flex items-center gap-2 p-2 text-gray-400 hover:text-yellow-400 transition-colors">
                <User class="w-5 h-5" />
                <span class="hidden sm:inline text-sm font-medium">
                  {authStore.user?.firstName || 'User'}
                </span>
                <ChevronDown class="w-4 h-4 group-hover:rotate-180 transition-transform" />
              </button>
              
              <!-- Dropdown Menu -->
              <div class="absolute right-0 top-full mt-2 w-48 bg-yorha-bg-secondary border border-yellow-600/30 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div class="p-2 space-y-1">
                  <button 
                    class="w-full flex items-center gap-2 p-2 text-gray-400 hover:text-yellow-400 hover:bg-gray-800/50 rounded transition-colors text-left"
                    onclick={(e) => handleNavigation('/profile', e)}
                  >
                    <User class="w-4 h-4" />
                    Profile
                  </button>
                  <button 
                    class="w-full flex items-center gap-2 p-2 text-gray-400 hover:text-yellow-400 hover:bg-gray-800/50 rounded transition-colors text-left"
                    onclick={(e) => handleNavigation('/settings', e)}
                  >
                    <Settings class="w-4 h-4" />
                    Settings
                  </button>
                  <hr class="my-2 border-gray-600" />
                  <button 
                    class="w-full flex items-center gap-2 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors text-left"
                    onclick={handleLogout}
                  >
                    <LogOut class="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          {:else}
            <button 
              class="nes-legal-priority-high yorha-3d-button text-sm"
              onclick={(e) => handleNavigation('/auth/login', e)}
            >
              Login
            </button>
          {/if}
        </div>
      </div>
    </header>

    <!-- Page Content -->
    <main id="app" class={cn(
      "min-h-[calc(100vh-4rem)]",
      fullWidth ? "" : "container mx-auto p-6"
    )}>
      {@render children()}
    </main>

    <!-- Floating Client-Side AI Chat -->
    {#if showClientChat}
      <div class="fixed bottom-6 right-6 z-50 w-80 max-w-[calc(100vw-2rem)]">
        <ClientSideAIChat collapsed={false} showStatus={true} />
      </div>
    {/if}

    <!-- Footer -->
    <footer class="border-t border-yellow-600/30 bg-yorha-bg-secondary/50 backdrop-blur-sm p-4">
      <div class="container mx-auto flex items-center justify-between text-sm text-gray-500">
        <div class="flex items-center gap-4">
          <span>© 2024 YoRHa Legal AI Platform</span>
          <div class="flex items-center gap-1">
            <Activity class="w-4 h-4" />
            <span>System Operational</span>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <span class="font-mono">{formatTime(currentTime)}</span>
          <Zap class="w-4 h-4 text-yellow-400" />
        </div>
      </div>
    </footer>
  </div>
</div>

<style>
  .yorha-production-layout {
    @apply min-h-screen bg-yorha-bg-primary text-white;
    font-family: 'JetBrains Mono', 'Courier New', monospace;
  }

  /* Enhanced scrollbars for better UX */
  :global(.yorha-production-layout *::-webkit-scrollbar) {
    width: 8px;
    height: 8px;
  }

  :global(.yorha-production-layout *::-webkit-scrollbar-track) {
    background: rgba(255, 215, 0, 0.1);
    border-radius: 4px;
  }

  :global(.yorha-production-layout *::-webkit-scrollbar-thumb) {
    background: rgba(255, 215, 0, 0.4);
    border-radius: 4px;
  }

  :global(.yorha-production-layout *::-webkit-scrollbar-thumb:hover) {
    background: rgba(255, 215, 0, 0.6);
  }

  /* Animation for neural sprite effects */
  :global(.neural-sprite-active) {
    animation: neural-pulse 2s ease-in-out infinite;
  }

  @keyframes neural-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  /* Responsive typography */
  @media (max-width: 768px) {
    .yorha-production-layout {
      font-size: 14px;
    }
  }

  @media (max-width: 640px) {
    .yorha-production-layout {
      font-size: 13px;
    }
  }
</style>
