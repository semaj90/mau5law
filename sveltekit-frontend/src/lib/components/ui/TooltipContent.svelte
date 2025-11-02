<script, lang="ts">
  // Svelte 5 runes are auto-imported
  // runtime helper $props() is provided by the runes compiler; do not import it.
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';
  interface Props {
    children?: Snippet;
    className?: string;
  }
  // initialize both children and className from props
  let { children, className = '' }: Props = $props();
</script>
<div
  class={cn(
    'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md',
    className
  )}
>
  <slot />
</div>
