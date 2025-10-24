<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fly } from 'svelte/transition';
  import type { Snippet } from 'svelte';
  let {
    align = $bindable('left' as 'left' | 'right'),
    closeOnSelect = $bindable(true),
    onopen,
    onclose,
    trigger,
    children,
  }: {
    align?: 'left' | 'right';
    closeOnSelect?: boolean;
    onopen?: () => void;
    onclose?: () => void;
    trigger?: Snippet<[{ open: boolean }]>;
    children?: Snippet;
  } = $props();

  let open = $state(false);
  let rootEl = $state<HTMLElement | null>(null);

  function toggle() {
    open = !open;
    if (open) {
      onopen?.();
    } else {
      onclose?.();
    }
  }

  export function close() {
    if (open) {
      open = false;
      onclose?.();
    }
  }
  function onDocumentClick(e: MouseEvent) {
    if (!rootEl) return;
    if (!rootEl.contains(e.target as Node)) close();
  }
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  // optional helper for menu items to close the menu after action
  export function maybeCloseFromItem() {
    if (closeOnSelect) close();
  }

  onMount(() => {
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onKeydown);
  });
  onDestroy(() => {
    document.removeEventListener('click', onDocumentClick);
    document.removeEventListener('keydown', onKeydown);
  });
</script>

<div class="dropdown-root" bind:this={rootEl} style="position relative; display: inline-block;">
  <button
    type="button"
    class="dropdown-trigger"
    onclick={e => {
      e.stopPropagation();
      toggle();
    }}
    onkeydown={e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    }}
    aria-haspopup="true"
    aria-expanded={open}
  >
    {#if trigger}
      {@render trigger({ open })}
    {/if}
  </button>

  {#if open}
    <div
      role="menu"
      tabindex="-1"
      class="dropdown-menu"
      onclick={e => e.stopPropagation()}
      onkeydown={e => {
        if (e.key === 'Escape') close();
      }}
      style="position absolute; top: 100%; z-index: 60; {align === 'right' ? 'right:0' : 'left:0'}"
      transition:fly={{ y: -6, duration: 140 }}
    >
      {#if children}
        {@render children()}
      {/if}
    </div>
  {/if}
</div>

<style>
  /* Minimal encapsulated styles; toolbar reuses classes (menu-trigger, dropdown-menu, dropdown-item) */
  .dropdown-root {
    font-size: 0.95rem;
  }
  .dropdown-trigger {
    display: inline-flex;
    align-items: center;
  }
  .dropdown-menu {
    background: var(--dropdown-bg, #fff);
    border-radius: 0.5rem;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
    padding: 0.35rem;
    border: 1px solid #e6edf3;
    min-width: 12rem;
  }
</style>
