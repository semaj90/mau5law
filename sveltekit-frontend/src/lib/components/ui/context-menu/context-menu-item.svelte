<script lang="ts">
  import { getContext } from 'svelte';
  import type { Snippet } from 'svelte';

  let {
    disabled = false,
    onclick = () => {}
  }: {
    disabled?: boolean;
    onclick?: (event?: unknown) => void;
  } = $props();

  // children Snippet for Svelte 5 runes
  let { children }: { children?: Snippet } = $props();

  interface ContextMenuContext {
    close: () => void;
  }

  const ctx = getContext<ContextMenuContext>('context-menu');
  const close = ctx?.close ?? (() => {});

  function handleClick() {
    if (!disabled) {
      onclick?.();
      close();
    }
  }
</script>

<button
  class="context-menu-item"
  class:disabled={disabled}
  role="menuitem"
  tabindex={disabled ? -1 : 0}
  onclick={handleClick}
  {disabled}
>
  {@render children?.()}
</button>

<style>/* @unocss-include */
  .context-menu-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.375rem 0.5rem;
    font-size: 0.875rem;
    border: none;
    border-radius: 0.25rem;
    background: transparent;
    cursor: pointer;
    transition: background-color 0.15s;
    text-align: left;
  }
  .context-menu-item:hover:not(.disabled) {
    background-color: #f3f4f6;
  }
  .context-menu-item:focus {
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
  }
  .context-menu-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
