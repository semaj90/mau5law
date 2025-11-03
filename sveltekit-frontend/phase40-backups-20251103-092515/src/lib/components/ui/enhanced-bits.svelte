<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Refactor props to use Svelte 5's $props() rune
  const {
    onclick,
    disabled = false,
    variant = '',
    size = '',
    className = '',
    hoverable = false,
    fullWidth = false,
    ...restAttrs // Capture all other attributes/props
  } = $props<{
    onclick?: (e: MouseEvent) => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
    className?: string;
    hoverable?: boolean;
    fullWidth?: boolean;
    // Allow any other HTML attributes to be passed through
    [key: string]: any;
  }>();

  const dispatch = createEventDispatcher();

  function handleClick(e: MouseEvent) {
    if (disabled) return;
    onclick?.(e);
    dispatch('click', e);
  }
</script>

<article
  class={className}
  data-variant={variant}
  data-hoverable={hoverable}
  data-fullwidth={fullWidth}
  onclick={handleClick}
  aria-disabled={disabled}
  {...restAttrs}
>
  <slot />
</article>

<style>
  /* very small baseline styles; real project likely overrides */
  .bits-btn {
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: transparent;
    cursor: pointer;
  }

  /* disabled, state: cover both attribute and pseudo-class usages */
  .bits-btn[disabled],
  .bits-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  article {
    padding: 1rem;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.02);
    color: inherit;
  }

  article[data-hoverable='true']:hover {
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  }

  article[data-fullwidth='true'] {
    width: 100%;
  }
</style>
