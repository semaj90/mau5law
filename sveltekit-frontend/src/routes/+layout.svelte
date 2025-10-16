<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import '../app.css';
  import Navigation from '$lib/components/Navigation.svelte';
  // Removed direct import of ragSyncAgent as its lifecycle will be managed by xstateIntegration
  // import { ragSyncAgent } from '$lib/agents/rag-sync-agent';
  import GlobalAIAssistantButton from '$lib/components/GlobalAIAssistantButton.svelte';
  import loadSession from '$lib/stores/user';
  import 'nes.css/css/nes.min.css';
  // Assuming bits.css is available or you're using UnoCSS for Bits-UI components
  // If Bits-UI has a global CSS file, include it
  // import 'bits-ui/dist/bits.css'; // Uncomment if Bits-UI requires a global CSS import
  import xstateIntegration from '$lib/services/xstate-integration'; // Import the central XState coordinator

  // Define the machine ID for the RAG Sync Agent. This ID must be consistent with its registration in xstate-integration.ts.
  const RAG_SYNC_AGENT_MACHINE_ID = 'ragSyncAgentMachine';

  onMount(() => {
    loadSession();

    // Start the background sync agent by sending an event to the central XState coordinator.
    // This aligns with the event-driven architecture and central XState integration pattern.
    try {
      xstateIntegration.sendEvent(RAG_SYNC_AGENT_MACHINE_ID, { type: 'START_AGENT' });
    } catch (e) {
      // Log a warning if the event dispatch fails, but don't break the app.
      // The xstateIntegration service should handle internal machine errors.
      // eslint-disable-next-line no-console
      console.warn('Failed to send START_AGENT event to xstateIntegration for RAG Sync Agent:', e);
    }
  });

  onDestroy(() => {
    // Stop the background sync agent by sending an event to the central XState coordinator.
    try {
      xstateIntegration.sendEvent(RAG_SYNC_AGENT_MACHINE_ID, { type: 'STOP_AGENT' });
    } catch (e) {
      // Log a warning if the event dispatch fails.
      // eslint-disable-next-line no-console
      console.warn('Failed to send STOP_AGENT event to xstateIntegration for RAG Sync Agent:', e);
    }
  });
</script>

<div class="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
  <Navigation />
  <main class="container mx-auto p-4">
    {@render children()}
  </main>
  <GlobalAIAssistantButton />
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: 'JetBrains Mono', monospace;
    background: black;
  }
</style>
