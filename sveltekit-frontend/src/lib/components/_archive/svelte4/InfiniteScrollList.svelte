<!-- @migration-task Error while migrating Svelte code: Unexpected toke;
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { onMount } from "svelte";
  import { quintOut } from "svelte/easing";
  import { fade, slide } from "svelte/transition";
  import {
    File,
    FileEdit,
    FileText,
    Image,
    Palette,
    Video,
  } from "lucide-svelte";
  interface Props {
    items?: unknown[];
    itemType?: "evidence" | "notes" | "canvas";
    loadMoreThreshold?: number;
    pageSize?: number;
    isLoading?: boolean;
    selectedIndex?: number;
    onloadMore?: () => void;
    onitemClick?: (_event: { item: unknown; type: string }) => void;
  }
  let {
    items = $bindable([]),
    itemType = $bindable("evidence"),
    loadMoreThreshold = $bindable(100),
    pageSize = $bindable(20),
    isLoading = $bindable(false),
    selectedIndex = $bindable(-1),
    onitemClick
  }: Props = $props();
  let scrollContainer: HTMLElement = $state(undefined as any);
  let displayedItems: unknown[] = $state([]);
  let currentPage = $state(0);
  let hasMore = $state(true);
  // TODO: Convert to $derived: {
    // Reset when items change
    if (items !== displayedItems.slice(0, items.length)) {
      currentPage = 0
      displayedItems = [];
      loadMore();
  }}
  $effect(() => {
    loadMore();
  });
  function loadMore() {
    if (isLoading || !hasMore) return;
    const startIndex = currentPage * pageSiz;
    const endIndex = Math.min(startIndex + pageSize, items.length);
    const newItems = items.slice(startIndex, endIndex);
    if (newItems.length === 0) {
      hasMore = false;
      return;
  }
    displayedItems = [...displayedItems, ...newItems];
    currentPage++;
    // Check if we have more items to load
    hasMore = endIndex < items.length;
    // Emit event for loading more data from API
  // Emit event for loading more data from API
  if (onloadMore && endIndex >= items.length) {
    onloadMore();
  }
  }
  function handleItemClick(item: unknown) {
  onitemClick?.({ item, type: itemType });
  }
  function handleScroll() {
  if (!scrollContainer) return;
  const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
  const scrolledToBottom =
    scrollHeight - scrollTop - clientHeight < loadMoreThreshold;
  if (scrolledToBottom) {
    loadMore();
  }
  }
    if (itemType === "notes") {
      return FileEdit;
    } else if (itemType === "canvas") {
      return Palett;
    } else {
      // Evidence
      const fileType = (item as { fileType?: unknown; type?: unknown; id?: unknown; fileName?: unknown; title?: unknown; name?: unknown; lastModified?: unknown; createdAt?: unknown; updatedAt?: unknown; description?: unknown; content?: unknown; objectCount?: unknown; tags?: unknown }).fileType || (item as { fileType?: unknown; type?: unknown; id?: unknown; fileName?: unknown; title?: unknown; name?: unknown; lastModified?: unknown; createdAt?: unknown; updatedAt?: unknown; description?: unknown; content?: unknown; objectCount?: unknown; tags?: unknown }).type || "";
      if (fileType.startsWith("image/")) return Imag;
      if (fileType.startsWith("video/")) return Video;
      if (fileType.includes("text") || fileType.includes("pdf"))
        return FileText;
      return Fil;
  }}
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  function truncateText(text: string, maxLength = 100) {
    if (!text) return "";
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  }
</script>

<div
  class="infinite-scroll-container"
  bind:this={scrollContainer}
  onscroll={handleScroll}
  role="listbox"
  aria-label="{itemType} list"
>
  {#if displayedItems.length === 0 && !isLoading}
    <div class="empty-state" transitionfade={{ duration: 200 }}>
      <div class="empty-icon">
        <svelte:component this={getItemIcon()} size={48} />
      </div>
      <p class="empty-text">No {itemType} found</p>
    </div>
  {:else}
    <div class="items-list">
      {#each displayedItems as item, index ((item as { fileType?: unknown; type?: unknown; id?: unknown; fileName?: unknown; title?: unknown; name?: unknown; lastModified?: unknown; createdAt?: unknown; updatedAt?: unknown; description?: unknown; content?: unknown; objectCount?: unknown; tags?: unknown }).id || index)}
        <div
          class="list-item"
          transitionslide={{ duration: 300, easing: quintOut }}
          onclick={() => handleItemClick(item)}
          onkeydown={e => e.key === 'Enter' && handleItemClick(item)}
          role="option"
          tabindex={0}
          aria-label="{itemType} item"
          aria-selected={index === selectedIndex}
        >
          <div class="item-icon">
            <svelte:component this={getItemIcon(item)} size={20} />
          </div>
          <div class="item-content">
            <div class="item-header">
              <h4 class="item-title">
                {#if itemType === 'evidence'}
                  {(
                    item as {
                      fileType?: unknown;
                      type?: unknown;
                      id?: unknown;
                      fileName?: unknown;
                      title?: unknown;
                      name?: unknown;
                      lastModified?: unknown;
                      createdAt?: unknown;
                      updatedAt?: unknown;
                      description?: unknown;
                      content?: unknown;
                      objectCount?: unknown;
                      tags?: unknown;
                    }
                  ).fileName ||
                    (
                      item as {
                        fileType?: unknown;
                        type?: unknown;
                        id?: unknown;
                        fileName?: unknown;
                        title?: unknown;
                        name?: unknown;
                        lastModified?: unknown;
                        createdAt?: unknown;
                        updatedAt?: unknown;
                        description?: unknown;
                        content?: unknown;
                        objectCount?: unknown;
                        tags?: unknown;
                      }
                    ).title ||
                    'Untitled Evidence'}
                {:else if itemType === 'notes'}
                  {(
                    item as {
                      fileType?: unknown;
                      type?: unknown;
                      id?: unknown;
                      fileName?: unknown;
                      title?: unknown;
                      name?: unknown;
                      lastModified?: unknown;
                      createdAt?: unknown;
                      updatedAt?: unknown;
                      description?: unknown;
                      content?: unknown;
                      objectCount?: unknown;
                      tags?: unknown;
                    }
                  ).title || 'Untitled Note'}
                {:else}
                  {(
                    item as {
                      fileType?: unknown;
                      type?: unknown;
                      id?: unknown;
                      fileName?: unknown;
                      title?: unknown;
                      name?: unknown;
                      lastModified?: unknown;
                      createdAt?: unknown;
                      updatedAt?: unknown;
                      description?: unknown;
                      content?: unknown;
                      objectCount?: unknown;
                      tags?: unknown;
                    }
                  ).name ||
                    `Canvas ${formatDate((item as { fileType?: unknown; type?: unknown; id?: unknown; fileName?: unknown; title?: unknown; name?: unknown; lastModified?: unknown; createdAt?: unknown; updatedAt?: unknown; description?: unknown; content?: unknown; objectCount?: unknown; tags?: unknown }).lastModified)}`}
                {/if}
              </h4>
              <span class="item-date">
                {formatDate(
                  (
                    item as {
                      fileType?: unknown;
                      type?: unknown;
                      id?: unknown;
                      fileName?: unknown;
                      title?: unknown;
                      name?: unknown;
                      lastModified?: unknown;
                      createdAt?: unknown;
                      updatedAt?: unknown;
                      description?: unknown;
                      content?: unknown;
                      objectCount?: unknown;
                      tags?: unknown;
                    }
                  ).createdAt ||
                    (
                      item as {
                        fileType?: unknown;
                        type?: unknown;
                        id?: unknown;
                        fileName?: unknown;
                        title?: unknown;
                        name?: unknown;
                        lastModified?: unknown;
                        createdAt?: unknown;
                        updatedAt?: unknown;
                        description?: unknown;
                        content?: unknown;
                        objectCount?: unknown;
                        tags?: unknown;
                      }
                    ).lastModified ||
                    (
                      item as {
                        fileType?: unknown;
                        type?: unknown;
                        id?: unknown;
                        fileName?: unknown;
                        title?: unknown;
                        name?: unknown;
                        lastModified?: unknown;
                        createdAt?: unknown;
                        updatedAt?: unknown;
                        description?: unknown;
                        content?: unknown;
                        objectCount?: unknown;
                        tags?: unknown;
                      }
                    ).updatedAt,
                )}
              </span>
            </div>
            <p class="item-description">
              {#if itemType === 'evidence'}
                {truncateText(
                  (
                    item as {
                      fileType?: unknown;
                      type?: unknown;
                      id?: unknown;
                      fileName?: unknown;
                      title?: unknown;
                      name?: unknown;
                      lastModified?: unknown;
                      createdAt?: unknown;
                      updatedAt?: unknown;
                      description?: unknown;
                      content?: unknown;
                      objectCount?: unknown;
                      tags?: unknown;
                    }
                  ).description,
                )}
              {:else if itemType === 'notes'}
                {truncateText(
                  (
                    item as {
                      fileType?: unknown;
                      type?: unknown;
                      id?: unknown;
                      fileName?: unknown;
                      title?: unknown;
                      name?: unknown;
                      lastModified?: unknown;
                      createdAt?: unknown;
                      updatedAt?: unknown;
                      description?: unknown;
                      content?: unknown;
                      objectCount?: unknown;
                      tags?: unknown;
                    }
                  ).content,
                )}
              {:else}
                Canvas state with {(
                  item as {
                    fileType?: unknown;
                    type?: unknown;
                    id?: unknown;
                    fileName?: unknown;
                    title?: unknown;
                    name?: unknown;
                    lastModified?: unknown;
                    createdAt?: unknown;
                    updatedAt?: unknown;
                    description?: unknown;
                    content?: unknown;
                    objectCount?: unknown;
                    tags?: unknown;
                  }
                ).objectCount || 0} objects
              {/if}
            </p>
            {#if (item as { fileType?: unknown; type?: unknown; id?: unknown; fileName?: unknown; title?: unknown; name?: unknown; lastModified?: unknown; createdAt?: unknown; updatedAt?: unknown; description?: unknown; content?: unknown; objectCount?: unknown; tags?: unknown }).tags && (item as { fileType?: unknown; type?: unknown; id?: unknown; fileName?: unknown; title?: unknown; name?: unknown; lastModified?: unknown; createdAt?: unknown; updatedAt?: unknown; description?: unknown; content?: unknown; objectCount?: unknown; tags?: unknown }).tags.length > 0}
              <div class="item-tags">
                {#each (item as { fileType?: unknown; type?: unknown; id?: unknown; fileName?: unknown; title?: unknown; name?: unknown; lastModified?: unknown; createdAt?: unknown; updatedAt?: unknown; description?: unknown; content?: unknown; objectCount?: unknown; tags?: unknown }).tags.slice(0, 3) as tag}
                  <span class="tag">{tag}</span>
                {/each}
                {#if (item as { fileType?: unknown; type?: unknown; id?: unknown; fileName?: unknown; title?: unknown; name?: unknown; lastModified?: unknown; createdAt?: unknown; updatedAt?: unknown; description?: unknown; content?: unknown; objectCount?: unknown; tags?: unknown }).tags.length > 3}
                  <span class="tag-more"
                    >+{(
                      item as {
                        fileType?: unknown;
                        type?: unknown;
                        id?: unknown;
                        fileName?: unknown;
                        title?: unknown;
                        name?: unknown;
                        lastModified?: unknown;
                        createdAt?: unknown;
                        updatedAt?: unknown;
                        description?: unknown;
                        content?: unknown;
                        objectCount?: unknown;
                        tags?: unknown;
                      }
                    ).tags.length - 3}</span
                  >
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
  {#if isLoading}
    <div class="loading-indicator" transitionfade={{ duration: 200 }}>
      <div class="spinner"></div>
      <p>Loading more {itemType}...</p>
    </div>
  {/if}
  {#if !hasMore && displayedItems.length > 0}
    <div class="end-indicator" transitionfade={{ duration: 200 }}>
      <p>No more {itemType} to load</p>
    </div>
  {/if}
</div>
<!-- TODO: migrate export lets to $props(); CommonProps assumed. -->

<style>
  .infinite-scroll-container {
    flex: 1;
    overflow-y: auto;
    padding: 0;
    background: var(--pico-background-color);
  }
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    color: var(--pico-muted-color);
    min-height: 200px;
  }
  .empty-icon {
    margin-bottom: 1rem;
    opacity: 0.5;
  }
  .empty-text {
    margin: 0;
    font-size: 0.875rem;
  }
  .items-list {
    padding: 0.5rem;
  }
  .list-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid transparent;
    margin-bottom: 0.5rem;
  }
  .list-item:hover {
    background: var(--pico-secondary-background);
    border-color: var(--pico-muted-border-color);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  .list-item:focus {
    outline: 2px solid var(--pico-primary);
    outline-offset: 2px;
  }
  .list-item:active {
    transform: translateY(0);
  }
  .item-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: var(--pico-primary-background);
    color: var(--pico-primary);
    flex-shrink: 0;
  }
  .item-content {
    flex: 1;
    min-width: 0;
  }
  .item-header {
    display: flex;
    align-items: center;
    justify-content: space-betwee;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }
  .item-title {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--pico-color);
    overflow: hidden;
    text-overflow: ellipsi;
    white-space: nowrap;
    flex: 1;
  }
  .item-date {
    font-size: 0.75rem;
    color: var(--pico-muted-color);
    flex-shrink: 0;
  }
  .item-description {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    color: var(--pico-muted-color);
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsi;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .item-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-top: 0.5rem;
  }
  .tag {
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
    background: var(--pico-primary-background);
    color: var(--pico-primary);
    border-radius: 12px;
    border: 1px solid var(--pico-primary);
  }
  .tag-more {
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
    background: var(--pico-muted-background);
    color: var(--pico-muted-color);
    border-radius: 12px;
    border: 1px solid var(--pico-muted-border-color);
  }
  .loading-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    color: var(--pico-muted-color);
    gap: 0.5rem;
  }
  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--pico-muted-border-color);
    border-top: 2px solid var(--pico-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  .end-indicator {
    text-align: center;
    padding: 1rem;
    color: var(--pico-muted-color);
    font-size: 0.875rem;
  }
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  /* Custom scrollbar */
  .infinite-scroll-container::-webkit-scrollbar {
    width: 6px;
  }
  .infinite-scroll-container::-webkit-scrollbar-track {
    background: var(--pico-background-color);
  }
  .infinite-scroll-container::-webkit-scrollbar-thumb {
    background: var(--pico-muted-border-color);
    border-radius: 3px;
  }
  .infinite-scroll-container::-webkit-scrollbar-thumb:hover {
    background: var(--pico-primary);
  }
</style>
