<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get, type Unsubscriber } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { AuthStore, isAuthenticated, currentUser } from '$lib/auth/auth-store';
  import { AccessControl } from '$lib/auth/roles';
  import type { LayoutData } from './$types';
  import type { Permission } from '$lib/auth/roles';

  // Props using Svelte 5 syntax
  let { data }: { data: LayoutData } = $props();

  // State using Svelte 5 syntax
  let isLoading = $state(true);
  let hasAdminAccess = $state(false);
  let glitchEffect = $state('');
  const glitchChars = ['#', '%', '@', '◈', '◉', '◎', '⧨', '◐', '⬢'];
  // Use a cross-environment interval type to avoid Node vs DOM return-type mismatches
  let glitchInterval = $state<ReturnType<typeof setInterval> | null >(null);

  // Local snapshot of current user (subscribe to store to avoid $ pref in code)
  let currentUserValue: { email?: string; role?: string } | null = $state(null);
  let unsubscribeCurrentUser = $state<Unsubscriber | null >(null);

  // Explicit subscription for page store to avoid using $page in script reactive context
  let unsubscribePage = $state<Unsubscriber | null >(null);

  // Professional Executive Dashboard styling classes
  const executiveClasses = {
    container: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white font-sans min-h-screen',
    header: 'border-b border-amber-500/20 bg-slate-900/95 backdrop-blur-md shadow-xl p-6',
    nav: 'flex flex-wrap gap-4',
    navLink: 'px-6 py-3 border border-slate-600/50 bg-slate-800/60 hover:bg-amber-500/10 hover:border-amber-500/60 transition-all duration-300 rounded-lg font-medium text-slate-300 hover:text-amber-400',
    navLinkActive: 'px-6 py-3 border border-amber-500 bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-400 shadow-lg shadow-amber-500/25 rounded-lg font-semibold',
    sidebar: 'w-80 bg-slate-900/90 backdrop-blur-sm border-r border-amber-500/20 p-6 shadow-2xl',
    content: 'flex-1 p-8 max-w-7xl mx-auto',
    glitch: 'relative overflow-hidden'
  };

  // Executive navigation items for admin panel
  const navItems: { path: string; label: string; icon: string; permission: Permission; description: string }[] = [
    {
      path: '/admin',
      label: 'Executive Dashboard',
      icon: '📊',
      permission: 'access_admin_panel',
      description: 'Strategic overview and key metrics'
    },
    {
      path: '/admin/users',
      label: 'User Management',
      icon: '👥',
      permission: 'manage_users',
      description: 'User accounts and permissions'
    },
    {
      path: '/admin/roles',
      label: 'Role Administration',
      icon: '🔐',
      permission: 'manage_users',
      description: 'Access control and role definitions'
    },
    {
      path: '/admin/system',
      label: 'System Configuration',
      icon: '⚙️',
      permission: 'configure_system',
      description: 'Platform settings and configuration'
    },
    {
      path: '/admin/audit',
      label: 'Audit & Compliance',
      icon: '📋',
      permission: 'view_audit_logs',
      description: 'Security logs and compliance tracking'
    },
    {
      path: '/admin/integrations',
      label: 'Enterprise Integrations',
      icon: '🔗',
      permission: 'manage_integrations',
      description: 'Third-party systems and APIs'
    }
  ];

  // Derive visible nav items from current user permissions
  let visibleNavItems = $state<{ path: string; label: string; icon: string; permission: Permission }[] >([]);

  // Derived display values for safer template usage
  let userEmail = $derived(currentUserValue?.email ?? '');
  let userRoleLabel = $derived(currentUserValue?.role ? currentUserValue.role.toUpperCase().replace(/_/g, ' ') : 'UNKNOWN');

  $effect(() => {
    visibleNavItems = currentUserValue && currentUserValue.role
      ? navItems.filter(item => AccessControl.hasPermission(currentUserValue.role, item.permission))
      : [];
  });

  // Maintain current path via explicit subscription to avoid $page usage in TS logic
  let currentPath = $state('');

  function isActivePath(itemPath: string) {
    return currentPath === itemPath || (itemPath !== '/admin' && currentPath.startsWith(itemPath + '/'));
  }

  function navClass(item: { path: string; label: string; icon: string; permission: Permission; description: string }) {
    return (isActivePath(item.path) ? executiveClasses.navLinkActive : executiveClasses.navLink) + ' w-full block text-left group';
  }

  onMount(async () => {
    try {
      // Initialize auth if not already done
      await AuthStore.initialize();

      // Initialize current user from data or store snapshot and subscribe for updates
      const initialUser = data.user || get(currentUser);
      currentUserValue = initialUser ?? null;
      unsubscribeCurrentUser = currentUser.subscribe(v => { currentUserValue = v; });

      // subscribe to page store to keep currentPath updated (safe in TS/SSR)
      unsubscribePage = page.subscribe(p => {
        currentPath = p?.url?.pathname ?? '';
      });

      // Check if user is authenticated and has admin access
      const user = currentUserValue;

      if (!user || !get(isAuthenticated)) {
        goto('/login?redirect=/admin');
        return;
      }

      // Check for admin panel access permission (guard role access)
      const userRole = user?.role ?? '';
      hasAdminAccess = userRole ? AccessControl.hasPermission(userRole, 'access_admin_panel') : false;

      if (!hasAdminAccess) {
        goto('/unauthorized');
        return;
      }

      // Start a small decorative glitch effect
      glitchInterval = setInterval(() => {
        glitchEffect = Math.random() < 0.08 ? glitchChars[Math.floor(Math.random() * glitchChars.length)] : '';
      }, 120);

    } catch (error) {
      console.error('Admin layout initialization error:', error);
      goto('/login');
    } finally {
      isLoading = false;
    }
  });

  onDestroy(() => {
    if (glitchInterval !== null) {
      clearInterval(glitchInterval);
    }
    if (unsubscribeCurrentUser) {
      unsubscribeCurrentUser();
    }
    if (unsubscribePage) {
      unsubscribePage();
    }
  });
</script>

<!-- Executive Admin Layout with Professional Styling -->
{#if !isLoading}
  <div class={executiveClasses.container}>
    <!-- Executive Header -->
    <header class={executiveClasses.header}>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <span class="text-2xl font-bold text-slate-900">LA</span>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-amber-400 tracking-tight">Legal AI Platform</h1>
              <p class="text-slate-400 text-sm">Executive Administration Console</p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-6">
          <div class="text-right">
            <div class="text-xs text-slate-500 uppercase tracking-wider mb-1">Current User</div>
            <div class="font-semibold text-amber-400">{userEmail ? userEmail : (currentUserValue?.email || 'Unknown User')}</div>
            <div class="text-xs text-slate-400">{userRoleLabel !== 'UNKNOWN' ? userRoleLabel : (currentUserValue?.role ? currentUserValue.role.replace(/_/g, ' ') : 'No Role Assigned')}</div>
          </div>

          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
              <span class="text-amber-400 font-bold text-sm">{(userEmail || currentUserValue?.email || 'U')[0].toUpperCase()}</span>
            </div>
            <button
              onclick={() => AuthStore.logout()}
              class="px-4 py-2 bg-red-500/10 border border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-500 transition-all duration-300 rounded-lg text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="flex min-h-[calc(100vh-7rem)]">
      <aside class={executiveClasses.sidebar}>
        <nav class="space-y-3">
          <div class="mb-6">
            <h3 class="text-xs uppercase tracking-wider text-slate-500 font-bold mb-4 border-b border-amber-500/20 pb-2">Administration</h3>
          </div>
          {#each visibleNavItems as item}
            <a href={item.path} class={navClass(item)}>
              <div class="flex items-center gap-4">
                <span class="text-xl">{item.icon}</span>
                <div class="flex-1">
                  <div class="font-medium">{item.label}</div>
                  <div class="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">{item.description}</div>
                </div>
              </div>
            </a>
          {/each}
        </nav>

        <div class="mt-8 pt-6 border-t border-amber-500/20">
          <div class="text-xs uppercase tracking-wider text-slate-500 font-bold mb-4">Executive Actions</div>
          <div class="space-y-3">
            <button class="w-full text-left px-4 py-3 bg-slate-800/50 hover:bg-amber-500/10 rounded-lg transition-all duration-300 border border-slate-600/50 hover:border-amber-500/50 group">
              <div class="flex items-center gap-3">
                <span class="text-green-400">🟢</span>
                <div>
                  <div class="text-sm font-medium text-slate-300 group-hover:text-amber-400">System Health</div>
                  <div class="text-xs text-slate-500">Monitor platform status</div>
                </div>
              </div>
            </button>
            <button class="w-full text-left px-4 py-3 bg-slate-800/50 hover:bg-amber-500/10 rounded-lg transition-all duration-300 border border-slate-600/50 hover:border-amber-500/50 group">
              <div class="flex items-center gap-3">
                <span class="text-blue-400">💾</span>
                <div>
                  <div class="text-sm font-medium text-slate-300 group-hover:text-amber-400">Data Backup</div>
                  <div class="text-xs text-slate-500">Secure system backup</div>
                </div>
              </div>
            </button>
            <button class="w-full text-left px-4 py-3 bg-slate-800/50 hover:bg-amber-500/10 rounded-lg transition-all duration-300 border border-slate-600/50 hover:border-amber-500/50 group">
              <div class="flex items-center gap-3">
                <span class="text-purple-400">🗑️</span>
                <div>
                  <div class="text-sm font-medium text-slate-300 group-hover:text-amber-400">Cache Management</div>
                  <div class="text-xs text-slate-500">Optimize performance</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </aside>

      <!-- Executive Main Content Area -->
      <main class={executiveClasses.content}>
        <div class="mb-8">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-3xl font-bold text-white mb-2">Executive Dashboard</h2>
              <p class="text-slate-400">Advanced legal AI platform administration and management</p>
            </div>
            <div class="bg-slate-800/60 border border-amber-500/20 rounded-lg p-4">
              <div class="text-xs text-slate-500 uppercase tracking-wider mb-1">Access Level</div>
              <div class="text-amber-400 font-semibold">{currentUserValue?.role ? currentUserValue.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Standard User'}</div>
              <div class="text-xs text-slate-500 mt-1">Administrator privileges active</div>
            </div>
          </div>
        </div>
        {@render children?.()}
      </main>
    </div>
  </div>

{:else}
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
    <div class="text-center max-w-lg mx-auto p-8">
      <div class="w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/25">
        <span class="text-4xl text-white">⚠</span>
      </div>
      <h1 class="text-2xl font-bold text-white mb-4">Access Restricted</h1>
      <div class="bg-slate-800/60 border border-red-500/20 rounded-lg p-6 mb-6">
        <div class="text-sm text-slate-400 mb-2">Administrative access required</div>
        <div class="text-red-400 font-semibold">Current Role: {currentUserValue?.role ? currentUserValue.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unauthorized'}</div>
        <div class="text-xs text-slate-500 mt-2">Contact your system administrator for access</div>
      </div>
      <button
        onclick={() => goto('/')}
        class="px-8 py-3 bg-amber-500/10 border border-amber-500/50 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500 transition-all duration-300 rounded-lg font-medium"
      >
        Return to Dashboard
      </button>
    </div>
  </div>
{/if}

<style>
  /* Professional Executive Theme Effects */
  @keyframes professional-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.1); }
    50% { box-shadow: 0 0 30px rgba(245, 158, 11, 0.2); }
  }

  .professional-glow {
    animation: professional-glow 3s ease-in-out infinite;
  }

  /* Enhanced scrollbar for executive theme */
  :global(::-webkit-scrollbar) {
    width: 12px;
  }

  :global(::-webkit-scrollbar-track) {
    background: rgba(15, 23, 42, 0.8);
    border-radius: 6px;
  }

  :global(::-webkit-scrollbar-thumb) {
    background: linear-gradient(180deg, rgba(245, 158, 11, 0.6), rgba(217, 119, 6, 0.6));
    border-radius: 6px;
    border: 2px solid rgba(15, 23, 42, 0.8);
  }

  :global(::-webkit-scrollbar-thumb:hover) {
    background: linear-gradient(180deg, rgba(245, 158, 11, 0.8), rgba(217, 119, 6, 0.8));
  }

  /* Smooth transitions for professional feel */
  :global(*) {
    transition: color 0.3s ease, background-color 0.3s ease, border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
  }

  /* Executive typography */
  :global(.font-sans) {
    font-family: 'Inter', 'Segoe UI', 'Helvetica Neue', sans-serif;
  }

  /* Professional backdrop effects */
  .backdrop-blur-md {
    backdrop-filter: blur(12px) saturate(180%);
  }
</style>
