<script lang="ts">
  export interface Item<T = any> { 
    id: string; 
    __optimistic?: boolean; 
    data: T;
  }
  
  interface OptimisticListProps<T = any> {
    items?: Item<T>[];
    optimistic?: Item<T>[];
    keyField?: string;
    loading?: boolean;
    error?: string | null;
    empty?: import('svelte').Snippet;
    item?: import('svelte').Snippet<[{ item: Item<T>; index: number; isOptimistic: boolean }]>;
    loadingItem?: import('svelte').Snippet;
  }
  
  let {
    items = [],
    optimistic = [],
    keyField = 'id',
    loading = false,
    error = null,
    empty,
    item,
    loadingItem
  }: OptimisticListProps = $props();

  // Merge items with optimistic updates, avoiding duplicates
  let merged = $derived([
    ...items,
    ...optimistic.filter(o => !items.some(i => i[keyField] === o[keyField]))
  ]);
  
  // Track which items are optimistic
  let itemsWithMetadata = $derived(
    merged.map((item, index) => ({
      item,
      index,
      isOptimistic: !!item.__optimistic || optimistic.includes(item)
    }))
  );
</script>

<div class="optimistic-list">
  {#if error}
    <div class="optimistic-list__error" role="alert">
      <span class="error-icon">⚠️</span>
      <span class="error-message">{error}</span>
    </div>
  {:else if loading && merged.length === 0}
    <!-- Loading state when no items -->
    <div class="optimistic-list__loading">
      {#if loadingItem}
        {@render loadingItem()}
      {:else}
        <div class="loading-placeholder">
          <div class="loading-spinner"></div>
          <span>Loading...</span>
        </div>
      {/if}
    </div>
  {:else if merged.length === 0}
    <!-- Empty state -->
    <div class="optimistic-list__empty">
      {#if empty}
        {@render empty()}
      {:else}
        <div class="empty-placeholder">
          <span class="empty-icon">📝</span>
          <span class="empty-message">No items to display</span>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Items list -->
    <div class="optimistic-list__items">
      {#each itemsWithMetadata as { item, index, isOptimistic } (item[keyField])}
        <div 
          class="optimistic-list__item {isOptimistic ? 'optimistic-list__item--optimistic' : ''}"
          data-optimistic={isOptimistic}
        >
          {#if item}
            {@render item({ item, index, isOptimistic })}
          {/if}
        </div>
      {/each}
      
      <!-- Loading indicator for additional items -->
      {#if loading && merged.length > 0}
        <div class="optimistic-list__loading-more">
          {#if loadingItem}
            {@render loadingItem()}
          {:else}
            <div class="loading-more-placeholder">
              <div class="loading-spinner loading-spinner--small"></div>
              <span>Loading more...</span>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .optimistic-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .optimistic-list__error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background-color: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 0.375rem;
    color: rgb(239, 68, 68);
  }
  
  .error-icon {
    font-size: 1.25rem;
  }
  
  .error-message {
    font-weight: 500;
  }
  
  .optimistic-list__loading,
  .optimistic-list__empty {
    padding: 2rem;
    text-align: center;
  }
  
  .loading-placeholder,
  .empty-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    color: rgb(107, 114, 128);
  }
  
  .loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid rgba(59, 130, 246, 0.2);
    border-top: 2px solid rgb(59, 130, 246);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  .loading-spinner--small {
    width: 1rem;
    height: 1rem;
  }
  
  .empty-icon {
    font-size: 3rem;
    opacity: 0.5;
  }
  
  .empty-message {
    font-size: 1.125rem;
    font-weight: 500;
  }
  
  .optimistic-list__items {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .optimistic-list__item {
    transition: all 0.2s ease-in-out;
  }
  
  .optimistic-list__item--optimistic {
    opacity: 0.7;
    background-color: rgba(59, 130, 246, 0.05);
    border: 1px dashed rgba(59, 130, 246, 0.3);
    border-radius: 0.375rem;
    padding: 0.5rem;
  }
  
  .optimistic-list__loading-more {
    display: flex;
    justify-content: center;
    padding: 1rem;
  }
  
  .loading-more-placeholder {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: rgb(107, 114, 128);
    font-size: 0.875rem;
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  /* Animation for optimistic items */
  .optimistic-list__item--optimistic {
    animation: optimisticPulse 2s ease-in-out infinite;
  }
  
  @keyframes optimisticPulse {
    0%, 100% {
      background-color: rgba(59, 130, 246, 0.05);
    }
    50% {
      background-color: rgba(59, 130, 246, 0.1);
    }
  }
</style>
