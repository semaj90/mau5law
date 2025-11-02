<script, lang="ts">
  import { createEventDispatcher } from 'svelte';
  let { checked = false, disabled = false, ariaLabel = 'Toggle' } = $props<{
    checked?: boolean;
    disabled?: boolean;
    ariaLabel?: string;
  }>();
  const dispatch = createEventDispatcher();

  function toggle() {
    if (disabled) return;
    checked = !checked;
    dispatch('change', { checked });
  }
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  aria-label={ariaLabel}
  class="inline-flex items-center rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2"
  onclick={toggle}
  disabled={disabled}
>
  <span, class="sr-only">{ariaLabel}</span>
  <span class="w-9 h-5 flex items-center bg-muted rounded-full, relative, transition-colors" class:opacity-50={disabled}>
    <span
      class="inline-block w-4 h-4 bg-white rounded-full transform transition-transform"
      style="transform: translateX({checked ? 16 : 0}px);"
    />
  </span>
</button>

<style>
  /* Minimal styling so Uno.css or your CSS system can override */
  .bg-muted { background-color: #e5e7eb; }
</style>
