<script lang="ts">
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { Button, LinkButton } from '$lib/components/ui/enhanced-bits';
  import AccessibilitySettings from '$lib/components/ui/AccessibilitySettings.svelte';
  import { accessibilityService } from '$lib/services/accessibility-service';

  interface Props {
    user?: unknown;
    sidebarOpen?: boolean;
    variant?: 'full' | 'minimal' | 'demo';
  }

  let {
    user = null,
    sidebarOpen = $bindable(false),
    variant = 'full'
  }: Props = $props();

  let currentPath = $derived($page.url.pathname);
  let isDemo = $derived(currentPath.startsWith('/demo'));
  let isAuth = $derived(currentPath.startsWith('/auth'));
  let isAdmin = $derived(currentPath.startsWith('/admin'));
  let showAccessibilitySettings = $state(false);

  // Navigation item type
  type NavItem = {
    path: string;
    label: string;
    icon: string;
  };

  // Main navigation items
  const mainNavItems: NavItem[] = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/dashboard/cases', label: 'Cases', icon: '📁' },
    { path: '/ai/dashboard', label: 'AI Hub', icon: '🤖' },
    { path: '/evidenceboard', label: 'Evidence', icon: '🔍' },
    { path: '/persons-of-interest', label: 'POI', icon: '👥' },
    { path: '/citations', label: 'Citations', icon: '📚' },
    { path: '/chat', label: 'Chat', icon: '💬' },
  ];

  // Demo navigation items
  const demoNavItems: NavItem[] = [
    { path: '/demo/bits-ui', label: 'Components', icon: '🎨' },
    { path: '/demo/nes-bits-ui', label: 'NES UI', icon: '🎮' },
    { path: '/demo/gpu-inference', label: 'GPU', icon: '⚡' },
    { path: '/demo/legal-ai-complete', label: 'Legal AI', icon: '⚖️' },
    { path: '/all-routes', label: 'All Routes', icon: '🗺️' },
  ];

  // Admin navigation items
  const adminNavItems: NavItem[] = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/users', label: 'Users', icon: '👤' },
    { path: '/admin/cluster', label: 'Cluster', icon: '🖥️' },
    { path: '/admin/performance-dashboard', label: 'Performance', icon: '📈' },
  ];

  function isActive(path: string): boolean {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  }

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function toggleAccessibilitySettings() {
    showAccessibilitySettings = !showAccessibilitySettings;
    if (showAccessibilitySettings) {
      accessibilityService.announceToScreenReader('Accessibility settings opened');
    }
  }

  function handleKeyboardShortcut(event: KeyboardEvent) {
    // Alt + A: Open accessibility settings
    if (event.altKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      toggleAccessibilitySettings();
    }
  }
</script>

<header class="navbar-header" data-variant={variant}>
  <div class="navbar-container">
    <div class="navbar-content">
      <!-- Logo and Sidebar Toggle -->
      <div class="navbar-start">
        {#if variant === 'full'}
          <button
            class="sidebar-toggle nes-btn"
            onclick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
        {/if}

        <a href="/" class="navbar-logo">
          <span class="logo-text">YoRHa Legal AI</span>
          {#if isDemo}
            <span class="badge badge-demo">DEMO</span>
          {/if}
          {#if isAdmin}
            <span class="badge badge-admin">ADMIN</span>
          {/if}
        </a>
      </div>

      <!-- Main Navigation -->
      <nav class="navbar-center" aria-label="Main navigation">
        {#if variant === 'minimal'}
          <!-- Minimal nav for auth pages -->
          <LinkButton href="/" variant="ghost" size="sm">Home</LinkButton>
          <LinkButton href="/all-routes" variant="ghost" size="sm">Browse</LinkButton>
        {:else if isDemo}
          <!-- Demo-specific navigation -->
          {#each demoNavItems as item}
            <LinkButton
              href={item.path}
              variant={isActive(item.path) ? 'primary' : 'ghost'}
              size="sm"
              class="nav-item"
            >
              <span class="nav-icon">{item.icon}</span>
              <span class="nav-label">{item.label}</span>
            </LinkButton>
          {/each}
        {:else if isAdmin && user?.role === 'admin'}
          <!-- Admin navigation -->
          {#each adminNavItems as item}
            <LinkButton
              href={item.path}
              variant={isActive(item.path) ? 'primary' : 'ghost'}
              size="sm"
              class="nav-item"
            >
              <span class="nav-icon">{item.icon}</span>
              <span class="nav-label">{item.label}</span>
            </LinkButton>
          {/each}
        {:else}
          <!-- Main navigation -->
          {#each mainNavItems as item}
            <LinkButton
              href={item.path}
              variant={isActive(item.path) ? 'primary' : 'ghost'}
              size="sm"
              class="nav-item"
            >
              <span class="nav-icon">{item.icon}</span>
              <span class="nav-label">{item.label}</span>
            </LinkButton>
          {/each}
        {/if}
      </nav>

      <!-- User Menu / Auth Buttons -->
      <div class="navbar-end">
        <!-- Accessibility Settings Button -->
        <button
          class="accessibility-btn nes-btn is-primary"
          onclick={toggleAccessibilitySettings}
          aria-label="Open accessibility settings (Alt+A)"
          title="Accessibility Settings (Alt+A)"
        >
          ♿
        </button>

        {#if user}
          <div class="user-menu">
            <span class="user-name">{user.name || user.email}</span>
            <LinkButton href="/settings" variant="ghost" size="sm">
              ⚙️ Settings
            </LinkButton>
            <LinkButton href="/auth/logout" variant="ghost" size="sm">
              Logout
            </LinkButton>
          </div>
        {:else}
          <LinkButton href="/auth/login" variant="ghost" size="sm">
            Login
          </LinkButton>
          <LinkButton href="/auth/register" variant="primary" size="sm">
            Register
          </LinkButton>
        {/if}
      </div>
    </div>
  </div>
</header>

<!-- Accessibility Settings Modal -->
<AccessibilitySettings bind:isOpen={showAccessibilitySettings} />

<!-- Global keyboard shortcut handler -->
<svelte:window onkeydown={handleKeyboardShortcut} />

<style>
  .navbar-header {
    position: sticky;
    top: 0;
    z-index: 40;
    background: var(--color-bg-secondary, #1a1a2e);
    border-bottom: 1px solid var(--color-border, #333);
    backdrop-filter: blur(8px);
  }

  .navbar-container {
    max-width: 100%;
    margin: 0 auto;
  }

  .navbar-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.5rem;
    gap: 1rem;
  }

  .navbar-start {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .sidebar-toggle {
    padding: 0.5rem;
    background: transparent;
    border: 1px solid var(--color-border);
    cursor: pointer;
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
  }

  .navbar-logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: var(--color-primary, #f59e0b);
    font-weight: bold;
    font-size: 1.25rem;
  }

  .logo-text {
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .badge {
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .badge-demo {
    background: rgba(74, 144, 226, 0.2);
    color: #4a90e2;
    border: 1px solid #4a90e2;
  }

  .badge-admin {
    background: rgba(208, 2, 27, 0.2);
    color: #d0021b;
    border: 1px solid #d0021b;
  }

  .navbar-center {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    justify-content: center;
  }

  :global(.navbar-center .nav-item) {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .nav-icon {
    font-size: 1rem;
  }

  .nav-label {
    display: none;
  }

  @media (min-width: 768px) {
    .nav-label {
      display: inline;
    }
  }

  .navbar-end {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .user-menu {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .user-name {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    display: none;
  }

  .accessibility-btn {
    padding: 0.5rem;
    font-size: 1.25rem;
    border-radius: 0.375rem;
    background: transparent;
    border: 1px solid var(--color-primary, #4a90e2);
    color: var(--color-primary, #4a90e2);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
  }

  .accessibility-btn:hover {
    background: var(--color-primary, #4a90e2);
    color: white;
    transform: scale(1.05);
  }

  .accessibility-btn:focus-visible {
    outline: 2px solid var(--color-primary, #4a90e2);
    outline-offset: 2px;
  }

  @media (min-width: 768px) {
    .user-name {
      display: inline;
    }
  }

  /* Variant styles */
  [data-variant="minimal"] .navbar-center {
    justify-content: flex-start;
  }

  [data-variant="demo"] {
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    border-bottom: 2px solid #4a90e2;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .navbar-content {
      padding: 0.5rem 1rem;
    }

    .navbar-center {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }

    .navbar-center ::-webkit-scrollbar {
      display: none;
    }
  }
</style>