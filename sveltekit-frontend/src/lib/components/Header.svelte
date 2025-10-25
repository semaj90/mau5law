<script lang="ts">
  import Button from '$lib/components/ui/button/Button.svelte';
  import LoginModal from '$lib/components/auth/LoginModal.svelte';
  import RegisterModal from '$lib/components/auth/RegisterModal.svelte';
  import { userStore, clearUserSession } from '$lib/stores/user';
  import { User, LogOut } from 'lucide-svelte';

  let showLoginModal = $state(false);
  let showRegisterModal = $state(false);

  function handleLoginSuccess() {
    showLoginModal = false;
    window.location.href = '/profile';
  }

  function handleRegisterSuccess() {
    showRegisterModal = false;
    showLoginModal = true;
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      clearUserSession();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
</script>

<header class="bg-white border-b border-slate-200 sticky top-0 z-40">
  <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div class="text-2xl font-bold text-blue-600">⚖️</div>
      <h1 class="text-xl font-bold text-slate-900">Legal AI</h1>
    </div>

    <nav class="flex items-center gap-3">
      {#if $userStore}
        <!-- Authenticated User Menu -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center">
              <User class="w-4 h-4 text-white" />
            </div>
            <span class="text-sm font-medium text-slate-700">
              {$userStore.user.firstName || $userStore.user.email}
            </span>
          </div>
          <a
            href="/profile"
            class="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded transition"
          >
            Profile
          </a>
          <Button
            onclick={handleLogout}
            class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            <LogOut class="w-4 h-4" />
            Logout
          </Button>
        </div>
      {:else}
        <!-- Unauthenticated User Menu -->
        <Button
          onclick={() => (showLoginModal = true)}
          variant="secondary"
          class="px-4 py-2 text-slate-700 bg-slate-100 rounded hover:bg-slate-200 transition"
        >
          Sign In
        </Button>
        <Button
          onclick={() => (showRegisterModal = true)}
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Create Account
        </Button>
      {/if}
    </nav>
  </div>
</header>

<LoginModal bind:open={showLoginModal} onlogin={handleLoginSuccess} />
<RegisterModal bind:open={showRegisterModal} onsuccess={handleRegisterSuccess} />
