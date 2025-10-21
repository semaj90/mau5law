<!--
SessionInitializer.svelte - App-wide session initialization component (Svelte 5)
Updated to work with proper SvelteKit data flow instead of global stores
-->
<script lang="ts">
  import { browser } from '$app/environment';
  import { userDataStore  } from '$lib/stores/unified';

  // Props from the layout with session data from server
  interface Props {
    user: any;
    session any;
    isAuthenticated: boolean;
    enableAutoSync?: boolean;
    syncInterval?: number;
    enableDebugLogging?: boolean;
  }

  let {
    user,
    session,
    isAuthenticated,
    enableAutoSync = true,
    syncInterval = 5 * 60 * 1000, // 5 minutes
    enableDebugLogging = false,
  }: Props = $props();

  let syncIntervalId: number | null = null;

  // Debug logging helper
  function debugLog(message: string, ...args: any[]) {
    if (enableDebugLogging) {
      console.log(`[SessionInitializer] ${message}`, ...args);
    }
  }

  // Initialize user data store when session changes
  $effect(() => {
    if (browser && user?.id) {
      debugLog('Initializing user data for:', user.id);
      userDataStore.init(user.id);
    } else if (!user) {
      debugLog('Clearing user data - no user session');
      userDataStore.clear();
    }
  });

  // Set up periodic sync if enabled
  $effect(() => {
    if (browser && enableAutoSync && isAuthenticated && user?.id) {
      debugLog('Setting up auto-sync interval:', syncInterval);

      syncIntervalId = window.setInterval(() => {
        debugLog('Auto-syncing user data');
        userDataStore.init(user.id);
      }, syncInterval);

      // Cleanup function
      return () => {
        if (syncIntervalId) {
          clearInterval(syncIntervalId);
          syncIntervalId = null;
          debugLog('Cleared auto-sync interval');
        }
      };
    }
  });

  // Log session state changes for debugging
  $effect(() => {
    if (enableDebugLogging) {
      debugLog('Session state changed:', {
        isAuthenticated,
        userId: user?.id,
        userRole: user?.role,
        sessionId: session?.id,
      });
    }
  });
</script>

<!-- This component only initializes data, no UI to render -->
