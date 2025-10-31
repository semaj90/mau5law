<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ButtonVariant, ButtonSize } from '$lib/ui/types/button';

  // Props
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let variant: ButtonVariant = 'default';
  export let size: ButtonSize = 'default';
  export let disabled: boolean = false;
  export let href: string | undefined = undefined; // For anchor-like behavior

  // Event dispatcher for custom events
  const dispatch = createEventDispatcher();

  function handleClick(event: MouseEvent) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    dispatch('click', event);
  }

  // Dynamic classes based on props
  // In a larger project, a utility like `clsx` or `tw-merge` would be preferred
  // for combining classes robustly, especially with UnoCSS.
  $: baseClasses = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

  $: sizeClasses = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10'
  }[size];

  $: variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    primary: 'bg-blue-600 text-white hover:bg-blue-700', // Custom primary variant
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    link: 'text-primary underline-offset-4 hover:underline',
    success: 'bg-green-600 text-white hover:bg-green-700',
    warning: 'bg-yellow-500 text-black hover:bg-yellow-600',
    info: 'bg-blue-400 text-white hover:bg-blue-500'
  }[variant];

  $: buttonClasses = `${baseClasses} ${sizeClasses} ${variantClasses}`;
</script>

{#if href}
  <a {href} class={buttonClasses} on:click={handleClick} {...$$restProps}>
    <slot />
  </a>
{:else}
  <button {type} class={buttonClasses} {disabled} on:click={handleClick} {...$$restProps}>
    <slot />
  </button>
{/if}

<style lang="postcss">
  /* UnoCSS handles most styling, but custom styles can go here if needed */
</style>
