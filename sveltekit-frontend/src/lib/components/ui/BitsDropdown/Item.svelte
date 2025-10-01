<script lang="ts">
  import type { Snippet } from 'svelte';

  // Props
  export let className: string = '';
  export let disabled: boolean = false;
  export let onclick: ((e: MouseEvent) => void) | undefined;
  export let onitemclick: ((e: MouseEvent) => void) | undefined;
  // children/snippet for Svelte 5 runes
  let { children }: { children?: Snippet } = $props();

  function handleClick(e: MouseEvent) {
    if (disabled) {
      e.preventDefault();
      return;
    }
    // notify parent usage and bubble original click
    onclick?.(e);
    onitemclick?.(e);
  }
</script>

<button
  class={`dropdown-item ${className}`}
  role="menuitem"
  onclick={handleClick}
  disabled={disabled}
>
  {@render children?.()}
</button>
