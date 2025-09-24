<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { fade } from 'svelte/transition';
  import { Button, LinkButton, YoRHaSearchBar, ThemeToggle, Tabs, Popover, Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/enhanced-bits';
  import AccessibilitySettings from '$lib/components/ui/AccessibilitySettings.svelte';
  import { accessibilityService } from '$lib/services/accessibility-service';
  interface User {
    name?: string;
    email?: string;
    avatar?: string;
    role?: string;
  }
  interface Props {
    user?: User | null;
    sidebarOpen?: boolean;
    variant?: 'full' | 'minimal' | 'demo' | 'admin';
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
  let searchQuery = $state('');
  let showSearch = $state(false);
  let showUserMenu = $state(false);
  let activeNavTab = $state('main');
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
    sidebarOpen = !sidebarOpe;
  }
  function toggleAccessibilitySettings() {
    showAccessibilitySettings = !showAccessibilitySetting;
    if (showAccessibilitySettings) {
      accessibilityService.announceToScreenReader('Accessibility settings opened');
    }
  }
  function toggleSearch() {
    showSearch = !showSearch;
  }
  function handleSearch(event: CustomEvent) {
    const { query } = event.detail;
    // Navigate to search results or trigger search
    if (query.trim()) {
      // For demo purposes, navigate to AI dashboard with search
      window.location.href = `/ai/dashboard?q=${encodeURIComponent(query)}`;
    }
  }
  function handleKeyboardShortcut(event: KeyboardEvent) {
    // Alt + A: Open accessibility settings
    if (event.altKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      toggleAccessibilitySettings();
    }
    // Ctrl + K: Open search
    if (event.ctrlKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      toggleSearch();
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
      <!-- Main Navigation with Tabs -->
      <nav class="navbar-center" aria-label="Main navigation">
        {#if variant === 'minimal'}
          <!-- Minimal nav for auth pages -->
          <LinkButton href="/" variant="ghost" size="sm">Home</LinkButton>
          <LinkButton href="/all-routes" variant="ghost" size="sm">Browse</LinkButton>
        {:else}
          <!-- Tabbed Navigation -->
          <Tabs
            bind:value={activeNavTab}
            class="nav-tabs"
            orientation="horizontal"
          >
            <div class="tabs-list">
              <button
                class="tab-trigger {activeNavTab === 'main' ? 'active' : ''}"
                onclick={() => activeNavTab = 'main'}
              >
                🏠 Main
              </button>
              {#if isDemo}
                <button
                  class="tab-trigger {activeNavTab === 'demo' ? 'active' : ''}"
                  onclick={() => activeNavTab = 'demo'}
                >
                  🎮 Demo
                </button>
              {/if}
              {#if isAdmin && user?.role === 'admin'}
                <button
                  class="tab-trigger {activeNavTab === 'admin' ? 'active' : ''}"
                  onclick={() => activeNavTab = 'admin'}
                >
                  ⚙️ Admin
                </button>
              {/if}
            </div>
            <div class="tab-content">
              {#if activeNavTab === 'main'}
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
              {:else if activeNavTab === 'demo' && isDemo}
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
              {:else if activeNavTab === 'admin' && isAdmin && user?.role === 'admin'}
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
              {/if}
            </div>
          </Tabs>
        {/if}
      </nav>
      <!-- User Menu / Auth Buttons -->
      <div class="navbar-end">
        <!-- Search Toggle -->
        {#if variant === 'full'}
          <button
            class="search-toggle nes-btn"
            onclick={toggleSearch}
            aria-label="Toggle search (Ctrl+K)"
            title="Search (Ctrl+K)"
          >
            🔍
          </button>
        {/if}
        <!-- Theme Toggle -->
        <ThemeToggle size="sm" />
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
          <!-- User Profile Dropdown -->
          <Popover bind:open={showUserMenu}>
            <button
              class="user-profile-trigger"
              onclick={() => showUserMenu = !showUserMenu}
              aria-label="User menu"
            >
              <div class="user-avatar">
                {user.avatar ?
                  `<img src="${user.avatar}" alt="${user.name}" />` :
                  (user.name?.[0] || user.email?.[0] || '👤')
                }
              </div>
              <div class="user-info">
                <span class="user-name">{user.name || user.email}</span>
                <span class="user-role">{user.role || 'User'}</span>
              </div>
              <span class="dropdown-arrow">▼</span>
            </button>
            <Card class="user-dropdown-card">
              <CardHeader>
                <CardTitle class="flex items-center gap-2">
                  <div class="user-avatar-large">
                    {user.avatar ?
                      `<img src="${user.avatar}" alt="${user.name}" />` :
                      (user.name?.[0] || user.email?.[0] || '👤')
                    }
                  </div>
                  <div>
                    <div class="font-medium">{user.name || 'User'}</div>
                    <div class="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent class="user-menu space-y-2">
                <LinkButton href="/profile" variant="ghost" size="sm" class="w-full justify-start">
                  👤 Profile
                </LinkButton>
                <LinkButton href="/settings" variant="ghost" size="sm" class="w-full justify-start">
                  ⚙️ Settings
                </LinkButton>
                <LinkButton href="/dashboard" variant="ghost" size="sm" class="w-full justify-start">
                  📊 Dashboard
                </LinkButton>
                {#if user.role === 'admin'}
                  <LinkButton href="/admin" variant="ghost" size="sm" class="w-full justify-start">
                    🔧 Admin Panel
                  </LinkButton>
                {/if}
                <hr class="my-2" />
                <LinkButton href="/auth/logout" variant="ghost" size="sm" class="w-full justify-start text-red-600">
                  🚪 Logout
                </LinkButton>
              </CardContent>
            </Card>
          </Popover>
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
<!-- Search Overlay -->
{#if showSearch}
  <div class="search-overlay" transition:fade={{ duration: 200 }}>
    <div class="search-container">
      <YoRHaSearchBar
        bind:value={searchQuery}
        theme={isDemo ? 'yorha' : 'legal'}
        placeholder="Search legal documents, cases, evidence..."
        autofocus={true}
        on:search={handleSearch}
        onblur={() => setTimeout(() => showSearch = false, 100)}
        maxSuggestions={6}
      />
    </div>
  </div>
{/if}
<!-- Accessibility Settings Modal -->
<AccessibilitySettings bind:isOpen={showAccessibilitySettings} />
<!-- Global keyboard shortcut handler -->
<svelte:window onkeydown={handleKeyboardShortcut} />
<style>
  .navbar-header {
    position: sticky;
y;
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
    justify-content: space-betwee;
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
      display: inli;
    }
  }
  .navbar-end {
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
  .search-toggle {
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
    transition: all 0.2s ease;
  }
  .search-toggle:hover {
    background: var(--color-border);
    transform: scale(1.05);
  }
  /* Tab Navigation */
  .tabs-list {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem;
    background: var(--color-bg-tertiary, rgba(255, 255, 255, 0.05));
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
  }
  .tab-trigger {
    padding: 0.375rem 0.75rem;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .tab-trigger:hover {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
  }
  .tab-trigger.active {
    background: var(--color-primary);
    color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .tab-content {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  /* User Profile */
  .user-profile-trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--color-text-primary);
  }
  .user-profile-trigger:hover {
    background: var(--color-bg-secondary);
    border-color: var(--color-primary);
  }
  .user-avatar,
  .user-avatar-large {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: var(--color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 0.875rem;
    overflow: hidden;
  }
  .user-avatar-large {
    width: 3rem;
    height: 3rem;
    font-size: 1.25rem;
  }
  .user-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.125rem;
  }
  .user-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-primary);
    display: none;
  }
  .user-role {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    display: none;
  }
  .dropdown-arrow {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    transition: transform 0.2s ease;
  }
  .user-profile-trigger:hover .dropdown-arrow {
    transform: rotate(180deg);
  }
  /* Search Overlay */
  .search-overlay {
    position: fixed;
d;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
    z-index: 50;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 10vh;
  }
  .search-container {
    width: 100%;
    max-width: 600px;
    padding: 0 1rem;
  }
  @media (min-width: 768px) {
    .user-name,
    .user-role {
      display: block;
    }
    .tab-content {
      justify-content: flex-start;
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