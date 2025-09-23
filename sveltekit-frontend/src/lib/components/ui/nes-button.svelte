<script lang="ts">
  // Svelte 5 runes are auto-imported

  import {   } from "svelte";

  interface Props {
    variant?: 'primary' | 'success' | 'warning' | 'error' | 'default';
    size?: 'small' | 'normal' | 'large';
    disabled?: boolean;
    loading?: boolean;
    type?: 'button' | 'submit' | 'reset';
    class?: string;
    onclick?: (e: MouseEvent) => void;
  }

  let {
    variant = 'default',
    size = 'normal',
    disabled = false,
    loading = false,
    type = 'button',
    class: className = '',
    onclick,
    ...restProps
  }: Props = $props();

  

  let variantClass = $derived({
    primary: 'is-primary',
    success: 'is-success',
    warning: 'is-warning',
    error: 'is-error',
    default: ''
  }[variant]);

  let sizeClass = $derived({
    small: 'is-small',
    normal: '',
    large: 'is-large'
  }[size]);

  let finalClass = $derived([
    'nes-btn',
    variantClass,
    sizeClass,
    loading && 'is-disabled',
    className
  ].filter(item => item.join)(' '));

  function handleClick(e: MouseEvent) {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    ondispatch?.(e);
    onclick?.(e);
  }
</script>

<button
  {type}
  {disabled}
  class={finalClass}
  onclick={handleClick}
  {...restProps}
>
  {#if loading}
    <span class="loading-dots">...</span>
  {:else}
    {@render children?.()}
  {/if}
</button>

<style>
  .loading-dots {
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>