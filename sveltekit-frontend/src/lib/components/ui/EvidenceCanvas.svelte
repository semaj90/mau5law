<script lang="ts">
  import { Button, Modal } from '$lib/shims/bits-ui-enhanced';
  import type { EvidenceItem } from '$lib/types/sharedTypes';

  interface Props {
    evidenceItems?: EvidenceItem[];
    onAnalyze?: (item: EvidenceItem) => void;
    onEdit?: (item: EvidenceItem) => void;
    onDelete?: (item: EvidenceItem) => void;
  }

  let { evidenceItems = [], onAnalyze, onEdit, onDelete }: Props = $props();

  let showModal = $state(false);
  let selectedItem = $state<EvidenceItem | null>(null);

  function handleItemClick(item: EvidenceItem) {
    selectedItem = item;
    showModal = true;
  }

  function handleAnalyze() {
    if (selectedItem && onAnalyze) {
      onAnalyze(selectedItem);
    }
    showModal = false;
  }

  function handleEdit() {
    if (selectedItem && onEdit) {
      onEdit(selectedItem);
    }
    showModal = false;
  }

  function handleDelete() {
    if (selectedItem && onDelete) {
      onDelete(selectedItem);
    }
    showModal = false;
  }
</script>

<div class="canvas grid grid-cols-4 gap-4 p-4">
  {#each evidenceItems as item (item.id)}
    <div
      class="card nes-container is-dark hover:shadow-lg cursor-pointer transition-all duration-200"
      onclick={() => handleItemClick(item)}
      role="button"
      tabindex="0"
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleItemClick(item);
        }
      }}
    >
      {#if item.thumbnail}
        <img
          src={item.thumbnail}
          alt={item.title || 'Evidence item'}
          class="rounded-md w-full aspect-video object-cover mb-2"
        />
      {/if}
      <p class="text-xs mt-2 truncate" title={item.title}>
        {item.title || 'Untitled'}
      </p>
      {#if item.tags?.length}
        <div class="flex flex-wrap gap-1 mt-1">
          {#each item.tags.slice(0, 3) as tag}
            <span class="badge badge-sm">{tag}</span>
          {/each}
          {#if item.tags.length > 3}
            <span class="badge badge-sm">+{item.tags.length - 3}</span>
          {/if}
        </div>
      {/if}
      {#if item.confidence !== undefined}
        <div class="mt-2">
          <div class="text-xs text-gray-400 mb-1">Confidence</div>
          <div class="w-full bg-gray-700 rounded-full h-2">
            <div
              class="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full transition-all duration-300"
              style="width: {Math.max(10, item.confidence * 100)}%"
            ></div>
          </div>
        </div>
      {/if}
    </div>
  {/each}

  {#if evidenceItems.length === 0}
    <div class="col-span-full text-center py-12">
      <div class="nes-icon is-large star"></div>
      <p class="mt-4 text-gray-400">No evidence items yet</p>
      <p class="text-sm text-gray-500">Upload documents or add evidence to get started</p>
    </div>
  {/if}
</div>

{#if selectedItem}
  <Modal.Root bind:open={showModal}>
    <Modal.Backdrop />
    <Modal.Content class="nes-container is-dark max-w-md mx-auto">
      <Modal.Header>
        <Modal.Title class="text-lg font-bold">
          {selectedItem.title || 'Evidence Details'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body class="space-y-4">
        {#if selectedItem.thumbnail}
          <img
            src={selectedItem.thumbnail}
            alt={selectedItem.title || 'Evidence item'}
            class="w-full rounded-md"
          />
        {/if}

        <div>
          <h4 class="font-semibold mb-2">Description</h4>
          <p class="text-sm text-gray-300">
            {selectedItem.description || 'No description available.'}
          </p>
        </div>

        {#if selectedItem.tags?.length}
          <div>
            <h4 class="font-semibold mb-2">Tags</h4>
            <div class="flex flex-wrap gap-2">
              {#each selectedItem.tags as tag}
                <span class="badge">{tag}</span>
              {/each}
            </div>
          </div>
        {/if}

        {#if selectedItem.metadata}
          <div>
            <h4 class="font-semibold mb-2">Metadata</h4>
            <div class="text-xs space-y-1">
              {#each Object.entries(selectedItem.metadata) as [key, value]}
                <div class="flex justify-between">
                  <span class="text-gray-400">{key}:</span>
                  <span class="text-gray-200">{String(value)}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if selectedItem.confidence !== undefined}
          <div>
            <h4 class="font-semibold mb-2">AI Confidence</h4>
            <div class="flex items-center gap-2">
              <div class="flex-1 bg-gray-700 rounded-full h-3">
                <div
                  class="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-3 rounded-full transition-all duration-300"
                  style="width: {selectedItem.confidence * 100}%"
                ></div>
              </div>
              <span class="text-sm font-mono">
                {Math.round(selectedItem.confidence * 100)}%
              </span>
            </div>
          </div>
        {/if}
      </Modal.Body>

      <Modal.Footer class="flex gap-2 justify-end">
        {#if onEdit}
          <Button variant="secondary" onclick={handleEdit}>
            Edit
          </Button>
        {/if}
        {#if onAnalyze}
          <Button variant="primary" onclick={handleAnalyze}>
            Analyze
          </Button>
        {/if}
        {#if onDelete}
          <Button
            variant="danger"
            onclick={handleDelete}
            class="ml-auto"
          >
            Delete
          </Button>
        {/if}
      </Modal.Footer>
    </Modal.Content>
  </Modal.Root>
{/if}

<style>
  .canvas {
    min-height: 400px;
  }

  .card {
    transition: all var(--bits-duration-normal) var(--bits-easing);
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow: var(--bits-shadow-lg);
  }

  .badge {
    @apply px-2 py-1 text-xs font-medium rounded bg-gray-600 text-white;
  }

  .badge-sm {
    @apply px-1.5 py-0.5 text-xs;
  }

  /* NES.css inspired styles */
  .nes-container {
    background-color: var(--bits-surface);
    border: 2px solid var(--bits-border-primary, #495057);
    border-radius: var(--bits-radius-md);
    color: var(--bits-text-primary);
  }

  .nes-container.is-dark {
    background-color: var(--bits-surface);
    border-color: var(--bits-border-secondary, #6c757d);
  }

  /* Responsive grid */
  @media (max-width: 768px) {
    .canvas {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 480px) {
    .canvas {
      grid-template-columns: 1fr;
    }
  }
</style>