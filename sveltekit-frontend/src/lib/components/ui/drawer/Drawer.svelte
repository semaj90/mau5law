<!-- @migration-task Error while migrating Svelte code: `{@render ...}` tags can only contain call expressions
https://svelte.dev/e/render_tag_invalid_expression -->
<!-- @migration-task Error while migrating Svelte code: `{@render ...}` tags can only contain call expressions -->
<script lang="ts">
  import { X } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    open?: boolean;
    title?: string;
    description?: string;
    side?: 'left' | 'right' | 'top' | 'bottom';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    children?: Snippet;
  }

  let {
    open = $bindable(false),
    title = '',
    description = '',
    side = 'right',
    size = 'md',
    children
  }: Props = $props();

  let dialogEl: HTMLElement | null = null;

  function handleClose() {
    open = false;
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) handleClose();
  }

  function handleBackdropKey(e: KeyboardEvent) {
    // Support keyboard activation of the overlay: Enter / Space to close,
    // Escape as a common close key as well.
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'Escape') {
      handleClose();
    }
  }

  function handleDialogKey(e: KeyboardEvent) {
    // Close dialog on Escape
    if (e.key === 'Escape') handleClose();
  }

  onMount(() => {
    if (open && dialogEl) {
      // focus the dialog so that keyboard interactions are available
      dialogEl.focus();
    }
  });
</script>

{#if open}
  <div
    class="drawer-overlay"
    tabindex="0"
    aria-label={title ? `${title} overlay - click or press Enter/Space to close` : "Drawer overlay - press Enter/Space or click to close"}
    onclick={handleBackdropClick}
    onkeydown={handleBackdropKey}
  >
  <div
    class="drawer drawer-{size} drawer-{side}"
    role="dialog"
    aria-modal="true"
    aria-label={title ? title : "Drawer"}
    tabindex="0"
    bind:this={dialogEl}
    onclick={(e) => e.stopPropagation()}
    onkeydown={handleDialogKey}
  >
      <div class="drawer-header">
        <div>
          {#if title}
            <h2 class="drawer-title">{title}</h2>
          {/if}
          {#if description}
            <p class="drawer-description">{description}</p>
          {/if}
        </div>
        <button
          class="drawer-close"
          aria-label="Close drawer"
          onclick={handleClose}
        >
          <X size="24" />
        </button>
      </div>
      <div class="drawer-body">
        <slot />
      </div>
    </div>
  </div>
{/if}
<style>/* @unocss-include */ .drawer-overlay {
    position: fixed;

    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .drawer {
    background: white;
    border-radius: 8px;
    padding: 20px;
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
  }
  .drawer-sm {
    width: 300px;
  }
  .drawer-md {
    width: 500px;
  }
  .drawer-lg {
    width: 700px;
  }
  .drawer-xl {
    width: 900px;
  }
  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
  }
  .drawer-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }
  .drawer-description {
    color: #666;
    margin: 4px 0 0 0;
  }
  .drawer-close {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    border-radius: 4px;
  }
  .drawer-close:hover {
    background: #f5f5f5;
  }
</style>