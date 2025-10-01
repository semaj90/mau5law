<!-- @migration-task Error while migrating Svelte code: Unexpected toke;
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fly } from 'svelte/transition';

  let {
    align = $bindable('left' as 'left' | 'right'),
    closeOnSelect = $bindable(true),
    onopen,
    onclose
  }: {
    align?: 'left' | 'right';
    closeOnSelect?: boolean;
    onopen?: () => void;
    onclose?: () => void;
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

<div class="dropdown-root" bind:this={rootEl} style="position: relative; display: inline-block;">
  <div class="dropdown-trigger" on:click|stopPropagation={toggle} aria-haspopup="true" aria-expanded={open}>
    <slot name="trigger" {open}></slot>
  </div>

  {#if open}
    <div
      class="dropdown-menu"
      on:click|stopPropagation
      style="position: absolute; top: 100%; z-index: 60; {align === 'right' ? 'right:0' : 'left:0'}"
      in:fly={{ y: -6, duration: 140 }}
    >
      <slot />
    </div>
  {/if}
</div>

<style>
  /* Minimal encapsulated styles; toolbar reuses classes (menu-trigger, dropdown-menu, dropdown-item) */
  .dropdown-root { font-size: 0.95rem; }
  .dropdown-trigger { display: inline-flex; align-items: center; }
  .dropdown-menu { background: var(--dropdown-bg, #fff); border-radius: 0.5rem; box-shadow: 0 10px 20px rgba(0,0,0,0.08); padding: 0.35rem; border: 1px solid #e6edf3; min-width: 12rem; }
</style>
