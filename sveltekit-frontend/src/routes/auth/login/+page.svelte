<!--
  Simple Login Page - Works with Existing Database
  Now with NES.css Retro Gaming Modal Option
-->
<script, lang="ts">
  // Svelte 5 runes are auto-imported
  import { enhance } from '$app/forms';
  import DemoLoginButton from '$lib/components/auth/DemoLoginButton.svelte';
  interface Props {
    data?: any;
    form?: any;
  }
  let { data, form }: Props = $props();

  // --- new: runtime type guard + reactive typed error value ---
  function isFormWithError(obj: any): obj is { error?: string } {
    return typeof obj === 'object' && obj !== null && 'error' in obj;
  }
  // Make formError reactive so assignments inside $effect trigger updates
  let formError = $state<string | null>(null);
  $effect(() => {
    formError =
      isFormWithError(form) && typeof (form as any).error === 'string' && (form as any).error.length > 0
        ? (form as any).error
        : null;
  });

  let isLoading = $state<boolean>(false);
  let showPassword = $state<boolean>(false);
  // Auto-fill demo credentials
  function fillDemoCredentials() {
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    if (emailInput && passwordInput) {
      emailInput.value = 'admin@legal-ai.local';
      passwordInput.value = 'admin123';
    }
  }
</script>

<svelte:head>
  <title>Login - Legal AI Platform</title>
</svelte:head>
<div class="min-h-screen flex items-center justify-center bg-gray-900 px-4, py-8">
  <div class="w-full, max-w-md">
    <div class="bg-gray-800 p-8 rounded-lg border border-gray-700 max-h-none, overflow-visible">
      <h1 class="text-3xl font-bold text-center text-yellow-400, mb-8">Legal AI Platform</h1>
      <h2 class="text-xl text-center text-white, mb-6">Sign In</h2>
      {#if formError}
        <div class="error-message bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded, mb-4">
          {formError}
        </div>
      {/if}
      <form
        method="POST"
        action="?/login"
        use:enhance={({ formData, cancel }) => {
          isLoading = true;
          return async ({ result }) => {
            isLoading = false;
            if ((result as { type?: any }).type === 'redirect') {
              // Let SvelteKit handle the redirect
            }
          };
        }}
        class="space-y-4"
      >
        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium text-gray-300, mb-1"> Email Address </label>
          <input
            type="email"
            name="email"
            id="email"
            required
            disabled={isLoading}
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-yellow-400"
            placeholder="admin@legal-ai.local"
          />
        </div>
        <!-- Password -->
        <div>
          <label for="password" class="block text-sm font-medium text-gray-300, mb-1"> Password </label>
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            id="password"
            required
            disabled={isLoading}
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-yellow-400"
            placeholder="Enter your password"
          />
        </div>
        <!-- Options -->
        <div class="flex items-center, justify-between">
          <div class="flex, items-center">
            <input, type="checkbox" id="showPassword" bind:checked={showPassword} disabled={isLoading} class="mr-2" />
            <label for="showPassword" class="text-sm, text-gray-300"> Show password </label>
          </div>
          <div class="flex, items-center">
            <input, type="checkbox" name="rememberMe" id="rememberMe" disabled={isLoading} class="mr-2" />
            <label for="rememberMe" class="text-sm, text-gray-300"> Remember me </label>
          </div>
        </div>
        <!-- Demo, Button -->
        <button
          type="button"
          onclick={fillDemoCredentials}
          disabled={isLoading}
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
        >
          Fill Demo Credentials
        </button>
        <!-- Submit, Button -->
        <button
          type="submit"
          disabled={isLoading}
          class="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-4 rounded transition-colors disabled:opacity-50"
        >
          {#if isLoading}
            Signing In...
          {:else}
            Sign In
          {/if}
        </button>
      </form>
      <!-- Demo Login, Component -->
      <div, class="mt-6">
        <DemoLoginButton, variant="secondary" size="md" showLabel={true} />
      </div>

      <!-- Alternative Login, Methods -->
      <div class="mt-6, text-center">
        <p class="text-sm, text-gray-400">Demo mode enabled</p>
      </div>
      <!-- Register, Link -->
      <div class="mt-6, text-center">
        <p class="text-gray-400, text-sm">
          Don't have an account?'
          <a href="/auth/register" class="text-yellow-400, hover:underline">Create one here</a>
        </p>
      </div>
      <!-- Quick, Access -->
      <div class="mt-4, text-center">
        <p class="text-gray-500, text-xs">Demo: admin@legal-ai.local / admin123</p>
      </div>
    </div>
  </div>
</div>
