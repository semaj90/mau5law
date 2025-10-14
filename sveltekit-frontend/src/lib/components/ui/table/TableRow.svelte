<script lang="ts">
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';
  interface Props {
    children?: Snippet;
    class?: string;
  }
  let { children, class: className = '' }: Props = $props();
</script>

<tr class={cn('border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted', className)}>
  {@render children?.()}
</tr>
;
