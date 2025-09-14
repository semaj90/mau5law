<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<!-- Document Update Notifications Component -->
<!-- Shows real-time updates for document re-embedding and re-ranking -->

<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import {
    documentUpdateNotifications,
    formatNotificationTime,
    getNotificationIcon,
    getPriorityColor,
    notificationManager,
    type UpdateNotification,
  } from "$lib/services/documentUpdateNotifications";
  import { onDestroy, onMount } from "svelte";
  import { slide } from "svelte/transition";

  // Props
  let { showAll = false,
    maxVisible = 5,
    autoHide = true,
    position = "top-right",
   }: { showAll = false,
    maxVisible = 5,
    autoHide = true,
    position = "top-right",
  : any } = $props();

  // State
  let notifications = $state<UpdateNotification[]>([]);
  let activeUpdates = $state(new Map<string, UpdateNotification>(););
  let connectionStatus = $state("disconnected");
  let showNotifications = $state(true);
  let notificationPermissionGranted = $state(false);

  // Subscribe to notifications store
  let unsubscribe = $state<(() =>(null) {
    // Subscribe to notification updates
    unsubscribe = documentUpdateNotifications.subscribe((state) => {
      notifications = state.notifications;
      activeUpdates = state.activeUpdates;
      connectionStatus = state.connectionStatus;
    });

    // Check notification permission
    if (notificationManager) {
      notificationPermissionGranted =
        await notificationManager.requestNotificationPermission();
    }
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  // Computed
  let visibleNotifications = $derived(() => {
    const list = showAll ? notifications : notifications.slice(-maxVisible);
    return [...list].reverse(); // Show newest first without mutating source
  });

  let activeUpdatesList = $derived(() => {
    return Array.from(activeUpdates.values()) as UpdateNotification[];
  });

  let connectionStatusIcon = $derived(() => {
    switch (connectionStatus) {
      case "connected":
        return "🟢";
      case "connecting":
        return "🟡";
      case "disconnected":
        return "⚪";
      case "error":
        return "🔴";
      default:
        return "⚪";
    }
  });

  // Methods
  function clearAllNotifications() {
    if (notificationManager) {
      notificationManager.clearNotifications();
    }
  }

  function toggleNotifications() {
    showNotifications = !showNotifications;
  }

  function getProgressWidth(notification: UpdateNotification): string {
    if ((notification as { data?: any; id?: any }).(data as { title?: any; chunksProcessed?: any; totalChunks?: any; queriesReranked?: any; similarityImprovement?: any; error?: any; priority?: any }).progress !== undefined) {
      return `${(notification as { data?: any; id?: any }).(data as { title?: any; chunksProcessed?: any; totalChunks?: any; queriesReranked?: any; similarityImprovement?: any; error?: any; priority?: any }).progress}%`;
    }

    if ((notification as { data?: any; id?: any }).(data as { title?: any; chunksProcessed?: any; totalChunks?: any; queriesReranked?: any; similarityImprovement?: any; error?: any; priority?: any }).chunksProcessed != null && (notification as { data?: any; id?: any }).(data as { title?: any; chunksProcessed?: any; totalChunks?: any; queriesReranked?: any; similarityImprovement?: any; error?: any; priority?: any }).totalChunks != null) {
      const progress =
        ((notification as { data?: any; id?: any }).(data as { title?: any; chunksProcessed?: any; totalChunks?: any; queriesReranked?: any; similarityImprovement?: any; error?: any; priority?: any }).chunksProcessed / (notification as { data?: any; id?: any }).(data as { title?: any; chunksProcessed?: any; totalChunks?: any; queriesReranked?: any; similarityImprovement?: any; error?: any; priority?: any }).totalChunks) *
        100;
      return `${Math.round(progress)}%`;
    }

    return "0%";
  }
</script>

<!-- Notification Container -->
<div
  class="document-notifications fixed {position === 'top-right'
    ? 'top-4 right-4'
    : 'bottom-4 right-4'} z-50 w-96 max-w-sm"
>
  <!-- Connection Status & Toggle -->
  <div
    class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 mb-2 p-3"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <span class="text-lg">{connectionStatusIcon}</span>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Document Updates
        </span>
        {#if activeUpdatesList.length > 0}
          <span
            class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
          >
            {activeUpdatesList.length} active
          </span>
        {/if}
      </div>

      <div class="flex items-center space-x-1">
        {#if notifications.length > 0}
          <button
            on:click={clearAllNotifications}
            class="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded"
            title="Clear all"
          >
            Clear
          </button>
        {/if}

        <button
          on:click={toggleNotifications}
          class="text-gray-500 hover:text-gray-700 p-1 rounded"
          title={showNotifications
            ? "Hide notifications"
            : "Show notifications"}
        >
          {showNotifications ? "🔽" : "🔼"}
        </button>
      </div>
    </div>

    <!-- Connection Status Details -->
    <div class="mt-1 text-xs text-gray-500">
      Status: {connectionStatus}
      {#if !notificationPermissionGranted}
        <span class="text-orange-600">• Browser notifications disabled</span>
      {/if}
    </div>
  </div>

  <!-- Active Updates (Always Visible) -->
  {#if activeUpdatesList.length > 0}
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 mb-2"
    >
      <div class="p-3 border-b border-gray-200 dark:border-gray-700">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
          🔄 Processing Updates
        </h4>
      </div>

      {#each activeUpdatesList as update (update.id)}
        <div
          class="p-3 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="text-sm text-gray-700 dark:text-gray-300 mb-1">
                {update.(data as { title?: any; chunksProcessed?: any; totalChunks?: any; queriesReranked?: any; similarityImprovement?: any; error?: any; priority?: any }).title ||
                  `Document ${update.documentId.substring(0, 8)}...`}
              </div>

              {#if update.(data as { title?: any; chunksProcessed?: any; totalChunks?: any; queriesReranked?: any; similarityImprovement?: any; error?: any; priority?: any }).chunksProcessed != null && update.(data as { title?: any; chunksProcessed?: any; totalChunks?: any; queriesReranked?: any; similarityImprovement?: any; error?: any; priority?: any }).totalChunks != null}
                <div class="text-xs text-gray-500 mb-2">
                  Processing chunk {update.(data as { title?: any; chunksProcessed?: any; totalChunks?: any; queriesReranked?: any; similarityImprovement?: any; error?: any; priority?: any }).chunksProcessed} of {update.data
                    .totalChunks}
                </div>

                <!-- Progress Bar -->
                <div class="w-full bg-gray-200 rounded-full h-2 mb-1">
                  <div
                    class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style="width: {getProgressWidth(update)}"
                  ></div>
                </div>
              {:else}
                <div class="flex items-center space-x-2 text-xs text-gray-500">
                  <div
                    class="animate-spin w-3 h-3 border border-blue-600 border-t-transparent rounded-full"
                  ></div>
                  <span>Processing...</span>
                </div>
              {/if}
            </div>

            <div class="text-xs text-gray-400 ml-2">
              {formatNotificationTime(update.timestamp)}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Notification History -->
  {#if showNotifications && visibleNotifications.length > 0}
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto"
      transitislide={{ duration: 200 }}
    >
      <div class="p-3 border-b border-gray-200 dark:border-gray-700">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
          📋 Recent Updates
        </h4>
      </div>

      {#each visibleNotifications as notification ((notification as { data?: any; id?: any }).id)}
        {@const typedNotification = notification as UpdateNotification}
        <div
          class="p-3 border-b border-gray-100 dark:border-gray-600 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          transitislide={{ duration: 150 }}
        >
          <div class="flex items-start justify-between">
            <div class="flex items-start space-x-2 flex-1">
              <span class="text-lg mt-0.5">
                {getNotificationIcon(typedNotification.type)}
              </span>

              <div class="flex-1 min-w-0">
                <div class="text-sm text-gray-700 dark:text-gray-300 mb-1">
                  {#if typedNotification.type === "document_changed"}
                    Document "{typedNotification.(data as { title?: any; chunksProcessed?: any; totalChunks?: any; queriesReranked?: any; similarityImprovement?: any; error?: any; priority?: any }).title || "Untitled"}" was
                    modified
                  {:else if typedNotification.type === "reembedding_started"}
                    Re-embedding "{typedNotification.(data as { title?: any; chunksProcessed?: any; totalChunks?: any; queriesReranked?: any; similarityImprovement?: any; error?: any; priority?: any }).title || "document"}"
                  {:else if typedNotification.type === "reembedding_complete"}
                    Completed re-embedding with {typedNotification.data
                      .chunksProcessed || 0} chunks
                  {:else if typedNotification.type === "reranking_complete"}
                    Updated {typedNotification.(data as { title?: any; chunksProcessed?: any; totalChunks?: any; queriesReranked?: any; similarityImprovement?: any; error?: any; priority?: any }).queriesReranked || 0} search
                    queries
                    {#if typedNotification.(data as { title?: any; chunksProcessed?: any; totalChunks?: any; queriesReranked?: any; similarityImprovement?: any; error?: any; priority?: any }).similarityImprovement}
                      <span class="text-green-600">
                        (+{(
                          typedNotification.(data as { title?: any; chunksProcessed?: any; totalChunks?: any; queriesReranked?: any; similarityImprovement?: any; error?: any; priority?: any }).similarityImprovement * 100
                        ).toFixed(1)}% accuracy)
                      </span>
                    {/if}
                  {:else if typedNotification.type === "error"}
                    <span class="text-red-600">
                      Error: {typedNotification.(data as { title?: any; chunksProcessed?: any; totalChunks?: any; queriesReranked?: any; similarityImprovement?: any; error?: any; priority?: any }).error}
                    </span>
                  {/if}
                </div>

                {#if typedNotification.(data as { title?: any; chunksProcessed?: any; totalChunks?: any; queriesReranked?: any; similarityImprovement?: any; error?: any; priority?: any }).priority}
                  <span
                    class="inline-block px-2 py-1 text-xs rounded-full {getPriorityColor(
                      typedNotification.(data as { title?: any; chunksProcessed?: any; totalChunks?: any; queriesReranked?: any; similarityImprovement?: any; error?: any; priority?: any }).priority
                    )}"
                  >
                    {typedNotification.(data as { title?: any; chunksProcessed?: any; totalChunks?: any; queriesReranked?: any; similarityImprovement?: any; error?: any; priority?: any }).priority} priority
                  </span>
                {/if}
              </div>
            </div>

            <div class="text-xs text-gray-400 ml-2 whitespace-nowrap">
              {formatNotificationTime(typedNotification.timestamp)}
            </div>
          </div>
        </div>
      {/each}

      {#if !showAll && notifications.length > maxVisible}
        <div class="p-3 text-center">
          <button
            on:click={() => (showAll = true)}
            class="text-xs text-blue-600 hover:text-blue-800"
          >
            Show all {notifications.length} notifications
          </button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Empty State -->
  {#if showNotifications && notifications.length === 0 && activeUpdatesList.length === 0}
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 text-center"
      transitislide={{ duration: 200 }}
    >
      <div class="text-4xl mb-2">📭</div>
      <div class="text-sm text-gray-500">No document updates yet</div>
    </div>
  {/if}
</div>

<style>
  .document-notifications {
    /* Ensure notifications appear above other elements */
    z-index: 9999;
  }

  /* Custom scrollbar for notification history */
  .document-notifications :global(.overflow-y-auto) {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e0 transparent;
  }

  .document-notifications :global(.overflow-y-auto::-webkit-scrollbar) {
    width: 4px;
  }

  .document-notifications :global(.overflow-y-auto::-webkit-scrollbar-track) {
    background: transparent;
  }

  .document-notifications :global(.overflow-y-auto::-webkit-scrollbar-thumb) {
    background-color: #cbd5e0;
    border-radius: 2px;
  }

  .document-notifications
    :global(.overflow-y-auto::-webkit-scrollbar-thumb:hover) {
    background-color: #a0aec0;
  }
</style>


