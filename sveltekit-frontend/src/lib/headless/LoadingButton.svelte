<script lang="ts">
  // Svelte 5 runes: props are read-only; no `export let`
  const {
    loading = false,
    disabled = false,
    spinnerClass = 'mr-2 h-4 w-4 animate-spin',
    type = 'button',
    ariaLabel = undefined,
    class: className = '',
    ...rest
  } = $props();

  let isDisabled = $derived(disabled || loading);
</script>

<button
  {type}
  class={className}
  aria-busy={loading ? 'true' : 'false'}
  aria-label={ariaLabel}
  disabled={isDisabled}
  {...rest}
>
  {#if loading}
    <span class={spinnerClass} aria-hidden="true">
      <svg viewBox="0 0 24 24" class="w-full h-full" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
      </svg>
    </span>
  {/if}
  <slot />
</button>

<style>
  button[disabled] { cursor: not-allowed; }
</style>
