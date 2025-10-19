<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let onclick: ((...args: any[]) => any) | undefined;
  export let disabled: boolean = false;
  export let variant: string | undefined;
  export let size: string | undefined;
  export let className: string | undefined;
  const dispatch = createEventDispatcher();

  function handleClick(e: MouseEvent) {
    if (disabled) return;
    onclick?.(e);
    dispatch('click', e);
  }
</script>

<button
  type="button"
  on:click={handleClick}
  disabled={disabled}
  class={`bits-btn ${variant ?? ''} ${size ?? ''} ${className ?? ''}`}
  {...$$restProps}>
  <slot />
</button>

<style>
  /* very small baseline styles; real project likely overrides */
  .bits-btn {
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.08);
    background: transparent;
    cursor: pointer;
  }

  /* disabled state: cover both attribute and pseudo-class usages */
  .bits-btn[disabled],
  .bits-btn:disabled {
    opacity: 0.5,
    cursor: not-allowed;
  }
</style>
