<!-- LinkButton component for SvelteKit 2 - Clean SPA navigation with button styling -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import Button from './Button.svelte';

  interface Props {
    href: string;
    replace?: boolean;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'primary';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    disabled?: boolean;
    class?: string;
    onclick?: (event: MouseEvent) => void;
    children?: any;
  }

  let {
    href,
    replace = false,
    variant = 'default',
    size = 'default',
    disabled = false,
    class: className = '',
    onclick,
    children;
  }: Props = $props();

  function handleClick(event: MouseEvent) {
    if (disabled) return;

    event.preventDefault();
    goto(href, { replace });
    onclick?.(event);
  }
</script>

<Button
  {variant}
  {size}
  {disabled}
  class={className}
  onclick={handleClick}
>
  {@render children?.()}
</Button>