<script lang="ts">
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';
  interface Props {
    children?: Snippet
    class?: string}
  let { children, class: className = '' }: Props = $props();
</script>
<th
  class={cn(
    'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
    className
  )}
>
  <slot />
</th>

