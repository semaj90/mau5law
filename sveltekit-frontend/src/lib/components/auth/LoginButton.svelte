<script lang="ts">
  // LoginButton component - Svelte 5 with bits-ui Button
  import * as unified from '$lib/stores/unified';
  const authStore: any =
    (unified as any).auth ??
    (unified as any).authStore ??
    (unified as any).default ??
    (unified as any);

  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button/Button.svelte';

  // Svelte 5 runes - Props
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

  // Svelte 5: Use onclick instead of on:click
  async function handleLogin(): Promise<any> {
    if (redirectAfterLogin && authStore?.setRedirect) {
      authStore.setRedirect(redirectAfterLogin);
    }
    goto('/auth/login');
  }

  async function handleLogout(): Promise<any> {
    if (authStore?.logout) {
      await authStore.logout();
    }
    if (redirectAfterLogout) {
      goto(redirectAfterLogout);
    }
  }
</script>

{#if authStore && authStore.isAuthenticated}
  <div class="flex items-center gap-3 {className}">
    {#if showUserInfo && authStore.user}
      <div class="flex flex-col items-end text-sm">
        <span class="font-medium text-gray-700 dark:text-gray-100">
          {authStore.user.name || authStore.user.email}
        </span>
        <span class="text-xs text-gray-500 dark:text-gray-400 capitalize">
          {authStore.user.role}
        </span>
      {/if}
    <Button.Root
      class={className}
      {variant}
      {size}
      disabled={authStore.isLoading ?? false}
      onclick={handleLogout}
      aria-label="Sign out"
    >
      {logoutText}
    </Button.Root>
  </div>
{:else}
  <Button.Root
    class={className}
    {variant}
    {size}
    disabled={authStore?.isLoading ?? false}
    onclick={handleLogin}
    aria-label="Sign in"
  >
    {loginText}
  </Button.Root>
{/if}