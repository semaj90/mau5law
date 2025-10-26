<script lang="ts">
  import Button from '$lib/components/ui/button/Button.svelte';
  import LoginModal from '$lib/components/auth/LoginModal.svelte';
  import RegisterModal from '$lib/components/auth/RegisterModal.svelte';
  import UserProfileDropdown from '$lib/components/auth/UserProfileDropdown.svelte';
  import { userStore } from '$lib/stores/user';

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
</script>

<header class="bg-white border-b border-slate-200 sticky top-0 z-40">
  <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div class="text-2xl font-bold text-blue-600">⚖️</div>
      <h1 class="text-xl font-bold text-slate-900">Legal AI</h1>
    </div>

    <nav class="flex items-center gap-3">
      {#if $userStore}
        <!-- Authenticated User Menu with Dropdown -->
        <UserProfileDropdown />
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
