<script lang="ts">
  import { onMount } from 'svelte';

  // local element reference (was incorrectly importing a component)
  let buttonEl: HTMLButtonElement | null = null;
  export let variant = 'default';
  export let size = 'medium';
  export let disabled = false;
  export let loading = false;
  export let type: 'button' | 'submit' | 'reset' | undefined = 'button';
  export let ariaLabel = '';

  let buttonClass = '';

  onMount(() => {
    // no-op on mount; reactive assignment keeps class up to date
  });

  // reactive class recomputation
  $: buttonClass = `btn-${variant} btn-${size}`;

  function handleClick(event: MouseEvent) {
    if (disabled || loading) {
      // block action when disabled/loading
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    // allow native click to bubble to parent — no custom dispatcher
  }
</script>

<button
  bind:this={buttonEl}
  class={buttonClass}
  onclick={handleClick}
  disabled={disabled}
  aria-label={ariaLabel}
  type={type}
>
  <slot />
  {#if loading}
    <span class="loader"></span>
  {/if}
</button>

<style>
  /* @unocss-include */
  /* Add any additional styles for the button here */
</style>