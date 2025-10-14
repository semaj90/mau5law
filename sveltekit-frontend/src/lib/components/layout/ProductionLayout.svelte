<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { page } from '$app/stores'; // Import the page store
  import {
    Home,
    Search,
    Database,
    Eye,
    Folder, // Removed BarChart
    Terminal,
    Settings,
    Bell,
    Menu,
    X,
    Zap,
    ChevronDown,
    LogOut,
    User,
    Calendar,
    Activity,
    MessageSquare,
    BarChart3, // Add BarChart3 here
  } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import { authStore } from '$lib/stores/auth-store.svelte.js';
  // Client-side AI assistant chat widget
  import { ClientSideAIChat } from '$lib/components/ai/ClientSideAIChat.svelte'; // Changed to named import
  interface Props {
    children: any;
    title?: string; // Added missing title property
    subtitle?: string;
    showBreadcrumbs?: boolean;
    fullWidth?: boolean;
  } // Closing brace for interface Props
  // Svelte 5 runes: destructure component props using $props() for type-safe defaults.
  // See https://svelte.dev/docs/runes#props for more details.
  let {
    children,
    title = 'Legal AI Platform',
    subtitle = 'Professional Legal Intelligence Suite',
    showBreadcrumbs = true,
    fullWidth = false,
  } = $props<Props>(); // Corrected $props() syntax with generic type
  // Professional navigation configuration
  const mainNavItems = [
    {
      id: 'dashboard',
      href: '/',
      label: 'Dashboard',
      icon: Home, // Changed semicolon to comma
      description: 'Executive overview and key metrics',
    },
    {
      id: 'cases',
      href: '/cases',
      label: 'Case Management',
      icon: Folder, // Changed semicolon to comma
      description: 'Legal case tracking and documentation',
    },
    {
      id: 'evidence',
      href: '/evidenceboard',
      label: 'Evidence Analysis',
      icon: Eye, // Changed semicolon to comma
      description: 'Digital evidence collection and forensics',
    },
    {
      id: 'research',
      href: '/demo/enhanced-rag-semantic',
      label: 'Legal Research',
      icon: Search, // Changed semicolon to comma
      description: 'AI-powered legal research and precedents',
    },
    {
      id: 'chat',
      href: '/chat',
      label: 'AI Assistant',
      icon: MessageSquare, // Changed semicolon to comma
      description: 'Intelligent legal consultation',
    },
    {
      id: 'analysis',
      href: '/analysis',
      icon: BarChart3, // Reverted to BarChart3 as BarChart is deprecated
      label: 'Analytics',
      description: 'Data insights and trend analysis',
    },
  ];
  const toolsNavItems = [
    {
      id: 'yorha-command',
      href: '/yorha-command-center',
      label: 'Command Center',
      icon: Terminal, // Changed semicolon to comma
      description: 'Advanced system controls',
    },
    {
      id: 'gpu-inference',
      href: '/demo/gpu-inference',
      label: 'GPU Processing',
      icon: Zap, // Changed semicolon to comma
      description: 'High-performance AI inference',
    },
    {
      id: 'settings',
      href: '/settings',
      label: 'Settings',
      icon: Settings, // Changed semicolon to comma
      description: 'Platform configuration',
    },
    {
      id: 'admin',
      href: '/admin',
      label: 'Administration',
      icon: Database, // Changed semicolon to comma
      description: 'System administration',
    },
  ];
  // State
  let isSidebarOpen = $state(true);
  let isMobileMenuOpen = $state(false);
  let showNotifications = $state(false);
  let showClientChat = $state(false);
  let currentTime = $state(new Date());
  let systemStatus = $state({
    ai: true, // Changed semicolon to comma
    database: true, // Changed semicolon to comma
    search: true, // Changed semicolon to comma
    gpu: false, // Changed semicolon to comma
  });
  // Derived state
  // const { url } = $page; // Removed problematic $page destructuring
  let currentPath = $derived(browser && $page.url ? $page.url.pathname : '/'); // Corrected to use $page.url directly
  // Removed currentNavItem as it was unused
  // Update time every second
  $effect(() => {
    const timer = setInterval(() => {
      currentTime = new Date(); // Removed extra parenthesis
    }, 1000);
    // Check system status periodically
    const statusTimer = setInterval(async () => {
      // Fetch real system status from SvelteKit API endpoint
      try {
        const response = await fetch('/api/go/health');
        if (response.ok) {
          const data = await response.json();
          systemStatus = {
            ai: data.ai || false,
            database: data.database || false,
            search: data.search || false,
            gpu: data.gpu || false,
          };
        } else {
          console.error('Failed to fetch system status:', response.statusText);
          // Fallback to offline status if API call fails
          systemStatus = { ai: false, database: false, search: false, gpu: false };
        }
      } catch (error) {
        console.error('Error fetching system status:', error);
        // Fallback to offline status on network error
        systemStatus = { ai: false, database: false, search: false, gpu: false };
      }
    }, 10000); // Check every 10 seconds
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
    isSidebarOpen = !isSidebarOpen; // Fixed typo
  }
  function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen; // Fixed typo
  }
  function handleLogout() {
    authStore.logout();
    goto('/auth/login');
  }
  function formatTime(date: Date) {
    return date.toLocaleTimeString('en-US', {
      hour12: false, // Changed semicolon to comma
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit', // Changed semicolon to comma
    });
  }
  function formatDate(date: Date) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric', // Changed semicolon to comma
    });
  }
  function getStatusColor(status: boolean) {
    return status ? 'text-green-400' : 'text-red-400';
  }
  // Dynamically get the current year for the footer
  let currentYear = $derived(() => new Date().getFullYear());
  // Breadcrumbs generation
  let breadcrumbs = $derived(() => {
    const pathSegments = currentPath.split('/').filter(Boolean); // Corrected split call
    const crumbs = [{ label: 'Home', href: '/' }];
    let currentHref = '';
    pathSegments.forEach(segment => {
      // Removed unused index
      currentHref += '/' + segment;
      const navItem = [...mainNavItems, ...toolsNavItems].find(item => item.href === currentHref); // Corrected find call
      crumbs.push({
        // Corrected push call
        label: navItem?.label || segment.charAt(0).toUpperCase() + segment.slice(1),
        href: currentHref,
      });
    });
    return crumbs; // Changed crumb to crumbs
  });
</script>

<div
  class="yorha-production-layout min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white"
>
  <!-- Mobile Menu Overlay -->
  {#if isMobileMenuOpen}
    <div
      class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden"
      role="button"
      tabindex="-1"
      onclick={toggleMobileMenu}
      onkeydown={e => e.key === 'Escape' && toggleMobileMenu()}
    ></div>
  {/if}
  <!-- Professional Sidebar Navigation -->
  <aside
    class={cn(
      'fixed top-0 left-0 h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-amber-500/20 transition-all duration-300 z-40 shadow-2xl',
      isSidebarOpen ? 'w-80' : 'w-18',
      isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    )}
  >
    <div class="flex flex-col h-full">
      <!-- Professional Sidebar Header -->
      <div class="p-6 border-b border-amber-500/20 bg-gradient-to-r from-slate-900/95 to-slate-800/95 backdrop-blur-sm">
        <div class="flex items-center justify-between">
          <div class={cn('flex items-center gap-4', !isSidebarOpen && 'justify-center')}>
            <div
              class="professional-logo-container p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg shadow-amber-500/25"
            >
              <Zap class="w-7 h-7 text-slate-900 font-bold" />
            </div>
            {#if isSidebarOpen}
              <div class="flex flex-col">
                <h1 class="text-xl font-bold text-amber-400 tracking-tight">Legal AI Platform</h1>
                <p class="text-sm text-slate-400 font-medium">Professional Intelligence Suite</p>
              </div>
            {/if}
          </div>
          {#if isSidebarOpen}
            <button
              class="p-2 text-slate-400 hover:text-amber-400 transition-colors lg:hidden rounded-lg hover:bg-slate-800/50"
              onclick={toggleMobileMenu}
            >
              <X class="w-5 h-5" />
            </button>
          {/if}
        </div>
      </div>
      <!-- Professional Navigation Menu -->
      <nav class="flex-1 p-6 space-y-8 overflow-y-auto">
        <!-- Main Navigation -->
        <div class="space-y-3">
          {#if isSidebarOpen}
            <h3
              class="text-xs uppercase tracking-wider text-slate-500 font-bold mb-4 border-b border-amber-500/20 pb-2"
            >
              Core Functions
            </h3>
          {/if}
          {#each mainNavItems as item}
            <button
              class={cn(
                'w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 group relative',
                currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href + '/'))
                  ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/50 text-amber-400 shadow-lg shadow-amber-500/25'
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/60 border border-transparent hover:border-amber-500/30',
                !isSidebarOpen && 'justify-center'
              )}
              onclick={e => handleNavigation(item.href, e)}
              title={!isSidebarOpen ? item.label : ''}
            >
              <item.icon class="w-6 h-6 flex-shrink-0" />
              {#if isSidebarOpen}
                <div class="flex-1 text-left">
                  <div class="font-semibold text-base">{item.label}</div>
                  <div class="text-sm text-slate-500 group-hover:text-slate-400 transition-colors">
                    {item.description}
                  </div>
                </div>
              {/if}
            </button>
          {/each}
        </div>
        <!-- Professional Tools Section -->
        <div class="space-y-3">
          {#if isSidebarOpen}
            <h3
              class="text-xs uppercase tracking-wider text-slate-500 font-bold mb-4 border-b border-amber-500/20 pb-2"
            >
              Advanced Tools
            </h3>
          {/if}
          {#each toolsNavItems as item}
            <button
              class={cn(
                'w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 group',
                currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href + '/'))
                  ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/50 text-amber-400 shadow-lg shadow-amber-500/25'
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/60 border border-transparent hover:border-amber-500/30',
                !isSidebarOpen && 'justify-center'
              )}
              onclick={e => handleNavigation(item.href, e)}
              title={!isSidebarOpen ? item.label : ''}
            >
              <item.icon class="w-6 h-6 flex-shrink-0" />
              {#if isSidebarOpen}
                <div class="flex-1 text-left">
                  <div class="font-semibold">{item.label}</div>
                  <div class="text-sm text-slate-500 group-hover:text-slate-400 transition-colors">
                    {item.description}
                  </div>
                </div>
              {/if}
            </button>
          {/each}
        </div>
        <!-- Professional System Status -->
        {#if isSidebarOpen}
          <div class="space-y-4 pt-6 border-t border-amber-500/20">
            <h3 class="text-xs uppercase tracking-wider text-slate-500 font-bold">System Health</h3>
            <div class="bg-slate-800/40 rounded-xl p-4 space-y-3 border border-slate-700/50">
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-400 font-medium">AI Engine</span>
                <div class="flex items-center gap-2">
                  <div
                    class={cn('w-3 h-3 rounded-full animate-pulse', systemStatus.ai ? 'bg-green-400' : 'bg-red-400')}
                  ></div>
                  <span class={cn('font-semibold', getStatusColor(systemStatus.ai))}
                    >{systemStatus.ai ? 'Online' : 'Offline'}</span
                  >
                </div>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-400 font-medium">Database</span>
                <div class="flex items-center gap-2">
                  <div
                    class={cn(
                      'w-3 h-3 rounded-full animate-pulse',
                      systemStatus.database ? 'bg-green-400' : 'bg-red-400'
                    )}
                  ></div>
                  <span class={cn('font-semibold', getStatusColor(systemStatus.database))}
                    >{systemStatus.database ? 'Active' : 'Error'}</span
                  >
                </div>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-400 font-medium">GPU Acceleration</span>
                <div class="flex items-center gap-2">
                  <div
                    class={cn(
                      'w-3 h-3 rounded-full animate-pulse',
                      systemStatus.gpu ? 'bg-green-400' : 'bg-yellow-400'
                    )}
                  ></div>
                  <span class={cn('font-semibold', systemStatus.gpu ? 'text-green-400' : 'text-yellow-400')}
                    >{systemStatus.gpu ? 'Enabled' : 'Limited'}</span
                  >
                </div>
              </div>
            </div>
          </div>
        {/if}
      </nav>
      <!-- Professional Sidebar Footer -->
      {#if isSidebarOpen}
        <div class="p-6 border-t border-amber-500/20">
          <div class="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
            <div class="text-sm text-slate-400 space-y-2">
              <div class="flex justify-between items-center">
                <span class="font-medium">Local Time:</span>
                <span class="text-amber-400 font-mono font-bold">{formatTime(currentTime)}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="font-medium">Date:</span>
                <span class="text-slate-300 font-semibold">{formatDate(currentTime)}</span>
              </div>
              <div class="pt-2 border-t border-slate-600/50">
                <div class="text-xs text-slate-500 text-center">
                  Platform Status: <span class="text-green-400 font-semibold">Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </aside>
  <!-- Professional Main Content Area -->
  <div
    class={cn(
      'min-h-screen transition-all duration-300 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
      isSidebarOpen ? 'ml-80' : 'ml-18'
    )}
  >
    <!-- Professional Top Header Bar -->
    <header class="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-amber-500/20 shadow-xl">
      <div class="flex items-center justify-between p-6">
        <!-- Professional Header Left -->
        <div class="flex items-center gap-6">
          <button
            class="p-3 text-slate-400 hover:text-amber-400 transition-all duration-300 rounded-lg hover:bg-slate-800/50"
            onclick={toggleSidebar}
          >
            <Menu class="w-6 h-6" />
          </button>
          <button
            class="p-3 text-slate-400 hover:text-amber-400 transition-all duration-300 lg:hidden rounded-lg hover:bg-slate-800/50"
            onclick={toggleMobileMenu}
          >
            <Menu class="w-6 h-6" />
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
                    'hover:text-yellow-400 transition-colors',
                    index === breadcrumbs.length - 1 ? 'text-yellow-400 font-medium' : 'text-gray-400'
                  )}
                  onclick={e => handleNavigation(crumb.href, e)}
                >
                  {crumb.label}
                </button>
              {/each}
            </nav>
          {/if}
        </div>
        <!-- Professional Header Center - Page Title -->
        <div class="flex-1 text-center hidden lg:block">
          <h1 class="text-2xl font-bold text-amber-400 tracking-tight">{title}</h1>
          {#if subtitle}
            <p class="text-base text-slate-400 font-medium">{subtitle}</p>
          {/if}
        </div>
        <!-- Header Right -->
        <div class="flex items-center gap-3">
          <!-- Professional AI Chat Toggle -->
          <div class="relative">
            <button
              class="p-3 text-slate-400 hover:text-green-400 transition-all duration-300 relative group rounded-lg hover:bg-slate-800/50"
              onclick={() => (showClientChat = !showClientChat)}
              title="AI Assistant (Gemma 270MB)"
            >
              <MessageSquare class="w-6 h-6" />
              <div
                class="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-green-400 to-green-500 rounded-full group-hover:animate-pulse shadow-lg shadow-green-500/50"
              ></div>
            </button>
          </div>
          <!-- Professional Notifications -->
          <div class="relative">
            <button
              class="p-3 text-slate-400 hover:text-amber-400 transition-all duration-300 relative rounded-lg hover:bg-slate-800/50"
              onclick={() => (showNotifications = !showNotifications)}
            >
              <Bell class="w-6 h-6" />
              <div
                class="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-red-400 to-red-500 rounded-full shadow-lg shadow-red-500/50"
              ></div>
            </button>
          </div>
          <!-- Professional User Menu -->
          {#if authStore.isAuthenticated}
            <div class="relative group">
              <button
                class="flex items-center gap-3 p-3 text-slate-400 hover:text-amber-400 transition-all duration-300 rounded-lg hover:bg-slate-800/50"
              >
                <div
                  class="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg"
                >
                  <span class="text-slate-900 font-bold text-sm"
                    >{(authStore.user?.firstName || 'U')[0].toUpperCase()}</span
                  >
                </div>
                <div class="hidden sm:block text-left">
                  <div class="text-sm font-semibold text-white">
                    {authStore.user?.firstName || 'User'}
                  </div>
                  <div class="text-xs text-slate-400">Legal Professional</div>
                </div>
                <ChevronDown class="w-4 h-4 group-hover:rotate-180 transition-transform" />
              </button>
              <!-- Professional Dropdown Menu -->
              <div
                class="absolute right-0 top-full mt-2 w-56 bg-slate-800/95 backdrop-blur-md border border-amber-500/20 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all"
              >
                <div class="p-3 space-y-2">
                  <button
                    class="w-full flex items-center gap-3 p-3 text-slate-400 hover:text-amber-400 hover:bg-slate-700/50 rounded-lg transition-all duration-300 text-left"
                    onclick={e => handleNavigation('/profile', e)}
                  >
                    <User class="w-5 h-5" />
                    <span class="font-medium">Profile Settings</span>
                  </button>
                  <button
                    class="w-full flex items-center gap-3 p-3 text-slate-400 hover:text-amber-400 hover:bg-slate-700/50 rounded-lg transition-all duration-300 text-left"
                    onclick={e => handleNavigation('/settings', e)}
                  >
                    <Settings class="w-5 h-5" />
                    <span class="font-medium">Platform Settings</span>
                  </button>
                  <hr class="my-2 border-slate-600/50" />
                  <button
                    class="w-full flex items-center gap-3 p-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-300 text-left"
                    onclick={handleLogout}
                  >
                    <LogOut class="w-5 h-5" />
                    <span class="font-medium">Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          {:else}
            <div class="flex items-center gap-3">
              <button
                class="px-6 py-3 bg-amber-500/10 border border-amber-500/50 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500 transition-all duration-300 rounded-lg font-semibold"
                onclick={e => handleNavigation('/auth/login', e)}
              >
                Sign In
              </button>
              <button
                class="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 hover:from-amber-600 hover:to-amber-700 transition-all duration-300 rounded-lg font-bold shadow-lg shadow-amber-500/25"
                onclick={e => handleNavigation('/auth/register', e)}
              >
                Get Started
              </button>
            </div>
          {/if}
        </div>
      </div>
    </header>
    <!-- Page Content -->
    <main id="app" class={cn('min-h-[calc(100vh-4rem)]', fullWidth ? '' : 'container mx-auto p-6')}>
      {@render children()}
    </main>
    <!-- Removed redundant div wrapper -->
    {#if showClientChat}
      <div class="fixed bottom-8 right-8 z-50 w-96 max-w-[calc(100vw-2rem)]">
        <div
          class="bg-slate-800/95 backdrop-blur-md border border-amber-500/20 rounded-2xl shadow-2xl shadow-amber-500/10"
        >
          <ClientSideAIChat collapsed={false} showStatus={true} />
        </div>
      </div>
    {/if}
    <!-- Professional Footer -->
    <footer class="border-t border-amber-500/20 bg-slate-900/95 backdrop-blur-md shadow-xl p-2">
      <div class="container mx-auto flex items-center justify-between text-xs text-slate-400">
        <div class="flex items-center gap-3">
          <span class="font-medium">© {currentYear} Legal AI Platform</span>
          <div class="flex items-center gap-1">
            <Activity class="w-3 h-3 text-green-400" />
            <span class="text-green-400 font-medium text-xs">Operational</span>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1">
            <Calendar class="w-3 h-3" />
            <span class="font-mono font-medium text-xs">{formatTime(currentTime)}</span>
          </div>
          <Zap class="w-3 h-3 text-amber-400" />
        </div>
      </div>
    </footer>
  </div>
</div>

<style>
  .yorha-production-layout {
    font-family: 'Inter', 'Segoe UI', 'Helvetica Neue', sans-serif;
  }
  /* Professional enhanced scrollbars */
  :global(.yorha-production-layout *::-webkit-scrollbar) {
    width: 12px;
    height: 12px;
  }
  :global(.yorha-production-layout *::-webkit-scrollbar-track) {
    background: rgba(15, 23, 42, 0.8);
    border-radius: 6px;
  }
  :global(.yorha-production-layout *::-webkit-scrollbar-thumb) {
    background: linear-gradient(180deg, rgba(245, 158, 11, 0.6), rgba(217, 119, 6, 0.6));
    border-radius: 6px;
    border: 2px solid rgba(15, 23, 42, 0.8);
  }
  :global(.yorha-production-layout *::-webkit-scrollbar-thumb:hover) {
    background: linear-gradient(180deg, rgba(245, 158, 11, 0.8), rgba(217, 119, 6, 0.8));
  }
  /* Professional animation effects */
  :global(.professional-glow) {
    animation: professional-glow 3s ease-in-out infinite;
  }
  @keyframes professional-glow {
    0%,
    100% {
      box-shadow: 0 0 20px rgba(245, 158, 11, 0.1);
    }
    50% {
      box-shadow: 0 0 30px rgba(245, 158, 11, 0.2);
    }
  }
  /* Enhanced backdrop blur effects */
  .backdrop-blur-md {
    backdrop-filter: blur(12px) saturate(180%);
  }
  /* Professional responsive typography */
  @media (max-width: 768px) {
    .yorha-production-layout {
      font-size: 15px;
    }
  }
  @media (max-width: 640px) {
    .yorha-production-layout {
      font-size: 14px;
    }
  }
  /* Professional smooth transitions */
  :global(*) {
    transition:
      color 0.3s ease,
      background-color 0.3s ease,
      border-color 0.3s ease,
      transform 0.3s ease,
      box-shadow 0.3s ease;
  }
</style>
