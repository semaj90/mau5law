<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import '../app.css';
  import Navigation from '$lib/components/Navigation.svelte';
  // Removed direct import of ragSyncAgent as its lifecycle will be managed by xstateIntegration
  // import { ragSyncAgent } from '$lib/agents/rag-sync-agent';
  import GlobalAIAssistantButton from '$lib/components/GlobalAIAssistantButton.svelte';
  import { loadSession } from '$lib/stores/unified';
  // Global error handler (toast UI) - displays structured API errors
  import ErrorHandler from '$lib/components/ErrorHandler.svelte';
  import 'nes.css/css/nes.min.css';
  // Assuming bits.css is available or you're using UnoCSS for Bits-UI components
  // If Bits-UI has a global CSS file, include it
  // import 'bits-ui/dist/bits.css'; // Uncomment if Bits-UI requires a global CSS import
  import xstateIntegration from '$lib/services/xstate-integration'; // Import the central XState coordinator

  // Define the machine ID for the RAG Sync Agent. This ID must be consistent with its registration in xstate-integration.ts.
  const RAG_SYNC_AGENT_MACHINE_ID = 'ragSyncAgentMachine';

  // track whether we actually started the agent so we only attempt to stop it if needed
  let agentStarted = false;

  onMount(async () => {
    // Safely load session and avoid unhandled promise rejections
    try {
      // Support multiple possible exports:
      // - a callable initializer (old default export function)
      // - a store object with common initializer names: load, initialize, loadSession
      if (typeof loadSession === 'function') {
        await (loadSession as unknown as () => Promise<void>)();
      } else if (typeof (loadSession as any).load === 'function') {
        await (loadSession as any).load();
      } else if (typeof (loadSession as any).initialize === 'function') {
        await (loadSession as any).initialize();
      } else if (typeof (loadSession as any).loadSession === 'function') {
        await (loadSession as any).loadSession();
      } else {
        // No initializer found; skip quietly.
        console.debug('loadSession: no callable initializer found on import; skipping.');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('loadSession failed:', err);
    }

    // Start background sync agent via central XState coordinator if available
    try {
      // Use runtime lookup to avoid TypeScript errors when the property does not exist.
      const sendFn =
        (xstateIntegration as any)?.['sendEvent'] ??
        (xstateIntegration as any)?.['send'] ??
        (xstateIntegration as any)?.['sendToMachine'];

      if (typeof sendFn === 'function') {
        sendFn.call(xstateIntegration, RAG_SYNC_AGENT_MACHINE_ID, { type: 'START_AGENT' });
        agentStarted = true;
      } else {
        // eslint-disable-next-line no-console
        console.warn('xstateIntegration: no send function available; cannot start RAG sync agent.');
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to send START_AGENT event to xstateIntegration for RAG Sync Agent:', e);
    }
  });

  onDestroy(() => {
    if (!agentStarted) return;

    try {
      const sendFn =
        (xstateIntegration as any)?.['sendEvent'] ??
        (xstateIntegration as any)?.['send'] ??
        (xstateIntegration as any)?.['sendToMachine'];

      if (typeof sendFn === 'function') {
        sendFn.call(xstateIntegration, RAG_SYNC_AGENT_MACHINE_ID, { type: 'STOP_AGENT' });
        agentStarted = false;
      } else {
        // eslint-disable-next-line no-console
        console.warn('xstateIntegration: no send function available; cannot stop RAG sync agent.');
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to send STOP_AGENT event to xstateIntegration for RAG Sync Agent:', e);
    }
  });
</script>

<div class="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
  <Navigation />
  <main class="container mx-auto p-4">
    <!-- render child routes correctly -->
    <slot />
  </main>
  <GlobalAIAssistantButton />
  <!-- Global error handler inserted at the app root so toasts are visible across routes -->
  <ErrorHandler />
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: 'JetBrains Mono', monospace;
    background: black;
  }
</style>
