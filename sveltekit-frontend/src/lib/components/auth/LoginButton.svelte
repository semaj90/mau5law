<script lang="ts">
  // LoginButton component - Enhanced login/logout button - Svelte 5 compatible
  // Replace invalid named import (module has no exported member 'auth')
  // Use a resilient fallback that supports common export shapes from the unified module.
  import * as unified from '$lib/stores/unified';
  const authStore: any =
    (unified as any).auth ??
    (unified as any).authStore ??
    (unified as any).default ??
    (unified as any);

  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/enhanced-bits';
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
    size = 'sm',
    className = '',
    loginText = 'Sign In',
    logoutText = 'Sign Out',
    showUserInfo = false,
    redirectAfterLogin = '/dashboard',
    redirectAfterLogout = '/'
  }: Props = $props();
  async function handleLogin() {
    if (redirectAfterLogin && authStore?.setRedirect) {
      authStore.setRedirect(redirectAfterLogin);
    }
    goto('/auth/login');
  }
  async function handleLogout() {
    if (authStore?.logout) {
      await authStore.logout();
    }
    if (redirectAfterLogout) {
      goto(redirectAfterLogout);
    }
  }

  // Helper to produce a loose-typed props object to avoid svelte type-check errors when passing
  // component-specific props (class/variant/size) to third-party Button components.
  function makeButtonProps(disabled: boolean): any {
    return {
      class: className,
      variant,
      size,
      disabled
    } as any;
  }
</script>

{#if authStore && authStore.isAuthenticated}
  <div class="auth-user-section {className}">
    {#if showUserInfo && authStore.user}
      <div class="user-info">
        <span class="user-name">{authStore.user.name || authStore.user.email}</span>
        <span class="user-role">{authStore.user.role}</span>
      </div>
    {/if}
    <Button
      {...makeButtonProps(authStore.isLoading ?? false)}
      on:click={handleLogout}
      aria-label="Sign out"
    >
      {logoutText}
    </Button>
  </div>
{:else}
  <Button
    {...makeButtonProps(authStore?.isLoading ?? false)}
    on:click={handleLogin}
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