<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import '../app.css';
  import Navigation from '$lib/components/Navigation.svelte';
  import { ragSyncAgent } from '$lib/agents/rag-sync-agent';

  interface Props {
    children: any;
    data?: {
      user?: any;
      session?: any;
      isAuthenticated?: boolean;
      startupStatus?: any;
    };
  }

  let { children, data }: Props = $props();

  // Start the background sync agent when running in the browser.
  onMount(() => {
    try {
      ragSyncAgent.start();
    } catch (e) {
      // If something goes wrong, don't break the whole app
      // eslint-disable-next-line no-console
      console.warn('Failed to start ragSyncAgent', e);
    }
  });

  onDestroy(() => {
    try {
      ragSyncAgent.stop();
    } catch {}
  });
</script>

<div class="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
  <Navigation />
  <main class="container mx-auto p-4">
    {@render children()}
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: 'JetBrains Mono', monospace;
    background: black;
  }
</style>
