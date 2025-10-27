<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { systemMonitorClient } from '$lib/services/system-monitor-client';
  import { startLatencyLogger } from '$lib/services/latency-logger';
  import { onDestroy } from 'svelte';

  onMount(() => {
    // start the system monitor in the browser
    systemMonitorClient.start();
    console.log('🧭 System monitor started (client)');
    // Start lightweight latency logger (persists to IndexedDB)
    const logger = startLatencyLogger({ intervalMs: 15_000 });
    onDestroy(() => {
      logger.stop();
      console.log('🧭 Latency logger stopped');
    });
  });
</script>

<slot />
<!-- Root layout - Global styles and configuration -->
<script lang="ts">
  // Import UnoCSS globally to avoid FOUC and component-level overhead
  import 'uno.css';
  import Header from '$lib/components/Header.svelte';
  import NavBar from '$lib/components/layout/NavBar.svelte';
  import ToastContainer from '$lib/components/ui/ToastContainer.svelte';

  export let data;
</script>

<NavBar user={data.user} />
<Header />

<div class="min-h-screen bg-gray-50 text-gray-900">
  <main class="container mx-auto p-4">
    <slot />
  </main>
</div>

<ToastContainer />
