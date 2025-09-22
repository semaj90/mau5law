<script lang="ts">
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { redirect } from '@sveltejs/kit';
  import { ThemeProvider, Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/enhanced-bits';
  import NavBar from '$lib/components/layout/NavBar.svelte';

  interface Props {
    data: {
      user?: unknown;
      session?: unknown;
    };
    children: any;
  }

  let { data, children }: Props = $props();

  let currentPath = $derived($page.url.pathname);
  let isLoginPage = $derived(currentPath === '/auth/login' || currentPath === '/login');
  let isRegisterPage = $derived(currentPath === '/auth/register' || currentPath === '/register');
  let sidebarOpen = $state(false);

  // Minimal theme for auth pages
  const authTheme = {
    colors: {
      primary: '#4A90E2',
      secondary: '#6B7280',
      accent: '#10B981',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      text: '#1F2937',
      textSecondary: '#6B7280',
      border: '#E5E7EB'
    }
  };
</script>

<ThemeProvider theme="legal">
  <!-- Auth-specific navbar with minimal variant -->
  <NavBar
    user={data.user}
    bind:sidebarOpen
    variant="minimal"
  />

  <main class="auth-layout">
    <div class="auth-container">
      {#if isLoginPage || isRegisterPage}
        <!-- Centered auth form layout -->
        <div class="auth-form-container">
          <div class="auth-brand">
            <div class="brand-logo">
              <span class="logo-icon">⚖️</span>
              <h1 class="brand-title">YoRHa Legal AI</h1>
            </div>
            <p class="brand-subtitle">
              Advanced Legal Intelligence Platform
            </p>
          </div>

          <Card class="auth-card">
            <CardContent class="auth-card-content">
              {@render children?.()}
            </CardContent>
          </Card>

          <div class="auth-footer">
            <p class="footer-links">
              {#if isLoginPage}
                Don't have an account?
                <a href="/auth/register" class="auth-link">Register here</a>
              {:else}
                Already have an account?
                <a href="/auth/login" class="auth-link">Sign in</a>
              {/if}
            </p>
            <p class="footer-help">
              Need help? <a href="/help" class="auth-link">Contact Support</a>
            </p>
          </div>
        </div>
      {:else}
        <!-- General auth layout for other auth pages -->
        <div class="auth-content-container">
          <div class="auth-content-wrapper">
            {@render children?.()}
          </div>
        </div>
      {/if}
    </div>
  </main>
</ThemeProvider>

<style>
  .auth-layout {
    min-height: calc(100vh - 60px);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .auth-container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }

  .auth-form-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    max-width: 400px;
    margin: 0 auto;
  }

  .auth-brand {
    text-align: center;
    color: white;
  }

  .brand-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .logo-icon {
    font-size: 2.5rem;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  }

  .brand-title {
    font-size: 2rem;
    font-weight: 700;
    margin: 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    letter-spacing: 0.05em;
  }

  .brand-subtitle {
    font-size: 1rem;
    opacity: 0.9;
    margin: 0;
    font-weight: 300;
  }

  .auth-card {
    width: 100%;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  .auth-card-content {
    padding: 2rem;
  }

  .auth-footer {
    text-align: center;
    color: white;
    font-size: 0.875rem;
    space-y: 0.5rem;
  }

  .footer-links,
  .footer-help {
    margin: 0.5rem 0;
    opacity: 0.9;
  }

  .auth-link {
    color: #FBD38D;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;
  }

  .auth-link:hover {
    color: #F6E05E;
    text-decoration: underline;
  }

  .auth-content-container {
    max-width: 800px;
    margin: 0 auto;
  }

  .auth-content-wrapper {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 1rem;
    padding: 2rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 768px) {
    .auth-layout {
      padding: 1rem;
    }

    .brand-title {
      font-size: 1.5rem;
    }

    .auth-card-content {
      padding: 1.5rem;
    }

    .auth-content-wrapper {
      padding: 1.5rem;
    }
  }
</style>