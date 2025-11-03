<script lang="ts">
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';
  interface Props {
    children?: Snippet;
    class?: string;
  }
  let { children, class: className = '' }: Props = $props();
</script>

<td class={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)}>
  <slot />
</td>
