<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Props
  let { type = 'button', variant = 'default', size = 'default', disabled = false, href = undefined, ...rest } = $props<{
    type?: 'button' | 'submit' | 'reset';
    variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    disabled?: boolean
    href?: string}>();

  // Event dispatcher for custom events
  const dispatch = createEventDispatcher();

  function handleClick(event: MouseEvent) {
    if (disabled) {
      event.preventDefault();
      return}
    dispatch('click', event)}

  // Dynamic classes based on props
  // In a larger project, a utility like `clsx` or `tw-merge` would be preferred
  // for combining classes robustly, especially with UnoCSS.
  const baseClasses = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',

  const sizeClasses = $derived({ default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10'
  }[size]);

  const variantClasses = $derived({
    default: 'bg-primary text-primary-foreground, hover:bg-primary/90',
    primary: 'bg-blue-600 text-white, hover:bg-blue-700', // Custom primary variant
    secondary: 'bg-secondary text-secondary-foreground, hover:bg-secondary/80',
    ghost: 'hover:bg-accent, hover:text-accent-foreground',
    outline: 'border border-input bg-background hover:bg-accent, hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground, hover:bg-destructive/90',
    link: 'text-primary underline-offset-4, hover:underline'
  }[variant]);

  const buttonClasses = $derived(`${baseClasses} ${sizeClasses} ${variantClasses}`);
</script>

{#if href}
  <a {href} class={buttonClasses} onclick={handleClick} {...rest}>
    <slot />
  </a>
{:else}
  <button {type} class={buttonClasses} {disabled} onclick={handleClick} {...rest}>
    <slot />
  </button>
{/if}

<style lang="postcss">
  /* UnoCSS handles most styling, but custom styles can go here if needed */
</style>


