<script lang="ts">
  // LoginButton component - Enhanced login/logout button - Svelte 5 compatible
  import { authStore } from '$lib/stores/auth-store.svelte';
  import { goto } from '$app/navigation';
  import Button from '$lib/components/ui/Button.svelte';
  
  interface Props {
    variant?: 'default' | 'outline' | 'ghost' | 'secondary';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    loginText?: string;
    logoutText?: string;
    showUserInfo?: boolean;
    redirectAfterLogin?: string;
    redirectAfterLogout?: string;
  }

  let {
    variant = 'default',
    size = 'md',
    className = '',
    loginText = 'Sign In',
    logoutText = 'Sign Out',
    showUserInfo = false,
    redirectAfterLogin = '/dashboard',
    redirectAfterLogout = '/'
  }: Props = $props();

  async function handleLogin() {
    if (redirectAfterLogin) {
      authStore.setRedirect(redirectAfterLogin);
    }
    goto('/auth/login');
  }

  async function handleLogout() {
    await authStore.logout();
    if (redirectAfterLogout) {
      goto(redirectAfterLogout);
    }
  }
</script>

{#if authStore.isAuthenticated}
  <div class="auth-user-section {className}">
    {#if showUserInfo && authStore.user}
      <div class="user-info">
        <span class="user-name">{authStore.user.name || authStore.user.email}</span>
        <span class="user-role">{authStore.user.role}</span>
      </div>
    {/if}
    <Button 
      {variant} 
      {size}
      onclick={handleLogout}
      disabled={authStore.isLoading}
      aria-label="Sign out"
    >
      {logoutText}
    </Button>
  </div>
{:else}
  <Button 
    {variant} 
    {size}
    class={className}
    onclick={handleLogin}
    disabled={authStore.isLoading}
    aria-label="Sign in"
  >
    {loginText}
  </Button>
{/if}

<style>
  .auth-user-section {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .user-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 0.875rem;
  }

  .user-name {
    font-weight: 500;
    color: #374151;
  }

  .user-role {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: capitalize;
  }

  @media (prefers-color-scheme: dark) {
    .user-name {
      color: #f9fafb;
    }
    
    .user-role {
      color: #9ca3af;
    }
  }
</style>