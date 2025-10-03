<script lang="ts">
  import { getContext } from 'svelte';

  // Expose props correctly for Svelte
  export let disabled: boolean = false;
  // Accept keyboard events as well; be defensive when invoking.
  export let onClick: (event?: MouseEvent | KeyboardEvent | Event | unknown) => void = () => {};

  interface ContextMenuContext {
    close: () => void;
  }

  const ctx = getContext<ContextMenuContext>('context-menu');
  const close = ctx?.close ?? (() => {});

  // Accept generic Event union; guard disabled and onClick before calling.
  function handleClick(event?: MouseEvent | KeyboardEvent | Event) {
    if (disabled) return;
    if (typeof onClick === 'function') onClick(event);
    close();
  }

  // Support keyboard activation for Enter and Space
  function handleKeydown(event: KeyboardEvent) {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      // prevent page scroll when Space is used
      event.preventDefault();
      handleClick(event);
    }
  }
</script>

<button
  type="button"
  disabled={disabled}
  class="context-menu-item"
  class:disabled={disabled}
  role="menuitem"
  tabindex={disabled ? -1 : 0}
  on:click={handleClick}
  on:keydown={handleKeydown}
  aria-disabled={disabled}
>
  <slot />
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
