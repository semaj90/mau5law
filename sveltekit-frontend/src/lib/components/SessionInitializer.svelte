<!--
SessionInitializer.svelte - App-wide session initialization component (Svelte 5)
Automatically integrates session and user data stores with SvelteKit page data
Should be included in the root layout to ensure session is available everywhere
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { sessionStore, initUserDataSync } from '$lib/stores/sessionStore.svelte';
  import { userDataStore } from '$lib/stores/userDataStore';
  // Props for configuration
  let {
    enableAutoSync = true,
    syncInterval = 5 * 60 * 1000, // 5 minutes
    enableDebugLogging = false
  }: {
    enableAutoSync?: boolean;
    syncInterval?: number;
    enableDebugLogging?: boolean;
  } = $props();
  let syncIntervalId: number | null = null;
  // Debug logging helper
  function debugLog(message: string, ...args: any[]) {
    if (enableDebugLogging) {
      console.log(`[SessionInitializer] ${message}`, ...args);
    }
  }
  // Reactive effect for session sync (Svelte 5 style)
  $effect(() => {
    initUserDataSync();
  });
  // Initialize session when component mounts
  onMount(() => {
    debugLog('Initializing session...');
    // Subscribe to page data changes to detect session updates
    const unsubscribePage = page.subscribe(($page) => {
      if ($page.data) {
        debugLog('Page data updated, syncing session:', $page.data);
        // Initialize session store with page data
        sessionStore.init($page.data);
        // If user is authenticated, initialize user data
        if ($page.data.user?.id) {
          debugLog('User authenticated, initializing user data:', $page.data.user.id);
          userDataStore.init($page.data.user.id);
        }
      }
    });
    // Set up auto-sync if enabled
    if (enableAutoSync && browser) {
      syncIntervalId = window.setInterval(() => {
        debugLog('Auto-sync triggered');
        // Check if session is still valid and refresh if needed
        sessionStore.refreshSession().then((user) => {
          if (user?.id) {
            debugLog('Session refreshed, syncing user data for:', user.id);
            // Optionally sync user data as well
            // userDataStore.init(user.id)
          }
        });
      }, syncInterval);
      debugLog('Auto-sync enabled with interval:', syncInterval);
    }
    // Listen for visibility changes to sync when user returns to tab
    if (browser) {
      const handleVisibilityChange = () => {
        if (!document.hidden && enableAutoSync) {
          debugLog('Tab became visible, checking session...');
          sessionStore.refreshSession();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      // Cleanup function for visibility listener
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
    // Return cleanup function for page subscription
    return unsubscribePag;
  });
  // Cleanup on component destroy
  onDestroy(() => {
    if (syncIntervalId !== null) {
      clearInterval(syncIntervalId);
      debugLog('Auto-sync interval cleared');
    }
  });
  // Listen for storage events to sync across tabs
  if (browser) {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'legal_ai_session_cache' && e.newValue) {
        try {
          const sessionData = JSON.parse(e.newValue);
          if (sessionData.user) {
            debugLog('Session updated in another tab, syncing...');
            sessionStore.setSession(sessionData.user, sessionData.session);
          }
        } catch (error) {
          debugLog('Failed to parse session data from storage event:', error);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    // Cleanup storage listener
    onDestroy(() => {
      window.removeEventListener('storage', handleStorageChange);
    });
  }
</script>
<!-- This component doesn't render anything visible -->
<!-- It's purely for session initialization and management -->
<div style="display: none;" aria-hidden="true">
  <!-- Session Initializer - Invisible Component -->
</div>