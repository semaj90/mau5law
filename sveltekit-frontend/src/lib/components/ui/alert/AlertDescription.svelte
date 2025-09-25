<script lang="ts">
	import type { Snippet } from 'svelte';
  interface Props {
    class?: string;
    children?: import('svelte').Snippet;
  }
  let { class: className = '',
    children,
    ...restProps  }: { class: className = '',
    children,
    ...restProps: unknown } = $props();
</script>

<div class="text-sm [&_p]:leading-relaxed {className}" {...restProps}>
  {@render children?.()}
</div>
