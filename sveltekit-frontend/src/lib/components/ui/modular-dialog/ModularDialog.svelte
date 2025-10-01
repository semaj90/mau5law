<!-- Modular Data-Driven Dialog Component -->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { Dialog as _Dialog } from 'bits-ui';
  const Dialog: any = _Dialog;

  import { X, Loader2, AlertCircle, RefreshCw } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import { onMount  } from "svelte";
  import type { Snippet } from 'svelte';
  import { reactiveApiClient } from '$lib/services/api-client';
  import type { ApiResponse, DialogDataProvider } from '$lib/types/api';
  interface Props {
    // Dialog configuration
    open?: boolean;
    title?: string;
    description?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    showClose?: boolean;
    class?: string;
    // Data integration
    dataProvider?: DialogDataProvider;
    entityType?: 'case' | 'evidence' | 'document';
    entityId?: string;
    autoLoad?: boolean;
    cacheData?: boolean;
    refreshInterval?: number;
    // Event handlers
    onOpenChange?: (open: boolean) => void;
    onDataLoad?: (data: unknown) => void;
    onError?: (error: string) => void;
    // Content slots / render props
    children?: Snippet;
    header?: Snippet;
    footer?: Snippet;
    loading?: Snippet;
    error?: Snippet;
  }
  let { open = $bindable(false),
    title = '',
    description = '',
    size = 'md',
    showClose = true,
    class: className = '',
    dataProvider,
    entityType,
    entityId,
    autoLoad = true,
    cacheData = true,
    refreshInterval,
    onOpenChange,
    onDataLoad,
    onError,
  children,
  header,
  footer,
  loading,
  error
   }: Props = $props();
  // Reactive data state
  let data: unknown = $state(dataProvider?.data || null);
  let isLoading = $state(dataProvider?.loading || false);
  let errorMessage = $state(dataProvider?.error || null);
  let lastFetch = $state<number | null>(null);
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-[95vw] max-h-[95vh]'
  };
  // Helper: safe case label extraction (avoid inline TS casts in template)
  function getCaseLabel(d: any) {
    try {
      if (!d) return '';
      if (d.caseNumber) return String(d.caseNumber);
      if (d.id) return String(d.id).slice(-6);
      return '';
    } catch {
      return '';
    }
  }
  // Load data when dialog opens or component mounts
  async function loadData(force = false) {
    if (!entityType || !entityId) return;
    // Skip if data is fresh and not forcing
    if (!force && cacheData && data && lastFetch && Date.now() - lastFetch < 60000) {
      return;
    }
    isLoading = true;
    errorMessage = null;
    try {
      let result: any = null;
      switch (entityType) {
        case 'case':
          result = await reactiveApiClient.fetchCase(entityId, cacheData);
          break;
        case 'evidence':
          result = await reactiveApiClient.getEvidence(entityId);
          break;
        case 'document':
          // Implement document fetching
          break;
      }
      if (result) {
        data = (result as { data?: unknown }).data || result;
        lastFetch = Date.now();
        onDataLoad?.(data);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message: 'Failed to load data';
      errorMessage = error;
      onError?.(error);
    } finally {
      isLoading = false;
    }
  }
  // Refresh data
  async function refresh() {
    await loadData(true);
  }
  // Handle open/close (kept for explicit actions)
  function handleOpenChange(newOpen: boolean) {
    open = newOpen;
    onOpenChange?.(newOpen);
    if (newOpen && autoLoad && entityType && entityId) {
      loadData();
    }
  }
  // Auto-refresh interval
  let refreshTimer = $state<number | null >(null);
  $effect(() => {
    if (open && refreshInterval && refreshInterval > 0) {
      refreshTimer = setInterval(() => {
        if (!isLoading) {
          loadData();
        }
      }, refreshInterval) as any;
    }
    return () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
    }
  });
  // Initial load (preserve original behavior)
  $effect(() => {
    if (autoLoad && entityType && entityId) {
      loadData();
    }
  });
  // Call external onOpenChange when open changes (and auto-load on open)
  $effect(() => {
    onOpenChange?.(open);
    if (open && autoLoad && entityType && entityId) {
      loadData();
    }
  });
  // Subscribe to reactive data changes
  let unsubscribe = $state<(() => void) | null>(null);
  $effect(() => {
    if (entityType && entityId) {
      const key = `${entityType}:${entityId}`;
      unsubscribe?.();
      unsubscribe = reactiveApiClient.subscribe(key, (store) => {
        data = store.data;
        isLoading = store.loading;
        errorMessage = store.error;
        lastFetch = store.lastFetch;
      });
    }
    return () => {
      unsubscribe?.();
    }
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay
      class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    />
    <Dialog.Content
      class={cn(
        'fixed left-1/2 top-1/2 z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
        sizeClasses[size],
        'modular-dialog',
        className
      )}
    >
      <!-- Header -->
      <div class="flex flex-col space-y-1.5 text-center sm:text-left">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            {#if header}
              {@render header?.({ data, isLoading, error: errorMessage })}
            {:else if title}
              <h2 class="text-lg font-semibold leading-none tracking-tight font-mono">
                {title}
                {#if data && entityType === 'case'}
                  <span class="text-sm nes-text is-disabled ml-2">
                    #{getCaseLabel(data)}
                  </span>
                {/if}
              </h2>
            {/if}
            {#if description}
              <p class="text-sm nes-text is-disabled font-mono mt-1">
                {description}
              </p>
            {/if}
          </div>
          <!-- Refresh button -->
          {#if entityType && entityId}
            <button
              on:click={refresh}
              disabled={isLoading}
              class="p-1 rounded-sm opacity-70 hover:opacity-100 transition-opacity disabled:opacity-50 mr-2"
              title="Refresh data"
            >
              <RefreshCw class={cn("h-4 w-4", isLoading && "animate-spin")} />
            </button>
          {/if}
        </div>
      </div>
      <!-- Close Button -->
      {#if showClose}
        <Dialog.Close class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none" on:click={() => handleOpenChange(false)}>
          <X class="h-4 w-4" />
          <span class="sr-only">Close</span>
        </Dialog.Close>
      {/if}
      <!-- Content -->
      <div class="modular-dialog-content min-h-[200px] flex flex-col">
        {#if isLoading}
          <div class="flex-1 flex items-center justify-center">
            {#if loading}
              {@render loading?.()}
            {:else}
              <div class="flex items-center gap-2 nes-text is-disabled">
                <Loader2 class="h-4 w-4 animate-spin" />
                <span class="font-mono text-sm">Loading...</span>
              </div>
            {/if}
          </div>
        {:else if errorMessage}
          <div class="flex-1 flex items-center justify-center">
            {#if error}
              {@render error?.({ error: errorMessage, refresh })}
            {:else}
              <div class="flex flex-col items-center gap-3 text-center">
                <AlertCircle class="h-8 w-8 text-destructive" />
                <div>
                  <p class="font-mono text-sm text-destructive font-medium">Error loading data</p>
                  <p class="font-mono text-xs nes-text is-disabled mt-1">{errorMessage}</p>
                </div>
                <button
                  on:click={refresh}
                  class="px-3 py-1 text-xs bg-muted hover:bg-muted/80 rounded-md font-mono transition-colors"
                >
                  Try Again
                </button>
              </div>
            {/if}
          </div>
        {:else}
          <div class="flex-1">
            {@render children?.({ data, refresh, entityType, entityId })}
          </div>
        {/if}
      </div>
      <!-- Footer -->
      {#if footer}
        <div class="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 modular-dialog-footer border-t pt-4">
          {@render footer?.({ data, refresh, close: () => { open = false; handleOpenChange(false); } })}
        </div>
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
<style>
  :global(.modular-dialog) {
    @apply bg-yorha-bg-secondary border-yorha-border;
  }
  :global(.modular-dialog-content) {
    @apply text-yorha-text-primary;
  }
  :global(.modular-dialog-footer) {
    @apply border-yorha-border;
  }
</style>