<!-- Gaming-Themed Navigation Bar with Console Theme Switching -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { applyConsolePalette, CONSOLE_PALETTES, type ConsolePaletteName } from '$lib/themes/retro-console-palettes';

  interface User {
    name?: string;
    email?: string;
    avatar?: string;
    role?: string;
  }

  interface Props {
    user: User | null;
    sidebarOpen?: boolean;
    onToggleSidebar?: () => void;
  }

  let { user, sidebarOpen = false, onToggleSidebar }: Props = $props();

  // Gaming theme state
  let selectedTheme = $state<ConsolePaletteName>('legal');
  let showThemeDropdown = $state(false);

  // Reactive values
  let isAuthenticated = $derived(!!user);
  let currentRoute = $derived($page.url.pathname);
  let isAdmin = $derived(user?.role === 'admin');

  // Theme switching logic
  function switchTheme(theme: ConsolePaletteName) {
    selectedTheme = theme;
    applyConsolePalette(theme);
    showThemeDropdown = false;

    // Store in localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('legal-ai-theme', theme);
    }
  }

  // Initialize theme on mount
  $effect(() => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('legal-ai-theme') as ConsolePaletteName;
      if (stored && CONSOLE_PALETTES[stored]) {
        selectedTheme = stored;
        applyConsolePalette(stored);
      }
    }
  });

  function handleNavigation(path: string) {
    goto(path);
  }

  function handleLogout() {
    // Logout logic would go here
    goto('/login');
  }
</script>

<nav class="navbar">
  <div class="nav-container">
    <!-- Left section Logo + Sidebar Toggle -->
    <div class="nav-left">
      {#if onToggleSidebar}
        <button class="sidebar-toggle" onclick={onToggleSidebar} aria-label="Toggle sidebar">
          <span class="hamburger" class:open={sidebarOpen}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      {/if}

      <div class="logo">
        <button class="logo-btn" onclick={() => handleNavigation(isAuthenticated ? '/dashboard' : '/')}>
          <span class="logo-icon">🎮</span>
          <span class="logo-text">Legal AI</span>
        </button>
      </div>
    </div>

    <!-- Center section Main Navigation (if authenticated) -->
    {#if isAuthenticated}
      <div class="nav-center">
        <a href="/dashboard" class="nav-link" class:active={currentRoute === '/dashboard'}> 🏠 Dashboard </a>
        <a href="/cases" class="nav-link" class:active={currentRoute.startsWith('/cases')}> ⚖️ Cases </a>
        <a href="/ai" class="nav-link" class:active={currentRoute.startsWith('/ai')}> 🤖 AI Assistant </a>
        {#if isAdmin}
          <a href="/admin" class="nav-link admin-link" class:active={currentRoute.startsWith('/admin')}> 🔧 Admin </a>
        {/if}
      </div>
    {/if}

    <!-- Right section Theme + User Menu -->
    <div class="nav-right">
      <!-- Gaming Theme Selector -->
      <div class="theme-selector">
        <button
          class="theme-btn"
          onclick={() => (showThemeDropdown = !showThemeDropdown)}
          aria-label="Switch console theme"
        >
          <span class="theme-icon">🎨</span>
          <span class="theme-name">{CONSOLE_PALETTES[selectedTheme].name}</span>
          <span class="dropdown-arrow" class:open={showThemeDropdown}>▼</span>
        </button>

        {#if showThemeDropdown}
          <div class="theme-dropdown">
            {#each Object.entries(CONSOLE_PALETTES) as [key, palette]}
              <button
                class="theme-option"
                class:active={key === selectedTheme}
                onclick={() => switchTheme(key as ConsolePaletteName)}
              >
                <span class="theme-preview" style="background: {palette.colors.primary}"></span>
                <span class="theme-info">
                  <span class="theme-title">{palette.name}</span>
                  <span class="theme-era">{palette.era}</span>
                </span>
                {#if key === selectedTheme}
                  <span class="check-mark">✓</span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- User Menu -->
      {#if isAuthenticated && user}
        <div class="user-menu">
          <button class="user-btn" onclick={() => goto('/profile')}>
            <span class="user-avatar">👤</span>
            <span class="user-name">{user.email}</span>
          </button>
          <button class="logout-btn" onclick={handleLogout}>
            <span>🚪</span> Logout
          </button>
        </div>
      {:else}
        <div class="auth-buttons">
          <button class="login-btn" onclick={() => goto('/login')}> Login </button>
          <button class="signup-btn" onclick={() => goto('/register')}> Sign Up </button>
        </div>
      {/if}
    </div>
  </div>
</nav>

<style>
  .navbar {
    position: sticky;
    top: 0;
    z-index: 1000;
    background: var(--console-gradient-main, linear-gradient(45deg, #0f0f23, #1a1a2e));
    border-bottom: 2px solid var(--console-primary, #00aa00);
    backdrop-filter: blur(10px);
  }

  .nav-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .nav-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .sidebar-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .sidebar-toggle:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .hamburger {
    display: flex;
    flex-direction: column;
    width: 20px;
    height: 16px;
    position: relative;
  }

  .hamburger span {
    display: block;
    height: 2px;
    width: 100%;
    background: var(--console-fg, white);
    margin: 2px 0;
    transition 0.3s;
    transform-origin: center;
  }

  .hamburger.open span:nth-child(1) {
    transform: rotate(45deg) translate(5px, 5px);
  }

  .hamburger.open span:nth-child(2) {
    opacity: 0;
  }

  .hamburger.open span:nth-child(3) {
    transform: rotate(-45deg) translate(7px, -6px);
  }

  .logo-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: none;
    border: none;
    color: var(--console-fg, white);
    font-size: 1.25rem;
    font-weight: bold;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .logo-btn:hover {
    background: var(--console-primary, #00aa00);
    color: var(--console-bg, #0f0f23);
  }

  .logo-icon {
    font-size: 1.5rem;
  }

  .nav-center {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    color: var(--console-fg, white);
    text-decoration: none;
    border-radius: 6px;
    transition: all 0.2s;
    font-weight: 500;
  }

  .nav-link:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--console-primary, #00aa00);
  }

  .nav-link.active {
    background: var(--console-primary, #00aa00);
    color: var(--console-bg, #0f0f23);
  }

  .admin-link {
    border: 1px solid var(--console-error, #ff5555);
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .theme-selector {
    position: relative;
  }

  .theme-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid var(--console-primary, #00aa00);
    color: var(--console-fg, white);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.9rem;
  }

  .theme-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .dropdown-arrow {
    font-size: 0.8rem;
    transition: transform 0.2s;
  }

  .dropdown-arrow.open {
    transform: rotate(180deg);
  }

  .theme-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.5rem;
    background: var(--console-bg, #0f0f23);
    border: 2px solid var(--console-primary, #00aa00);
    border-radius: 8px;
    min-width: 280px;
    z-index: 1000;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .theme-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    color: var(--console-fg, white);
    cursor: pointer;
    transition background 0.2s;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .theme-optionhover {
    background: rgba(255, 255, 255, 0.1);
  }

  .theme-option.active {
    background: var(--console-primary, #00aa00);
    color: var(--console-bg, #0f0f23);
  }

  .theme-preview {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.3);
  }

  .theme-info {
    display: flex;
    flex-direction column;
    align-items: flex-start;
    flex: 1;
  }

  .theme-title {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .theme-era {
    font-size: 0.8rem;
    opacity: 0.7;
  }

  .check-mark {
    font-weight: bold;
  }

  .user-menu {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .user-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid transparent;
    color: var(--console-fg, white);
    border-radius: 6px;
    cursor: pointer;
    transition all 0.2s;
  }

  .user-btn:hover {
    border-color: var(--console-primary, #00aa00);
  }

  .logout-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--console-error, #ff5555);
    border: none;
    color: white;
    border-radius: 6px;
    cursor: pointer;
    transition all 0.2s;
    font-size: 0.9rem;
  }

  .logout-btn:hover {
    background: var(--console-error, #cc4444);
  }

  .auth-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .login-btn,
  .signup-btn {
    padding: 0.5rem 1rem;
    border: 1px solid var(--console-primary, #00aa00);
    color: var(--console-fg, white);
    background: none;
    border-radius: 6px;
    cursor: pointer;
    transition all 0.2s;
    font-weight: 500;
  }

  .signup-btn {
    background: var(--console-primary, #00aa00);
    color: var(--console-bg, #0f0f23);
  }

  .login-btn:hover {
    background: var(--console-primary, #00aa00);
    color: var(--console-bg, #0f0f23);
  }

  .signup-btn:hover {
    background: transparent;
    color: var(--console-primary, #00aa00);
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .nav-center {
      display: none;
    }

    .theme-name {
      display: none;
    }

    .user-name {
      display: none;
    }
  }
</style>
