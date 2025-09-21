<script lang="ts">
  // Svelte 5 runes are auto-imported

  import { onMount } from 'svelte';
  import { componentLoader } from '$lib/utils/dynamic-imports';
  import AILoadingIndicator from './AILoadingIndicator.svelte';

  let { loader } = $props();: () => Promise<any>;
  let { key } = $props();: string;
  let { fallback } = $props();: string = 'Loading component...';
  let { errorFallback } = $props();: string = 'Failed to load component';
  let { props } = $props();: Record<string, any> = {};
  let Component: unknown = null;
  let isLoading = true;
  let error: Error | null = null;

  async function loadComponent() {
    try {
      isLoading = true;
      error = null;
      Component = await componentLoader.load(key, loader);
    } catch (err) {
      error = err as Error;
      console.error(`Failed to load component ${key}:`, err);
    } finally {
      isLoading = false;
    }
  }

  $effect(() => {
    loadComponent();
  });

  function retry() {
    componentLoader.clear();
    loadComponent();
  }
</script>

{#if isLoading}
  <AILoadingIndicator
    isLoading={true}
    title={fallback}
    operation="processing"
    size="md"
    variant="inline"
  />
{:else if error}
  <div class="lazy-load-error p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950">
    <h3 class="text-red-800 dark:text-red-200 font-semibold mb-2">
      Component Error
    </h3>
    <p class="text-red-600 dark:text-red-400 text-sm mb-3">
      {errorFallback}
    </p>
    <button
      onclick={retry}
      class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
    >
      Retry
    </button>
  </div>
{:else if Component}
  <svelte:component this={Component} {...props} />
{/if}

<style>
  .lazy-load-error {
    min-height: 100px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
</style>